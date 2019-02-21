// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const metaphone = require('metaphone')
const adminCheck = require('../util/adminCheck')

function EditRaidbossWizard (bot) {
  return new WizardScene('edit-raidboss-wizard',
    // Step 0
    // Raidboss name request
    async (ctx) => {
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }

      ctx.session.editboss = {}
      return ctx.replyWithMarkdown(`Je wilt een raidboss wijzigen.\n*Voer een deel van de naam in…*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },

    // Step 1
    // Raidboss lookup by name
    async (ctx) => {
      let term = ctx.update.message.text.trim()
      let bosses = await models.Raidboss.findAll({
        where: {
          name: { [Op.like]: '%' + term + '%' }
        }
      })
      if (bosses.length === 0) {
        return ctx.replyWithMarkdown(`Ik kon geen boss vinden met '${term === '/start help_fromgroup' ? '' : term}' in de naam…\n\n*Gebruik */start* als je nog een actie wilt uitvoeren. Of ga terug naar de groep.*`)
          .then(() => ctx.scene.leave())
      }
      ctx.session.bosscandidates = []
      for (let i = 0; i < bosses.length; i++) {
        ctx.session.bosscandidates.push({
          id: bosses[i].id,
          name: bosses[i].name,
          level: bosses[i].level,
          accounts: bosses[i].accounts
        })
      }
      ctx.session.bosscandidates.push({ name: 'Ik wil niets wijzigen en niets bewaren…', id: 0 })
      return ctx.replyWithMarkdown('Kies een raidboss.', Markup.keyboard(ctx.session.bosscandidates.map(el => el.name)).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 2
    // Handle boss selection , ask what to change
    async (ctx) => {
      let bossindex = ctx.session.bosscandidates.length - 1
      if (ctx.session.more !== true) {
        for (let i = 0; i < ctx.session.bosscandidates.length; i++) {
          console.log(ctx.session.bosscandidates[i].name, ' === ', ctx.update.message.text)
          if (ctx.session.bosscandidates[i].name === ctx.update.message.text) {
            bossindex = i
          }
        }
        if (ctx.session.bosscandidates[bossindex].id === 0) {
          return ctx.replyWithMarkdown('OK\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        ctx.session.editboss = ctx.session.bosscandidates[bossindex]
      }

      ctx.session.changebtns = [
        [`Naam: ${ctx.session.editboss.name}`, 'name'],
        [`Level: ${ctx.session.editboss.level}`, 'level'],
        [`Aantal accounts: ${ctx.session.editboss.accounts}`, 'accounts'],
        [`Ik wil niets wijzigen en niets bewaren…`, 0]
      ]
      return ctx.replyWithMarkdown(`Wat wil je wijzigen?`, Markup.keyboard(ctx.session.changebtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 3
    // Ask for value
    async (ctx) => {
      ctx.session.key = 0
      for (let i = 0; i < ctx.session.changebtns.length; i++) {
        if (ctx.session.changebtns[i][0] === ctx.update.message.text) {
          ctx.session.key = ctx.session.changebtns[i][1]
          break
        }
      }
      let question = ''
      switch (ctx.session.key) {
        case 'name':
          question = `*Wat wordt de nieuwe naam?*`
          break
        case 'level':
          question = `*Wat wordt het nieuwe level?*`
          break
        case 'accounts':
          question = `*Hoeveel accounts beveel je aan?*`
          break
        case 0:
          return ctx.replyWithMarkdown('OK\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start')
            .then(() => ctx.scene.leave())
        default:
          return ctx.replyWithMarkdown(`Ik heb geen idee wat je wilt doen…\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start`)
            .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(question)
        .then(() => ctx.wizard.next())
    },

    // Step 4
    // Handle value, ask what's next?
    async (ctx) => {
      let value = ctx.update.message.text.trim()
      ctx.session.editboss[ctx.session.key] = value
      let out = `Naam: ${ctx.session.editboss.name}\nLevel: ${ctx.session.editboss.level}\nAanbevolen aantal: ${ctx.session.editboss.accounts}`

      ctx.session.savebtns = [
        'Opslaan en afsluiten',
        'Nog iets wijzigen aan deze raidboss',
        'Annuleren'
      ]
      return ctx.replyWithMarkdown(`Dit zijn nu de raidboss gegevens:\n\n${out}\n\n*Wat wil je nu doen?*`, Markup.keyboard(ctx.session.savebtns)
        .oneTime()
        .resize()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },
    // Step 5
    // Handle value, ask whats next?
    async (ctx) => {
      let action = ctx.session.savebtns.indexOf(ctx.update.message.text)
      switch (action) {
        case 0:
          // Save
          try {
            await models.Raidboss.update(
              {
                name: ctx.session.editboss.name,
                level: ctx.session.editboss.level,
                accounts: ctx.session.editboss.accounts,
                metaphone: metaphone(ctx.session.editboss.name)
              },
              {
                where: {
                  id: ctx.session.editboss.id
                }
              }
            )
            ctx.session = null
            return ctx.replyWithMarkdown('Dankjewel.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
          } catch (error) {
            console.error('Error saving raidboss edit', error)
            return ctx.replyWithMarkdown('Het bewaren van deze wijziging is mislukt', Markup.removeKeyboard().extra())
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
        case 1:
          // Edit more
          ctx.session.more = true
          return ctx.replyWithMarkdown(`OK, meer wijzigingen…`)
            .then(() => ctx.wizard.selectStep(2))
            .then(() => ctx.wizard.steps[2](ctx))
        case 2:
          // Cancel
          return ctx.replyWithMarkdown('OK\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        default:
          console.log('EditRaidbossWizard: action not found', action)
          return ctx.replyWithMarkdown('??\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = EditRaidbossWizard
