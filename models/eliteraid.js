'use strict';
module.exports = (sequelize, DataTypes) => {
  var Eliteraid = sequelize.define(
    'Eliteraid',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      endtime: DataTypes.INTEGER,
      target: DataTypes.STRING(191),
      gymId: DataTypes.INTEGER.UNSIGNED,
      start1: DataTypes.INTEGER,
      reporterName: DataTypes.STRING,
      reporterId: DataTypes.INTEGER,
      raidbossId: DataTypes.INTEGER,
    },
    { tableName: 'eliteraids' }
  );

  Eliteraid.associate = function (models) {
    models.Eliteraid.belongsTo(models.Gym, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false,
      },
    });
    models.Eliteraid.hasMany(models.Eliteraiduser);
    models.Eliteraid.belongsTo(models.Raidboss);
  };
  return Eliteraid;
};
