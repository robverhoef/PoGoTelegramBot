'use strict'
module.exports = (sequelize, DataTypes) => {
  var Raiduser = sequelize.define('Raiduser', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    username: DataTypes.STRING(191),
    uid: DataTypes.STRING(191),
    accounts: {
      type: DataTypes.INTEGER, defaultValue: 1
    },
    raidId: DataTypes.INTEGER.UNSIGNED,
    delayed: {
      type: DataTypes.STRING(32),
      allowNull: true
    }
  }, {tableName: 'raidusers'})

  Raiduser.associate = function (models) {
    models.Raiduser.belongsTo(models.Raid, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
  }
  return Raiduser
}
