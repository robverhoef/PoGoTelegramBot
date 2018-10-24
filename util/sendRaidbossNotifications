const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const models = require('../models')

/**
 * Sends all applicable raidboss notifications
 * TODO: send in batches
 */
module.exports = async (bot, raidbossId, gymname, target, starttime) => {
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

  for (let notification of notifications) {
    bot.telegram.sendMessage(notification.User.tId, `Psst.. Er is zojuist een *${target}* raid toegevoegd bij *${gymname}* om *${moment.unix(starttime).format('H:mm')}*.`, {parse_mode: 'Markdown', disable_web_page_preview: true})
  }
}
