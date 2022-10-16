'use strict';
module.exports = (sequelize, DataTypes) => {
  var Eliteraiduser = sequelize.define(
    'Eliteraiduser',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      username: DataTypes.STRING(191),
      uid: DataTypes.STRING(191),
      accounts: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      eliteraidId: DataTypes.INTEGER.UNSIGNED,
      delayed: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      remote: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      invited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      private: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    { tableName: 'eliteraidusers' }
  );

  Eliteraiduser.associate = function (models) {
    models.Eliteraiduser.belongsTo(models.Eliteraid, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false,
      },
    });
  };
  return Eliteraiduser;
};
