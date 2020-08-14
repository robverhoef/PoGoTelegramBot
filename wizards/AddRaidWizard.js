// ===================
// add raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const inputTime = require('../util/inputTime')
const listRaids = require('../util/listRaids')
const sendGymNotifications = require('../util/sendGymNotifications')
const sendRaidbossNotifications = require('../util/sendRaidbossNotifications')
const resolveRaidBoss = require('../util/resolveRaidBoss')
const setLocale = require('../util/setLocale')
const TIMINGS = require('../timeSettings.js')
const escapeMarkDown = require('../util/escapeMarkDown')

moment.tz.setDefault('Europe/Amsterdam')

function AddRaidWizard (bot) {
  return new WizardScene('add-raid-wizard',
    // step 0
    async (ctx) => {
      await setLocale(ctx)
      // console.log('HELLO ADD RAID WIZARD')
      ctx.session.newraid = {}
      ctx.session.gymcandidates = []
      return ctx.replyWithMarkdown(`${ctx.i18n.t('add_raid_welcome')}\r\n`, Markup.keyboard([{ text: ctx.i18n.t('btn_gym_find_location'), request_location: true }]).resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      // console.log('step 1', ctx.update.message.text)
      let candidates = []
      if (ctx.update.message.location) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 1.0 // max radius in Km
        const $sql = `SELECT id, gymname, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM gyms WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) AND removed = 0 ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Gym,
          mapToModel: {
            [Op.eq]: true // pass true here if you have any mapped fields
          }
        })
      } else {
        // User was typing
        const term = ctx.update.message.text.trim()
        if (term.length < 2) {
          return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
          // .then(() => ctx.wizard.back())
        } else {
          candidates = await models.Gym.findAll({
            where: {
              [Op.and]: [
                {
                  gymname: {
                    [Op.like]: '%' + term + '%'
                  }
                },
                {
                  removed: {
                    [Op.eq]: false
                  }
                }
              ]
            }
          })
          if (candidates.length === 0) {
            ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', { term: escapeMarkDown(term) }))
            return
          }
        }
      }
      ctx.session.gymcandidates = []
      for (let i = 0; i < candidates.length; i++) {
        ctx.session.gymcandidates.push([
          candidates[i].gymname.trim(),
          candidates[i].id
        ])
      }

      ctx.session.gymcandidates.push([
        ctx.i18n.t('btn_gym_not_found'), 0
      ])
      return ctx.replyWithMarkdown(ctx.i18n.t('select_a_gym'), Markup.keyboard(ctx.session.gymcandidates.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    // step 2
    async (ctx) => {
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.gymcandidates.length; i++) {
        if (ctx.session.gymcandidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch gym not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('add_raid_wrong_while_selecting')}\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the gym

      if (ctx.session.gymcandidates[selectedIndex][1] === 0) {
        ctx.replyWithMarkdown(ctx.i18n.t('retry_or_cancel'), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.wizard.selectStep(0)
            return ctx.wizard.steps[0](ctx)
          })
      } else {
        // retrieve selected candidate from session
        const selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newraid.gymId = selectedgym[1]
        ctx.session.newraid.gymname = selectedgym[0]
        ctx.session.timeOptions = [
          [ctx.i18n.t('btn_start_mode_time'), 'startmodetime'],
          [ctx.i18n.t('btn_start_mode_min'), 'startmodemin'],
          [ctx.i18n.t('btn_end_mode_time'), 'endmodetime'],
          [ctx.i18n.t('btn_end_mode_min'), 'endmodemin']
        ]
        const btns = ctx.session.timeOptions.map(el => el[0])

        return ctx.replyWithMarkdown(ctx.i18n.t('enter_end_time_mode_question'),
          Markup.keyboard(btns).oneTime().resize().extra()
        )
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: get the time; either start or end of the raid itself, or in minutes
    async (ctx) => {
      let timemode = ''
      for (var a = 0; a < ctx.session.timeOptions.length; a++) {
        if (ctx.session.timeOptions[a][0] === ctx.update.message.text) {
          timemode = ctx.session.timeOptions[a][1]
          break
        }
      }
      ctx.session.timemode = timemode
      let question = ''
      if (timemode === 'startmodetime') {
        question = ctx.i18n.t('enter_starttime_time')
      } else if (timemode === 'endmodetime') {
        question = ctx.i18n.t('enter_endtime_time', { bosstime: TIMINGS.BOSS })
      } else if (timemode === 'startmodemin') {
        question = ctx.i18n.t('enter_starttime_minutes', { bosstime: TIMINGS.BOSS })
      } else if (timemode === 'endmodemin') {
        question = ctx.i18n.t('enter_endtime_minutes')
      }
      return ctx.replyWithMarkdown(question, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      const message = ctx.update.message.text.trim()

      let tmptime
      if (ctx.session.timemode === 'startmodetime' || ctx.session.timemode === 'endmodetime') {
        tmptime = inputTime(message)
        // check valid time
        if (tmptime === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
        }
      } else {
        const minutes = parseInt(message)
        if ((!minutes || minutes < 0 || minutes > TIMINGS.HATCH) && ctx.session.timemode === 'startmodemin') {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_minutes_retry', { hatchtime: TIMINGS.HATCH }))
        }
        if ((!minutes || minutes < 0 || minutes > TIMINGS.BOSS) && ctx.session.timemode === 'endmodemin') {
          return ctx.replyWithMarkdown(`${ctx.i18n.t('add_raid_0_45_min_error', { bosstime: TIMINGS.BOSS })}`)
        }
        if (minutes < 5 && ctx.session.timemode === 'endmodemin') {
          return ctx.replyWithMarkdown(ctx.i18n.t('time_to_tight'))
            .then(() => ctx.scene.leave())
        }
        tmptime = moment().add(minutes, 'minutes').unix()
      }

      let endtime
      if (ctx.session.timemode === 'startmodetime' || ctx.session.timemode === 'startmodemin') {
        // user wanted to enter time when egg hatches
        endtime = moment.unix(tmptime).add(TIMINGS.BOSS, 'minutes').unix()
      } else {
        // user wanted to enter raid's end time
        endtime = tmptime
      }

      ctx.session.newraid.endtime = endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(TIMINGS.BOSS, 'minutes')

      if (starttime < moment()) {
        starttime = moment()
      }
      ctx.replyWithMarkdown(ctx.i18n.t('starttime_proposal', { starttm: starttime.format('HH:mm'), endtm: moment.unix(endtime).format('HH:mm') }))
        .then(() => ctx.wizard.next())
    },
    // step 5
    async (ctx) => {
      const endtime = ctx.session.newraid.endtime
      // calculate minimum start time
      const starttime = moment.unix(endtime)
      starttime.subtract(TIMINGS.BOSS, 'minutes')

      const message = ctx.update.message.text.trim()
      let start1
      if (message === 'x' || message === 'X') {
        // default starttime of 30 before endtime or right now, when time is short:
        let start1time = moment.unix(endtime)
        start1time.subtract(TIMINGS.RAID_START, 'minutes')
        if (start1time < moment()) {
          start1time = moment()
        }
        start1 = start1time.unix()
      } else {
        start1 = inputTime(message)
        if (start1 === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_range', { range_start: starttime.format('HH:mm'), range_end: moment.unix(endtime).format('HH:mm') }))
        }
        if (starttime.diff(moment.unix(start1)) > 0 || moment.unix(endtime).diff(moment.unix(start1)) < 0) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_range', { range_start: starttime.format('HH:mm'), range_end: moment.unix(endtime).format('HH:mm') }))
        }
        if (moment.unix(endtime).diff(moment.unix(start1)) < 5) {
          return ctx.replyWithMarkdown(`${ctx.i18n.t('invalid_time_range_too_early')}${ctx.i18n.t('invalid_time_range', { range_start: starttime.format('HH:mm'), range_end: moment.unix(endtime).format('HH:mm') })}`)
        }
      }
      ctx.session.newraid.start1 = start1

      var lastRaidBossesQuery = await models.sequelize.query('SELECT target FROM raids ORDER BY createdAt DESC LIMIT 10;', {
        model: models.Raid,
        mapToModel: {
          [Op.eq]: true // pass true here if you have any mapped fields
        }
      })

      var lastRaidBosses = [...new Set(lastRaidBossesQuery.map(({ target: text }) => text))].slice(0, 5).map(text => ({ text }))
      var buttons = lastRaidBosses.reduce((result, value, index, array) => {
        if (index % 2 === 0) {
          result.push(array.slice(index, index + 2))
        }
        return result
      }, [])

      ctx.replyWithMarkdown(ctx.i18n.t('raidboss_question'), Markup.keyboard(buttons).resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },
    // step 7
    async (ctx) => {
      const target = ctx.update.message.text.trim()
      const boss = await resolveRaidBoss(target)
      if (boss !== null) {
        ctx.session.newraid.target = boss.name
        ctx.session.newraid.bossid = boss.id
        ctx.session.newraid.accounts = boss.accounts
      } else {
        ctx.session.newraid.target = target
        ctx.session.newraid.accounts = null
        ctx.session.newraid.bossid = null
      }
      const endtime = ctx.session.newraid.endtime
      const start1 = ctx.session.newraid.start1
      const out = `${ctx.i18n.t('until')} ${moment.unix(endtime).format('HH:mm')}: *${ctx.session.newraid.target}*\n${ctx.session.newraid.bossid !== null ? (ctx.i18n.t('recommended') + ': ' + ctx.session.newraid.accounts + ' accounts\n') : ''}${ctx.session.newraid.gymname}\n${ctx.i18n.t('start')}: ${moment.unix(start1).format('HH:mm')}`
      ctx.session.saveOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard(ctx.session.saveOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // step 8
    async (ctx) => {
      const user = ctx.from
      const saveme = ctx.session.saveOptions.indexOf(ctx.update.message.text) === 0
      if (saveme) {
        // Sometimes a new raid is getting submitted multiple times
        // ToDo: adapt this when multiple starttimes are getting implemented
        var raidexists = await models.Raid.findOne({
          where: {
            [Op.and]: [
              {
                gymId: {
                  [Op.eq]: ctx.session.newraid.gymId
                }
              },
              {
                target: {
                  [Op.eq]: ctx.session.newraid.target
                }
              },
              {
                start1: {
                  [Op.eq]: ctx.session.newraid.start1
                }
              },
              {
                endtime: {
                  [Op.eq]: ctx.session.newraid.endtime
                }
              }
            ]
          }
        })
        if (raidexists) {
          console.log(`New raid exists… Ignoring id: ${ctx.session.newraid.gymId} target: ${ctx.session.newraid.target} endtime: ${ctx.session.newraid.endtime}`)
          return ctx.replyWithMarkdown(ctx.i18n.t('raid_exists_warning'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session.newraid = null
              return ctx.scene.leave()
            })
        }
        const newraid = models.Raid.build({
          gymId: ctx.session.newraid.gymId,
          start1: ctx.session.newraid.start1,
          target: ctx.session.newraid.target,
          raidbossId: ctx.session.newraid.bossid,
          endtime: ctx.session.newraid.endtime,
          reporterName: user.first_name,
          reporterId: user.id
        })
        // save...
        try {
          await newraid.save()
            .then((saved) => {
              ctx.session.savedraid = saved
            })
        } catch (error) {
          console.log('Woops… registering new raid failed', error)

          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        const oldlang = ctx.i18n.locale()
        ctx.i18n.locale(process.env.DEFAULT_LOCALE)
        const reason = ctx.i18n.t('raid_added_list', {
          gymname: ctx.session.newraid.gymname,
          user_first_name: escapeMarkDown(user.first_name),
          user: user
        })
        ctx.i18n.locale(oldlang)
        // send updated list to group
        const out = await listRaids(reason, ctx)
        if (out === null) {
          return ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        // send alert to subscribed users of this Gym
        await sendGyms(ctx, bot)
        // send alert to subscribed users of the Raidboss
        await sendRaidbosses(ctx, bot)
        ctx.session.participateOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
        return bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
          .then(() => {
            ctx.replyWithMarkdown(ctx.i18n.t('do_you_participate'), Markup.keyboard(ctx.session.participateOptions).resize().oneTime().extra())
          })
          .then(() => ctx.wizard.next())
      } else {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('join_raid_cancel')}`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
    },
    // Step 9
    async (ctx) => {
      const participate = ctx.session.participateOptions.indexOf(ctx.update.message.text)
      if (participate === 1) {
        // user does NOT participate, exit
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      // user does participate
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
        gymname: ctx.session.newraid.gymname
      }), Markup.keyboard([['1'], ['2', '3', '4'], ['5', '6', '7']])
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // step 10
    async (ctx) => {
      // save number of accounts to session
      ctx.session.accounts = parseInt(ctx.update.message.text)
      ctx.session.raidOptions = [ctx.i18n.t('remote_raid_confirm'), ctx.i18n.t('local_raid_confirm'), ctx.i18n.t('private_raid_confirm')]
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('remote_raid_question')}*\n\n*${ctx.i18n.t('covid19_disclaimer')}*`, Markup.keyboard(ctx.session.raidOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // step 11
    async (ctx) => {
      const raidtypeanswer = ctx.update.message.text
      // console.log(raidtypeanswer)
      ctx.session.newraid.remote = raidtypeanswer === ctx.i18n.t('remote_raid_confirm')
      ctx.session.newraid.private = raidtypeanswer === ctx.i18n.t('private_raid_confirm')

      if (raidtypeanswer === ctx.i18n.t('remote_raid_confirm')) {
        if (ctx.session.accounts > parseInt(process.env.THRESHOLD_REMOTE_USERS) && raidtypeanswer === ctx.i18n.t('remote_raid_confirm')) {
          // console.info('To many remotes, current:',  )
          return ctx.replyWithMarkdown(`*${ctx.i18n.t('maximum_remote_raid_reached')}* ${process.env.THRESHOLD_REMOTE_USERS}. ${ctx.i18n.t('try_again_remote_limit')}`)
            .then(() => ctx.scene.leave())
        }
      }
      if (
        raidtypeanswer !== ctx.i18n.t('remote_raid_confirm') &&
        raidtypeanswer !== ctx.i18n.t('local_raid_confirm') &&
        raidtypeanswer !== ctx.i18n.t('private_raid_confirm')
      ) {
        // console.log('test nrw', ctx.i18n.t('remote_raid_confirm'))
        ctx.replyWithMarkdown(ctx.i18n.t('retry_or_cancel'), Markup.keyboard(ctx.session.raidOptions).resize().oneTime().extra())
          .then(() => {

          })
      } else {
        const accounts = ctx.session.accounts
        const user = ctx.from
        // Check already registered? If so; update else store new
        const raiduser = await models.Raiduser.findOne({
          where: {
            [Op.and]: [{ uid: user.id }, { raidId: ctx.session.savedraid.id }]
          }
        })
        if (raiduser) {
        // update
          try {
            await models.Raiduser.update(
              { accounts: accounts },
              { where: { [Op.and]: [{ uid: user.id }, { raidId: ctx.session.savedraid.id }] } }
            )
          } catch (error) {
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        } else {
        // new raid user
          const raiduser = models.Raiduser.build({
            raidId: ctx.session.savedraid.id,
            username: user.first_name,
            uid: user.id,
            accounts: accounts,
            remote: ctx.session.newraid.remote,
            private: ctx.session.newraid.private
          })
          try {
            await raiduser.save()
          } catch (error) {
            console.log('Woops… registering raiduser failed', error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        }
        const oldlang = ctx.i18n.locale()
        ctx.i18n.locale(process.env.DEFAULT_LOCALE)
        const reason = ctx.i18n.t('raid_user_added_list', {
          user: user,
          user_first_name: escapeMarkDown(user.first_name),
          gymname: ctx.session.newraid.gymname
        })
        ctx.i18n.locale(oldlang)
        const out = await listRaids(reason, ctx)
        if (out === null) {
          ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        return ctx.replyWithMarkdown(ctx.i18n.t('raid_add_finish', {
          gymname: ctx.session.newraid.gymname,
          starttm: moment.unix(ctx.session.newraid.start1).format('HH:mm')
        }), Markup.removeKeyboard().extra())

          .then(async () => {
            bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
          })
          .then(() => ctx.scene.leave())
      }
    })
}
async function sendGyms (ctx, bot) {
  const gymId = ctx.session.newraid.gymId
  const gymname = ctx.session.newraid.gymname
  const target = ctx.session.newraid.target
  const starttime = ctx.session.newraid.start1

  await sendGymNotifications(ctx, bot, gymId, gymname, target, starttime)
}

async function sendRaidbosses (ctx, bot) {
  const raidbossId = ctx.session.newraid.bossid
  if (!raidbossId) {
    return
  }
  const gymname = ctx.session.newraid.gymname
  const target = ctx.session.newraid.target
  const starttime = ctx.session.newraid.start1

  await sendRaidbossNotifications(ctx, bot, raidbossId, gymname, target, starttime)
}

module.exports = AddRaidWizard
