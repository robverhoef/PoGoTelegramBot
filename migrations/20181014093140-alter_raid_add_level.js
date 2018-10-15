'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raids',
      'level',
      {
        type: Sequelize.TINYINT,
        defaultValue: 0,
        allowNull: false
      }
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'raids',
      'level'
    )
  }
};
