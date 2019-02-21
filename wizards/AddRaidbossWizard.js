// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const metaphone = require('metaphone')
const adminCheck = require('../util/adminCheck')

function AddRaidbossWizard (bot) {
  return new WizardScene('add-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }

      ctx.session.newboss = {}
      return ctx.replyWithMarkdown(`Je wilt een nieuwe raidboss toevoegen.\n*Voer de naam in…*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },

    // Step 1: Handle raidboss name and ask for level
    async (ctx) => {
      let bossname = ctx.update.message.text.trim()
      ctx.session.newboss.name = bossname
      // lookup raidboss, prevent double bosses
      let oldboss = await models.Raidboss.findOne({
        where: {
          name: bossname
        }
      })
      if (oldboss !== null) {
        return ctx.replyWithMarkdown('Deze raidboss bestaat al!\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
          .then(() => ctx.scene.leave())
      }
      let btns = ['1', '2', '3', '4', '5']
      return ctx.replyWithMarkdown(`Welk level heeft ${bossname}?`, Markup.keyboard(btns)
        .resize()
        .oneTime()
        .extra()
      )
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle level, ask for recommended number of accounts
    (ctx) => {
      ctx.session.newboss.level = parseInt(ctx.update.message.text.trim())
      return ctx.replyWithMarkdown(`Wat is het aanbevolen aantal accounts voor ${ctx.session.newboss.name}?`)
        .then(() => ctx.wizard.next())
    },

    // Handle recommended number of accounts
    async (ctx) => {
      ctx.session.newboss.accounts = ctx.update.message.text.trim()
      ctx.session.savebtns = ['Ja', 'Nee']
      ctx.replyWithMarkdown(`Raidboss: ${ctx.session.newboss.name}\nLevel: ${ctx.session.newboss.level}\nAanbevolen aantal accounts: ${ctx.session.newboss.accounts}\n\n*Opslaan?*`, Markup.keyboard(ctx.session.savebtns)
        .oneTime()
        .resize()
        .extra()
      )
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle save
    async (ctx) => {
      let dosave = ctx.session.savebtns.indexOf(ctx.update.message.text) === 0
      if (dosave) {
        let newboss = models.Raidboss.build({
          name: ctx.session.newboss.name,
          level: ctx.session.newboss.level,
          accounts: ctx.session.newboss.accounts,
          metaphone: metaphone(ctx.session.newboss.name)
        })
        console.log('new boss', newboss)
        try {
          await newboss.save()
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het saven… Misschien toch maar eens opnieuw proberen.`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        return ctx.replyWithMarkdown(`OK, de nieuwe raidboss wordt niet bewaard.\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }

      return ctx.replyWithMarkdown('Dankjewel!\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = AddRaidbossWizard
