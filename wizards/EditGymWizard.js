// ===================
// Edit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function EditGymWizard (bot) {
  return new WizardScene('edit-gym-wizard',
    // step 0
    async (ctx) => {
      return ctx.replyWithMarkdown(ctx.i18n.t(ctx.i18n.t('edit_gym_intro')))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      const term = ctx.update.message.text.trim()
      let btns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
          .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', {term: term}))
          return
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push({
            id: candidates[i].id,
            gymname: candidates[i].gymname,
            googleMapsLink: candidates[i].googleMapsLink,
            address: candidates[i].address,
            exRaidTrigger: candidates[i].exRaidTrigger
          })
          btns.push(Markup.callbackButton(candidates[i].gymname, i))
        }
        btns.push(Markup.callbackButton(ctx.i18n.t('btn_gym_not_found'), candidates.length))
        ctx.session.gymcandidates.push({gymname: 'none', id: 0})
        return ctx.replyWithMarkdown(ctx.i18n.t('select_a_gym'), Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 2
    async (ctx) => {
      if (!ctx.update.callback_query && ctx.session.more !== true) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      if (ctx.session.more !== true) {
        let selectedIndex = parseInt(ctx.update.callback_query.data)

        if (ctx.session.gymcandidates[selectedIndex].id === 0) {
          return ctx.answerCbQuery('', undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.replyWithMarkdown(ctx.i18n.t('retry_or_cancel'))
              ctx.session.gymcandidates = null
              ctx.session.editgym = null
              ctx.session.more = null
              ctx.wizard.selectStep(1)
              return ctx.wizard.steps[1](ctx)
            })
        } else {
          // retrieve selected candidate from session
          let selectedgym = ctx.session.gymcandidates[selectedIndex]
          ctx.session.editgym = selectedgym
        }
      }
      let btns = [
        Markup.callbackButton(`${ctx.i18n.t('btn_edit_gym_name')}: ${ctx.session.editgym.gymname}`, 'gymname'),
        Markup.callbackButton(`${ctx.i18n.t('btn_edit_gym_gmlink')}: ${ctx.session.editgym.googleMapsLink !== null ? ctx.session.editgym.googleMapsLink : 'Niets opgegegven'}`, 'googleMapsLink'),
        Markup.callbackButton(`${ctx.i18n.t('btn_edit_gym_address')}: ${ctx.session.editgym.address !== null ? ctx.session.editgym.address : ctx.i18n.t('no_input')}`, 'address'),
        Markup.callbackButton(`${ctx.i18n.t('btn_edit_gym_exraid')}: ${ctx.session.editgym.exRaidTrigger === 1 || ctx.session.editgym.exRaidTrigger === true ? ctx.i18n.t('yes') : ctx.i18n.t('no_dont_know')}`, 'exRaidTrigger'),
        Markup.callbackButton(ctx.i18n.t('btn_edit_gym_cancel'), 0)
      ]
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`*${ctx.i18n.t('edit_what')}*`, Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      const editattr = ctx.update.callback_query.data
      if (editattr === '0') {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.session.gymcandidates = null
            ctx.session.editgym = null
            ctx.session.more = null
            return ctx.scene.leave()
          })
      } else {
        let question = ''
        switch (editattr) {
          case 'gymname':
            ctx.session.editattr = 'gymname'
            question = ctx.i18n.t('edit_gym_question_name')
            break
          case 'address':
            ctx.session.editattr = 'address'
            question = ctx.i18n.t('edit_gym_question_address')
            break
          case 'googleMapsLink':
            ctx.session.editattr = 'googleMapsLink'
            question = ctx.i18n.t('edit_gym_question_gmlink')
            break
          case 'exRaidTrigger':
            ctx.session.editattr = 'exRaidTrigger'
            question = ctx.i18n.t('edit_gym_question_exraid')
            break
          default:
            question = ctx.i18n.t('edit_gym_question_not_found')
            break
        }
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(question))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      let key = ctx.session.editattr
      let value = ctx.update.message.text.trim()
      if (key === 'exRaidTrigger') {
        ctx.session.editgym.exRaidTrigger = value.toLowerCase() === ctx.i18n.t('yes') ? 1 : 0
      } else if (value.toLowerCase() === 'x') {
        ctx.session.editgym[key] = null
      } else {
        ctx.session.editgym[key] = value
      }
      let out = `${ctx.i18n.t('btn_edit_gym_name')}: ${ctx.session.editgym.gymname}\n${ctx.i18n.t('btn_edit_gym_address')}: ${ctx.session.editgym.address !== null ? ctx.session.editgym.address : ctx.i18n.t('no_input')}\n${ctx.i18n.t('btn_edit_gym_gmlink')}: ${ctx.session.editgym.googleMapsLink !== null ? ctx.session.editgym.googleMapsLink : ctx.i18n.t('no_input')}\n${ctx.i18n.t('btn_edit_gym_exraid')}: ${ctx.session.editgym.exRaidTrigger === 1 ? ctx.i18n.t('yes') : ctx.i18n.t('no')}\n\n`
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_gym_overview', {
        out: out
      }), Markup.inlineKeyboard([
        Markup.callbackButton(ctx.i18n.t('edit_gym_btn_save_close'), 0),
        Markup.callbackButton(ctx.i18n.t('edit_gym_btn_edit_more'), 1),
        Markup.callbackButton('edit_gym_btn_cancel', 2)
      ], {columns: 1}).removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      const choice = parseInt(ctx.update.callback_query.data)
      switch (choice) {
        case 0:
          // save and exit
          // const user = ctx.update.callback_query.from
          try {
            await models.Gym.update(
              {
                gymname: ctx.session.editgym.gymname,
                address: ctx.session.editgym.address,
                googleMapsLink: ctx.session.editgym.googleMapsLink,
                exRaidTrigger: ctx.session.editgym.exRaidTrigger
              },
              {
                where: {
                  id: ctx.session.editgym.id
                }
              })
            return ctx.answerCbQuery('', undefined, true)
              .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure')))
              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.error(error)
            return ctx.answerCbQuery('', undefined, true)
              .then(() => ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving')))
              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor to step 1 and trigger jump to step 1
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => {
              ctx.session.more = true
              return ctx.replyWithMarkdown(ctx.i18n.t('edit_more'))
                .then(() => ctx.wizard.selectStep(2))
                .then(() => ctx.wizard.steps[2](ctx))
            })
        case 2:
          // Don't save and leave
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving')))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.editgym = null
              return ctx.scene.leave()
            })
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.reply(ctx.i18n.t('ok')))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = EditGymWizard
