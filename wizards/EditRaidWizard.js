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

    // step 0: choose raid
    async (ctx) => {
      // console.log('edit raid step 0')
      // reset some values for gym editting
      ctx.session.newgymid = null
      ctx.session.editattr = null

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
          .then(() => ctx.replyWithMarkdown('Sorry, ik kan nu geen raid vinden 🤨\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
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
      return ctx.replyWithMarkdown(`Welke raid wil je wijzigen?`,
        Markup.inlineKeyboard(btns, {
          columns: 1
        })
        .removeKeyboard().extra())
        .then(() => {
          if(ctx.update.callback_query.message){
            ctx.deleteMessage(ctx.update.callback_query.message.message_id)
          }
        })
        .then(() => ctx.wizard.next())
    },

    // step 1: raid chosen, edit what?
    async (ctx) => {
      // console.log('edit raid step 1')
      if (!ctx.update.callback_query && ctx.session.more !== true) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken 👆. Of */cancel* gebruiken om mij te resetten.*')
      }

      // retrieve selected candidate from session…
      if (ctx.session.more !== true) {
        let selectedraid = ctx.session.raidcandidates[ctx.update.callback_query.data]
        if (selectedraid.id === 0) {
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.replyWithMarkdown('Jammer!\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
            .then(() => {
              if(ctx.update.callback_query.message) {
                ctx.deleteMessage(ctx.update.callback_query.message.message_id)
              }
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
        // save selected index to session
        let editraidindex = parseInt(ctx.update.callback_query.data)
        ctx.session.editraid = ctx.session.raidcandidates[editraidindex]
      }
      let btns = [
        Markup.callbackButton(`Gym: ${ctx.session.editraid.gymname}`, 'gym'),
        Markup.callbackButton(`Eindtijd: ${moment.unix(ctx.session.editraid.endtime).format('HH:mm')}`, 'endtime'),
        Markup.callbackButton(`Starttijd: ${moment.unix(ctx.session.editraid.start1).format('HH:mm')}`, 'start1'),
        Markup.callbackButton(`Pokemon: ${ctx.session.editraid.target}`, 'target'),
        Markup.callbackButton(`Ik wil toch niets wijzigen en niets bewaren…`, 0)
      ]
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Wat wil je wijzigen?`, Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra()))
        .then(() => {
          if (ctx.update.callback_query && ctx.session.more !== true) {
            ctx.deleteMessage(ctx.update.callback_query.message.message_id)
          }
        })
        .then(() => ctx.wizard.next())
    },

    // step 2: chosen what to edit, enter a value
    async (ctx) => {
      // console.log('edit raid step 2')
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed… \n*Je moet op een knop klikken 👆. Of */cancel* gebruiken om mij te resetten.*')
      }
      const editattr = ctx.update.callback_query.data
      if (editattr === '0') {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
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
          case 'gym':
            ctx.session.editattr = 'gym'
            question = `Je wilt de gym wijzigen\nWelke gym wordt het nu?\n*Voer een deel van de naam in, minimaal 2 tekens…*`
            // console.log('DBUG', ctx)
            return ctx.answerCbQuery(null, undefined, true)

              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.replyWithMarkdown(question))
              .then(() => {
                ctx.wizard.selectStep(6)
                return ctx.wizard.steps[6](ctx)
              })
          default:
            question = 'Ik heb geen idee wat je wilt wijzigen. \n*Gebruik */start* om het nog eens te proberen. Of ga terug naar de groep.*'
            return ctx.answerCbQuery(null, undefined, true)
              .then(() => ctx.replyWithMarkdown(question))
              .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
              .then(() => ctx.scene.leave())
        }
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(question))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.wizard.next())
      }
    },
    // step 3: enter new value or jump to 6 for entering a new gym
    async (ctx) => {
      // console.log('edit raid step 3')
      let key = ctx.session.editattr
      // console.log('KEY', key)
      let value = null
      // user has not just updated gym? If not expect text message
      if (key !== 'gymId') {
        value = ctx.update.message.text.trim()
      } else {
        value = ctx.session.newgymid
      }
      // console.log('VALUE', value)
      if (key === 'endtime' || key === 'start1') {
        let timevalue = inputTime(value)
        if (timevalue === false) {
          return ctx.replyWithMarkdown('Deze tijd is ongeldig… probeer het nog eens.\nAls je er niet uitkomt, kan je altijd stoppen met /cancel')
        }
        if (key === 'start1') {
          let endtime = moment.unix(ctx.session.editraid.endtime)
          let start = moment.unix(ctx.session.editraid.endtime).subtract(45, 'minutes')
          let start1 = moment.unix(timevalue)
          if (start.diff(moment(start1)) > 0 || endtime.diff(start1) < 0) {
            return ctx.replyWithMarkdown('Deze tijd is ongeldig… probeer het nog eens.\nAls je er niet uitkomt, kun je altijd helemaal stoppen met /cancel')
          }
        }
        value = timevalue
      }
      // Handle the raidboss:
      if(key === 'target') {
        const target = ctx.update.message.text.trim()
        // let's see if we can find the raidboss…
        let boss = await models.Raidboss.find({
          where: {
            name: target
          }
        })
        console.log('BOSS', boss)
        if(boss !== null) {
          ctx.session.editraid.target = boss.name
          ctx.session.editraid.bossid = boss.id
          ctx.session.editraid.accounts = boss.accounts
        } else {
          ctx.session.editraid.target = target
          ctx.session.editraid.accounts = null
          ctx.session.editraid.bossid = null
        }
      }
      else{
        ctx.session.editraid[key] = value
      }
      // console.log('next…')
      ctx.wizard.selectStep(4)
      return ctx.wizard.steps[4](ctx)
    },

    // step 4: do more or save?
    async (ctx) => {
      // console.log('edit raid step 4')
      let out = `Tot ${moment.unix(ctx.session.editraid.endtime).format('HH:mm')}: *${ctx.session.editraid.target}*\n${ctx.session.editraid.bossid !== null?('Aanbevolen: '+ctx.session.editraid.accounts+' accounts\n'):''}${ctx.session.editraid.gymname}\nStart: ${moment.unix(ctx.session.editraid.start1).format('HH:mm')}\n\n`
      return ctx.replyWithMarkdown(`Dit zijn nu de raid gegevens:\n\n${out}*Wat wil je nu doen?*`, Markup.inlineKeyboard([
        Markup.callbackButton('Opslaan en afsluiten', 0),
        Markup.callbackButton('Nog iets wijzigen aan deze raid', 1),
        Markup.callbackButton('Annuleren', 2)
      ], {columns: 1})
        .removeKeyboard()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },

    // step 5: save & exit or jump to 2
    async (ctx) => {
      // console.log('edit raid step 5')
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken 👆. Of */cancel* gebruiken om mij te resetten.*')
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
                target: ctx.session.editraid.target,
                gymId: ctx.session.editraid.gymId,
                raidbossId: ctx.session.editraid.bossid
              },
              {
                where: {
                  id: ctx.session.editraid.id
                }
              }
            )
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
              .then(() => {
                ctx.replyWithMarkdown('Dankjewel.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start')
              })
              .then(() => ctx.scene.leave())
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
            .then(() => ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start'))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.editraid = null
              return ctx.scene.leave()
            })
      }
    },
    // =======

    // step 6: handle gym search
    async (ctx) => {
      // console.log('DBUG2', ctx.update.message)

      // why do i need this??
      if(ctx.update.message === undefined) {
        return // ctx.replyWithMarkdown(`Minimaal 2 tekens van de gymnaam…\n*Probeer het nog eens.* 🤨`)
      }

      const term = ctx.update.message.text.trim()
      let btns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(`Minimaal 2 tekens van de gymnaam…\n*Probeer het nog eens.* 🤨`)
        // .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          // ToDo: check dit dan...
          return ctx.replyWithMarkdown(`Ik kon geen gym vinden met '${term === '/start help_fromgroup' ? '' : term}' in de naam…\n*Probeer het nog eens*\nGebruik /cancel om te stoppen.`)
          // .then(() => ctx.wizard.back())
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push(
            {
              gymname: candidates[i].gymname, id: candidates[i].id
            }
          )
          btns.push(Markup.callbackButton(candidates[i].gymname, i))
        }

        btns.push(Markup.callbackButton('Mijn gym staat er niet bij…', candidates.length))
        ctx.session.gymcandidates.push(
          {
            name: 'none',
            id: 0
          }
        )
        return ctx.replyWithMarkdown('Kies de nieuwe gym.', Markup.inlineKeyboard(btns,
          {
            columns: 1
          }
        ).removeKeyboard().extra())
          .then(() => ctx.wizard.next())
      }
    },

    // step 7: handle gym selection
    async (ctx) => {
      // console.log('edit raid step 7')
      let gymIndex = ctx.update.callback_query.data
      let selectedGym = ctx.session.gymcandidates[gymIndex]
      if (selectedGym.id === 0) {
        // mmm, let's try searching for a gym again
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.replyWithMarkdown(`We gaan opnieuw zoeken. \nGebruik /cancel als je wilt stoppen\n*Voer een deel van de naam in, minimaal 2 tekens…*`))
          .then(() => {
            ctx.wizard.selectStep(6)
            return ctx.wizard.steps[6](ctx)
          })
      } else {
        ctx.session.newgymid = selectedGym.id
        ctx.session.editraid.gymId = selectedGym.id
        ctx.session.editraid.gymname = selectedGym.gymname
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.wizard.selectStep(4)
            return ctx.wizard.steps[4](ctx)
          })
      }
    }
  )
}
module.exports = EditRaidWizard
