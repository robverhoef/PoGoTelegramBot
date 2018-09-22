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
      return ctx.replyWithMarkdown(`Je wilt een nieuwe raid toevoegen. We gaan eerst de gym zoeken.\n*Voer een deel van de naam in, minimaal 2 tekens…*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      // console.log('step 1', ctx.update.message.text)
      const term = ctx.update.message.text.trim()
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
          ctx.wizard.selectStep(0)
          return ctx.wizard.steps[0](ctx)
      } else {
        // retrieve selected candidate from session
        let selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newraid.gymId = selectedgym[1]
        ctx.session.newraid.gymname = selectedgym[0]
        ctx.session.timeOptions = [
          ['Uitkomen van het ei: start tijd', 'startmodetime'],
          ['Uitkomen van het ei: in minuten', 'startmodemin'],
          ['Einde van de raid: eind tijd', 'endmodetime'],
          ['Einde van de raid: in minuten', 'endmodemin']
        ]
        let btns = ctx.session.timeOptions.map(el => el[0])

        return ctx.replyWithMarkdown(`*Hoe wil je de eindtijd van de raid opgeven?*`,
          Markup.keyboard(btns).oneTime().resize().extra()
        )
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: get the time; either start or end of the raid itself, or in minutes
    async (ctx) => {
      let timemode = ''
      for (var a = 0; a < ctx.session.timeOptions.length; a++) {
        if (ctx.session.timeOptions[a][0] === ctx.update.message.text) {
          timemode = ctx.session.timeOptions[a][1]
          break
        }
      }
      ctx.session.timemode = timemode
      let question = ''
      if (timemode === 'startmodetime') {
        question = `*Hoe laat komt het ei uit?*\nGeef de tijd zo op: *09:30* of *13:45*…`
      } else if (timemode === 'endmodetime') {
        question = `*Hoe laat eindigt de raid?*\nGeef de tijd zo op: *09:30* of *13:45*…\n(Noot: eindtijd is uitkomen van het ei + 45 minuten)`
      } else if (timemode === 'startmodemin') {
        question = `*Hoeveel minuten staat er nog op het ei?*\n(Noot: eindtijd is uitkomen van het ei + 45 minuten)`
      } else if (timemode === 'endmodemin') {
        question = `*Hoeveel minuten staat er nog op de raid?*`
      }
      return ctx.replyWithMarkdown(question, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      const message = ctx.update.message.text.trim()

      let tmptime
      if (ctx.session.timemode === 'startmodetime' || ctx.session.timemode === 'endmodetime') {
        tmptime = inputTime(message)
        // check valid time
        if (tmptime === false) {
          return ctx.replyWithMarkdown(`Dit is geen geldige tijd. \n*Probeer het nog eens.*`)
        }
      } else {
        let minutes = parseInt(message)

        if ((!minutes || minutes < 0 || minutes > 60) && ctx.session.timemode === 'startmodemin') {
          return ctx.replyWithMarkdown(`Opgegeven minuten moeten tussen de 0 en 60 liggen. \n*Probeer het nog eens.*`)
        }
        if ((!minutes || minutes < 0 || minutes > 45) && ctx.session.timemode === 'endmodemin') {
          return ctx.replyWithMarkdown(`Opgegeven minuten moeten tussen de 0 en 45 liggen. \n*Probeer het nog eens.*`)
        }

        if (minutes < 5 && ctx.session.timemode === 'endmodemin') {
          return ctx.replyWithMarkdown('*Dat wordt een beetje krap om nog te melden, volgende keer beter.\nWil je nog een actie uitvoeren? Klik dan hier op */start')
            .then(() => ctx.scene.leave())
        }

        tmptime = moment().add(minutes, 'minutes').unix()
      }

      let endtime
      if (ctx.session.timemode === 'startmodetime' || ctx.session.timemode === 'startmodemin') {
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

      if (starttime < moment()) {
        starttime = moment()
      }

      ctx.replyWithMarkdown(`*Welke starttijd stel je voor?*\nGeef de tijd tussen *${starttime.format('HH:mm')}* en *${moment.unix(endtime).format('HH:mm')}* of vul een *x* in om deze leeg te laten`)
        .then(() => ctx.wizard.next())
    },
    // step 4
    async (ctx) => {
      let endtime = ctx.session.newraid.endtime
      // calculate minimum start time
      let starttime = moment.unix(endtime)
      starttime.subtract(45, 'minutes')

      let message = ctx.update.message.text.trim()
      let start1
      if (message === 'x' || message === 'X') {
        // default starttime of 15 before endtime or right now, when time is short:
        let start1time = moment.unix(endtime)
        start1time.subtract(15, 'minutes')
        if (start1time < moment()) {
          start1time = moment()
        }
        start1 = start1time.unix()
      } else {
        start1 = inputTime(message)
        if (start1 === false) {
          return ctx.replyWithMarkdown(`Dit is geen geldige tijd. Geef de tijd tussen *${starttime.format('HH:mm')}* en *${moment.unix(endtime).format('HH:mm')}*  of vul een *x* in om deze leeg te laten`)
          // .then(() => ctx.wizard.back())
        }
        if (starttime.diff(moment.unix(start1)) > 0 || moment.unix(endtime).diff(moment.unix(start1)) < 0) {
          return ctx.replyWithMarkdown(`De starttijd is niet geldig. \nGeef de tijd tussen *${starttime.format('HH:mm')}* en *${moment.unix(endtime).format('HH:mm')}* of vul een *x* in om deze leeg te laten\nProbeer het nog eens…`)
          // .then(() => ctx.wizard.back())
        }
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
      if (boss !== null) {
        ctx.session.newraid.target = boss.name
        ctx.session.newraid.bossid = boss.id
        ctx.session.newraid.accounts = boss.accounts
      } else {
        ctx.session.newraid.target = target
        ctx.session.newraid.accounts = null
        ctx.session.newraid.bossid = null
      }
      const endtime = ctx.session.newraid.endtime
      const start1 = ctx.session.newraid.start1

      let out = `Tot ${moment.unix(endtime).format('HH:mm')}: *${ctx.session.newraid.target}*\n${ctx.session.newraid.bossid !== null ? ('Aanbevolen: ' + ctx.session.newraid.accounts + ' accounts\n') : ''}${ctx.session.newraid.gymname}\nStart: ${moment.unix(start1).format('HH:mm')}`
      ctx.session.saveOptions = ['Ja', 'Nee']
      return ctx.replyWithMarkdown(`${out}\n\n*Opslaan?*`, Markup.keyboard(ctx.session.saveOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },
    // step 6
    async (ctx) => {
      const user = ctx.from
      let saveme = ctx.session.saveOptions.indexOf(ctx.update.message.text) === 0
      if (saveme) {
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
          console.log(`New raid exists… Ignoring id: ${ctx.session.newraid.gymId} target: ${ctx.session.newraid.target} endtime: ${ctx.session.newraid.endtime}`)
          return ctx.replyWithMarkdown(`Deze raid bestaat al.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
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
            .then((saved) => {
              // console.log('saved', saved)
              ctx.session.savedraid = saved
            })
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het saven… Misschien toch maar eens opnieuw proberen met /start.`, Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        // send updated list to group
        let out = await listRaids(`Raid bij ${ctx.session.newraid.gymname} toegevoegd door: [${user.first_name}](tg://user?id=${user.id})\n\n`)
        if (out === null) {
          return ctx.replyWithMarkdown(`Mmmm, vreemd. Sorry, geen raid te vinden.`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        ctx.session.participateOptions = ['Ja', 'Nee']
        return bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
          .then(() => {
            ctx.replyWithMarkdown('Dankjewel!\n*Doe je zelf mee met deze raid?*', Markup.keyboard(ctx.session.participateOptions).resize().oneTime().extra())
          })
          .then(() => ctx.wizard.next())
      } else {
        return ctx.replyWithMarkdown('Jammer… \n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
    },
    // Step 7
    async (ctx) => {
      let participate = ctx.session.participateOptions.indexOf(ctx.update.message.text)
      if (participate === 1) {
        // user does NOT participate, exit
        return ctx.replyWithMarkdown('Dankjewel!\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      // user does participate
      return ctx.replyWithMarkdown(`Met hoeveel accounts/mensen kom je naar *${ctx.session.newraid.gymname}*?`, Markup.keyboard(['1', '2', '3', '4', '5'])
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 8
    async (ctx) => {
      const accounts = parseInt(ctx.update.message.text)

      const user = ctx.from
      // Check already registered? If so; update else store new
      let raiduser = await models.Raiduser.find({
        where: {
          [Op.and]: [{uid: user.id}, {raidId: ctx.session.savedraid.id}]
        }
      })
      if (raiduser) {
        // update
        try {
          await models.Raiduser.update(
            { accounts: accounts },
            { where: { [Op.and]: [{uid: user.id}, {raidId: ctx.session.savedraid.id}] } }
          )
        } catch (error) {
          return ctx.replyWithMarkdown('Hier ging iets niet goed tijdens het updaten… \n*Misschien opnieuw proberen?*', Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        // new raid user
        let raiduser = models.Raiduser.build({
          raidId: ctx.session.savedraid.id,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await raiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(`Hier ging iets *niet* goed tijdens het bewaren…\nMisschien kun je het nog eens proberen met /start. Of ga terug naar de groep.`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      }
      let out = await listRaids(`[${user.first_name}](tg://user?id=${user.id}) toegevoegd aan raid bij ${ctx.session.newraid.gymname}\n\n`)
      if (out === null) {
        ctx.replyWithMarkdown(`Mmmm, vreemd. Sorry, geen raid te vinden.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(`Je bent aangemeld voor ${ctx.session.newraid.gymname} om ${moment.unix(ctx.session.newraid.start1).format('HH:mm')} 👍\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
        .then(async () => {
          bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
        })
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = AddRaidWizard
