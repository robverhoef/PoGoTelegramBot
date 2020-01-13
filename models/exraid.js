'use strict'
module.exports = (sequelize, DataTypes) => {
  var Exraid = sequelize.define('Exraid', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    endtime: DataTypes.INTEGER,
    target: DataTypes.STRING(191),
    gymId: DataTypes.INTEGER.UNSIGNED,
    start1: DataTypes.INTEGER,
    reporterName: DataTypes.STRING,
    reporterId: DataTypes.INTEGER,
    raidbossId: DataTypes.INTEGER
  }, { tableName: 'exraids' })

  Exraid.associate = function (models) {
    models.Exraid.belongsTo(models.Gym, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
    models.Exraid.hasMany(models.Exraiduser)
    models.Exraid.belongsTo(models.Raidboss)
  }
  return Exraid
}
