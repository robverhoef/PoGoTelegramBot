'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raids', 'newaccounts', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('raids', 'newaccounts')
  }
}
