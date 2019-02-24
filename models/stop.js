'use strict'
module.exports = (sequelize, DataTypes) => {
  var Stop = sequelize.define('Stop', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    // geo: DataTypes.STRING,
    lat: DataTypes.DECIMAL,
    lon: DataTypes.DECIMAL,
    googleMapsLink: DataTypes.STRING
  }, {
    tableName: 'stops'
  })
  Stop.associate = function (models) {
    models.Stop.hasMany(models.Fieldresearch)
  }
  return Stop
}
