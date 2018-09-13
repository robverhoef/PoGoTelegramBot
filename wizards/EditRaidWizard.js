// ===================
// Edit raid wizard
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

function EditRaidWizard (bot) {
  return new WizardScene('edit-raid-wizard',

    // step 0: choose raid
    async (ctx) => {
      // reset some values for gym editting
      ctx.session.newgymid = null
      ctx.session.editattr = null

      let raids = await models.Raid.findAll({
        include: [models.Gym, models.Raiduser],
        where: {
          endtime: {
            [Op.gt]: moment().unix()
          }
        }
      })
      if (raids.length === 0) {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('edit_raid_no_raids_found')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      let btns = []
      let candidates = []
      for (var a = 0; a < raids.length; a++) {
        candidates[a] = {
          gymname: raids[a].Gym.gymname,
          id: raids[a].id,
          start1: raids[a].start1,
          endtime: raids[a].endtime,
          target: raids[a].target
        }
        btns.push(Markup.callbackButton(`${raids[a].Gym.gymname}, ${ctx.i18n.t('edit_raid_until')}: ${moment.unix(raids[a].endtime).format('HH:mm')}, ${ctx.i18n.t('edit_raid_start')}: ${moment.unix(raids[a].start1).format('HH:mm')}; ${raids[a].target}`, a))
      }
      btns.push(Markup.callbackButton(ctx.i18n.t('edit_raid_not_found'), candidates.length))
      candidates.push({
        gymname: 'none',
        id: 0
      })
      // save all candidates to session…
      ctx.session.raidcandidates = candidates
      return ctx.replyWithMarkdown(`${ctx.i18n.t('edit_raid_which_raid')}`,
        Markup.inlineKeyboard(btns, {
          columns: 1
        })
          .removeKeyboard().extra())
        .then(() => {
          if (ctx.update.callback_query.message) {
            ctx.deleteMessage(ctx.update.callback_query.message.message_id)
          }
        })
        .then(() => ctx.wizard.next())
    },

    // step 1: raid chosen, edit what?
    async (ctx) => {
      if (!ctx.update.callback_query && ctx.session.more !== true) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }

      // retrieve selected candidate from session…
      if (ctx.session.more !== true) {
        let selectedraid = ctx.session.raidcandidates[ctx.update.callback_query.data]
        if (selectedraid.id === 0) {
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.replyWithMarkdown(ctx.i18n.t('cancelmessage')))
            .then(() => {
              if (ctx.update.callback_query.message) {
                ctx.deleteMessage(ctx.update.callback_query.message.message_id)
              }
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
        // save selected index to session
        let editraidindex = parseInt(ctx.update.callback_query.data)
        ctx.session.editraid = ctx.session.raidcandidates[editraidindex]
      }
      let btns = [
        Markup.callbackButton(`${ctx.i18n.t('edit_raid_gym')}: ${ctx.session.editraid.gymname}`, 'gym'),
        Markup.callbackButton(`${ctx.i18n.t('edit_raid_endtime')}: ${moment.unix(ctx.session.editraid.endtime).format('HH:mm')}`, 'endtime'),
        Markup.callbackButton(`${ctx.i18n.t('edit_raid_starttime')}: ${moment.unix(ctx.session.editraid.start1).format('HH:mm')}`, 'start1'),
        Markup.callbackButton(`${ctx.i18n.t('edit_raid_pokemon')}: ${ctx.session.editraid.target}`, 'target'),
        Markup.callbackButton(ctx.i18n.t('btn_edit_gym_cancel'), 0)
      ]
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('edit_what'), Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra()))
        .then(() => {
          if (ctx.update.callback_query && ctx.session.more !== true) {
            ctx.deleteMessage(ctx.update.callback_query.message.message_id)
          }
        })
        .then(() => ctx.wizard.next())
    },

    // step 2: chosen what to edit, enter a value
    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      const editattr = ctx.update.callback_query.data
      if (editattr === '0') {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('cancelmessage')))
          .then(() => {
            if (ctx.update.callback_query.message.message_id) {
              return ctx.deleteMessage(ctx.update.callback_query.message.message_id)
            }
          })
          .then(() => {
            ctx.session.raidcandidates = null
            ctx.session.editraid = null
            return ctx.scene.leave()
          })
      } else {
        let question = ''
        switch (editattr) {
          case 'endtime':
            ctx.session.editattr = 'endtime'
            question = ctx.i18n.t('edit_raid_question_endtime')
            break
          case 'start1':
            ctx.session.editattr = 'start1'
            let endtimestr = moment.unix(ctx.session.editraid.endtime).format('HH:mm')
            let start1str = moment.unix(ctx.session.editraid.endtime).subtract(45, 'minutes').format('HH:mm')
            question = ctx.i18n.t('', {
              start1str: start1str,
              endtimestr: endtimestr
            })
            break
          case 'target':
            ctx.session.editattr = 'target'
            question = ctx.i18n.t('edit_raid_question_pokemon')
            break
          case 'gym':
            ctx.session.editattr = 'gym'
            question = ctx.i18n.t('edit_raid_question_gym')
            return ctx.answerCbQuery(null, undefined, true)

              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.replyWithMarkdown(question))
              .then(() => {
                ctx.wizard.selectStep(6)
                return ctx.wizard.steps[6](ctx)
              })
          default:
            question = ctx.i18n.t('edit_raidboss_no_clue')
            return ctx.answerCbQuery(null, undefined, true)
              .then(() => ctx.replyWithMarkdown(question))
              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.scene.leave())
        }
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(question))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: enter new value or jump to 6 for entering a new gym
    async (ctx) => {
      let key = ctx.session.editattr
      let value = null
      // user has not just updated gym? If not expect text message
      if (key !== 'gymId') {
        value = ctx.update.message.text.trim()
      } else {
        value = ctx.session.newgymid
      }
      if (key === 'endtime' || key === 'start1') {
        let timevalue = inputTime(value)
        if (timevalue === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
        }
        if (key === 'start1') {
          let endtime = moment.unix(ctx.session.editraid.endtime)
          let start = moment.unix(ctx.session.editraid.endtime).subtract(45, 'minutes')
          let start1 = moment.unix(timevalue)
          if (start.diff(moment(start1)) > 0 || endtime.diff(start1) < 0) {
            return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
          }
        }
        value = timevalue
      }
      // Handle the raidboss:
      if (key === 'target') {
        const target = ctx.update.message.text.trim()
        // let's see if we can find the raidboss…
        let boss = await models.Raidboss.find({
          where: {
            name: target
          }
        })
        if (boss !== null) {
          ctx.session.editraid.target = boss.name
          ctx.session.editraid.bossid = boss.id
          ctx.session.editraid.accounts = boss.accounts
        } else {
          ctx.session.editraid.target = target
          ctx.session.editraid.accounts = null
          ctx.session.editraid.bossid = null
        }
      } else {
        ctx.session.editraid[key] = value
      }
      ctx.wizard.selectStep(4)
      return ctx.wizard.steps[4](ctx)
    },

    // step 4: do more or save?
    async (ctx) => {
      let out = `${ctx.i18n.t('until')} ${moment.unix(ctx.session.editraid.endtime).format('HH:mm')}: *${ctx.session.editraid.target}*\n${ctx.session.editraid.bossid !== null ? (`${ctx.i18n.t('edit_raidboss_overview_accounts')}: ${ctx.session.editraid.accounts}\n`) : ''}${ctx.session.editraid.gymname}\nStart: ${moment.unix(ctx.session.editraid.start1).format('HH:mm')}\n\n`
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_raid_overview_data', {
        out: out
      }), Markup.inlineKeyboard([
        Markup.callbackButton(ctx.i18n.t('edit_raidboss_btn_save_close'), 0),
        Markup.callbackButton(ctx.i18n.t('edit_raid_edit_more'), 1),
        Markup.callbackButton(ctx.i18n.t('cancel'), 2)
      ], {columns: 1})
        .removeKeyboard()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },

    // step 5: save & exit or jump to 2
    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      const choice = parseInt(ctx.update.callback_query.data)
      switch (choice) {
        case 0:
          // save and exit
          const user = ctx.update.callback_query.from
          try {
            await models.Raid.update(
              {
                endtime: ctx.session.editraid.endtime,
                start1: ctx.session.editraid.start1,
                target: ctx.session.editraid.target,
                gymId: ctx.session.editraid.gymId,
                raidbossId: ctx.session.editraid.bossid
              },
              {
                where: {
                  id: ctx.session.editraid.id
                }
              }
            )
            let out = await listRaids('edit_raid_list_message', {
              gymname: ctx.session.editraid.gymname,
              user: user
            })
            return ctx.answerCbQuery('', undefined, true)
              .then(async () => {
                bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
              })
              .then(() => {
                if (ctx.update.callback_query) {
                  return ctx.deleteMessage(ctx.update.callback_query.message.message_id)
                }
              })
              .then(() => {
                ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'))
              })
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.error(error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving')).then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor to step 1 and trigger jump to step 1
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.more = true
              return ctx.replyWithMarkdown(ctx.i18n.t('edit_more'))
                .then(() => ctx.wizard.selectStep(1))
                .then(() => ctx.wizard.steps[1](ctx))
            })
        case 2:
          // Don't save and leave
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving')))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.editraid = null
              return ctx.scene.leave()
            })
      }
    },
    // =======

    // step 6: handle gym search
    async (ctx) => {
      // why do i need this??
      if (ctx.update.message === undefined) {
        return // ctx.replyWithMarkdown(`Minimaal 2 tekens van de gymnaam…\n*Probeer het nog eens.* 🤨`)
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
          // ToDo: check dit dan...
          return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', {
            term: term === '/start help_fromgroup' ? '' : term
          }))
          // .then(() => ctx.wizard.back())
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push(
            {
              gymname: candidates[i].gymname, id: candidates[i].id
            }
          )
          btns.push(Markup.callbackButton(candidates[i].gymname, i))
        }

        btns.push(Markup.callbackButton(ctx.i18n.t('btn_gym_not_found'), candidates.length))
        ctx.session.gymcandidates.push(
          {
            name: 'none',
            id: 0
          }
        )
        return ctx.replyWithMarkdown(ctx.i18n.t('select_a_gym'), Markup.inlineKeyboard(btns,
          {
            columns: 1
          }
        ).removeKeyboard().extra())
          .then(() => ctx.wizard.next())
      }
    },

    // step 7: handle gym selection
    async (ctx) => {
      let gymIndex = ctx.update.callback_query.data
      let selectedGym = ctx.session.gymcandidates[gymIndex]
      if (selectedGym.id === 0) {
        // mmm, let's try searching for a gym again
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('edit_raid_search_gym_again')))
          .then(() => {
            ctx.wizard.selectStep(6)
            return ctx.wizard.steps[6](ctx)
          })
      } else {
        ctx.session.newgymid = selectedGym.id
        ctx.session.editraid.gymId = selectedGym.id
        ctx.session.editraid.gymname = selectedGym.gymname
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.wizard.selectStep(4)
            return ctx.wizard.steps[4](ctx)
          })
      }
    }
  )
}
module.exports = EditRaidWizard
