// import models from '../models/index.js'
import models from '../models/index.js'
import Sequelize from 'sequelize'
const Op = Sequelize.Op
import { Markup } from 'telegraf'
/**
 * Returns false when everything is OK
 * Otherwise returns response
 */
export default async (ctx, bot) => {
  const user = ctx.from
  let isAdmin = false
  const admins = await bot.telegram.getChatAdministrators(process.env.GROUP_ID)
  for (let a = 0; a < admins.length; a++) {
    if (admins[a].user.id === user.id) {
      isAdmin = true
    }
  }
  // or marked admin from database?
  if (!isAdmin) {
    const dbAdmin = await models.User.findOne({
      where: {
        tId: {
          [Op.eq]: user.id
        },
        [Op.and]: {
          isAdmin: {
            [Op.eq]: true
          }
        }
      }
    })
    if (dbAdmin !== null) {
      isAdmin = true
    }
  }

  if (!isAdmin) {
    console.log('Illegal admin attempt', user)
    return ctx
      .replyWithHTML(
        'Really nice try. And smart too! \r\nBut only admins are allowed here…',
        Markup.removeKeyboard()
      )
      .then(() => ctx.scene.leave())
  }
  return false
}
