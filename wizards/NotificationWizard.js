// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
var models = require('../models')
const {Markup} = require('telegraf')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

var NotificationWizard = function () {
  return new WizardScene('notification-wizard',
    // step 0
    async (ctx) => {
      ctx.session.newraid = {}
      ctx.session.gymcandidates = []
      return ctx.replyWithMarkdown(`Je wilt een nieuwe notificatie beheren op een gym. We gaan eerst de gym zoeken.\n*Voer een deel van de naam in, minimaal 2 tekens…*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      // console.log('step 1', ctx.update.message.text)
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        return ctx.replyWithMarkdown(`Geef minimaal 2 tekens van de gymnaam…\n*Probeer het nog eens.* 🤨`)
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(`Ik kon geen gym vinden met '${term === '/start help_fromgroup' ? '' : term}' in de naam…\nGebruik /cancel om te stoppen.\n*Of probeer het nog eens*`)
          return
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push([
            candidates[i].gymname.trim(),
            candidates[i].id
          ])
        }
        ctx.session.gymcandidates.push([
          'Mijn gym staat er niet bij…', 0
        ])
        return ctx.replyWithMarkdown('Kies een gym.', Markup.keyboard(ctx.session.gymcandidates.map(el => el[0])).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 2
    async (ctx) => {
      // console.log('step 2')
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.gymcandidates.length; i++) {
        if (ctx.session.gymcandidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch gym not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`Er ging iets fout bij het kiezen van de gym.\n*Gebruik */start* om het nog eens te proberen…*\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the gym
      if (ctx.session.gymcandidates[selectedIndex][1] === 0) {
        return ctx.replyWithMarkdown(`*Probeer het nog eens…*\nJe kan ook altijd stoppen door /cancel te typen`, Markup.removeKeyboard().extra())
      } else {
        // retrieve selected candidate from session
        let gym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.selectedGym = gym

        const user = ctx.from

        //find existing, change message
        return ctx.replyWithMarkdown(`Wil je een notificatie van ${gym[0]} als er wat te raiden valt?.`, Markup.keyboard(['Ja', 'Nee']).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 3
    async (ctx) => {
      if (ctx.update.message.text === 'Nee') {
        return ctx.replyWithMarkdown(`Prima.\n*Gebruik */start* om het nog een opdracht uit te voeren…*\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }

      let gym = ctx.session.selectedGym
      const user = ctx.from
      let notification = models.Notification.build({
        gymId: gym[1],
        userId: user.id
      })
      try {
        await notification.save()
      } catch (error) {
        console.log('Woops… registering notification failed', error)
        return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }

      //change message

      return ctx.replyWithMarkdown(`Je bent aangemeld voor notificaties op de volgende gym: ${gym[0]}. Zodra er een raid gemeld wordt, ben jij de eerste die het hoort. 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = NotificationWizard
