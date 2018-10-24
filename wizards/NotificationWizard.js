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
      const user = ctx.from
      let dbuser = await models.User.findOne({
        where: {
          tId: {
            [Op.eq]: user.id
          }
        }
      })
      if (!dbuser) {
        return ctx.replyWithMarkdown(`Hier ging iets *niet* met het ophalen van jouw gebruiker…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }

      ctx.session.userId = dbuser.id
      ctx.session.notificatiesbtns = [`Gym notificaties`, `Raisboss notificaties`]

      return ctx.replyWithMarkdown(`*Welke type notificaties gaan we mee aan de slag?*`, Markup.keyboard(ctx.session.notificatiesbtns)
        .oneTime()
        .resize()
        .extra())
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      ctx.session.chosenNotificatie = ctx.session.notificatiesbtns.indexOf(ctx.update.message.text)
      ctx.session.chosenGymNotification = ctx.session.chosenNotificatie === 0
      ctx.session.chosenNotificationString = ctx.session.chosenGymNotification ? 'gyms' : 'raidbosses'
      ctx.session.chosenNotificationSingleString = ctx.session.chosenGymNotification ? 'gym' : 'raidboss'

      if (ctx.session.chosenNotificatie === -1) {
        return ctx.replyWithMarkdown(`Hier ging iets niet goed…\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
      }

      let existingNotifications = []
      if (ctx.session.chosenGymNotification) {
        existingNotifications = await models.GymNotification.findAll({
          include: [
            models.Gym
          ],
          where: {
            userId: {
              [Op.eq]: ctx.session.userId
            }
          }
        })
        console.log(existingNotifications.length)
      } else {
        existingNotifications = await models.RaidbossNotification.findAll({
          include: [
            models.Raidboss
          ],
          where: {
            userId: {
              [Op.eq]: ctx.session.userId
            }
          }
        })
      }

      let message = ''
      for (let existingNotification of existingNotifications) {
        message += `\n- ${ctx.session.chosenGymNotification ? existingNotification.Gym.gymname : existingNotification.Raidboss.name}`
      }

      if (message === '') {
        message = '\n- Je hebt geen notificaties ingesteld'
      }

      message += '\n\n'

      return ctx.replyWithMarkdown(`*Je hebt momenteel op de volgende ${ctx.session.chosenNotificationString} notificaties ingesteld als er raids gemeld worden:*\n${message}
Wil je notificaties toevoegen op een ${ctx.session.chosenNotificationSingleString} of juist afmelden? Dan gaan we deze eerst zoeken.\n
*Voer een deel van de naam in, minimaal 2 tekens in…*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    // step 2
    async (ctx) => {
      // console.log('step 1', ctx.update.message.text)
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        return ctx.replyWithMarkdown(`Geef minimaal 2 tekens van de naam…\n*Probeer het nog eens of gebruik /cancel om te annuleren* 🤨`)
      } else {
        let candidates = []
        if (ctx.session.chosenGymNotification) {
          candidates = await models.Gym.findAll({
            where: {
              gymname: {[Op.like]: '%' + term + '%'}
            }
          })
        } else {
          candidates = await models.Raidboss.findAll({
            where: {
              name: {[Op.like]: '%' + term + '%'}
            }
          })
        }
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(`Ik kon geen ${ctx.session.chosenNotificationString} vinden met '${term}' in de naam… \nWellicht staat deze nog niet geregistreerd… Een van de admins kan deze wellicht toevoegen…\nGebruik /cancel om te stoppen.\n*Of probeer het nog eens*`)
          return
        }
        ctx.session.candidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.candidates.push([
            ctx.session.chosenGymNotification ? candidates[i].gymname.trim() : candidates[i].name.trim(),
            candidates[i].id
          ])
        }
        ctx.session.candidates.push([
          `Mijn ${ctx.session.chosenNotificationSingleString} staat er niet bij…`, 0
        ])
        return ctx.replyWithMarkdown(`Kies een ${ctx.session.chosenNotificationSingleString}.`, Markup.keyboard(ctx.session.candidates.map(el => el[0])).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 3
    async (ctx) => {
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.candidates.length; i++) {
        if (ctx.session.candidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch gym not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`Er ging iets fout bij het kiezen van de ${ctx.session.chosenNotificationSingleString}.\n*Gebruik */start* om het nog eens te proberen…*\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the gym/raidboss
      if (ctx.session.candidates[selectedIndex][1] === 0) {
        return ctx.replyWithMarkdown(`*Probeer het nog eens…*\nJe kan ook altijd stoppen door /cancel te typen`, Markup.removeKeyboard().extra())
      } else {
        // retrieve selected candidate from session
        let selectedCandidate = ctx.session.candidates[selectedIndex]
        ctx.session.selected = selectedCandidate
        let existingNotification
        if (ctx.session.chosenGymNotification) {
          existingNotification = await models.GymNotification.findOne({
            where: {
              userId: {
                [Op.eq]: ctx.session.userId
              },
              gymId: {
                [Op.eq]: selectedCandidate[1]
              }
            }
          })
        } else {
          existingNotification = await models.RaidbossNotification.findOne({
            where: {
              userId: {
                [Op.eq]: ctx.session.userId
              },
              raidbossId: {
                [Op.eq]: selectedCandidate[1]
              }
            }
          })
        }
        let message = `Wil je een notificatie van ${selectedCandidate[0]} als er wat te raiden valt?`
        if (existingNotification) {
          ctx.session.existingNotificationId = existingNotification.id
          message = `Wil je je notificaties uitzetten van ${selectedCandidate[0]}?`
        } else {
          ctx.session.existingNotificationId = null
        }

        return ctx.replyWithMarkdown(message, Markup.keyboard(['Ja', 'Nee']).oneTime().resize().extra())
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

      let selected = ctx.session.selected
      let userId = ctx.session.userId

      // save new
      if (!ctx.session.existingNotificationId) {
        if (ctx.session.chosenGymNotification) {
          let gymNotification = models.GymNotification.build({
            gymId: selected[1],
            userId: userId
          })
          try {
            await gymNotification.save()
          } catch (error) {
            console.log('Woops… registering gymNotification failed', error)
            return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`Je bent aangemeld voor notificaties op de volgende gym: ${selected[0]}. Zodra er een raid gemeld wordt, ben jij de eerste die het hoort. 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        } else {
          let raidbossNotification = models.RaidbossNotification.build({
            raidbossId: selected[1],
            userId: userId
          })
          try {
            await raidbossNotification.save()
          } catch (error) {
            console.log('Woops… registering raidbossNotification failed', error)
            return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`Je bent aangemeld voor notificaties op de volgende raidboss: ${selected[0]}. Zodra er een raid gemeld wordt, ben jij de eerste die het hoort. 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        // remove old
        if (ctx.session.chosenGymNotification) {
          try {
            await models.GymNotification.destroy({
              where: {
                id: {
                  [Op.eq]: ctx.session.existingNotificationId
                }
              }
            })
          } catch (error) {
            console.log('Woops… deleting gymNotification failed', error)
            return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`Je bent afgemeld voor notificaties op de volgende gym: ${selected[0]}. 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        } else {
          try {
            await models.RaidbossNotification.destroy({
              where: {
                id: {
                  [Op.eq]: ctx.session.existingNotificationId
                }
              }
            })
          } catch (error) {
            console.log('Woops… deleting raidbossNotification failed', error)
            return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`Je bent afgemeld voor notificaties op de volgende raidboss: ${selected[0]}. 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      }
    }
  )
}

module.exports = NotificationWizard
