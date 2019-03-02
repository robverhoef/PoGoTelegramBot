// ===================
// add gym wizard
// Note: when adding steps, update the jump to Shiny reports, currently it is the 3rd step
// ===================
const WizardScene = require('telegraf/scenes/wizard')
var models = require('../models')
const moment = require('moment-timezone')
const { Markup } = require('telegraf')
const Sequelize = require('sequelize')
const lastExRaidPassDate = require('../util/lastExRaidPassDate')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')
const adminCheck = require('../util/adminCheck')

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
    if (raids[a].Gym.exRaidTrigger) {
      key += ' 💳'
    }
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
    statMessage += `${ctx.i18n.t('stats_your_total_raids_reported', { ownraids: ownraids })} \n`
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

function processPersonalRaids (raids, splice, ctx) {
  let statMessage = ''
  if (raids.length > 0) {
    statMessage += `${ctx.i18n.t('stats_total_times_joined') + ': *' + raids.length + '* \n'}`
    let gymcount = sortRaidsOnGymcount(raids)
    let joinedRaids = splice ? gymcount.splice(0, personalTop) : gymcount
    if (joinedRaids.length > 0) {
      statMessage += `_${ctx.i18n.t('stats_your_most_visited_gyms')}:_\n`
    }
    for (var i = 0; i < joinedRaids.length; i++) {
      statMessage += `- ${joinedRaids[i][0]}: *${joinedRaids[i][1]}${ctx.i18n.t('stats_times_visited')}*\n`
    }
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
  return processPersonalRaids(raids, true, ctx)
}

async function processPersonalExRaidGyms (user, start, end, ctx) {
  let raids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: start.unix()
      },
      [Op.and]: {
        endtime: {
          [Op.lt]: end.unix()
        }
      }
    },
    include: [
      {
        model: models.Gym,
        where: {
          'exRaidTrigger': true
        }
      },
      {
        model: models.Raiduser,
        where: {
          'uid': user.id
        }
      }
    ]
  })
  return processPersonalRaids(raids, false, ctx)
}

async function determinePersonalStats (user, time, ctx) {
  let statMessage = ''
  statMessage += await processPersonalOwnRaids(user, time, ctx)
  statMessage += await processPersonalJoinedRaids(user, time, ctx)
  return statMessage
}

async function determinePersonalExRaids (user, start, end, ctx) {
  let statMessage = ''
  statMessage += await processPersonalExRaidGyms(user, start, end, ctx)
  return statMessage
}

function processRaidcount (raids, ctx) {
  let statMessage = ''
  let gymcount = sortRaidsOnGymcount(raids).slice(0, globalTop)
  if (gymcount.length > 0) {
    statMessage += `${ctx.i18n.t('stats_total_reported_raids_everybody')}: *${raids.length}* \n`
    statMessage += `_${ctx.i18n.t('stats_most_reported_gyms')}:_\n`
    for (let i = 0; i < gymcount.length; i++) {
      statMessage += `- ${gymcount[i][0]}: *${gymcount[i][1]}${ctx.i18n.t('stats_times_visited')}*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

function getGymcounts (raids, countMethod) {
  let gyms = {}
  let total = 0
  for (var a = 0; a < raids.length; a++) {
    let key = raids[a].Gym.gymname
    let count = gyms[key]
    let totalRaid = countMethod(raids[a])

    if (!count) {
      count = totalRaid
    } else {
      count += totalRaid
    }
    gyms[key] = count
    total += totalRaid
  }
  return { gyms, total }
}

function processRaidVsRaidusers (raids, countAccounts, splice, ctx) {
  let filteredRaids = filterRaidsOnViability(raids)

  let raidTotals = getGymcounts(filteredRaids, raid => 1)
  let countMethod = !countAccounts ? raid => raid.Raidusers.length : raid => {
    let totals = 0
    for (const raiduser of raid.Raidusers) {
      totals += raiduser.accounts
    }
    return totals
  }

  let { gyms, total } = getGymcounts(filteredRaids, countMethod)

  let statMessage = ''
  let value = sortDictionaryOnValue(gyms)
  let gymcount = splice ? value.splice(0, globalTop) : value
  if (gymcount.length > 0) {
    if (countAccounts) {
      statMessage += `${ctx.i18n.t('stats_total_accounts_for_these_raids')}: *${total}* \n`
    } else {
      statMessage += `${ctx.i18n.t('stats_total_joins_for_these_raids')}: *${total}* \n`
    }
    statMessage += `_${ctx.i18n.t('stats_busiest_gyms_in_period')}:_\n`
    for (let i = 0; i < gymcount.length; i++) {
      statMessage += `- ${gymcount[i][0]}: *${gymcount[i][1]} ${countAccounts ? ctx.i18n.t('stats_accounts') : ctx.i18n.t('stats_joins')} ${`${ctx.i18n.t('stats_in')} ${raidTotals.gyms[gymcount[i][0]]} raids`}*\n`
    }
    statMessage += '\n'
  }
  return statMessage
}

function filterRaidsOnViability (raids) {
  let viableRaids = []
  for (const raid of raids) {
    // No raidusers? dont count
    if (raid.Raidusers.length === 0) {
      continue
    }

    // if raidboss is unknown, count it anyways:
    if (!raid.Raidboss) {
      viableRaids.push(raid)
      continue
    } else {
      // get the first number of accounts and compare it!
      let regex = /(\d)/g
      let match = regex.exec(raid.Raidboss.accounts)
      let minAccounts = match[1]
      let totals = 0
      for (const raiduser of raid.Raidusers) {
        totals += raiduser.accounts
      }

      // count the raid if it has one less than the required minimum
      if ((minAccounts - 1) <= totals) {
        viableRaids.push(raid)
      } else {
        // console.log(`Ignoring following raid on ${raid.target} on ${raid.Gym.gymname} because ${totals} < ${minAccounts - 1} needed for ${raid.Raidboss.name}`)
      }
    }
  }
  return viableRaids
}

function processAllRaids (raids, ctx) {
  let statMessage = processRaidcount(raids, ctx)
  statMessage += processRaidVsRaidusers(raids, false, true, ctx)
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

  let userCount = sortDictionaryOnValue(users).splice(0, globalTop)
  if (userCount.length > 0) {
    statMessage += `_${ctx.i18n.t('stats_top_raiders_period')}:_\n`
    for (let i = 0; i < userCount.length; i++) {
      let userId = userCount[i][0]
      statMessage += `- ${userNames[userId]}: *${userCount[i][1]} ${ctx.i18n.t('stats_times_raided')}*\n`
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
  let reporterCount = sortDictionaryOnValue(reporters).splice(0, globalTop)
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
      if (user !== null) {
        statMessage += `- ${user.tUsername}: *${reporterCount[i][1]}${ctx.i18n.t('stats_times_reported')}*\n`
      }
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
    include: [models.Gym, models.Raiduser, models.Raidboss]
  })
  let statMessage = processAllRaids(raids, ctx)
  statMessage += processRaidusers(raids, ctx)
  statMessage += await processRaidreporters(raids, ctx)

  return statMessage
}

async function determineGlobalExRaids (start, end, ctx) {
  let raids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: start.unix()
      },
      [Op.and]: {
        endtime: {
          [Op.lt]: end.unix()
        }
      }
    },
    include: [
      {
        model: models.Gym,
        where: {
          'exRaidTrigger': true
        }
      }, models.Raiduser, models.Raidboss]
  })
  let statMessage = processRaidVsRaidusers(raids, true, false, ctx)

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

async function isAdmin (ctx, bot) {
  const user = ctx.from
  let admins = await bot.telegram.getChatAdministrators(process.env.GROUP_ID)
  // or marked admin from database
  let dbAdmin = await models.User.findOne({
    where: {
      tId: {
        [Op.eq]: user.id
      },
      [Op.and]: {
        isAdmin: true
      }
    }
  })
  for (let a = 0; a < admins.length; a++) {
    if (admins[a].user.id === user.id || dbAdmin !== null) {
      return true
    }
  }
  return false
}

var StatsWizard = function (bot) {
  return new WizardScene('stats-wizard',
    // Step 0: Get the info requested
    async (ctx) => {
      await setLocale(ctx)
      ctx.session.statbtns = [
        ctx.i18n.t('stats_my_statistics'),
        ctx.i18n.t('stats_total_statistics')
      ]
      if (await isAdmin(ctx, bot)) {
          ctx.session.statbtns.push(ctx.i18n.t('sh_stats_btn_report'))
          ctx.session.statbtns.push(ctx.i18n.t('sh_stats_btn_show'))
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('stats_see_which_stats_question'), Markup.keyboard(ctx.session.statbtns)
        .oneTime()
        .resize()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.chosenStat = ctx.session.statbtns.indexOf(ctx.update.message.text)
      if (ctx.session.chosenStat === 2) {
          // 4rd function
          ctx.wizard.selectStep(3)
          return ctx.wizard.steps[3](ctx)
      }
      if (ctx.session.chosenStat === 3) {
          // 10th function
          ctx.wizard.selectStep(7)
          return ctx.wizard.steps[7](ctx)
      }
      if (ctx.session.chosenStat === -1) {
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong'), Markup.removeKeyboard().extra())
      }

      let dates = await lastExRaidPassDate()

      ctx.session.periodbtns = [
        ctx.i18n.t('stats_today'),
        ctx.i18n.t('stats_this_week'),
        ctx.i18n.t('stats_this_month'),
        ctx.i18n.t('stats_this_year'),
        ctx.i18n.t('stats_expass_today', { dates: dates }),
        ctx.i18n.t('stats_expass_prev_period', { dates: dates })
      ]

      return ctx.replyWithMarkdown(ctx.i18n.t('stats_see_which_period_question'), Markup.keyboard(ctx.session.periodbtns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      let chosenStat = ctx.session.chosenStat
      let chosenTime = ctx.session.periodbtns.indexOf(ctx.update.message.text)
      let statMessage = ''
      if (chosenTime < 4) {
        let time = determineChosenTime(chosenTime)
        if (chosenStat === 0) {
          statMessage = await determinePersonalStats(ctx.from, time, ctx)
        }
        if (chosenStat === 1) {
          statMessage = await determineGlobalStats(time, ctx)
        }
        statMessage = `*${ctx.i18n.t('stats_since', {
          timestr: moment.unix(time).format('DD-MM-YYYY')
        })}*\n\n` + statMessage
      } else { // ex raid stats
        let start
        let end
        let dates = await lastExRaidPassDate()
        if (chosenTime === 4) {
          start = dates.lastExwaveDate
          end = moment()
        }
        if (chosenTime === 5) {
          start = dates.secondToLastExwaveDate
          end = dates.lastExwaveDate
        }
        if (chosenStat === 0) {
          statMessage = await determinePersonalExRaids(ctx.from, start, end, ctx)
        }
        if (chosenStat === 1) {
          statMessage = await determineGlobalExRaids(start, end, ctx)
        }

        statMessage = `*${ctx.i18n.t('stats_exraid_since', { timestr: start.format('DD-MM-YYYY HH:mm'), endtimestr: end.format('DD-MM-YYYY HH:mm') })}:*\n\n` + statMessage
      }

      if (statMessage === '') {
        statMessage = ctx.i18n.t('stats_no_stat_identified')
      }

      let message = `${statMessage}\n${ctx.i18n.t('stats_finished')}`
      return ctx.replyWithMarkdown(message, Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    },
    // Report Shiny
    async (ctx) => {
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }
      const startfrom = moment().subtract(1, 'h').unix()
      const startuntil = moment().unix()
      const raids = await models.Raid.findAll({
        include: [models.Gym, models.Raiduser],
        where: {
          start1: {
            [Op.between]:[startfrom, startuntil]
          }
        }
      })
      console.log(raids.length, `${ctx.i18n.t('sh_stats_no_raids')}`)
      if (raids.length === 0) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_no_raids')}`, Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
      }
      ctx.session.sraids = raids.map((el) => {
        return {
          id: el.id,
          label: moment(el.start1 * 1000).format('HH:mm') + ' ' + el.Gym.gymname + ' ' + el.target
        }
      })
      return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_report_intro')}`, Markup.keyboard(ctx.session.sraids.map(el => el.label)).resize().oneTime().extra())
      .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text
      ctx.session.raidId = 0
      for (const raid of ctx.session.sraids) {
        if (raid.label === input) {
            ctx.session.raidId = raid.id
        }
      }
      return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_input_question')}`, Markup.removeKeyboard().extra())
      .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text.split(' ')
      const accounts = parseInt(input[0])
      const shinies = parseInt(input[1])
      let validated = true
      if (accounts.toString() !== input[0] || shinies.toString() !== input[1] || accounts < shinies) {
          validated = false
      }
      if (validated) {
        ctx.session.accounts = accounts
        ctx.session.shinies = shinies
        return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_input', {
          shinies: shinies,
          accounts: accounts
        })}\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
      }
      return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_input_wrong')}`)
    },
    async (ctx) => {
      const confirm = ctx.update.message.text
      if(confirm == ctx.i18n.t('yes')) {
        // save…
        try {
          models.Raid.update({
            shiny: ctx.session.shinies,
            accountsplayed: ctx.session.accounts
          },{
            where: {
              id: ctx.session.raidId
            }
          })
        } catch (error) {
          console.log('ERROR WHILE SAVING SHINY STATS', error.message)
          return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_save_failed')}`)
          .then(() => ctx.scene.leave())
        }
        return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_save_success')}`, Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())

      }
      // don't save
      return ctx.replyWithMarkdown(`${ctx.i18n.t('sh_stats_save_canceled')}`, Markup.removeKeyboard().extra())
      .then(() => ctx.scene.leave())
    },
    // Show Shiny stats
    async (ctx) => {
      const results = await models.sequelize.query('select target, sum(shiny) as shiny, sum(accountsplayed) as players from raids where shiny is not null and accountsplayed is not null group by target', { type: models.sequelize.QueryTypes.SELECT})
      console.log(results)
      if (results.length > 0) {
          let out = `${ctx.i18n.t('sh_stats_head')}\n\n`
          for (const result of results) {
            console.log('result:', result)
            out += `*${result.target}:* ${result.shiny} shiny, ${result.players} accounts; ${Math.round(result.shiny*100/result.players)}%\n`
          }
          out += `${ctx.i18n.t('sh_stats_done')}`
          return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = StatsWizard
