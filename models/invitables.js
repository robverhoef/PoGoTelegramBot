'use strict'
module.exports = (sequelize, DataTypes) => {
  const Invitables = sequelize.define('Invitables', {
    userId: DataTypes.INTEGER,
    starttime: DataTypes.INTEGER,
    endtime: DataTypes.INTEGER,
    pokemon: DataTypes.STRING
  }, {
    tableName: 'invitables'
  })
  Invitables.associate = function (models) {
    models.Invitables.belongsTo(models.User)
  }
  return Invitables
}
