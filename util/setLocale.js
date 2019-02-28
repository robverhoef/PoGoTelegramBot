var models = require('../models')

module.exports = async (ctx) => {
  const user = await models.User.findOne({
    tId: ctx.from.id
  })
  if (user) {
    ctx.i18n.locale(user.locale)
  }
}
