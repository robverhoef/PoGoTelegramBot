import Sequelize from 'sequelize'
import moment from 'moment-timezone'
import models from '../models/index.js'

const Op = Sequelize.Op
/**
 * Sends all applicable gym notifications
 * TODO: send in batches
 */
export default async (ctx, bot, gymId, gymname, target, starttime) => {
  const notifications = await models.GymNotification.findAll({
    include: [models.User],
    where: {
      gymId: {
        [Op.eq]: gymId
      }
    }
  })
  const oldlocale = ctx.i18n.locale()
  if (process.env.NODE_ENV === 'development') {
    console.log('WOULD SEND GYM NOTIFICATION', notifications.length, gymname)
    return
  }
  console.log('SENDING GYM NOTIFICATION', notifications.length, gymname)
  for (const notification of notifications) {
    ctx.i18n.locale(notification.User.locale)
    try {
      await bot.telegram.sendMessage(
        notification.User.tId,
        ctx.i18n.t('noti_gym_notification', {
          target: target,
          gymname: gymname,
          starttime: moment.unix(starttime).format('H:mm')
        }),
        { parse_mode: 'HTML' }
      )
    } catch (error) {
      console.log(
        'Error while sending gym notification to ',
        notification.User.tId,
        error.message
      )
    }
  }
  ctx.i18n.locale(oldlocale)
}
