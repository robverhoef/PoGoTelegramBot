const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const models = require('../models')

/**
 * Sends all applicable raidboss notifications
 * TODO: send in batches
 */
module.exports = async (ctx, bot, raidbossId, gymname, target, starttime) => {
  let notifications = await models.RaidbossNotification.findAll({
    include: [
      models.User
    ],
    where: {
      raidbossId: {
        [Op.eq]: raidbossId
      }
    }
  })
  const oldlocale = ctx.i18n.locale()
  console.log('SENDING RAIDBOSS NOTIFICATION', notifications.length, target)
  for (let notification of notifications) {
    ctx.i18n.locale(notification.User.locale)
    try {
      bot.telegram.sendMessage(notification.User.tId, ctx.i18n.t('noti_raidboss_notification', {
        target: target,
        gymname: gymname,
        starttime: moment.unix(starttime).format('H:mm')
      }), { parse_mode: 'Markdown', disable_web_page_preview: true })
    } catch (error) {
      console.log('Error while sending raidboss notification to ', notification.User.tId, error.message)
    }
  }
  ctx.i18n.locale(oldlocale)
}
