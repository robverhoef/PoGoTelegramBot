'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raidusers',
      'delayed',
      {
        type: Sequelize.STRING(32),
        defaultValue: null,
        allowNull: true
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'raidusers',
      'delayed'
    )
  }
}
