'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'invitables', 'pokemon', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('invitables', 'pokemon')
  }
}
