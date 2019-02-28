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

moment.tz.setDefault('Europe/Amsterdam')

function AddRaidWizard (bot) {
  return new WizardScene('add-raid-wizard',
    // step 0
    async (ctx) => {
      await setLocale(ctx)
      console.log('session: ', ctx.session)
      console.log('HELLO ADD RAID WIZARD')
      ctx.session.newraid = {}
      ctx.session.gymcandidates = []
      ctx.i18n.locale(ctx.session.__language_code)
      return ctx.replyWithMarkdown(ctx.i18n.t('add_raid_welcome'), Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      // console.log('step 1', ctx.update.message.text)
      ctx.i18n.locale(ctx.session.__language_code)
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
        // .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: { [Op.like]: '%' + term + '%' }
          }
        })
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', { term: term }))
          return
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
      }
    },
    // step 2
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.gymcandidates.length; i++) {
        if (ctx.session.gymcandidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch gym not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`Er ging iets fout bij het kiezen van de gym.\n*Gebruik */start* om het nog eens te proberen…*\n`, Markup.removeKeyboard().extra())
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
        let selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newraid.gymId = selectedgym[1]
        ctx.session.newraid.gymname = selectedgym[0]
        ctx.session.timeOptions = [
          [ctx.i18n.t('btn_start_mode_time'), 'startmodetime'],
          [ctx.i18n.t('btn_start_mode_min'), 'startmodemin'],
          [ctx.i18n.t('btn_end_mode_time'), 'endmodetime'],
          [ctx.i18n.t('btn_end_mode_min'), 'endmodemin']
        ]
        let btns = ctx.session.timeOptions.map(el => el[0])

        return ctx.replyWithMarkdown(ctx.i18n.t('enter_end_time_mode_question'),
          Markup.keyboard(btns).oneTime().resize().extra()
        )
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: get the time; either start or end of the raid itself, or in minutes
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
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
        question = ctx.i18n.t('enter_endtime_time')
      } else if (timemode === 'startmodemin') {
        question = ctx.i18n.t('enter_starttime_minutes')
      } else if (timemode === 'endmodemin') {
        question = ctx.i18n.t('enter_endtime_minutes')
      }
      return ctx.replyWithMarkdown(question, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
      const message = ctx.update.message.text.trim()

      let tmptime
      if (ctx.session.timemode === 'startmodetime' || ctx.session.timemode === 'endmodetime') {
        tmptime = inputTime(message)
        // check valid time
        if (tmptime === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
        }
      } else {
        let minutes = parseInt(message)
        if ((!minutes || minutes < 0 || minutes > 60) && ctx.session.timemode === 'startmodemin') {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_minutes_retry'))
        }
        if ((!minutes || minutes < 0 || minutes > 45) && ctx.session.timemode === 'endmodemin') {
          return ctx.replyWithMarkdown(`Opgegeven minuten moeten tussen de 0 en 45 liggen. \n*Probeer het nog eens.*`)
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
        endtime = moment.unix(tmptime).add(45, 'minutes').unix()
      } else {
        // user wanted to enter raid's end time
        endtime = tmptime
      }

      ctx.session.newraid.endtime = endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(45, 'minutes')

      if (starttime < moment()) {
        starttime = moment()
      }
      ctx.replyWithMarkdown(ctx.i18n.t('starttime_proposal', { starttm: starttime.format('HH:mm'), endtm: moment.unix(endtime).format('HH:mm') }))
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
      let endtime = ctx.session.newraid.endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(45, 'minutes')

      let message = ctx.update.message.text.trim()
      let start1
      if (message === 'x' || message === 'X') {
        // default starttime of 30 before endtime or right now, when time is short:
        let start1time = moment.unix(endtime)
        start1time.subtract(30, 'minutes')
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
      ctx.replyWithMarkdown(ctx.i18n.t('raidboss_question'))
        .then(() => ctx.wizard.next())
    },
    // step 5
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
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
      let out = `${ctx.i18n.t('until')} ${moment.unix(endtime).format('HH:mm')}: *${ctx.session.newraid.target}*\n${ctx.session.newraid.bossid !== null ? (ctx.i18n.t('recommended') + ': ' + ctx.session.newraid.accounts + ' accounts\n') : ''}${ctx.session.newraid.gymname}\n${ctx.i18n.t('start')}: ${moment.unix(start1).format('HH:mm')}`
      ctx.session.saveOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard(ctx.session.saveOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // step 6
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
      const user = ctx.from
      let saveme = ctx.session.saveOptions.indexOf(ctx.update.message.text) === 0
      if (saveme) {
        // Sometimes a new raid is getting submitted multiple times
        // ToDo: adapt this when multiple starttimes are getting implemented
        var raidexists = await models.Raid.findOne({
          where: {
            [Op.and]: [
              { gymId: ctx.session.newraid.gymId },
              { target: ctx.session.newraid.target },
              { start1: ctx.session.newraid.start1 },
              { endtime: ctx.session.newraid.endtime }
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
        let newraid = models.Raid.build({
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
        // send updated list to group
        let out = await listRaids(ctx.i18n.t('raid_added_list', {
          gymname: ctx.session.newraid.gymname,
          user: user
        }), ctx)
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
        return ctx.replyWithMarkdown('Jammer… \n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
    },
    // Step 7
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
      let participate = ctx.session.participateOptions.indexOf(ctx.update.message.text)
      if (participate === 1) {
        // user does NOT participate, exit
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      // user does participate
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
        gymname: ctx.session.newraid.gymname
      }), Markup.keyboard([['1'], ['2', '3', '4', '5']])
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 8
    async (ctx) => {
      ctx.i18n.locale(ctx.session.__language_code)
      const accounts = parseInt(ctx.update.message.text)
      const user = ctx.from
      // Check already registered? If so; update else store new
      let raiduser = await models.Raiduser.findOne({
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
        let raiduser = models.Raiduser.build({
          raidId: ctx.session.savedraid.id,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await raiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      }
      let out = await listRaids(ctx.i18n.t('raid_user_added_list', {
        user: user,
        gymname: ctx.session.newraid.gymname
      }), ctx)
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
  )
}

async function sendGyms (ctx, bot) {
  let gymId = ctx.session.newraid.gymId
  let gymname = ctx.session.newraid.gymname
  let target = ctx.session.newraid.target
  let starttime = ctx.session.newraid.start1

  await sendGymNotifications(bot, gymId, gymname, target, starttime)
}

async function sendRaidbosses (ctx, bot) {
  let raidbossId = ctx.session.newraid.bossid
  if (!raidbossId) {
    return
  }
  let gymname = ctx.session.newraid.gymname
  let target = ctx.session.newraid.target
  let starttime = ctx.session.newraid.start1

  await sendRaidbossNotifications(bot, raidbossId, gymname, target, starttime)
}

module.exports = AddRaidWizard
