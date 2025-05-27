'use strict'

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('users', 'locale', {
      type: Sequelize.STRING(32),
      defaultValue: 'nl',
      allowNull: true
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('users', 'locale')
  }
}
