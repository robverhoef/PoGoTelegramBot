// ===================
// add raid wizard
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

function AddRaidWizard (bot) {
  return new WizardScene('add-raid-wizard',
    // step 0
    async (ctx) => {
      ctx.session.newraid = {}
      ctx.session.gymcandidates = []
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Je wilt een nieuwe raid toevoegen. We gaan eerst de gym zoeken.\n*Voer een deel van de naam in, minimaal 2 tekens…*`))
        // .then(()=> {
      // .then(() => ctx.deleteMessage(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id))
      // ctx.session.prevMessage = {chatId: ,messageId:}
        // })
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      if (ctx.update.message.text === undefined) {
        return
      }
      const term = ctx.update.message.text.trim()
      let btns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(`Geef minimaal 2 tekens van de gymnaam…\n*Probeer het nog eens.* 🤨`)
          // .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(`Ik kon geen gym vinden met '${term === '/start help_fromgroup' ? '' : term}' in de naam…\nGebruik /cancel om te stoppen.\n*Of probeer het nog eens*`)
            // .then(() => ctx.wizard.back())
            return
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push({gymname: candidates[i].gymname, id: candidates[i].id})
          btns.push(Markup.callbackButton(candidates[i].gymname, i))
        }

        btns.push(Markup.callbackButton('Mijn gym staat er niet bij…', candidates.length))
        ctx.session.gymcandidates.push({name: 'none', id: 0})
        return ctx.replyWithMarkdown('Kies een gym.', Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 2
    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed… \n*Je moet op een knop klikken 👆. Of */cancel* gebruiken om mij te resetten.*')
      }
      let selectedIndex = parseInt(ctx.update.callback_query.data)
      // User can't find the gym
      if (ctx.session.gymcandidates[selectedIndex].id === 0) {
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.replyWithMarkdown(`*Probeer het nog eens…*\nJe kan ook altijd stoppen door /cancel te typen,`)
            ctx.wizard.selectStep(1)
            return ctx.wizard.steps[1](ctx)
          })
      } else {
        // retrieve selected candidate from session
        let selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newraid.gymId = selectedgym.id
        ctx.session.newraid.gymname = selectedgym.gymname

        let btns = [
          Markup.callbackButton('Uitkomen van het ei', 'startmode'),
          Markup.callbackButton('Eindtijd van de raid', 'endmode')
        ]
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.replyWithMarkdown(`*Hoe wil je de eindtijd van de raid opgeven?*\nKlik op een knop…`,
            Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra()
          ))
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: get the time; either start or end of the raid itself
    async (ctx) => {
      let timemode = ctx.update.callback_query.data
      ctx.session.timemode = timemode
      let question = ''
      if(timemode == 'startmode') {
        question = `*Hoe laat komt het ei uit?*\nGeef de tijd zo op: *09:30* of *13:45*…`
      } else {
        question = `*Hoe laat eindigt de raid?*\nGeef de tijd zo op: *09:30* of *13:45*…\n(Noot: eindtijd is uitkomen van het ei + 45 minuten)`
      }
      return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.replyWithMarkdown(question))
          .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      const timegiven = ctx.update.message.text.trim()
      let endtime
      let tmptime = inputTime(timegiven)
      // check valid time
      if (tmptime === false) {
        return ctx.replyWithMarkdown(`Dit is geen geldige tijd. \n*Probeer het nog eens.*`)
      }

      if(ctx.session.timemode === 'startmode'){
        // user wanted to enter time when egg hatches
        endtime = moment.unix(tmptime).add(45, 'minutes').unix()
      } else {
        // user wanted to enter raid's end time
        endtime = tmptime
      }
      ctx.session.newraid.endtime = endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(45, 'minutes')
      ctx.replyWithMarkdown(`*Welke starttijd stel je voor?*\nGeef de tijd tussen *${starttime.format('HH:mm')}* en *${moment.unix(endtime).format('HH:mm')}*`)
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      let endtime = ctx.session.newraid.endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(45, 'minutes')

      const start1 = inputTime(ctx.update.message.text.trim())
      if (start1 === false) {
        return ctx.replyWithMarkdown(`Dit is geen geldige tijd. Geef de tijd tussen *${starttime.format('HH:mm')}* en *${moment.unix(endtime).format('HH:mm')}*`)
        // .then(() => ctx.wizard.back())
      }
      if (starttime.diff(moment.unix(start1)) > 0 || moment.unix(endtime).diff(moment.unix(start1)) < 0) {
        return ctx.replyWithMarkdown(`De starttijd is niet geldig. \nGeef de tijd tussen *${starttime.format('HH:mm')}* en *${moment.unix(endtime).format('HH:mm')}*\nProbeer het nog eens…`)
        // .then(() => ctx.wizard.back())
      }
      ctx.session.newraid.start1 = start1
      ctx.replyWithMarkdown(`*Wat is de raid boss?*\nBijvoorbeeld *Kyogre* of *Level 5 ei*`)
        .then(() => ctx.wizard.next())
    },
    // step 5
    async (ctx) => {
      const target = ctx.update.message.text.trim()
      // let's see if we can find the raidboss…
      let boss = await models.Raidboss.find({
        where: {
          name: target
        }
      })
      console.log('BOSS', boss)
      if(boss !== null) {
        ctx.session.newraid.target = boss.name
        ctx.session.newraid.bossid = boss.id
        ctx.session.newraid.accounts = boss.accounts
      } else {
        ctx.session.newraid.target = target
        ctx.session.newraid.accounts = null
        ctx.session.newraid.bossid = null
      }
      const endtime = ctx.session.newraid.endtime
      const start1 =  ctx.session.newraid.start1

      let out = `Tot ${moment.unix(endtime).format('HH:mm')}: *${ctx.session.newraid.target}*\n${ctx.session.newraid.bossid !== null?('Aanbevolen: '+ctx.session.newraid.accounts+' accounts\n'):''}${ctx.session.newraid.gymname}\nStart: ${moment.unix(start1).format('HH:mm')}`

      return ctx.replyWithMarkdown(`${out}\n\n*Opslaan?*`, Markup.inlineKeyboard([
        Markup.callbackButton('Ja', 'yes'),
        Markup.callbackButton('Nee', 'no')
      ], {columns: 1}).removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    // step 6
    async (ctx) => {
      if (!ctx.update.callback_query) {
        ctx.replyWithMarkdown('Hier ging iets niet goed… *Klik op een knop 👆*')
      }
      const user = ctx.from
      let saveme = ctx.update.callback_query.data
      if (saveme === 'no') {
        return ctx.answerCbQuery('', undefined, true)
          .then(() => ctx.replyWithMarkdown('Jammer… \n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
          .then(() => ctx.scene.leave())
      } else {
        // Sometimes a new raid is getting submitted multiple times
        // ToDo: adapt this when multiple starttimes are getting implemented
        var raidexists = await models.Raid.find({
          where: {
            [Op.and]: [
              {gymId: ctx.session.newraid.gymId},
              {target: ctx.session.newraid.target},
              {start1: ctx.session.newraid.start1},
              {endtime: ctx.session.newraid.endtime}
            ]
          }
        })
        if (raidexists) {
          console.log('New raid exists… Ignoring ' + ctx.session.newraid.gymId + ctx.session.newraid.target + ctx.session.newraid.endtime)
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => {
              if (ctx.update.callback_query.message.message_id) {
                return ctx.deleteMessage(ctx.update.callback_query.message.message_id)
              }
            })
            .then(() => ctx.replyWithMarkdown(`Deze raid bestaat al.\nJe kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`))
            .then(() => {
              ctx.session.newraid = null
              return ctx.scene.leave()
            })
        }
        let newraid = models.Raid.build({
          gymId: ctx.session.newraid.gymId,
          start1: ctx.session.newraid.start1,
          target: ctx.session.newraid.target,
          raidbossId: ctx.session.newraid.bossid,
          endtime: ctx.session.newraid.endtime,
          reporterName: user.first_name,
          reporterId: user.id
        })
        // save...
        try {
          await newraid.save()
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het saven… Misschien toch maar eens opnieuw proberen.`)
            .then(() => ctx.scene.leave())
        }
        // send updated list to group
        let out = await listRaids(`Raid toegevoegd door: [${user.first_name}](tg://user?id=${user.id})\n\n`)
        if (out === null) {
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.replyWithMarkdown(`Mmmm, vreemd. Sorry, geen raid te vinden.`))
            .then(() => ctx.scene.leave())
        }

        return ctx.answerCbQuery('', undefined, true)
          .then(async () => {
            bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
          })
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.replyWithMarkdown('Dankjewel!\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
          .then(() => ctx.scene.leave())
      }
    }
  )
}
module.exports = AddRaidWizard
