'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gyms', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      address: Sequelize.STRING,
      exRaidTrigger: Sequelize.BOOLEAN,
      geo: Sequelize.STRING,
      googleMapsLink: Sequelize.STRING,
      gymkey: Sequelize.STRING,
      gymname: Sequelize.STRING,
      qualifier: Sequelize.STRING,
      region: Sequelize.STRING,
      // Timestamps
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('gyms')
  }
}
