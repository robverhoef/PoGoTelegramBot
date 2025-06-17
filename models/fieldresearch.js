'use strict'
export default (sequelize, DataTypes) => {
  const Fieldresearch = sequelize.define(
    'Fieldresearch',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      name: DataTypes.STRING,
      reward: DataTypes.STRING,
      stopId: DataTypes.INTEGER,
      reporterName: DataTypes.STRING,
      reporterId: DataTypes.BIGINT
    },
    {
      tableName: 'fieldresearches'
    }
  )

  Fieldresearch.associate = function (models) {
    models.Fieldresearch.belongsTo(models.Stop, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
  }
  return Fieldresearch
}
