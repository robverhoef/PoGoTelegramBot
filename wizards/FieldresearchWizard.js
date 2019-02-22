// ===================
// Field Research wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const moment = require('moment-timezone')
const listRaids = require('../util/listRaids')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

async function researchExists (stopId) {
  let today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  let researches = await models.Fieldresearch.findAll({
    where: {
      [Op.and]: [
        {
          createdAt: { [Op.gt]: today }
        }, {
          stopId: stopId
        }
      ]
    }
  })
  if (researches.length === 0) {
    return false
  } else {
    return true
  }
}
async function listResearches () {
  let today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  let researches = await models.Fieldresearch.findAll({
    where: {
      createdAt: {
        [Op.gt]: today
      }
    },
    include: [
      {
        model: models.Stop
      }
    ]
  })
  return researches
}
// List research options
async function listResearchOptionButtons () {
  const frkeys = await models.Fieldresearchkey.findAll({
    order: [
      ['label', 'ASC']
    ]
  })
  let out = []
  for (let key of frkeys) {
    out.push(key.label)
  }
  return out
}

function FielresearchWizard (bot) {
  const wizsteps = {
    mainmenu: 0,
    listresearch: 2,
    addresearch: 3,
    editresearch: 8,
    deleteresearch: 11,
    cancelresearch: 14
  }

  return new WizardScene('fieldresearch-wizard',
    // Field Research menu
    async (ctx) => {
      ctx.session.newresearch = {}
      // ToDo: delete all researches from previous days?
      ctx.session.mainreseachbtns = [
        ['Lijst tonen', 'listresearch'],
        ['Research toevoegen', 'addresearch'],
        ['Research aanpassen', 'editresearch'],
        ['Research verwijderen', 'deleteresearch'],
        ['Annuleren', 'cancelresearch']
      ]
      return ctx.replyWithMarkdown(`Hallo ${ctx.from.first_name}! \r\n\r\n*Wat wil je doen?*`, Markup.keyboard(ctx.session.mainreseachbtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // return ctx.replyWithMarkdown('Handle choice…')
      let nextStep = 0
      for (let i = 0; i < ctx.session.mainreseachbtns.length; i++) {
        if (ctx.session.mainreseachbtns[i][0] === ctx.update.message.text) {
          nextStep = ctx.session.mainreseachbtns[i][1]
          break
        }
      }
      ctx.wizard.selectStep(wizsteps[nextStep])
      return ctx.wizard.steps[wizsteps[nextStep]](ctx)
    },

    // -----------------
    // list Field Researches
    // -----------------
    async (ctx) => {
      let researches = await listResearches()
      let out = ''
      if (researches.length === 0) {
        out = 'Er zijn voor vandaag nog geen Field Researches gemeld…\r\n\r\n'
        out += '*Wil je nog een actie uitvoeren? Klik dan op */start'
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      out = `*Field Researches voor vandaag:*\r\n`
      for (let res of researches) {
        out += `\r\n*${res.name}*\r\n`
        out += `[${res.Stop.name}](${res.Stop.googleMapsLink}) toegevoegd door: [${res.reporterName}](tg://user?id=${res.reporterId})`
        out += `\r\n`
      }
      out += `\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`

      return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    },
    // -----------------
    // add fieldresearch
    // -----------------
    async (ctx) => {
      return ctx.replyWithMarkdown(`Je wilt een nieuwe Field Research toevoegen. Hier vind je een [lijst met Field Researches en beloningen ↗️](https://thesilphroad.com/research-tasks). \r\n\r\nWe gaan eerst de stop zoeken.\n\n*Gebruik de knop 'Zoek stops in mijn omgeving…'*\r\nOf voer een deel van de naam in, minimaal 2 tekens… \r\n`, Markup.keyboard([{ text: 'Zoek stops in mijn omgeving…', request_location: true }]).resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let candidates = []
      ctx.session.stopcandidates = []
      if (ctx.update.message.location) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 0.35 // max radius
        let $sql = `SELECT id, name, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM stops WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Stop,
          mapToModel: true // pass true here if you have any mapped fields
        })
      } else {
        let term = ctx.update.message.text.trim()
        if (term.length < 2) {
          return ctx.replyWithMarkdown(`Geef minimaal 2 tekens van de stopnaam…\n*Probeer het nog eens.* 🧐`)
        }
        candidates = await models.Stop.findAll({
          where: {
            name: { [Op.like]: '%' + term + '%' }
          }
        })
      }
      if (candidates.length === 0) {
        return ctx.replyWithMarkdown(`Ik kon geen stop vinden…\nGebruik /cancel om te stoppen.\n*Of probeer het nog eens door de naam in te vullen*`)
      }
      ctx.session.stopcandidates = []
      for (let i = 0; i < candidates.length; i++) {
        ctx.session.stopcandidates.push([
          candidates[i].name.trim(),
          candidates[i].id
        ])
      }
      ctx.session.stopcandidates.push([
        'Mijn stop staat er niet bij…', 0
      ])

      return ctx.replyWithMarkdown('Kies een stop.', Markup.keyboard(ctx.session.stopcandidates.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.stopcandidates.length; i++) {
        if (ctx.session.stopcandidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch stop not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`Er ging iets fout bij het kiezen van de stop.\n*Gebruik */start* om het nog eens te proberen…*\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the stop
      if (ctx.session.stopcandidates[selectedIndex][1] === 0) {
        ctx.replyWithMarkdown(`*Probeer het nog eens…*\nJe kan ook altijd stoppen door /cancel te typen`, Markup.removeKeyboard().extra())
        ctx.wizard.selectStep(wizsteps.addresearch)
        return ctx.wizard.steps[wizsteps.addresearch](ctx)
      } else {
        // retrieve selected candidate from session
        let selectedstop = ctx.session.stopcandidates[selectedIndex]
        ctx.session.newresearch.stopId = selectedstop[1]
        ctx.session.newresearch.stopName = selectedstop[0]
        if (await researchExists(ctx.session.newresearch.stopId)) {
          return ctx.replyWithMarkdown(`Er is al een Field Research op deze stop gemeld!\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`)
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
      }
      const frkeys = await listResearchOptionButtons()
      return ctx.replyWithMarkdown(`*Wat moet je doen voor deze quest?*\r\nKlik op een knop of typ de quest als het niet in de lijst staat.`,
        Markup.keyboard(frkeys).oneTime().resize().extra()
      )
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.newresearch.what = ctx.update.message.text
      return ctx.replyWithMarkdown(`*${ctx.session.newresearch.what}*\r\n${ctx.session.newresearch.stopName}\r\n\r\n*Opslaan?*`, Markup.keyboard(['Ja', 'Nee']).resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let out = ''
      if (ctx.update.message.text === 'Ja') {
        // console.log('USER SAYS YES TO SAVING RESEARCH')
        let research = models.Fieldresearch.build({
          StopId: ctx.session.newresearch.stopId,
          name: ctx.session.newresearch.what,
          reporterName: ctx.from.first_name,
          reporterId: ctx.from.id
        })
        try {
          await research.save()
        } catch (error) {
          console.log('Whoops… saving new Field Research failed', error)
          return ctx.replyWithMarkdown(`Sorry, hier ging iets *niet* goed… Wil je het nog eens proberen met /start?\n*Of je kan ook weer terug naar de groep gaan…*`, Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
        console.log(`Research toegevoegd ${JSON.stringify(ctx.session.newresearch)} door ${ctx.from.first_name}, ${ctx.from.id}`)
        // success...
        out += `*Top!*\r\nDe nieuwe Field Research voor ${ctx.session.newresearch.stopName} is opgeslagen\r\n\r\n`
        let researches = await listResearches()
        out += `*Field Researches voor vandaag:*\r\n`
        for (let res of researches) {
          out += `\r\n*${res.name}*\r\n`
          out += `[${res.Stop.name}](${res.Stop.googleMapsLink}) toegevoegd door: [${res.reporterName}](tg://user?id=${res.reporterId})`
          out += `\r\n`
        }
        out += `\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(async () => {
            ctx.session = {}
            let raidlist = await listRaids(`[${ctx.from.first_name}](tg://user?id=${ctx.from.id}) heeft een Field Research toegevoegd\n\n`)
            bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, { parse_mode: 'Markdown', disable_web_page_preview: true })
          })
          .then(() => ctx.scene.leave())
      } else if (ctx.update.message.text === 'Nee') {
        out += `OK.\r\n\r\n`
        let researches = await listResearches()
        out += `*Field Researches voor vandaag:*\r\n`
        for (let res of researches) {
          out += `\r\n*${res.name}*\r\n`
          out += `[${res.Stop.name}](${res.Stop.googleMapsLink}) toegevoegd door: [${res.reporterName}](tg://user?id=${res.reporterId})`
          out += `\r\n`
        }
        out += `\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
    },
    // -----------------
    // Edit fieldresearch
    // -----------------
    async (ctx) => {
      let today = moment()
      today.hours(0).minutes(0).seconds(0)
      let researches = await models.Fieldresearch.findAll({
        where: {
          createdAt: {
            [Op.gt]: today
          }
        },
        include: [
          {
            model: models.Stop
          }
        ]
      })
      let out = ''
      if (researches.length === 0) {
        out = 'Er zijn voor vandaag nog geen Field Researches gemeld…\r\n\r\n'
        out += '*Wil je nog een actie uitvoeren? Klik dan op */start'
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.candidates = []
      out = `*Welke Field Research wil je wijzigen?*`
      for (let res of researches) {
        ctx.session.candidates.push(res)
      }
      return ctx.replyWithMarkdown(out, Markup.keyboard(ctx.session.candidates.map(el => el.Stop.name)).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.editresearch = null
      for (let candidate of ctx.session.candidates) {
        // console.log(candidate.Stop.name.trim(), '==', ctx.update.message.text)
        if (candidate.Stop.name.trim() === ctx.update.message.text) {
          ctx.session.editresearch = candidate
          break
        }
      }
      const frkeys = await listResearchOptionButtons()
      return ctx.replyWithMarkdown(`*Wat moet je doen voor deze quest?*\r\nKlik op een knop of typ de quest als het niet in de lijst staat.`,
        Markup.keyboard(frkeys).oneTime().resize().extra()
      )
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.editresearch.name = ctx.update.message.text
      // console.log('altered: ', ctx.session.editresearch)
      try {
        await ctx.session.editresearch.save()
      } catch (error) {
        console.log('Whoops… saving new Field Research failed', error)
        return ctx.replyWithMarkdown(`Sorry, hier ging iets *niet* goed… Wil je het nog eens proberen met /start?\n*Of je kan ook weer terug naar de groep gaan…*`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      let researches = await listResearches()
      let out = `OK, je wijziging is opgeslagen.\r\n\r\n*Field Researches voor vandaag:*\r\n`
      for (let res of researches) {
        out += `\r\n*${res.name}*\r\n`
        out += `[${res.Stop.name}](${res.Stop.googleMapsLink}) toegevoegd door: [${res.reporterName}](tg://user?id=${res.reporterId})`
        out += `\r\n`
      }
      out += `\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`

      return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
        .then(async () => {
          ctx.session = {}
          let raidlist = await listRaids(`[${ctx.from.first_name}](tg://user?id=${ctx.from.id}) heeft een Field Research gewijzigd\n\n`)
          bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, { parse_mode: 'Markdown', disable_web_page_preview: true })
        })
        .then(() => ctx.scene.leave())
    },
    // -----------------
    // remove fieldresearch
    // -----------------
    async (ctx) => {
      // console.log('DESTROY research')
      let today = moment()
      today.hours(0).minutes(0).seconds(0)
      let researches = await models.Fieldresearch.findAll({
        where: {
          createdAt: {
            [Op.gt]: today
          }
        },
        include: [
          {
            model: models.Stop
          }
        ]
      })
      let out = ''
      if (researches.length === 0) {
        out = 'Er zijn voor vandaag nog geen Field Researches gemeld…\r\n\r\n'
        out += '*Wil je nog een actie uitvoeren? Klik dan op */start'
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.candidates = []
      out = `Je wilt een Field Research verwijderen…\r\n\r\n*Welke Field Research wil je verwijderen?*`
      for (let res of researches) {
        ctx.session.candidates.push(res)
      }
      // the escape option
      ctx.session.candidates.push({ Stop: { name: 'Annuleren', id: 0 } })

      return ctx.replyWithMarkdown(out, Markup.keyboard(ctx.session.candidates.map(el => el.Stop.name)).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.destroyresearch = null
      if (ctx.update.message.text === 'Annuleren') {
        return ctx.replyWithMarkdown(`OK\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      for (let candidate of ctx.session.candidates) {
        if (candidate.Stop.name.trim() === ctx.update.message.text) {
          ctx.session.destroyresearch = candidate
          break
        }
      }
      if (ctx.session.destroyresearch === null) {
        return ctx.replyWithMarkdown(`*Wil je nog een actie uitvoeren? Klik dan op */start`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      return ctx.replyWithMarkdown(`Weet je zeker dat je deze wilt verwijderen?`, Markup.keyboard([['Ja', 'Nee, toch niet']]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      switch (ctx.update.message.text) {
        case 'Ja':
          // Delete…
          try {
            console.log('User wants to destroy ', ctx.session.destroyresearch.id)
            await models.Fieldresearch.destroy({
              where: {
                id: ctx.session.destroyresearch.id
              }
            })
          } catch (error) {
            console.log(`Kon ${JSON.stringify(ctx.session.destroyresearch)} niet verwijderen`, error)
            return ctx.replyWithMarkdown(`Mmmm, vreemd. Verwijderen is niet gelukt.\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`)
              .then(() => {
                ctx.session = {}
                return ctx.scene.leave()
              })
          }
          console.log(`Research verwijderd ${JSON.stringify(ctx.session.destroyresearch)} door ${ctx.from.first_name}, ${ctx.from.id}`)
          break
        default:
          console.log('removal canceled')
      }
      let researches = await listResearches()
      let out = ''
      if (researches.length === 0) {
        out = 'Er zijn nu geen Field Researches.\r\n\r\n'
        out += '*Wil je nog een actie uitvoeren? Klik dan op */start'
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      out = `OK…\r\n*Field Researches voor vandaag:*\r\n`
      for (let res of researches) {
        out += `\r\n*${res.name}*\r\n`
        out += `[${res.Stop.name}](${res.Stop.googleMapsLink}) toegevoegd door: [${res.reporterName}](tg://user?id=${res.reporterId})`
        out += `\r\n`
      }
      out += `\r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start`

      return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    },
    // -----------------
    // cancel fieldresearch
    // -----------------
    async (ctx) => {
      return ctx.replyWithMarkdown('OK… \r\n\r\n*Wil je nog een actie uitvoeren? Klik dan op */start', Markup.removeKeyboard().extra())
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    }
  )
}
module.exports = FielresearchWizard
