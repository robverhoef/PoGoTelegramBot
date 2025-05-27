'use strict'
export default (sequelize, DataTypes) => {
  const Raidboss = sequelize.define(
    'Raidboss',
    {
      name: DataTypes.STRING,
      level: DataTypes.INTEGER,
      accounts: DataTypes.STRING,
      metaphone: DataTypes.STRING
    },
    { tableName: 'raidbosses' }
  )

  Raidboss.associate = function (models) {
    models.Raidboss.hasMany(models.Raid)
  }
  return Raidboss
}
