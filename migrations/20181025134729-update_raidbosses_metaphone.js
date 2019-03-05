'use strict'
var metaphone = require('metaphone')
const models = require('../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let bosses = await queryInterface.sequelize.query('select id, name from raidbosses', { model: models.Raidboss })

    for (var boss of bosses) {
      const metaphoned = metaphone(boss.name)
      await queryInterface.sequelize.query(
        'UPDATE raidbosses SET metaphone = "' + metaphoned + '" where id =' + boss.id
      )
    }
  },

  down: (queryInterface, Sequelize) => {

  }
}
