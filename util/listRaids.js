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
module.exports = async (reason, ctx) => {
  // save old user language
  ctx.session.oldlang = ctx.i18n.locale()

  // list should always be in default locale
  ctx.i18n.locale(process.env.DEFAULT_LOCALE)
  let out = reason
  const raids = await models.sequelize.query('SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,\'ONLY_FULL_GROUP_BY\',\'\'));')
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
  for (let a = 0; a < raids.length; a++) {
    const endtime = moment.unix(raids[a].endtime)
    out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
    out += `*${raids[a].target}*\n`
    if (raids[a].Raidboss) {
      out += `${ctx.i18n.t('recommended')}: ${raids[a].Raidboss.accounts} accounts\n`
    }
    if (raids[a].Gym.googleMapsLink) {
      out += `[${raids[a].Gym.gymname}](${raids[a].Gym.googleMapsLink})\n`
    } else {
      out += `${raids[a].Gym.gymname}\n`
    }
    if (raids[a].Gym.exRaidTrigger) {
      out += '💳 ExRaid Trigger\n'
    }
    const strtime = moment.unix(raids[a].start1)
    out += `${ctx.i18n.t('start')}: ${strtime.format('H:mm')} `
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
    out += `${ctx.i18n.t('number')}: ${accounter}\n`
    out += `${ctx.i18n.t('participants')}: ${userlist}`
    out += '\n\n'
  }

  const today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)

  const tomorrow = today.clone().add(1, 'day')

  // List today's Ex Raids
  // console.log('TODAYS EXRAIDS?')
  // console.log(`between ${today.unix()} and ${tomorrow.unix()}`)
  const exraids = await models.Exraid.findAll({
    include: [
      models.Gym,
      models.Exraiduser
    ],
    where: {
      [Op.and]: {
        // starts today
        start1: {
          [Op.gt]: today.unix()
        },
        endtime: {
          // and not finished yet
          [Op.gt]: moment().unix(),
          // and endtime must be today
          [Op.lt]: tomorrow.unix()
        }
      }
    },
    order: [
      ['start1', 'ASC'],
      [models.Exraiduser, 'hasinvite', 'DESC']
    ]
  })
  // console.log('\r\nEXRAIDS FOUND:')
  // for (const eraid of exraids) {
  //   console.log(eraid.Gym.gymname, eraid.target, eraid.start1)
  // }
  if (exraids.length > 0) {
    out += '------------------------------\n'
    out += '*EX RAIDS vandaag*\n'
    out += '------------------------------\n'
    for (const exraid of exraids) {
      const strtime = moment.unix(exraid.start1)
      // out += `${strtime.format('DD-MM-YYYY')} `

      const endtime = moment.unix(exraid.endtime)
      out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
      out += `*${exraid.target}*\n`
      if (exraid.Gym.googleMapsLink) {
        out += `[${exraid.Gym.gymname}](${exraid.Gym.googleMapsLink})\n`
      } else {
        out += `${exraid.Gym.gymname}\n`
      }
      out += `${ctx.i18n.t('start')}: ${strtime.format('H:mm')} `
      let userlist = ''
      let wantedlist = ''
      let accounter = 0
      for (var b = 0; b < exraid.Exraidusers.length; b++) {
        if (exraid.Exraidusers[b].hasinvite) {
          accounter += exraid.Exraidusers[b].accounts
          if (exraid.Exraidusers[b].delayed != null) {
            userlist += `[<⏰ ${exraid.Exraidusers[b].delayed} ${exraid.Exraidusers[b].username}>](tg://user?id=${exraid.Exraidusers[b].uid})${exraid.Exraidusers[b].accounts > 1 ? ('+' + (exraid.Exraidusers[b].accounts - 1)) : ''} `
          } else {
            userlist += `[${exraid.Exraidusers[b].username}](tg://user?id=${exraid.Exraidusers[b].uid})${exraid.Exraidusers[b].accounts > 1 ? ('+' + (exraid.Exraidusers[b].accounts - 1)) : ''} `
          }
        } else {
          wantedlist += `[${exraid.Exraidusers[b].username}](tg://user?id=${exraid.Exraidusers[b].uid}) `
        }
      }
      out += `${ctx.i18n.t('number')}: ${accounter}\n`
      out += `${ctx.i18n.t('participants')}: ${userlist}\n`
      if (wantedlist.length > 0) {
        out += `Nog geen invite: ${wantedlist}`
      }
      out += '\n\n'
    }
  }

  const researchcount = await models.Fieldresearch.count({
    where: {
      createdAt: {
        [Op.gt]: today
      }
    }
  })
  const exraidcount = await models.Exraid.count({
    where: {
      endtime: {
        [Op.gt]: today.unix()
      }
    }
  })
  out += `${ctx.i18n.t('list_raids_fres_count', {
    researchcount: researchcount,
    exraidcount: exraidcount
  })}`
  // out += `\r\n[@${process.env.BOT_USERNAME}](https://telegram.me/${process.env.BOT_USERNAME}?start=mainmenu)`
  // restore user locale
  ctx.i18n.locale(ctx.session.oldlang)
  return out
}
