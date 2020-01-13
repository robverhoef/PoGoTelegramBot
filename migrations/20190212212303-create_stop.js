'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('stops', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: Sequelize.STRING,
      // geo: Sequelize.STRING,
      lon: Sequelize.DECIMAL(11, 8),
      lat: Sequelize.DECIMAL(10, 8),
      googleMapsLink: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('stops')
  }
}
