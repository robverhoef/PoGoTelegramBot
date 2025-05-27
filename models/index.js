'use strict'
/** eslint no-unused-vars: "none"*/
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import Sequelize from 'sequelize'
const require = createRequire(import.meta.url)
var basename = path.basename(fileURLToPath(import.meta.url))
var env = process.env.NODE_ENV || 'development'
var configs = JSON.parse(
  fs.readFileSync(require.resolve('../config/config.json', 'utf8'))
)
var config = configs[env]
var logfunc = console.log
if (env === 'production') {
  logfunc = function () {}
}
config.logging = env === 'development' ? false : logfunc
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

const files = fs.readdirSync(import.meta.dirname).filter((file) => {
  return (
    file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  )
})

for (const file of files) {
  const model = await import(
    pathToFileURL(path.resolve('models', `${file}`)).href
  )
  if (model.default) {
    const namedModel = model.default(sequelize, Sequelize.DataTypes)
    db[namedModel.name] = namedModel
  }
}
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})
db.sequelize = sequelize
db.Sequelize = Sequelize

export default db
