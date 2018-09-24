'use strict'
module.exports = (sequelize, DataTypes) => {
  var Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    gymId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  }, {tableName: 'notifications'})
  Notification.associate = function (models) {
    models.Notification.belongsTo(models.Gym, {
      onDelete: 'NO ACTION'
    })
    models.Notification.belongsTo(models.User, {
      onDelete: 'NO ACTION'
    })
  }
  return Notification
}
