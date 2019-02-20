'use strict'
module.exports = (sequelize, DataTypes) => {
  var Fieldresearchkey = sequelize.define('Fieldresearchkey', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    label: DataTypes.STRING,
  }, { tableName: 'fieldresearchkeys'})
  return Fieldresearchkey
}
