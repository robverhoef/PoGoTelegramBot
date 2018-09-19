// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
var models = require('../models')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

const personalTop = 10
const globalTop = 10

function sortDictionaryOnValue (dictionary) {
  let items = Object.keys(dictionary).map(function (key) {
    return [key, dictionary[key]]
  })

  // Sort the array based on the second element
  items.sort(function (first, second) {
    return second[1] - first[1]
  })
  return items
}

function sortRaidsOnGymcount (raids) {
  let gyms = {}
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

  return sortDictionaryOnValue(gyms)
}

async function processPersonalOwnRaids (user, time) {
  let ownraids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: time
      },
      reporterId: {
        [Op.eq]: user.id
      }
    },
    include: [models.Gym]
  })

  let statMessage = ''
  if (ownraids.length > 0) {
    statMessage += `Totaal aantal raids door jou gemeld: *${ownraids.length}* \n`
    let ownedRaids = sortRaidsOnGymcount(ownraids).slice(0, personalTop)
    if (ownedRaids.length > 0) {
      statMessage += `_Jouw meest gemelde gyms:_\n`
    }
    for (let i = 0; i < ownedRaids.length; i++) {
      statMessage += `- ${ownedRaids[i][0]}: *${ownedRaids[i][1]}x gemeld*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

async function processPersonalJoinedRaids (user, time) {
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
  let statMessage = ''
  if (raids.length > 0) {
    statMessage += `Totaal keer aangemeld voor raids: *${raids.length}* \n`
    let joinedRaids = sortRaidsOnGymcount(raids).slice(0, personalTop)
    if (joinedRaids.length > 0) {
      statMessage += `_Jouw meest bezochte gyms:_\n`
    }
    for (var i = 0; i < joinedRaids.length; i++) {
      statMessage += `- ${joinedRaids[i][0]}: *${joinedRaids[i][1]}x bezocht*\n`
    }
  }
  return statMessage
}

async function determinePersonalStats (user, time) {
  let statMessage = ''
  statMessage += await processPersonalOwnRaids(user, time)
  statMessage += await processPersonalJoinedRaids(user, time)
  return statMessage
}

function processRaidcount (raids) {
  let statMessage = ''
  let gymcount = sortRaidsOnGymcount(raids).slice(0, globalTop)
  if (gymcount.length > 0) {
    statMessage += `Totaal aantal raids gemeld door iedereen: *${raids.length}* \n`
    statMessage += `_De meest gemelde gyms waren:_\n`
    for (let i = 0; i < gymcount.length; i++) {
      statMessage += `- ${gymcount[i][0]}: *${gymcount[i][1]}x gemeld*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

function processRaidVsRaisusers (raids) {
  let gyms = {}
  let total = 0
  for (var a = 0; a < raids.length; a++) {
    let key = raids[a].Gym.gymname
    let count = gyms[key]
    let totalRaid = raids[a].Raidusers.length
    if (!count) {
      count = totalRaid
    } else {
      count += totalRaid
    }
    gyms[key] = count
    total += totalRaid
  }
  let statMessage = ''
  let gymcount = sortDictionaryOnValue(gyms).splice(0, globalTop)
  if (gymcount.length > 0) {
    statMessage += `Totaal aantal aanmeldigen voor al deze raids: *${total}* \n`
    statMessage += `_De drukst bezochte gyms van deze periode waren:_\n`
    for (let i = 0; i < gymcount.length; i++) {
      statMessage += `- ${gymcount[i][0]}: *${gymcount[i][1]}x bezocht*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

function processAllRaids (raids) {
  let statMessage = processRaidcount(raids)

  statMessage += processRaidVsRaisusers(raids)

  return statMessage
}

function processRaidusers (raids) {
  let statMessage = ''
  let users = {}
  let userNames = {}
  for (let a = 0; a < raids.length; a++) {
    for (let b = 0; b < raids[a].Raidusers.length; b++) {
      let key = raids[a].Raidusers[b].uid
      let count = users[key]
      if (!count) {
        count = 1
      } else {
        count++
      }
      users[key] = count
      userNames[key] = raids[a].Raidusers[b].username
    }
  }

  let userCount = sortDictionaryOnValue(users).slice(0, globalTop)
  if (userCount.length > 0) {
    statMessage += `_De top raiders van deze periode waren:_\n`
    for (let i = 0; i < userCount.length; i++) {
      let userId = userCount[i][0]
      statMessage += `- ${userNames[userId]}: *${userCount[i][1]}x geraid*\n`
    }
    statMessage += '\n'
  }

  return statMessage
}

async function processRaidreporters (raids) {
  let statMessage = ''
  let reporters = {}
  for (let a = 0; a < raids.length; a++) {
    let reporterKey = raids[a].reporterId
    let reporterCount = reporters[reporterKey]
    if (!reporterCount) {
      reporterCount = 1
    } else {
      reporterCount++
    }
    reporters[reporterKey] = reporterCount
  }
  let reporterCount = sortDictionaryOnValue(reporters).slice(0, globalTop)
  if (reporterCount.length > 0) {
    statMessage += `_De volgende helden hebben de meeste raids gemeld:_\n`
    for (let i = 0; i < reporterCount.length; i++) {
      let reporterId = reporterCount[i][0]
      let user = await models.User.findOne({
        where: {
          tId: {
            [Op.eq]: reporterId
          }
        }
      })

      statMessage += `- ${user.tUsername}: *${reporterCount[i][1]}x gemeld*\n`
    }
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
    include: [models.Gym, models.Raiduser]
  })
  let statMessage = processAllRaids(raids)
  statMessage += processRaidusers(raids)
  statMessage += await processRaidreporters(raids)

  return statMessage
}

function determineChosenTime (chosenTime) {
  let starttime = moment()
  let time
  if (chosenTime === 0) {
    time = starttime.startOf('day').unix()
  } else if (chosenTime === 1) {
    time = starttime.startOf('week').unix()
  } else if (chosenTime === 2) {
    time = starttime.startOf('month').unix()
  } else {
    time = starttime.startOf('year').unix()
  }
  return time
}

var StatsWizard = function () {
  return new WizardScene('stats-wizard',
    // Step 0: Get the info requested
    async (ctx) => {
      ctx.session.statbtns = [`Mijn raid statistieken`, `Totale raid statistieken`]

      return ctx.replyWithMarkdown('Welke statistieken wil je inzien?', Markup.keyboard(ctx.session.statbtns)
        .oneTime()
        .resize()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.chosenStat = ctx.session.statbtns.indexOf(ctx.update.message.text)
      if (ctx.session.chosenStat === -1) {
        return ctx.replyWithMarkdown(`Hier ging iets niet goed…\n\n*Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
      }
      ctx.session.periodbtns = [
        `Vandaag`,
        `Deze week tot nu toe`,
        `Deze maand tot nu toe`,
        `Dit jaar tot nu toe`
      ]

      return ctx.replyWithMarkdown('Welke periode wil je inzien?', Markup.keyboard(ctx.session.periodbtns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      let chosenStat = ctx.session.chosenStat
      let chosenTime = ctx.session.periodbtns.indexOf(ctx.update.message.text)

      let time = determineChosenTime(chosenTime)

      let statMessage = ''
      if (chosenStat === 0) {
        statMessage = await determinePersonalStats(ctx.from, time)
      }
      if (chosenStat === 1) {
        statMessage = await determineGlobalStats(time)
      }

      if (statMessage === '') {
        statMessage = 'Er konden geen statistieken worden bepaald!'
      } else {
        statMessage = `*Statistieken vanaf ${moment.unix(time).format('DD-MM-YYYY')}*\n\n` + statMessage
      }

      let message = `${statMessage}\n*Wil je nog een actie uitvoeren? Klik dan hier op */start`

      return ctx.replyWithMarkdown(message, Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = StatsWizard
