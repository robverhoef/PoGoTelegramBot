'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raids',
      'reporterName',
      Sequelize.STRING
    )
    .then(() => {
      queryInterface.addColumn(
        'raids',
        'reporterId',
        Sequelize.INTEGER
      )}
    )
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeColumn(
      'raids',
      'reporterId'
    )
    queryInterface.removeColumn(
      'raids',
      'reporterName'
    )
  }
}
