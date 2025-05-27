'use strict'

export default {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('raidbosses', 'metaphone', {
      type: Sequelize.STRING(64),
      defaultValue: ''
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('raidbosses', 'metaphone')
  }
}
