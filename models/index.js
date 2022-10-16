'use strict'

var fs = require('fs')
var path = require('path')
var Sequelize = require('sequelize')
var basename = path.basename(__filename)
var env = process.env.NODE_ENV || 'development'
var config = require(path.join(__dirname, '/../config/config.json'))[env]
let logfunc = console.log
if (env === 'production') {
  logfunc = function () {}
}
config.logging = false //logfunc
var db = {}
var sequelize = {}
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config)
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  )
}

// sequelize = new Sequelize({
//   database: 'pogokanaleneiland',
//   username: 'dbuser1',
//   password: 'db_passwd',
//   dialect: 'mysql',
//   timezone: 'Europe/Amsterdam',
//   useUTC: false
// });

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
    )
  })
  .forEach((file) => {
    var model = sequelize.import(path.join(__dirname, file))
    db[model.name] = model
  })

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
