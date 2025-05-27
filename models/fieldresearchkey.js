'use strict'
export default (sequelize, DataTypes) => {
  const Fieldresearchkey = sequelize.define(
    'Fieldresearchkey',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      label: DataTypes.STRING
    },
    { tableName: 'fieldresearchkeys' }
  )
  return Fieldresearchkey
}
