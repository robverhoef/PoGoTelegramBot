// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const adminCheck = require('../util/adminCheck')
const setLocale = require('../util/setLocale')

function AddGymWizard (bot) {
  return new WizardScene('add-gym-wizard',
    // Step 0
    // Gym name
    async (ctx) => {
      await setLocale(ctx)
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }

      ctx.session.newgym = {}
      return ctx.replyWithMarkdown(`${ctx.i18n.t('add_gym_welcome')}`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    // Step 1
    // Adres of x
    async (ctx) => {
      let gymname = ctx.update.message.text.trim()
      let user = ctx.update.message.from
      // check if exists
      let oldgyms = await models.Gym.findAll({
        where: {
          gymname: gymname
        }
      })
      if (oldgyms.length > 0) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('gym_exists_warning')}`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      ctx.session.newgym.reporterName = user.first_name
      ctx.session.newgym.reporterId = user.id
      ctx.session.newgym.gymname = gymname
      ctx.replyWithMarkdown(`${ctx.i18n.t('address_question')}`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    // Step 2
    // Google maps of x
    async (ctx) => {
      let gymadres = ctx.update.message.text.trim()
      ctx.session.newgym.address = gymadres.toLowerCase() === 'x' ? null : gymadres
      ctx.replyWithMarkdown(`${ctx.i18n.t('gmlink_question')}`)
        .then(() => ctx.wizard.next())
    },
    // Step 3
    // Exraid question
    async (ctx) => {
      let gmlink = ctx.update.message.text.trim()
      gmlink = gmlink.toLowerCase() === 'x' ? null : gmlink
      ctx.session.newgym.googleMapsLink = gmlink
      if (gmlink !== null && gmlink.substr(0, 4) !== 'http') {
        ctx.replyWithMarkdown(`${ctx.i18n.t('invalid_link')}`)
          .then(() => {

          })
      }
      ctx.session.exraidbtns = [ctx.i18n.t('yes'), ctx.i18n.t('no_dont_know')]
      ctx.replyWithMarkdown(`${ctx.i18n.t('exraid_question')}`, Markup.keyboard(ctx.session.exraidbtns)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // Step 4
    // toon samenvatting & bevestiging
    async (ctx) => {
      let exraid = ctx.session.exraidbtns.indexOf(ctx.update.message.text) === 0
      ctx.session.newgym.exRaidTrigger = exraid
      ctx.session.savebtns = [
        ctx.i18n.t('yes'),
        ctx.i18n.t('no')
      ]
      return ctx.replyWithMarkdown(`${ctx.i18n.t('new_gym_almost_done_confirm')}: *${ctx.session.newgym.gymname}*\n${ctx.i18n.t('address')}: ${ctx.session.newgym.address === null ? ctx.i18n.t('no_input') : ctx.session.newgym.address}\n${ctx.i18n.t('map')}: ${ctx.session.newgym.googleMapsLink === null ? ctx.i18n.t('no_input') : ctx.session.newgym.googleMapsLink}\n${ctx.i18n.t('exraid_candidate')}: ${ctx.session.newgym.exRaidTrigger === 1 ? ctx.i18n.t('yes') : ctx.i18n.t('no_dont_know')}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard(ctx.session.savebtns).resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // Step 5
    async (ctx) => {
      // save …or maybe not
      let savenow = ctx.session.savebtns.indexOf(ctx.update.message.text) === 0
      if (savenow) {
        let gym = models.Gym.build(ctx.session.newgym)
        try {
          await gym.save()
        } catch (error) {
          console.log('Whoops… saving new gym failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      } else {
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
    })
}
module.exports = AddGymWizard
