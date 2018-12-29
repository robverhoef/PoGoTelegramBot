// ===================
// Edit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function LocaleWizard (bot) {
  return new WizardScene('locale-wizard',
    (ctx) => {
      let rawlocales = process.env.LOCALES.split(',')
      let locales = []
      ctx.session.localebtns = []
      for (const rawlocale of rawlocales) {
        var loc = rawlocale.trim().split(' ')
        locales.push({code: loc[0], name: loc[1]})
          ctx.session.localebtns.push(ctx.i18n.t(loc[1]))
      }
      return ctx.replyWithMarkdown(`*Select a language…*`, Markup.keyboard(ctx.session.localebtns).resize().oneTime().extra())
          .then(() => ctx.wizard.next())
    },

    (ctx) => {
      return ctx.replyWithMarkdown('Right…')
      .then(() => ctx.scene.leave())
    })
}
module.exports = LocaleWizard
