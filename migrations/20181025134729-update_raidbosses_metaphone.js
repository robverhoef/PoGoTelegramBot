'use strict'
import { metaphone } from 'metaphone'
import models from '../models/index.js'

export default {
  up: async (queryInterface, Sequelize) => {
    let bosses = await queryInterface.sequelize.query(
      'select id, name from raidbosses',
      { model: models.Raidboss }
    )

    for (var boss of bosses) {
      const metaphoned = metaphone(boss.name)
      await queryInterface.sequelize.query(
        'UPDATE raidbosses SET metaphone = "' +
          metaphoned +
          '" where id =' +
          boss.id
      )
    }
  },

  down: (queryInterface, Sequelize) => {}
}
