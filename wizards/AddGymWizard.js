// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')

function AddGymWizard (bot) {
  return new WizardScene('add-gym-wizard',
    // Gym naam
    async (ctx) => {
      ctx.session.newgym = {}
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('add_gym_welcome')))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    // Adres of x
    async (ctx) => {
      console.info('gymname: ', ctx.update.message.from)
      let gymname = ctx.update.message.text.trim()
      let user = ctx.update.message.from
      // check if exists
      let oldgyms = await models.Gym.findAll({
        where: {
          gymname: gymname
        }
      })
      if (oldgyms.length > 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('gym_exists_warning'))
          .then(() => ctx.scene.leave())
      }
      ctx.session.newgym.reporterName = user.first_name
      ctx.session.newgym.reporterId = user.id
      ctx.session.newgym.gymname = gymname
      console.info('session: ', ctx.session)
      ctx.replyWithMarkdown(ctx.i18n.t('address_question'))
        .then(() => ctx.wizard.next())
    },
    // Google maps of x
    async (ctx) => {
      let gymadres = ctx.update.message.text.trim()
      ctx.session.newgym.address = gymadres.toLowerCase() === 'x' ? null : gymadres
      ctx.replyWithMarkdown(('gmlink_question'))
        .then(() => ctx.wizard.next())
    },
    // Exraid vraag ja/nee, weet niet
    async (ctx) => {
      let gmlink = ctx.update.message.text.trim()
      gmlink = gmlink.toLowerCase() === 'x' ? null : gmlink
      ctx.session.newgym.googleMapsLink = gmlink
      if (gmlink !== null && gmlink.substr(0, 4) !== 'http') {
        ctx.replyWithMarkdown(ctx.i18n.t('invalid_link'))
          .then(() => ctx.wizard.back())
      }
      ctx.replyWithMarkdown(ctx.i18n.t('exraid_question'), Markup.inlineKeyboard([
        Markup.callbackButton(ctx.i18n.t('yes'), 'yes'),
        Markup.callbackButton(ctx.i18n.t('no_dont_know'), 'no')
      ], {columns: 1}).extra())
        .then(() => ctx.wizard.next())
    },
    // toon samenvatting & bevestiging
    async (ctx) => {
      if (!ctx.update.callback_query) {
        ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      let exraid = ctx.update.callback_query.data === 'yes' ? 1 : 0
      ctx.session.newgym.exRaidTrigger = exraid
      return ctx.answerCbQuery('', undefined, true)
        .then(() => ctx.replyWithMarkdown(`${ctx.i18n.t('new_gym_almost_done_confirm')}: *${ctx.session.newgym.gymname}*\n${ctx.i18n.t('address')}: ${ctx.session.newgym.address === null ? ctx.i18n.t('no_input') : ctx.session.newgym.address}\n${ctx.i18n.t('map')}: ${ctx.session.newgym.googleMapsLink === null ? ctx.i18n.t('no_input') : ctx.session.newgym.googleMapsLink}\n${ctx.i18n.t('exraid_candidate')}: ${ctx.session.newgym.exRaidTrigger === 1 ? ctx.i18n.t('yes') : ctx.i18n.t('no_dont_know')}\n\n*${ctx.i18n.t('save_question')}*`, Markup.inlineKeyboard([
          Markup.callbackButton(ctx.i18n.t('yes'), 'yes'),
          Markup.callbackButton(ctx.i18n.t('no'), 'no')
        ], {columns: 1}).extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // save …or maybe not
      if (!ctx.update.callback_query) {
        ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      let savenow = ctx.update.callback_query.data === 'yes'
      if (savenow) {
        let gym = models.Gym.build(ctx.session.newgym)
        try {
          await gym.save()
        } catch (error) {
          console.log('Whoops… saving new gym failed', error)
          return ctx.answerCbQuery('', undefined, true)
            .then(() => ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving')))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.scene.leave())
        }
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      } else {
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
    })
}
module.exports = AddGymWizard
