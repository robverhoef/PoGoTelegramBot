// ===================
// Field Research wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const moment = require('moment-timezone')
const listRaids = require('../util/listRaids')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')
const getLocale = require('../util/getLocale')
const inputExRaidTime = require('../util/inputExRaidTime')
const resolveRaidBoss = require('../util/resolveRaidBoss')

async function listExraids () {
  let today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  let exraids = await models.Exraid.findAll({
    where: {
      createdAt: {
        [Op.gt]: today
      }
    },
    include: [
      models.Gym
    ]
  })
  return exraids
}

function ExraidWizard (bot) {
  const wizsteps = {
    mainmenu: 0,
    addexraid: 2,
    editexraid: 8,
    exraidleave: 12
  }
  return new WizardScene('exraid-wizard',
    // Exraid mainmenu, step 0
    async (ctx) => {
      await setLocale(ctx)
      ctx.session.newexraid = {}
      ctx.session.mainexraidbtns = []
      ctx.session.mainexraidbtns.push([ctx.i18n.t('exraid_btn_add'), 0])
      ctx.session.mainexraidbtns.push([ctx.i18n.t('exraid_btn_done'), 'exraiddone']);
      return ctx.replyWithMarkdown(ctx.i18n.t('main_menu_greeting', { user: ctx.from }), Markup.keyboard(ctx.session.mainexraidbtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    // handle choice, step 1
    async (ctx) => {
      const answer = ctx.update.message.text
      let answerid = -1
      //user wants to add ex raid?
      // or get ex raid id
      for(const btn of ctx.session.mainexraidbtns) {
        if (btn[0] === answer) {
          answerid = btn[1]
          break
        }
      }
      if (answerid === 0) {
        const nextStep = wizsteps.addexraid
        ctx.wizard.selectStep(nextStep)
        return ctx.wizard.steps[nextStep](ctx)
      } else {
        ctx.session.selectedRaid = answerid
      }
      ctx.replyWithMarkdown('Wat wil je doen met ' + answer + '?')
      .then(() => ctx.scene.leave())
    },

    // add ex raid, step 2
    async (ctx) => {
      return ctx.replyWithMarkdown(ctx.i18n.t('add_exraid_welcome'), Markup.keyboard([{ text: ctx.i18n.t('btn_gym_find_location'), request_location: true }]).resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      // console.log('step 3', ctx.update.message.text)
      let candidates = []
      if (ctx.update.message.location) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 1.0 // max radius in Km
        let $sql = `SELECT id, gymname, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM gyms WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) AND removed = 0 ORDER BY d`
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
            ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', { term: term }))
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
    // step 4
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
        let selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newexraid.gymId = selectedgym[1]
        ctx.session.newexraid.gymname = selectedgym[0]

        ctx.session.dateOptions = []
        const userLoc = getLocale(ctx)
        for (let i = 0; i < 14; i++) {
          const mnts = ['jan', 'feb', 'mar', 'apr' ,'may' ,'jun' ,'jul' ,'aug' ,'sep' ,'oct' ,'nov' ,'dec']
          var dat = moment().add(i, 'days').toArray()
          var datstr = dat[2] + ' ' + ctx.i18n.t(mnts[dat[1]]) + ' ' + dat[0]
          console.log(datstr)
          ctx.session.dateOptions.push([datstr, i])
        }
        let btns = ctx.session.dateOptions.map(el => el[0])

        return ctx.replyWithMarkdown('Op welke dag is de Ex Raid?', Markup.keyboard(btns).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },

    async (ctx) => {
      let answer = ctx.update.message.text
      let days = 0
      for (const d of ctx.session.dateOptions) {
        if (answer === d[0]) {
          days = d[1]
          break
        }
      }
      ctx.session.exraiddays = days
      return ctx.replyWithMarkdown('OK, over ' + ctx.session.exraiddays + ' dagen\n*Hoe laat begint de Ex Raid zelf?* \nGeef de tijd zo op: bijvoorbeeld 9:45 of 17:30', Markup.removeKeyboard().extra())
      .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      let tmptime = false
      let answer = ctx.update.message.text
      tmptime = inputExRaidTime(ctx.session.exraiddays, answer)
      // check valid time
      if (tmptime === false) {
        return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
      }
      ctx.session.newexraid.endtime = moment.unix(tmptime).add(45, 'minutes').unix()
      ctx.session.newexraid.start1 = tmptime
      return ctx.replyWithMarkdown(`*Wat wordt de starttijd?*\nVul een *x* in voor ${moment.unix(ctx.session.newexraid.start1).format('HH:mm')} \nOf vul een starttijd in tussen ${moment.unix(ctx.session.newexraid.start1).format('HH:mm')} en ${moment.unix(ctx.session.newexraid.endtime).subtract(10, 'minutes').format('HH:mm')}`)
      .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      let tmptime = false
      const answer = ctx.update.message.text.toLowerCase()
      if (answer === 'x') {
        tmptime = ctx.session.newexraid.start1
      } else {
        tmptime = inputExRaidTime(ctx.session.exraiddays, answer)
        if (moment.unix(tmptime).isBefore(moment.unix(ctx.session.newexraid.start1)) || moment.unix(tmptime).isAfter(moment.unix(ctx.session.newexraid.endtime).subtract(10, 'minutes'))) {
          return ctx.replyWithMarkdown(`Dat is geen goede starttijd. \nVul een tijd in tussen ${moment.unix(ctx.session.newexraid.start1).format('HH:mm')} en ${moment.unix(ctx.session.newexraid.endtime).subtract(10, 'minutes').format('HH:mm')}`)
        }
      }
      ctx.session.newexraid.start1 = tmptime
      return ctx.replyWithMarkdown(`Wat is de raidboss? \nBijvoorbeeld 'Deoxys'`)
      .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.newexraid.target = ctx.update.message.text
      var rboss = resolveRaidBoss(ctx.update.message.text)
      ctx.session.newexraid.raidbossId = rboss !== null ? rboss.id : null
      console.log(ctx.session.newexraid)
      let out = `*Ex Raid* ${moment.unix(ctx.session.newexraid.start1).format('YYYY-MM-DD')}\n${ctx.i18n.t('until')} ${moment.unix(ctx.session.newexraid.endtime).format('HH:mm')}: *${ctx.session.newexraid.target}*\n${ctx.session.newexraid.gymname}\n${ctx.i18n.t('start')}: ${moment.unix(ctx.session.newexraid.start1).format('HH:mm')}`
      ctx.session.saveOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard(ctx.session.saveOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      const user = ctx.from
      const answer = ctx.update.message.text
      if (answer === ctx.i18n.t('no')) {
        // don't save

      }
      // save
      if (answer === ctx.i18n.t('yes')) {
        var raidexists = await models.Exraid.findOne({
          where: {
            [Op.and]: [
              {
                gymId: {
                  [Op.eq]: ctx.session.newexraid.gymId
                }
              },
              {
                target: {
                  [Op.eq]: ctx.session.newexraid.target
                }
              },
              {
                start1: {
                  [Op.eq]: ctx.session.newexraid.start1
                }
              },
              {
                endtime: {
                  [Op.eq]: ctx.session.newexraid.endtime
                }
              }
            ]
          }
        })
        if (raidexists) {
          console.log(`New ex raid exists… Ignoring id: ${ctx.session.newexraid.gymId} target: ${ctx.session.newexraid.target} endtime: ${ctx.session.newexraid.endtime}`)
          return ctx.replyWithMarkdown(ctx.i18n.t('raid_exists_warning'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session.newexraid = null
              return ctx.scene.leave()
            })
        }
        let newexraid = models.Exraid.build({
          GymId: ctx.session.newexraid.gymId,
          start1: ctx.session.newexraid.start1,
          target: ctx.session.newexraid.target,
          raidbossId: ctx.session.newexraid.bossid,
          endtime: ctx.session.newexraid.endtime,
          reporterName: user.first_name,
          reporterId: user.id
        })
        console.log('session: ', ctx.session.newexraid, 'db: ', newexraid)
        // save...
        try {
          await newexraid.save()
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
        //saved…
        ctx.session.participateOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
          return bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
            .then(() => {
              ctx.replyWithMarkdown(ctx.i18n.t('do_you_participate'), Markup.keyboard(ctx.session.participateOptions).resize().oneTime().extra())
            })
            .then(() => ctx.wizard.next())
      } else {
        // user declined save
        return ctx.replyWithMarkdown(`${ctx.i18n.t('join_raid_cancel')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = null
            return ctx.scene.leave()
          })
      }
    },

    async (ctx) => {
      let participate = ctx.session.participateOptions.indexOf(ctx.update.message.text)
      if (participate === 1) {
        // user does NOT participate, exit
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      // user does participate
      // ToDo: Ask for invite
      // User does not have an invite?
      // register
      // User has an invite?
      // ask for number of accounts
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
        gymname: ctx.session.newraid.gymname
      }), Markup.keyboard([['1'], ['2', '3', '4', '5']])
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
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
          await models.Exraiduser.update(
            { accounts: accounts },
            { where: { [Op.and]: [{ uid: user.id }, { exraidId: ctx.session.savedraid.id }] } }
          )
        } catch (error) {
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        // new raid user
        let exraiduser = models.Exraiduser.build({
          raidId: ctx.session.savedraid.id,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await exraiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => {
              session = null
              return ctx.scene.leave()
            })
        }
        return ctx.replyWithMarkdown(ctx.i18n.t('raid_add_finish', {
          gymname: ctx.session.newexraid.gymname,
          starttm: moment.unix(ctx.session.newexraid.start1).format('HH:mm')
        }), Markup.removeKeyboard().extra())
      }
    }
  )
}

module.exports = ExraidWizard
