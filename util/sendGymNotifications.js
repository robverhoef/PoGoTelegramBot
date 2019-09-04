const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const models = require('../models')

/**
 * Sends all applicable gym notifications
 * TODO: send in batches
 */
module.exports = async (ctx, bot, gymId, gymname, target, starttime) => {
  const notifications = await models.GymNotification.findAll({
    include: [
      models.User
    ],
    where: {
      gymId: {
        [Op.eq]: gymId
      }
    }
  })
  const oldlocale = ctx.i18n.locale()
  console.log('SENDING GYM NOTIFICATION', notifications.length, gymname)
  for (const notification of notifications) {
    ctx.i18n.locale(notification.User.locale)
    try {
      bot.telegram.sendMessage(notification.User.tId, ctx.i18n.t('noti_gym_notification', {
        target: target,
        gymname: gymname,
        starttime: moment.unix(starttime).format('H:mm')
      }), { parse_mode: 'Markdown', disable_web_page_preview: true })
    } catch (error) {
      console.log('Error while sending gym notification to ', notification.User.tId, error.message)
    }
  }
  ctx.i18n.locale(oldlocale)
}
