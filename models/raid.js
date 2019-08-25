'use strict'
module.exports = (sequelize, DataTypes) => {
  var Raid = sequelize.define('Raid', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    endtime: DataTypes.INTEGER,
    target: DataTypes.STRING(191),
    exraidtrigger: DataTypes.BOOLEAN,
    gymId: DataTypes.INTEGER.UNSIGNED,
    start1: DataTypes.INTEGER,
    start2: DataTypes.DATE,
    start3: DataTypes.DATE,
    reporterName: DataTypes.STRING,
    reporterId: DataTypes.INTEGER,
    raidbossId: DataTypes.INTEGER,
    shiny: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      allowNull: true
    },
    accountsplayed: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      allowNull: true
    },
    newaccounts: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      allowNull: true
    }
  }, { tableName: 'raids' })

  Raid.associate = function (models) {
    models.Raid.belongsTo(models.Gym, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
    models.Raid.hasMany(models.Raiduser)
    models.Raid.belongsTo(models.Raidboss)
  }
  return Raid
}
