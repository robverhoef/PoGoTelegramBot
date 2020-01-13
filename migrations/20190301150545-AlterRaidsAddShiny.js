'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raids', 'shiny', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('raids', 'shiny')
  }
}
