'use strict'

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('gyms', 'removed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('gyms', 'removed')
  }
}
