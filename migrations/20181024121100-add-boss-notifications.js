'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameTable('notifications', 'gym-notifications')
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.renameTable('gym-notifications', 'notifications')
  }
}
