'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raidusers',
      'private',
      Sequelize.BOOLEAN
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'raidusers',
      'privat',
      Sequelize.BOOLEAN
    )
  }
}
