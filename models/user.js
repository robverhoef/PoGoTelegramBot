'use strict'
module.exports = (sequelize, DataTypes) => {
  var User = sequelize.define('User', {
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
    }
  }, {tableName: 'users'})
  User.associate = function (models) {
    // associations can be defined here
  }
  return User
}
