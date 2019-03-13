'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'gyms',
      'reporterName',
      Sequelize.STRING
    )
    .then(() => {
      queryInterface.addColumn(
        'gyms',
        'reporterId',
        Sequelize.INTEGER
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeColumn(
      'gyms',
      'reporterId'
    )
    queryInterface.removeColumn(
      'gyms',
      'reporterName'
    )
  }
}
