// ===================
// Edit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const inputTime = require('../util/inputTime')
const listRaids = require('../util/listRaids')

moment.tz.setDefault('Europe/Amsterdam')

function EditRaidWizard (bot) {
  return new WizardScene('edit-raid-wizard',
    // raid choice…
    async (ctx) => {
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
          .then(() => ctx.replyWithMarkdown('Sorry, ik kan nu geen raid vinden 🤨'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      let btns = []
      let candidates = []
      for (var a = 0; a < raids.length; a++) {
        candidates[a] = {
          gymname: raids[a].Gym.gymname,
          id: raids[a].id,
          start1: raids[a].start1,
          endtime: raids[a].endtime,
          target: raids[a].target
        }
        btns.push(Markup.callbackButton(`${raids[a].Gym.gymname}, tot: ${moment.unix(raids[a].endtime).format('HH:mm')}, start: ${moment.unix(raids[a].start1).format('HH:mm')}; ${raids[a].target}`, a))
      }
      btns.push(Markup.callbackButton('…de raid staat er niet bij', candidates.length))
      candidates.push({
        gymname: 'none',
        id: 0
      })
      // save all candidates to session…
      ctx.session.raidcandidates = candidates
      return ctx.replyWithMarkdown(`Welke raid wil je wijzigen?`, Markup.inlineKeyboard(btns, {
        columns: 1}).removeKeyboard().extra())
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      if (!ctx.update.callback_query && ctx.session.more !== true) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken 👆*')
      }
      // retrieve selected candidate  from session…
      if (ctx.session.more !== true) {
        let selectedraid = ctx.session.raidcandidates[ctx.update.callback_query.data]
        if (selectedraid.id === 0) {
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.replyWithMarkdown('Jammer! \n*Je kunt nu weer terug naar de groep gaan…*'))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.editraid = null
              return ctx.scene.leave()
            })
        }
        // save selected index to session
        let editraidindex = parseInt(ctx.update.callback_query.data)
        ctx.session.editraid = await ctx.session.raidcandidates[editraidindex]
      }
      let btns = [
        Markup.callbackButton(`Eindtijd ${moment.unix(ctx.session.editraid.endtime).format('HH:mm')}`, 'endtime'),
        Markup.callbackButton(`Starttijd ${moment.unix(ctx.session.editraid.start1).format('HH:mm')}`, 'start1'),
        Markup.callbackButton(`Pokemon ${ctx.session.editraid.target}`, 'target'),
        Markup.callbackButton(`Ik wil toch niets wijzigen en niets bewaren…`, 0)
      ]
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Wat wil je wijzigen?`, Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra()))
        .then(() => {
          if (ctx.update.callback_query && ctx.session.more !== true) {
            return ctx.deleteMessage(ctx.update.callback_query.message.message_id)
          }
        })
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed… \n*Je moet op een knop klikken 👆*')
      }
      const editattr = ctx.update.callback_query.data
      if (editattr === '0') {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan…*'))
          .then(() => {
            if (ctx.update.callback_query.message.message_id) {
              return ctx.deleteMessage(ctx.update.callback_query.message.message_id)
            }
          })
          .then(() => {
            ctx.session.raidcandidates = null
            ctx.session.editraid = null
            return ctx.scene.leave()
          })
      } else {
        let question = ''
        switch (editattr) {
          case 'endtime':
            ctx.session.editattr = 'endtime'
            question = `*Geef een nieuwe eindtijd*\nBijvoorbeeld *9:45* of *14:30*`
            break
          case 'start1':
            ctx.session.editattr = 'start1'
            let endtimestr = moment.unix(ctx.session.editraid.endtime).format('HH:mm')
            let start1str = moment.unix(ctx.session.editraid.endtime).subtract(45, 'minutes').format('HH:mm')
            question = `*Geef een nieuwe starttijd*\nDeze tijd moet tussen ${start1str} en ${endtimestr} liggen`
            break
          case 'target':
            ctx.session.editattr = 'target'
            question = `*Hoe heet de nieuwe raidboss of ei?*\nBijvoorbeeld 'Kyogre' of 'Lvl 5 ei'`
            break
          default:
            question = '*Ik heb geen idee wat je wilt wijzigen*\nGa terug naar de groep en probeer het nog eens'
            return ctx.answerCbQuery(null, undefined, true)
              .then(() => ctx.replyWithMarkdown(question))
              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.scene.leave())
        }
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(question)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.wizard.next()))
      }
    },
    (ctx) => {
      let key = ctx.session.editattr
      let value = ctx.update.message.text.trim()
      if (key === 'endtime' || key === 'start1') {
        let timevalue = inputTime(value)
        if (timevalue === false) {
          return ctx.replyWithMarkdown('Deze tijd is ongeldig… probeer het nog eens.\nAls je er niet uitkomt, kan je altijd stoppen met /cancel')
        } else {
          if (key === 'start1') {
            let endtime = moment.unix(ctx.session.editraid.endtime)
            let start = moment.unix(ctx.session.editraid.endtime).subtract(45, 'minutes')
            let start1 = moment.unix(timevalue)
            if (start.diff(moment(start1)) > 0 || endtime.diff(start1) < 0) {
              return ctx.replyWithMarkdown('Deze tijd is ongeldig… probeer het nog eens.\nAls je er niet uitkomt, kun je altijd helemaal stoppen met /cancel')
            }
          }
          ctx.session.editraid[key] = timevalue
        }
      } else {
        ctx.session.editraid[key] = value
      }
      let out = `Tot: ${moment.unix(ctx.session.editraid.endtime).format('HH:mm')}: *${ctx.session.editraid.target}*\n${ctx.session.editraid.gymname}\nStart: ${moment.unix(ctx.session.editraid.start1).format('HH:mm')}\n\n`
      return ctx.replyWithMarkdown(`Dit zijn nu de raid gegevens:\n\n${out}*Wat wil je nu doen?*`, Markup.inlineKeyboard([
        Markup.callbackButton('Opslaan en aflsuiten', 0),
        Markup.callbackButton('Nog iets wijzigen aan deze raid', 1),
        Markup.callbackButton('Annuleren', 2)
      ], {columns: 1}).removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken 👆*')
      }
      const choice = parseInt(ctx.update.callback_query.data)
      switch (choice) {
        case 0:
          // save and exit
          const user = ctx.update.callback_query.from
          try {
            await models.Raid.update(
              {
                endtime: ctx.session.editraid.endtime,
                start1: ctx.session.editraid.start1,
                target: ctx.session.editraid.target
              },
              {
                where: {
                  id: ctx.session.editraid.id
                }
              })
            let out = await listRaids(`*Raid gewijzigd* door: [${user.first_name}](tg://user?id=${user.id})\n\n`)
            return ctx.answerCbQuery('', undefined, true)
              .then(async () => {
                bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
              })
              .then(() => {
                if (ctx.update.callback_query) {
                  return ctx.deleteMessage(ctx.update.callback_query.message.message_id)
                }
              })
              .then(() => ctx.replyWithMarkdown('Dankjewel.\n*Je kunt nu weer terug naar de groep gaan…*'))
          } catch (error) {
            console.error(error)
            return ctx.replyWithMarkdown('Het bewaren van deze wijziging is mislukt').then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor to step 1 and trigger jump to step 1
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.more = true
              return ctx.replyWithMarkdown(`OK, meer wijzigingen…`)
                .then(() => ctx.wizard.selectStep(1))
                .then(() => ctx.wizard.steps[1](ctx))
            })
        case 2:
          // Don't save and leave
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan…*'))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.editraid = null
              return ctx.scene.leave()
            })
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.reply('OK'))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = EditRaidWizard
