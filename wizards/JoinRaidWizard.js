// ===================
// join raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const listRaids = require('../util/listRaids')

moment.tz.setDefault('Europe/Amsterdam')

function JoinRaidWizard (bot) {
  return new WizardScene('join-raid-wizard',
    async (ctx) => {
      ctx.session.joinedraid = null
      // ToDo: check for endtime
      let raids = await models.Raid.findAll({
        include: [models.Gym, models.Raiduser],
        where: {
          endtime: {
            [Op.gt]: moment().unix()
          }
        }
      })
      if (raids.length === 0) {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown('Sorry, er is nu geen raid te doen… 😉\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      // buttons to show, with index from candidates as data (since maxlength of button data is 64 bytes…)
      let btns = []
      let candidates = []
      for (var a = 0; a < raids.length; a++) {
        let strttm = moment.unix(raids[a].start1).format('H:mm')
        candidates[a] = {
          gymname: raids[a].Gym.gymname,
          raidid: raids[a].id,
          startsat: strttm
        }
        btns.push(Markup.callbackButton(`${raids[a].Gym.gymname} ${strttm}; ${raids[a].target}`, a))
      }
      btns.push(Markup.callbackButton('…toch niet meedoen', candidates.length))
      candidates.push({
        gymname: 'none',
        raidid: 0
      })
      // save all candidates to session…
      ctx.session.raidcandidates = candidates
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown('Kies een raid…', Markup.inlineKeyboard(btns, {
          wrap: (btn, index, currentRow) => 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken. Of */cancel* gebruiken om mij te resetten*')
          .then(() => {
            ctx.session.raidcandidates = null
            return ctx.scene.leave()
          })
      }
      // retrieve selected candidate  from session…
      let selectedraid = ctx.session.raidcandidates[ctx.update.callback_query.data]
      if (selectedraid.raidid === 0) {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown('Jammer! \n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.session.raidcandidates = null
            return ctx.scene.leave()
          })
      }
      // save selected index to session
      ctx.session.joinedraid = parseInt(ctx.update.callback_query.data)
      let btns = []
      for (var a = 1; a < 6; a++) {
        btns.push(Markup.callbackButton(a, a))
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Met hoeveel accounts/mensen kom je naar *${selectedraid.gymname}*?`, Markup.inlineKeyboard(btns).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken*')
          .then(() => ctx.scene.leave())
      }
      const accounts = parseInt(ctx.update.callback_query.data)
      const joinedraid = ctx.session.raidcandidates[ctx.session.joinedraid]

      const user = ctx.from
      // Check already registered? If so; update else store new
      let raiduser = await models.Raiduser.find({
        where: {
          [Op.and]: [{uid: user.id}, {raidId: joinedraid.raidid}]
        }
      })
      if (raiduser) {
        // update
        try {
          await models.Raiduser.update(
            { accounts: accounts },
            { where: { [Op.and]: [{uid: user.id}, {raidId: joinedraid.raidid}] } }
          )
        } catch (error) {
          return ctx.replyWithMarkdown('Hier ging iets niet goed tijdens het updaten… \n*Misschien opnieuw proberen?*')
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.scene.leave())
        }
      } else {
        // new raid user
        let raiduser = models.Raiduser.build({
          raidId: joinedraid.raidid,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await raiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`)
            .then(() => ctx.scene.leave())
        }
      }
      let out = await listRaids(`[${user.first_name}](tg://user?id=${user.id}) toegevoegd aan raid bij ${joinedraid.gymname}\n\n`)
      if (out === null) {
        ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(`Mmmm, vreemd. Sorry, geen raid te vinden.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Je bent aangemeld voor ${joinedraid.gymname} om ${joinedraid.startsat} 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(async () => {
          bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
        })
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = JoinRaidWizard
