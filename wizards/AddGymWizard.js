// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')

function AddGymWizard (bot) {
  return new WizardScene('add-gym-wizard',
    // Gym naam
    async (ctx) => {
      ctx.session.newgym = {}
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Je wilt een nieuwe gym toevoegen.\n*Voer de naam in…*`))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .finally(() => ctx.wizard.next())
    },
    // Adres of x
    async (ctx) => {
      console.info('gymname: ', ctx.update.message.from)
      let gymname = ctx.update.message.text.trim()
      let user = ctx.update.message.from
      // check if exists
      let oldgyms = await models.Gym.findAll({
        where: {
          gymname: gymname
        }
      })
      if (oldgyms.length > 0) {
        return ctx.replyWithMarkdown(`Deze gym bestaat al…\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`)
          .then(() => ctx.scene.leave())
      }
      ctx.session.newgym.reporterName = user.first_name
      ctx.session.newgym.reporterId = user.id
      ctx.session.newgym.gymname = gymname
      console.info('session: ', ctx.session)
      ctx.replyWithMarkdown('*Wat is het adres (straat en eventueel nummer)?*\nAls je deze niet weet, vul een *x* in…')
        .finally(() => ctx.wizard.next())
    },
    // Google maps of x
    async (ctx) => {
      let gymadres = ctx.update.message.text.trim()
      ctx.session.newgym.address = gymadres.toLowerCase() === 'x' ? null : gymadres
      ctx.replyWithMarkdown(`Top!\n*Kan je een Google Maps link geven?* \n\n[Hulp bij het maken van een Google Maps link](https://dev.romeen.nl/pogo_googlemaps/)\n Als je deze link niet kunt geven, verstuur dan een letter *x*…`)
        .then(() => ctx.wizard.next())
    },
    // Exraid vraag ja/nee, weet niet
    async (ctx) => {
      let gmlink = ctx.update.message.text.trim()
      gmlink = gmlink.toLowerCase() === 'x' ? null : gmlink
      ctx.session.newgym.googleMapsLink = gmlink
      if (gmlink !== null && gmlink.substr(0, 4) !== 'http') {
        ctx.replyWithMarkdown(`Geen geldige link. Links starten met 'http'. \n*Probeer nog eens.*`)
          .then(() => ctx.wizard.back())
      }
      ctx.replyWithMarkdown(`Okidoki…\nIs dit een kanshebber voor een ExRaid?`, Markup.inlineKeyboard([
        Markup.callbackButton(`Ja`, 'yes'),
        Markup.callbackButton(`Nee / Weet ik niet`, 'no')
      ], {columns: 1}).extra())
        .then(() => ctx.wizard.next())
    },
    // toon samenvatting & bevestiging
    async (ctx) => {
      if (!ctx.update.callback_query) {
        ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Klik op een knop*')
      }
      let exraid = ctx.update.callback_query.data === 'yes' ? 1 : 0
      ctx.session.newgym.exRaidTrigger = exraid
      return ctx.answerCbQuery('', undefined, true)
        .then(() => ctx.replyWithMarkdown(`Bijna klaar!\nJe hebt deze gegevens ingevuld:\nNieuwe gym: *${ctx.session.newgym.gymname}*\nAdres: ${ctx.session.newgym.address === null ? 'Niet opgegeven' : ctx.session.newgym.address}\nKaart: ${ctx.session.newgym.googleMapsLink === null ? 'Niet opgegeven' : ctx.session.newgym.googleMapsLink}\nEX Raid kanshebber: ${ctx.session.newgym.exRaidTrigger === 1 ? 'Ja' : 'Nee / weet niet'}\n\n*Opslaan?*`, Markup.inlineKeyboard([
          Markup.callbackButton(`Ja`, 'yes'),
          Markup.callbackButton(`Nee`, 'no')
        ], {columns: 1}).extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // save …or maybe not
      if (!ctx.update.callback_query) {
        ctx.replyWithMarkdown('Hier ging iets niet goed… *Klik op een knop*')
      }
      let savenow = ctx.update.callback_query.data === 'yes'
      if (savenow) {
        let gym = models.Gym.build(ctx.session.newgym)
        try {
          await gym.save()
        } catch (error) {
          console.log('Whoops… saving new gym failed', error)
          return ctx.answerCbQuery('', undefined, true)
            .then(() => ctx.replyWithMarkdown(`Sorry, hier ging iets *niet* goed… Wil je het nog eens proberen met /start?\n*Of je kan ook weer terug naar de groep gaan…*`))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.scene.leave())
        }
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.replyWithMarkdown('Dankjewel!\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      } else {
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.replyWithMarkdown('OK. *Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
    })
}
module.exports = AddGymWizard
