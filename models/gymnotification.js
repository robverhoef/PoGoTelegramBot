'use strict'
module.exports = (sequelize, DataTypes) => {
  var GymNotification = sequelize.define('GymNotification', {
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
  }, {tableName: 'gym-notifications'})
  GymNotification.associate = function (models) {
    models.GymNotification.belongsTo(models.Gym, {
      onDelete: 'NO ACTION'
    })
    models.GymNotification.belongsTo(models.User, {
      onDelete: 'NO ACTION'
    })
  }
  return GymNotification
}
