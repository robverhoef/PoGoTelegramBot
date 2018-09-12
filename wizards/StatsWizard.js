// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
var models = require('../models')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function sortRaidsOnGymcount (raids) {
  var gyms = {}
  for (var a = 0; a < raids.length; a++) {
    let key = raids[a].Gym.gymname
    let count = gyms[key]
    if (!count) {
      count = 1
    } else {
      count++
    }
    gyms[key] = count
  }

  let items = Object.keys(gyms).map(function (key) {
    return [key, gyms[key]]
  })

  // Sort the array based on the second element
  items.sort(function (first, second) {
    return second[1] - first[1]
  })

  return items
}

async function determinePersonalStats (user, time) {
  let raids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: time
      }
    },
    include: [
      models.Gym,
      {
        model: models.Raiduser,
        where: {
          'uid': user.id
        }
      }
    ]
  })

  let statMessage = `Totaal aantal raids bezocht: *${raids.length}* \n\n`
  let items = sortRaidsOnGymcount(raids)
  let result = items.slice(0, 5)
  if(result.length > 0) {
    statMessage += `_Jouw meest bezochte gyms:_\n\n`
  }
  for (var i = 0; i < result.length; i++) {
    statMessage += `${result[i][0]}: *${result[i][1]}x bezocht*\n`;
  }
  return statMessage
}

async function determineGlobalStats (time) {
  let raids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: time
      }
    },
    include: [models.Gym]
  })

  let statMessage = `Totaal aantal raids bezocht door iedereen: *${raids.length}* \n\n`
  let items = sortRaidsOnGymcount(raids)

  let result = items.slice(0, 10)
  if (result.length > 0) {
    statMessage += `_De meest bezochte gyms waren:_\n\n`
  }
  for (var i = 0; i < result.length; i++) {
    statMessage += `${result[i][0]}: *${result[i][1]}x bezocht*\n`
  }
  return statMessage
}

function determineChosenTime (chosenTime) {
  let starttime = moment()
  let time
  if (chosenTime === 0) {
    time = starttime.subtract(7, 'days').unix()
  } else if (chosenTime === 1) {
    time = starttime.startOf('month').unix()
  } else if (chosenTime === 2) {
    time = starttime.subtract(3, 'months').unix()
  } else {
    time = starttime.startOf('year').unix()
  }
  return time
}

var StatsWizard = function () {
  return new WizardScene('stats-wizard',
    // Step 0: Get the info requested
    async (ctx) => {
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }

      let btns = []
      btns.push(Markup.callbackButton(`Mijn raid statistieken`, 0))
      btns.push(Markup.callbackButton(`Totale raid statistieken`, 1))

      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown('Welke statistieken wil je inzien?', Markup.inlineKeyboard(btns, {
          wrap: (btn, index, currentRow) => 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken. Of */cancel* gebruiken om mij te resetten*')
          .then(() => {
            ctx.session.chosenStat = null
            return ctx.scene.leave()
          })
      }

      ctx.session.chosenStat = parseInt(ctx.update.callback_query.data)

      let btns = []
      btns.push(Markup.callbackButton(`Laatste 7 dagen`, 0))
      btns.push(Markup.callbackButton(`Deze maand tot nu toe`, 1))
      btns.push(Markup.callbackButton(`Laatste 3 maanden`, 2))
      btns.push(Markup.callbackButton(`Dit jaar tot nu toe`, 3))

      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown('Welke periode wil je inzien?', Markup.inlineKeyboard(btns, {
          wrap: (btn, index, currentRow) => 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken. Of */cancel* gebruiken om mij te resetten*')
          .then(() => {
            ctx.session.chosenStat = null
            return ctx.scene.leave()
          })
      }

      let chosenStat = ctx.session.chosenStat
      let chosenTime = parseInt(ctx.update.callback_query.data)

      let time = determineChosenTime(chosenTime);

      let statMessage = ''
      if (chosenStat === 0) {
        statMessage = await determinePersonalStats(ctx.from, time)
      }
      if (chosenStat === 1) {
        statMessage = await determineGlobalStats(time)
      }

      if (statMessage === '') {
        statMessage = 'Er konden geen statistieken worden bepaald!'
      }


      let message = `${statMessage}\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`

      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(message))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = StatsWizard
