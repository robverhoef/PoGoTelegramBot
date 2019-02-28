// const models = require('../models')
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { Markup } = require('telegraf')
/**
* Returns false when everything is OK
* Otherwise returns response
*/
module.exports = async (ctx, bot) => {
  const user = ctx.from
  let isAdmin = false
  let admins = await bot.telegram.getChatAdministrators(process.env.GROUP_ID)
  for (let a = 0; a < admins.length; a++) {
    if (admins[a].user.id === user.id) {
      isAdmin = true
    }
  }
  // or marked admin from database?
  if (!isAdmin) {
    let dbAdmin = await models.User.findOne({
      where: {
        tId: {
          [Op.eq]: user.id
        },
        [Op.and]: {
          isAdmin: true
        }
      }
    })
    if (dbAdmin !== null) {
      isAdmin = true
    }
  }

  if (!isAdmin) {
    console.log('Illegal admin attempt', user)
    return ctx.replyWithMarkdown(`Really nice try. And smart too! \r\nBut only admins are allowed here…`, Markup.removeKeyboard())
      .then(() => ctx.scene.leave())
  }
  return false
}
