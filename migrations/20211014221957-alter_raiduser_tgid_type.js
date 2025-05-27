'use strict'

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('users', 'tId', {
      type: Sequelize.BIGINT.UNSIGNED
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('users', 'tId', {
      type: Sequelize.INTEGER
    })
  }
}
