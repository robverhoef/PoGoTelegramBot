import models from '../models/index.js'
import Sequelize from 'sequelize'
const Op = Sequelize.Op

export default async (ctx) => {
  const user = await models.User.findOne({
    where: {
      tId: {
        [Op.eq]: ctx.from.id
      }
    }
  })
  if (user) {
    return user.locale
  }
  // default locale
  return process.env.DEFAULT_LOCALE
}
