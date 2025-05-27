'use strict'
export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('raidusers', 'invited', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'raidusers',
      'invited',
      Sequelize.BOOLEAN
    )
  }
}
