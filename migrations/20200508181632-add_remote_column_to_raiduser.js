'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raidusers',
      'remote',
      Sequelize.BOOLEAN
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'raidusers',
      'remote',
      Sequelize.BOOLEAN
    )
  }
}
