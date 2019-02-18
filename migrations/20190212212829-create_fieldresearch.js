'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('fieldresearches', {
      id: {type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey:true},
      stopId: {
        type: Sequelize.INTEGER.UNSIGNED, references: {
          model: 'stops',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      name: Sequelize.STRING,
      reward: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reporterName: Sequelize.STRING,
      reporterId: Sequelize.INTEGER,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.dropTable('fieldresearches');
  }
};
