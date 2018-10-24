const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

/**
* @param {string}
* @returns {raidboss: models.Raidboss | null, level: Number}
*/
module.exports = async (bossname) => {
    // forst start by checking for eggs -might save us a DB query-
    // match 'level 5', 'lvl 5', 'level5', 'lvl5'
    if(bossname.indexOf('lvl') > -1 || bossname.indexOf('level') > -1){

      let egg = bossname.match(/(?:^lvl|^level)\s*(\d)/i)
      if (egg !== null && egg.length > 1 && parseInt(egg[1]) > 0) {
        return {raidboss: null, level: parseInt(egg[1])}
      } else {
        // next; search DB
      let boss = await models.Raidboss.find({
        where: {
          name: {[Op.like]: bossname}
        }
      })
      if (boss) {
       return {raidboss: boss}
      } else {
      // last resort; try soundex
      // default soundex query in DB is not sufficient; meditite and mewtwo are he same…
        sequelize.query('SELECT * FROM raidbosses WHERE SOUNDEX('+bossname+') = SOUNDEX(raidbosses.name)', { model: models.Raidboss }).then(bosses => {
            if(bosses.length > 0) {
              return {raidboss: bosses[0]}
            }
        })

    }
}
