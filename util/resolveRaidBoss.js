const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const metaphone = require('metaphone')
/**
* @param {string}
* @returns {raidboss: models.Raidboss} or (egg) {raidboss: null, level: int} or null
*/
module.exports = async (bossname) => {
  // first start by checking for eggs -might save us a DB query-
  // match 'level 5', 'lvl 5', 'level5', 'lvl5'
  if (bossname.toLowerCase().indexOf('lvl') > -1 || bossname.toLowerCase().indexOf('level') > -1) {
    let egg = bossname.match(/(?:^lvl|^level)\s*(\d)/i)
    if (egg !== null && egg.length > 1 && parseInt(egg[1]) > 0) {
      // Let's see if the egg is defined…
      const boss = await models.Raidboss.findOne({
        where: {
          name: {[Op.like]: 'Level ' + parseInt(egg[1]) + ' egg'}
        }
      })
      if (boss) {
        return boss
      } else {
        // …nope
        return null
      }
    } else {
      // should never happen unless bossname is something like 'lvl'
      return null
    }
  } else {
    // next; search DB
    let boss = await models.Raidboss.findOne({
      where: {
        name: { [Op.like]: bossname }
      }
    })
    if (boss) {
      return boss
    } else {
      // last resort; try metaphone
      const boss = await models.Raidboss.findOne({
        where: {
          metaphone: metaphone(bossname)
        }
      })
      if (boss) {
        return boss
      } else {
        return null
      }
    }
  }
}
