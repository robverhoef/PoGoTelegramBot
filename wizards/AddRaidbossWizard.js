// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')

function AddRaidbossWizard (bot) {
  return new WizardScene('add-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      ctx.session.newboss = {}
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      return ctx.replyWithMarkdown(`Je wilt een nieuwe raidboss toevoegen.\n*Voer de naam in…*`)
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .finally(() => ctx.wizard.next())
    },

    // Step 1: Handle raidboss name and ask for level
    async (ctx) => {
      let bossname = ctx.update.message.text.trim()
      ctx.session.newboss.name = bossname
      // lookup raidboss, prevent double bosses
      let oldboss = await models.Raidboss.find({
        where: {
          name: bossname
        }
      })
      if (oldboss !== null) {
        return ctx.replyWithMarkdown('Deze raidboss bestaat al!\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
          .then(() => ctx.scene.leave())
      }
      let btns = []
      for (let i = 0; i < 5; i++) {
        btns.push(Markup.callbackButton(i + 1, i + 1))
      }
      return ctx.replyWithMarkdown(`Welk level heeft ${bossname}?`, Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .finally(() => {
          return ctx.wizard.next()
        })
    },

    // Handle level, ask for recommended number of accounts
    (ctx) => {
      ctx.session.newboss.level = ctx.update.callback_query.data
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
        ctx.deleteMessage(ctx.update.callback_query.message.message_id)
      }
      return ctx.replyWithMarkdown(`Wat is het aanbevolen aantal accounts voor ${ctx.session.newboss.name}?`)
        .finally(() => ctx.wizard.next())
    },

    // Handle recommended number of accounts
    async (ctx) => {
      ctx.session.newboss.accounts = ctx.update.message.text.trim()
      let btns = [
        Markup.callbackButton('Ja', 'yes'),
        Markup.callbackButton('Nee', 'no')
      ]
      ctx.replyWithMarkdown(`Raidboss: ${ctx.session.newboss.name}\nLevel: ${ctx.session.newboss.level}\nAanbevolen aantal accounts: ${ctx.session.newboss.accounts}\n\n*Opslaan?*`, Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .finally(() => {
          return ctx.wizard.next()
        })
    },

    // Handle save
    async (ctx) => {
      if (ctx.update.callback_query.data === 'yes') {
        let newboss = models.Raidboss.build({
          name: ctx.session.newboss.name,
          level: ctx.session.newboss.level,
          accounts: ctx.session.newboss.accounts
        })
        try {
          await newboss.save()
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het saven… Misschien toch maar eens opnieuw proberen.`)
            .then(() => ctx.scene.leave())
        }
      } else {
        if (ctx.update.callback_query) {
          ctx.answerCbQuery(null, undefined, true)
          ctx.deleteMessage(ctx.update.callback_query.message.message_id)
        }
        return ctx.replyWithMarkdown(`OK, de nieuwe raidboss wordt niet bewaard.\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`)
          .then(() => ctx.scene.leave())
      }
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
        ctx.deleteMessage(ctx.update.callback_query.message.message_id)
      }

      return ctx.replyWithMarkdown('Dankjewel!\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start')
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = AddRaidbossWizard
