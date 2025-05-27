// ===================
// Edit raid wizard
// ===================
// import WizardScene from 'telegraf/scenes/wizard'
import { Scenes } from 'telegraf'
import { Markup } from 'telegraf'
import models from '../models/index.js'
import setLocale from '../util/setLocale.js'

function LocaleWizard() {
  return new Scenes.WizardScene(
    'locale-wizard',
    async (ctx) => {
      if (ctx.update.message.chat.id === parseInt(process.env.GROUP_ID)) {
        return ctx
          .replyWithHTML('Not here… set your language in the bot screen')
          .then(() => ctx.scene.leave())
      }
      await setLocale(ctx)
      const rawlocales = process.env.LOCALES
      const locs = JSON.parse(rawlocales)
      const locales = []
      ctx.session.localebtns = []
      for (const loc of locs) {
        locales.push({ code: loc[0].trim(), name: loc[1].trim() })
        ctx.session.localebtns.push(ctx.i18n.t(loc[1]))
      }
      return ctx
        .replyWithHTML(
          '<b>Select a language…</b>',
          Markup.keyboard(ctx.session.localebtns).resize().oneTime()
        )
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      const lang = ctx.update.message.text
      const rawlocales = process.env.LOCALES
      let newloc = process.env.LOCALE
      const rawlocs = JSON.parse(rawlocales)
      for (const loc of rawlocs) {
        if (loc[1] === lang) {
          newloc = loc[0]
          break
        }
      }
      const user = ctx.update.message.from
      // Note; it is exceptional, but users might be registered more than once; update all
      try {
        await models.User.update(
          {
            locale: newloc
          },
          {
            where: {
              tId: user.id
            }
          }
        )
      } catch (error) {
        console.log('ERROR while updating locale', error.message)
      }
      ctx.i18n.locale(newloc)
      return ctx
        .replyWithHTML(`${ctx.i18n.t('lang_set')}`)
        .then(() => ctx.scene.leave())
    }
  )
}
export default LocaleWizard
