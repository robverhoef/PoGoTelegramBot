const moment = require('moment-timezone')
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const escapeMarkDown = require('../util/escapeMarkDown')

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

  const getInvitableString = (invitable) => {
    const pokemon = invitable.pokemon ? `(${invitable.pokemon})` : ''
    let invstring = ''
    if (invitable.User.pokemonname || invitable.User.friendcode) {
      const usr = encodeURI(
        `https://t.me/${process.env.BOT_USERNAME}?start=udetail_${invitable.User.id}`
      )
      invstring = `[${escapeMarkDown(
        invitable.User.tUsername
      )} ${pokemon}](${usr}) `
    } else {
      invstring = `[${escapeMarkDown(
        invitable.User.tUsername
      )} ${pokemon}](tg://user?id=${invitable.User.tId}) `
    }
    return invstring
  }

  let out = reason
  const raids = await models.sequelize
    .query(
      "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));"
    )
    .then(() =>
      models.Raid.findAll({
        include: [models.Gym, models.Raiduser, models.Raidboss],
        where: {
          endtime: {
            [Op.gt]: moment().unix()
          }
        },
        order: [
          ['start1', 'ASC'],
          [models.Raiduser, 'id', 'asc']
        ]
      })
    )
  for (let a = 0; a < raids.length; a++) {
    const endtime = moment.unix(raids[a].endtime)
    out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
    out += `*${raids[a].target}*\n`
    if (raids[a].Raidboss) {
      out += `${ctx.i18n.t('recommended')}: ${
        raids[a].Raidboss.accounts
      } accounts\n`
    }
    if (raids[a].Gym.googleMapsLink) {
      out += `[${raids[a].Gym.gymname}](${raids[a].Gym.googleMapsLink})\n`
    } else {
      out += `${raids[a].Gym.gymname}\n`
    }
    // if (raids[a].Gym.exRaidTrigger) {
    //   out += '💳 ExRaid Trigger\n'
    // }
    const strtime = moment.unix(raids[a].start1)
    out += `${ctx.i18n.t('start')}: ${strtime.format('H:mm')} `

    // After 2 minutes, stop tagging people. Raid has passed, carry on..
    const startTimeHasPassed = strtime.isBefore(moment().add(-2, 'minutes'))

    let userlist = ''
    let remoteuserlist = ''
    let privateuserlist = ''
    let accounter = 0
    for (var b = 0; b < raids[a].Raidusers.length; b++) {
      const raiduser = raids[a].Raidusers[b]
      accounter += raiduser.accounts
      const tag = startTimeHasPassed ? '' : `(tg://user?id=${raiduser.uid})`
      const accounts = `${
        raiduser.accounts > 1 ? '+' + (raiduser.accounts - 1) : ''
      } `

      const getUserString = () => {
        if (raiduser.delayed != null) {
          return `[<⏰ ${raiduser.delayed} ${escapeMarkDown(
            raiduser.username
          )}>]${tag}${accounts}`
        } else if (raiduser.private && privateuserlist.length === 0) {
          return `[*${escapeMarkDown(raiduser.username)}*]${tag}${accounts}`
        } else {
          return `[${escapeMarkDown(
            raiduser.username + (raiduser.invited ? ' 📨' : '')
          )}]${tag}${accounts}`
        }
      }
      const userString = getUserString()
      raiduser.remote
        ? (remoteuserlist += userString)
        : raiduser.private
        ? (privateuserlist += userString)
        : (userlist += userString)
    }
    out += `${ctx.i18n.t('number')}: ${accounter}\n`
    out += userlist.length ? `${ctx.i18n.t('participants')}: ${userlist}\n` : ''
    out += remoteuserlist.length
      ? `${ctx.i18n.t('participants_remotely')}: ${remoteuserlist}\n`
      : ''
    out += privateuserlist.length
      ? `${ctx.i18n.t('participants_private')}: ${privateuserlist}`
      : ''
    out += '\n\n'
  }

  const today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)

  const tomorrow = today.clone().add(1, 'day')
  const in2days = today.clone().add(2, 'day')
  // List people who want to receive invites;
  const now = moment().unix()
  const invitables = await models.Invitables.findAll({
    where: {
      endTime: {
        [Op.gt]: now
      }
    },
    include: [{ model: models.User }]
  })
  if (invitables.length > 0) {
    out += '------------------------------\n'
    out += `*${ctx.i18n.t('remote_invitables_list')}*\n`
    for (const invite of invitables) {
      out += getInvitableString(invite)
    }
    out += '\n------------------------------\n'
  }

  const eliteraids = await models.Eliteraid.findAll({
    include: [models.Gym, models.Eliteraiduser],
    where: {
      [Op.and]: {
        // starts today
        start1: {
          [Op.gt]: today.unix()
        },
        endtime: {
          // and not finished yet
          [Op.gt]: moment().unix(),
          // and endtime must be max 2 days
          [Op.lt]: in2days.unix()
        }
      }
    },
    order: [
      ['start1', 'ASC'],
      [models.Eliteraiduser, 'id', 'DESC']
    ]
  })
  if (eliteraids.length > 0) {
    out += '\n------------------------------\n'
    out += `*${ctx.i18n.t('btn_eliteraids')}*\n`
    out += '------------------------------\n'
    for (const eliteraid of eliteraids) {
      const strtime = moment.unix(eliteraid.start1)
      // out += `${strtime.format('DD-MM-YYYY')} `

      const endtime = moment.unix(eliteraid.endtime)
      out += `${ctx.i18n.t('until')}: ${endtime.format('DD-MM H:mm')} `
      out += `*${eliteraid.target}*\n`
      if (eliteraid.Gym.googleMapsLink) {
        out += `[${eliteraid.Gym.gymname}](${eliteraid.Gym.googleMapsLink})\n`
      } else {
        out += `${eliteraid.Gym.gymname}\n`
      }
      out += `${ctx.i18n.t('start')}: ${strtime.format('DD-MM HH:mm')} `
      let userlist = ''
      let accounter = 0
      for (b = 0; b < eliteraid.Eliteraidusers.length; b++) {
        accounter += eliteraid.Eliteraidusers[b].accounts
        if (eliteraid.Eliteraidusers[b].delayed != null) {
          userlist += `[<⏰ ${eliteraid.Eliteraidusers[b].delayed} ${
            eliteraid.Eliteraidusers[b].username
          }>](tg://user?id=${eliteraid.Eliteraidusers[b].uid})${
            eliteraid.Eliteraidusers[b].accounts > 1
              ? '+' + (eliteraid.Eliteraidusers[b].accounts - 1)
              : ''
          } `
        } else {
          userlist += `[${eliteraid.Eliteraidusers[b].username}](tg://user?id=${
            eliteraid.Eliteraidusers[b].uid
          })${
            eliteraid.Eliteraidusers[b].accounts > 1
              ? '+' + (eliteraid.Eliteraidusers[b].accounts - 1)
              : ''
          } `
        }
      }
      out += `${ctx.i18n.t('number')}: ${accounter}\n`
      out += `${ctx.i18n.t('participants')}: ${userlist}\n`
      out += '\n\n'
    }
  }

  // List today's Ex Raids
  const exraids = await models.Exraid.findAll({
    include: [models.Gym, models.Exraiduser],
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

  if (exraids.length > 0) {
    out += '------------------------------\n'
    out += `*${ctx.i18n.t('exraids_today')}*\n`
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
      for (b = 0; b < exraid.Exraidusers.length; b++) {
        if (exraid.Exraidusers[b].hasinvite) {
          accounter += exraid.Exraidusers[b].accounts
          if (exraid.Exraidusers[b].delayed != null) {
            userlist += `[<⏰ ${exraid.Exraidusers[b].delayed} ${
              exraid.Exraidusers[b].username
            }>](tg://user?id=${exraid.Exraidusers[b].uid})${
              exraid.Exraidusers[b].accounts > 1
                ? '+' + (exraid.Exraidusers[b].accounts - 1)
                : ''
            } `
          } else {
            userlist += `[${exraid.Exraidusers[b].username}](tg://user?id=${
              exraid.Exraidusers[b].uid
            })${
              exraid.Exraidusers[b].accounts > 1
                ? '+' + (exraid.Exraidusers[b].accounts - 1)
                : ''
            } `
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
