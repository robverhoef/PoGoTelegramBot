'use strict'
module.exports = (sequelize, DataTypes) => {
  var RaidbossNotification = sequelize.define('RaidbossNotification', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    raidbossId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  }, { tableName: 'raidboss-notifications' })
  RaidbossNotification.associate = function (models) {
    models.RaidbossNotification.belongsTo(models.Raidboss, {
      onDelete: 'NO ACTION'
    })
    models.RaidbossNotification.belongsTo(models.User, {
      onDelete: 'NO ACTION'
    })
  }
  return RaidbossNotification
}
