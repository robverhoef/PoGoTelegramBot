// ===================
// add raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const inputTime = require('../util/inputTime')
const listRaids = require('../util/listRaids')

moment.tz.setDefault('Europe/Amsterdam')

function AddRaidWizard (bot) {
  return new WizardScene('add-raid-wizard',
    // step 0
    async (ctx) => {
      ctx.session.newraid = {}
      ctx.session.gymcandidates = []
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('add_raid_welcome')))
        // .then(()=> {
      // .then(() => ctx.deleteMessage(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id))
      // ctx.session.prevMessage = {chatId: ,messageId:}
        // })
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      if (ctx.update.message.text === undefined) {
        return
      }
      const term = ctx.update.message.text.trim()
      let btns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
        // .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', {term: term}))
          // .then(() => ctx.wizard.back())
          return
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push({gymname: candidates[i].gymname, id: candidates[i].id})
          btns.push(Markup.callbackButton(candidates[i].gymname, i))
        }

        btns.push(Markup.callbackButton(ctx.i18n.t('btn_gym_not_found'), candidates.length))
        ctx.session.gymcandidates.push({name: 'none', id: 0})
        return ctx.replyWithMarkdown('Kies een gym.', Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 2
    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      let selectedIndex = parseInt(ctx.update.callback_query.data)
      // User can't find the gym
      if (ctx.session.gymcandidates[selectedIndex].id === 0) {
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.replyWithMarkdown(ctx.i18n.t('retry_or_cancel'))
            ctx.wizard.selectStep(1)
            return ctx.wizard.steps[1](ctx)
          })
      } else {
        // retrieve selected candidate from session
        let selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newraid.gymId = selectedgym.id
        ctx.session.newraid.gymname = selectedgym.gymname

        let btns = [
          Markup.callbackButton(ctx.i18n.t('btn_start_mode_time'), 'startmodetime'),
          Markup.callbackButton(ctx.i18n.t('btn_start_mode_min'), 'startmodemin'),
          Markup.callbackButton(ctx.i18n.t('btn_end_mode_time'), 'endmodetime'),
          Markup.callbackButton(ctx.i18n.t('btn_end_mode_min'), 'endmodemin')
        ]
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('enter_end_time_mode_question'),
            Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra()
          ))
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: get the time; either start or end of the raid itself, or in minutes
    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      let timemode = ctx.update.callback_query.data
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
      return ctx.answerCbQuery('', undefined, true)
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.replyWithMarkdown(question))
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
        let minutes = parseInt(message)

        if (!minutes || minutes < 0 || minutes > 60) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_minutes_retry'))
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

      ctx.replyWithMarkdown(ctx.i18n.t('starttime_proposal', {starttm: starttime.format('HH:mm'), endtm: moment.unix(endtime).format('HH:mm')}))
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      let endtime = ctx.session.newraid.endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(45, 'minutes')

      let message = ctx.update.message.text.trim()
      let start1
      if (message === 'x' || message === 'X') {
        // default starttime of 15 before endtime or right now, when time is short:
        let start1time = moment.unix(endtime)
        start1time.subtract(15, 'minutes')
        if (start1time < moment()) {
          start1time = moment()
        }
        start1 = start1time.unix()
      } else {
        start1 = inputTime(message)
        if (start1 === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_range', {range_start: starttime.format('HH:mm'), range_end: moment.unix(endtime).format('HH:mm')}))
        }
        if (starttime.diff(moment.unix(start1)) > 0 || moment.unix(endtime).diff(moment.unix(start1)) < 0) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_range', {range_start: starttime.format('HH:mm'), range_end: moment.unix(endtime).format('HH:mm')}))
        }
      }

      ctx.session.newraid.start1 = start1
      ctx.replyWithMarkdown(ctx.i18n.t('raidboss_question'))
        .then(() => ctx.wizard.next())
    },
    // step 5
    async (ctx) => {
      const target = ctx.update.message.text.trim()
      // let's see if we can find the raidboss…
      let boss = await models.Raidboss.find({
        where: {
          name: target
        }
      })
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

      let out = `${ctx.i18n.t('until')}} ${moment.unix(endtime).format('HH:mm')}: *${ctx.session.newraid.target}*\n${ctx.session.newraid.bossid !== null ? (ctx.i18n.t('recommended') + ': ' + ctx.session.newraid.accounts + ' accounts\n') : ''}${ctx.session.newraid.gymname}\n${ctx.i18n.t('start')}: ${moment.unix(start1).format('HH:mm')}`

      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.inlineKeyboard([
        Markup.callbackButton(ctx.i18n.t('yes'), 'yes'),
        Markup.callbackButton(ctx.i18n.t('no'), 'no')
      ], {columns: 1}).removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    // step 6
    async (ctx) => {
      if (!ctx.update.callback_query) {
        ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      const user = ctx.from
      let saveme = ctx.update.callback_query.data
      if (saveme === 'no') {
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving')))
          .then(() => ctx.scene.leave())
      } else {
        // Sometimes a new raid is getting submitted multiple times
        // ToDo: adapt this when multiple starttimes are getting implemented
        var raidexists = await models.Raid.find({
          where: {
            [Op.and]: [
              {gymId: ctx.session.newraid.gymId},
              {target: ctx.session.newraid.target},
              {start1: ctx.session.newraid.start1},
              {endtime: ctx.session.newraid.endtime}
            ]
          }
        })
        if (raidexists) {
          console.log(`New raid exists… Ignoring id: ${ctx.session.newraid.gymId} target: ${ctx.session.newraid.target} endtime: ${ctx.session.newraid.endtime}`)
          ctx.answerCbQuery(null, undefined, true)
          if (ctx.update.callback_query.message.message_id) {
            ctx.deleteMessage(ctx.update.callback_query.message.message_id)
          }
          return ctx.replyWithMarkdown(ctx.i18n.t('raid_exists_warning'))
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
              console.log('saved', saved)
              ctx.session.savedraid = saved
            })
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'))
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        // send updated list to group
        let out = await listRaids(ctx.i18n.t('raid_added_list', {
          gymname: ctx.session.newraid.gymname,
          user: user
        }))
        if (out === null) {
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found')))
            .then(() => ctx.scene.leave())
        }

        return ctx.answerCbQuery('', undefined, true)
          .then(async () => {
            bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
          })
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.replyWithMarkdown(ctx.i18n.t('do_you_participate'), Markup.inlineKeyboard([
              Markup.callbackButton(ctx.i18n.t('yes'), 'yes'),
              Markup.callbackButton(ctx.i18n.t('no'), 'no')
            ]).removeKeyboard().extra())
          })
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
          .then(() => {
            ctx.session = null
            return ctx.scene.leave()
          })
      }
      // user does NOT participate, exit
      if (ctx.update.callback_query.data === 'no') {
        ctx.answerCbQuery(null, undefined, true)
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'))
          .then(() => ctx.scene.leave())
      }
      // user does participate
      let btns = []
      for (var a = 1; a < 6; a++) {
        btns.push(Markup.callbackButton(a, a))
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t(ctx.i18n.t('number_of_accounts_question', {
          gymname: ctx.session.newraid.gymname
        }), Markup.inlineKeyboard(btns).removeKeyboard().extra())))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
          .then(() => ctx.scene.leave())
      }
      const accounts = parseInt(ctx.update.callback_query.data)

      const user = ctx.from
      // Check already registered? If so; update else store new
      let raiduser = await models.Raiduser.find({
        where: {
          [Op.and]: [{uid: user.id}, {raidId: ctx.session.savedraid.id}]
        }
      })
      if (raiduser) {
        // update
        try {
          await models.Raiduser.update(
            { accounts: accounts },
            { where: { [Op.and]: [{uid: user.id}, {raidId: ctx.session.savedraid.id}] } }
          )
        } catch (error) {
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
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
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'))
            .then(() => ctx.scene.leave())
        }
      }
      let out = await listRaids(ctx.i18n.t('raid_user_added_list', {
        user: user,
        gymname: ctx.session.newraid.gymname
      }))
      if (out === null) {
        ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('raid_add_finish', {
          gymname: ctx.session.newraid.gymname,
          starttm: moment.unix(ctx.session.newraid.start1).format('HH:mm')
        })))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(async () => {
          bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
        })
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = AddRaidWizard
