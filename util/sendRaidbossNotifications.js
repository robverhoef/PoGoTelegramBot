import Sequelize from 'sequelize'
const Op = Sequelize.Op
import moment from 'moment-timezone'
import models from '../models/index.js'

/**
 * Sends all applicable raidboss notifications
 * TODO: send in batches
 */
export default async (ctx, bot, raidbossId, gymname, target, starttime) => {
  const notifications = await models.RaidbossNotification.findAll({
    include: [models.User],
    where: {
      raidbossId: {
        [Op.eq]: raidbossId
      }
    }
  })
  const oldlocale = ctx.i18n.locale()
  if (process.env.NODE_ENV === 'development') {
    console.log(
      'WOULD SEND RAIDBOSS NOTIFICATION',
      notifications.length,
      target
    )
    return
  }
  console.log('SENDING RAIDBOSS NOTIFICATION', notifications.length, target)
  for (const notification of notifications) {
    ctx.i18n.locale(notification.User.locale)
    try {
      await bot.telegram.sendMessage(
        notification.User.tId,
        ctx.i18n.t('noti_raidboss_notification', {
          target: target,
          gymname: gymname,
          starttime: moment.unix(starttime).format('H:mm')
        }),
        { parse_mode: 'HTML' }
      )
    } catch (error) {
      console.log(
        'Error while sending raidboss notification to ',
        notification.User.tId,
        error.message
      )
    }
  }
  ctx.i18n.locale(oldlocale)
}
