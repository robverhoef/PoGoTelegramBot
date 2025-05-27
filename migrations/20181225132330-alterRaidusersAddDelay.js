'use strict'

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('raidusers', 'delayed', {
      type: Sequelize.STRING(32),
      defaultValue: null,
      allowNull: true
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('raidusers', 'delayed')
  }
}
