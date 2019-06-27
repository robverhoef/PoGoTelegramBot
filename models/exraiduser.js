'use strict'
module.exports = (sequelize, DataTypes) => {
  var Exraiduser = sequelize.define('Exraiduser', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    username: DataTypes.STRING(191),
    uid: DataTypes.STRING(191),
    accounts: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    hasinvite: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1
    },
    exraidId: DataTypes.INTEGER.UNSIGNED,
    delayed: {
      type: DataTypes.STRING(32),
      allowNull: true
    }
  }, { tableName: 'exraidusers' })

  Exraiduser.associate = function (models) {
    models.Exraiduser.belongsTo(models.Exraid, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
  }
  return Exraiduser
}
