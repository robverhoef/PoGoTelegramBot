import models from '../models/index.js'
import Sequelize from 'sequelize'
const Op = Sequelize.Op

export default async function (ctx) {
  const user = await models.User.findOne({
    where: {
      tId: {
        [Op.eq]: ctx.from.id
      }
    }
  })
  if (user) {
    ctx.i18n.locale(user.locale)
  }
}
