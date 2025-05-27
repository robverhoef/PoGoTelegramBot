'use strict'
/** eslint no-unused-vars: "none"*/
export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      tId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      tUsername: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tGroupID: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isAdmin: {
        type: DataTypes.BOOLEAN
      },
      locale: {
        type: DataTypes.STRING,
        allowNull: true
      },
      friendcode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      pokemonname: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    { tableName: 'users' }
  )
  User.associate = function () {
    // associations can be defined here
  }
  return User
}
