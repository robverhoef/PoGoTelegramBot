const moment = require('moment-timezone')
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

// The timezone
moment.tz.setDefault('Europe/Amsterdam')

/**
* Generate a presenatble list of current raids
* @param reason {string} - The reason why a new list raid was generated
*/
module.exports = async (reason) => {
  let out = ''
  let raids = await models.sequelize.query('SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,\'ONLY_FULL_GROUP_BY\',\'\'));')
    .then(() => models.Raid.findAll({
      include: [
        models.Gym,
        models.Raiduser,
        models.Raidboss
      ],
      where: {
        endtime: {
          [Op.gt]: moment().unix()
        }
      },
      order: [
        ['start1', 'ASC']
      ]
    }))

  if (raids.length === 0) {
    return null
  }
  out += reason
  for (let a = 0; a < raids.length; a++) {
    const endtime = moment.unix(raids[a].endtime)
    out += `Tot: ${endtime.format('H:mm')} `
    out += `*${raids[a].target}*\n`
    if (raids[a].Raidboss) {
      out += `Aanbevolen: ${raids[a].Raidboss.accounts} accounts\n`
    }
    if (raids[a].Gym.googleMapsLink) {
      out += `[${raids[a].Gym.gymname}](${raids[a].Gym.googleMapsLink})\n`
    } else {
      out += `${raids[a].Gym.gymname}\n`
    }
    if (raids[a].Gym.exRaidTrigger) {
      out += `💳 ExRaid Trigger\n`
    }
    const strtime = moment.unix(raids[a].start1)
    out += `Start: ${strtime.format('H:mm')} `
    let userlist = ''
    let accounter = 0
    for (var b = 0; b < raids[a].Raidusers.length; b++) {
      accounter += raids[a].Raidusers[b].accounts
      if (raids[a].Raidusers[b].delayed != null) {
        userlist += `[<⏰ ${raids[a].Raidusers[b].delayed} ${raids[a].Raidusers[b].username}>](tg://user?id=${raids[a].Raidusers[b].uid})${raids[a].Raidusers[b].accounts > 1 ? ('+' + (raids[a].Raidusers[b].accounts - 1)) : ''} `
      } else {
        userlist += `[${raids[a].Raidusers[b].username}](tg://user?id=${raids[a].Raidusers[b].uid})${raids[a].Raidusers[b].accounts > 1 ? ('+' + (raids[a].Raidusers[b].accounts - 1)) : ''} `
      }
    }
    out += `Aantal: ${accounter}\n`
    out += `Deelnemers: ${userlist}`
    out += `\n\n`
  }
  let today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  let researchcount = await models.Fieldresearch.count({
    where: {
      createdAt: {
        [Op.gt]: today
      }
    }
  })
  out += `De bot kent nu ${researchcount} Field Researches\r\n`
  // out += `\r\n[@${process.env.BOT_USERNAME}](https://telegram.me/${process.env.BOT_USERNAME}?start=mainmenu)`
  return out
}
