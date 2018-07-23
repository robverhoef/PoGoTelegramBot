const moment = require('moment-timezone')
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

// The timezone
moment.tz.setDefault(process.env.TZ)

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
        models.Raiduser
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
    out += `${raids[a].Gym.gymname}\n`
    if (raids[a].Gym.exRaidTrigger) {
      out += `ExRaid Trigger\n`
    }
    if (raids[a].Gym.googleMapsLink) {
      out += `[Kaart](${raids[a].Gym.googleMapsLink})\n`
    }
    const strtime = moment.unix(raids[a].start1)
    out += `Start: ${strtime.format('H:mm')} `
    let userlist = ''
    let accounter = 0
    for (var b = 0; b < raids[a].Raidusers.length; b++) {
      accounter += raids[a].Raidusers[b].accounts
      userlist += `[${raids[a].Raidusers[b].username}](tg://user?id=${raids[a].Raidusers[b].uid}) `
    }
    out += `Aantal: ${accounter}\n`
    out += `Deelnemers: ${userlist}`
    out += '\n\n'
  }
  // console.log('listRaids output:', out)
  return out
}
