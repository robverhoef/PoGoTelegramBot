'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      'users', 'tId', {
        type: Sequelize.BIGINT.UNSIGNED
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      'users', 'tId', {
        type: Sequelize.INTEGER
      }
    )
  }
}
