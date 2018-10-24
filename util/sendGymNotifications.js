const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const models = require('../models')

/**
 * Sends all applicable gym notifications
 * TODO: send in batches
 */
module.exports = async (bot, gymId, gymname, target, starttime) => {
  let notifications = await models.GymNotification.findAll({
    include: [
      models.User
    ],
    where: {
      gymId: {
        [Op.eq]: gymId
      }
    }
  })

  for (let notification of notifications) {
    bot.telegram.sendMessage(notification.User.tId, `Psst.. Er is zojuist een *${target}* raid toegevoegd bij *${gymname}* om *${moment.unix(starttime).format('H:mm')}*.`, {parse_mode: 'Markdown', disable_web_page_preview: true})
  }
}
