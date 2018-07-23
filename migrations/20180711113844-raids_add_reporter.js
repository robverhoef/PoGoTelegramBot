'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'raids',
      'reporterName',
     Sequelize.STRING
     )
    queryInterface.addColumn(
      'raids',
      'reporterId',
     Sequelize.INTEGER
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
};
