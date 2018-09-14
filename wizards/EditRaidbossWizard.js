// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function EditRaidbossWizard (bot) {
  return new WizardScene('edit-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      ctx.session.editboss = {}
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      return ctx.replyWithMarkdown(`Je wilt een raidboss wijzigen.\n*Voer een deel van de naam in…*`)
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .finally(() => ctx.wizard.next())
    },

    // Step 1: Raidboss lookup by name
    async (ctx) => {
      let term = ctx.update.message.text.trim()
      let bosses = await models.Raidboss.findAll({
        where: {
          name: {[Op.like]: '%' + term + '%'}
        }
      })
      if (bosses.length === 0) {
        return ctx.replyWithMarkdown(`Ik kon geen boss vinden met '${term === '/start help_fromgroup' ? '' : term}' in de naam…\n\n*Gebruik */start* als je nog een actie wilt uitvoeren. Of ga terug naar de groep.*`)
          .then(() => ctx.scene.leave())
      }
      let btns = []
      ctx.session.bosscandidates = []
      for (let i = 0; i < bosses.length; i++) {
        ctx.session.bosscandidates.push({
          id: bosses[i].id,
          name: bosses[i].name,
          level: bosses[i].level,
          accounts: bosses[i].accounts
        })
        btns.push(Markup.callbackButton(bosses[i].name, i))
      }
      ctx.session.bosscandidates.push({name: 'none', id: 0})
      btns.push(Markup.callbackButton('Mijn raidboss staat er niet bij…', bosses.length))
      return ctx.replyWithMarkdown('Kies een raidboss.', Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .finally(() => ctx.wizard.next())
    },

    // Step 2: handle boss selection , ask what to change
    async (ctx) => {
      if (ctx.session.more !== true) {
        let bossindex = ctx.update.callback_query.data
        if (ctx.session.bosscandidates[bossindex].id === 0) {
          return ctx.replyWithMarkdown('OK\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
            .then(() => ctx.scene.leave())
        }
        ctx.session.editboss = ctx.session.bosscandidates[bossindex]
      }
      let btns = [
        Markup.callbackButton(`Naam: ${ctx.session.editboss.name}`, 'name'),
        Markup.callbackButton(`Level: ${ctx.session.editboss.level}`, 'level'),
        Markup.callbackButton(`Aantal accounts: ${ctx.session.editboss.accounts}`, 'accounts'),
        Markup.callbackButton(`Ik wil toch niets wijzigen en niets bewaren…`, 0)
      ]
      return ctx.replyWithMarkdown(`Wat wil je wijzigen?`, Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .finally(() => ctx.wizard.next())
    },

    // Step 3: ask for value
    async (ctx) => {
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      let attr = ctx.update.callback_query.data
      let question = ''
      ctx.session.key = attr
      if (ctx.update.callback_query) {
        ctx.deleteMessage(ctx.update.callback_query.message.message_id)
      }
      switch (attr) {
        case 'name':
          question = `*Wat wordt de nieuwe naam?*`
          break
        case 'level':
          question = `*Wat wordt het nieuwe level?*`
          break
        case 'accounts':
          question = `*Hoeveel accounts beveel je aan?*`
          break
        case '0':
          return ctx.replyWithMarkdown('OK\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
            .then(() => ctx.scene.leave())
        default:
          return ctx.replyWithMarkdown(`Ik heb geen idee wat je wilt doen…\n\n`)
            .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(question)
        .finally(() => ctx.wizard.next())
    },
    // Step 4 handle value, ask whats next?
    async (ctx) => {
      let value = ctx.update.message.text.trim()
      ctx.session.editboss[ctx.session.key] = value
      let out = `Naam: ${ctx.session.editboss.name}\nLevel: ${ctx.session.editboss.level}\nAanbevolen aantal: ${ctx.session.editboss.accounts}`
      return ctx.replyWithMarkdown(`Dit zijn nu de raidboss gegevens:\n\n${out}\n\n*Wat wil je nu doen?*`, Markup.inlineKeyboard([
        Markup.callbackButton('Opslaan en afsluiten', 0),
        Markup.callbackButton('Nog iets wijzigen aan deze raidboss', 1),
        Markup.callbackButton('Annuleren', 2)
      ], {columns: 1})
        .removeKeyboard()
        .extra()
      )
        .finally(() => ctx.wizard.next())
    },
    // Step 4 handle value, ask whats next?
    async (ctx) => {
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      let action = parseInt(ctx.update.callback_query.data)
      switch (action) {
        case 0:
          // Save
          try {
            await models.Raidboss.update(
              {
                name: ctx.session.editboss.name,
                level: ctx.session.editboss.level,
                accounts: ctx.session.editboss.accounts
              },
              {
                where: {
                  id: ctx.session.editboss.id
                }
              }
            )

            if (ctx.update.callback_query) {
              ctx.deleteMessage(ctx.update.callback_query.message.message_id)
            }
            return ctx.answerCbQuery('', undefined, true)
              .then(() => {
                ctx.session = null
                return ctx.replyWithMarkdown('Dankjewel.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start')
              })
          } catch (error) {
            console.error('Error saving raidboss edit', error)
            return ctx.replyWithMarkdown('Het bewaren van deze wijziging is mislukt')
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
        case 1:
          // Edit more
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.more = true
              return ctx.replyWithMarkdown(`OK, meer wijzigingen…`)
                .then(() => ctx.wizard.selectStep(2))
                .then(() => ctx.wizard.steps[2](ctx))
            })
        case 2:
          // Cancel
          return ctx.replyWithMarkdown('OK\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
            .then(() => ctx.scene.leave())
        default:
          console.log('EditRaidbossWizard: action not found', action)
          return ctx.replyWithMarkdown('??\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
            .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = EditRaidbossWizard
