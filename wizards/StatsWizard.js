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

async function processPersonalOwnRaids (user, time, ctx) {
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
    statMessage += `${ctx.i18n.t('stats_stats_your_total_raids_reported', {ownraids: ownraids})} \n`
    let ownedRaids = sortRaidsOnGymcount(ownraids).slice(0, personalTop)
    if (ownedRaids.length > 0) {
      statMessage += `_${ctx.i18n.t('stats_your_most_reported_gyms')}:_\n`
    }
    for (let i = 0; i < ownedRaids.length; i++) {
      statMessage += `- ${ownedRaids[i][0]}: *${ownedRaids[i][1]}${ctx.i18n.t('stats_times_reported')}*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

async function processPersonalJoinedRaids (user, time, ctx) {
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
    statMessage += `${ctx.i18n.t('stats_total_times_joined')}: *${raids.length}* \n`
    let joinedRaids = sortRaidsOnGymcount(raids).slice(0, personalTop)
    if (joinedRaids.length > 0) {
      statMessage += `_${ctx.i18n.t('stats_your_most_visited_gyms')}:_\n`
    }
    for (var i = 0; i < joinedRaids.length; i++) {
      statMessage += `- ${joinedRaids[i][0]}: *${joinedRaids[i][1]}${ctx.i18n.t('stats_times_visted')}*\n`
    }
  }
  return statMessage
}

async function determinePersonalStats (user, time, ctx) {
  let statMessage = ''
  statMessage += await processPersonalOwnRaids(user, time, ctx)
  statMessage += await processPersonalJoinedRaids(user, time, ctx)
  return statMessage
}

function processRaidcount (raids, ctx) {
  let statMessage = ''
  let gymcount = sortRaidsOnGymcount(raids).slice(0, globalTop)
  if (gymcount.length > 0) {
    statMessage += `${ctx.i18n.t('stats_total_reported_raids_everybody')}: *${raids.length}* \n`
    statMessage += `_${ctx.i18n.t('stats_most_reported_gyms')}:_\n`
    for (let i = 0; i < gymcount.length; i++) {
      statMessage += `- ${gymcount[i][0]}: *${gymcount[i][1]}${ctx.i18n.t('stats_times_visted')}*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

function processRaidVsRaisusers (raids, ctx) {
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
    statMessage += `${ctx.i18n.t('stats_total_joins_for_these_raids')}: *${total}* \n`
    statMessage += `_${ctx.i18n.t('stats_busiest_gyms_in_period')}:_\n`
    for (let i = 0; i < gymcount.length; i++) {
      statMessage += `- ${gymcount[i][0]}: *${gymcount[i][1]}${ctx.i18n.t('stats_times_visted')}*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

function processAllRaids (raids, ctx) {
  let statMessage = processRaidcount(raids, ctx)

  statMessage += processRaidVsRaisusers(raids, ctx)

  return statMessage
}

function processRaidusers (raids, ctx) {
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
    statMessage += `_${ctx.i18n.t('stats_top_raiders_period')}:_\n`
    for (let i = 0; i < userCount.length; i++) {
      let userId = userCount[i][0]
      statMessage += `- ${userNames[userId]}: *${userCount[i][1]}${ctx.i18n.t('stats_times_raided')}*\n`
    }
    statMessage += '\n'
  }

  return statMessage
}

async function processRaidreporters (raids, ctx) {
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
    statMessage += `_${ctx.i18n.t('stats_heroes_most_reported')}:_\n`
    for (let i = 0; i < reporterCount.length; i++) {
      let reporterId = reporterCount[i][0]
      let user = await models.User.findOne({
        where: {
          tId: {
            [Op.eq]: reporterId
          }
        }
      })

      statMessage += `- ${user.tUsername}: *${reporterCount[i][1]}${ctx.i18n.t('stats_times_reported')}*\n`
    }
  }
  return statMessage
}

async function determineGlobalStats (time, ctx) {
  let raids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: time
      }
    },
    include: [models.Gym, models.Raiduser]
  })
  let statMessage = processAllRaids(raids, ctx)
  statMessage += processRaidusers(raids, ctx)
  statMessage += await processRaidreporters(raids, ctx)

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
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }

      let btns = []
      btns.push(Markup.callbackButton(ctx.i18n.t('stats_my_statistics'), 0))
      btns.push(Markup.callbackButton(ctx.i18n.t('stats_total_statistics'), 1))

      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('stats_see_which_stats_question'), Markup.inlineKeyboard(btns, {
          wrap: (btn, index, currentRow) => 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
          .then(() => {
            ctx.session.chosenStat = null
            return ctx.scene.leave()
          })
      }

      ctx.session.chosenStat = parseInt(ctx.update.callback_query.data)

      let btns = []
      btns.push(Markup.callbackButton(ctx.i18n.t('stats_today'), 0))
      btns.push(Markup.callbackButton(ctx.i18n.t('stats_this_week'), 1))
      btns.push(Markup.callbackButton(ctx.i18n.t('stats_this_month'), 2))
      btns.push(Markup.callbackButton(ctx.i18n.t('stats_this_year'), 3))

      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('stats_see_which_period_question'), Markup.inlineKeyboard(btns, {
          wrap: (btn, index, currentRow) => 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
          .then(() => {
            ctx.session.chosenStat = null
            return ctx.scene.leave()
          })
      }

      let chosenStat = ctx.session.chosenStat
      let chosenTime = parseInt(ctx.update.callback_query.data)

      let time = determineChosenTime(chosenTime)

      let statMessage = ''
      if (chosenStat === 0) {
        statMessage = await determinePersonalStats(ctx.from, time, ctx)
      }
      if (chosenStat === 1) {
        statMessage = await determineGlobalStats(time, ctx)
      }

      if (statMessage === '') {
        statMessage = ctx.i18n.t('stats_no_stat_identified')
      } else {
        statMessage = `*${ctx.i18n.t('stats_since', {
          timestr: moment.unix(time).format('DD-MM-YYYY')
        })}*\n\n` + statMessage
      }

      let message = `${statMessage}\n${ctx.i18n.t('stats_finished')}`

      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(message))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = StatsWizard
