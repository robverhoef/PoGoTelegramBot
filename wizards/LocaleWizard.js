// ===================
// Edit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const setLocale = require('../util/setLocale')

function LocaleWizard (bot) {
  return new WizardScene('locale-wizard',
    async (ctx) => {
      if (ctx.update.message.chat.id === parseInt(process.env.GROUP_ID)) {
        return ctx.replyWithMarkdown(`Not here… set your language in the bot screen`)
          .then(() => ctx.scene.leave())
      }
      await setLocale(ctx)
      let rawlocales = process.env.LOCALES
      const locs = JSON.parse(rawlocales)
      let locales = []
      ctx.session.localebtns = []
      for (const loc of locs) {
        locales.push({ code: loc[0].trim(), name: loc[1].trim() })
        ctx.session.localebtns.push(ctx.i18n.t(loc[1]))
      }
      return ctx.replyWithMarkdown(`*Select a language…*`, Markup.keyboard(ctx.session.localebtns).resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      const lang = ctx.update.message.text
      let rawlocales = process.env.LOCALES
      let newloc = process.env.LOCALE
      const rawlocs = JSON.parse(rawlocales)
      for (const loc of rawlocs) {
        if (loc[1] === lang) {
          newloc = loc[0]
          break
        }
      }
      const user = ctx.from
      // Note; it is exceptional, but users might be registered more than once; update all
      let fusers = await models.User.findAll({
        where: {
          tId: user.id
        }
      })

      for (let fuser of fusers) {
        await fuser.update({
          locale: newloc
        })
      }
      ctx.i18n.locale(newloc)
      return ctx.replyWithMarkdown(`${ctx.i18n.t('lang_set')}`)
        .then(() => ctx.scene.leave())
    })
}
module.exports = LocaleWizard
