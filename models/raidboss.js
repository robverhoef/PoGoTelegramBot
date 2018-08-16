'use strict';
module.exports = (sequelize, DataTypes) => {
  var Raidboss = sequelize.define('Raidboss', {
    name: DataTypes.STRING,
    level: DataTypes.INTEGER,
    accounts: DataTypes.STRING
  }, {});
  Raidboss.associate = function(models) {
    // associations can be defined here
  };
  return Raidboss;
};
