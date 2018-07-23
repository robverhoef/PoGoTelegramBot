'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('raids', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED, 
          autoIncrement: true, 
          primaryKey: true
        },
        endtime: Sequelize.DATE,
        target: Sequelize.STRING(191),
        exraidtrigger: Sequelize.BOOLEAN,
        gymId: {
          type: Sequelize.INTEGER.UNSIGNED,
          references:{
            model: 'gyms',
            key: 'id',
            onDelete: 'CASCADE'
          }
        },
        start1: Sequelize.DATE,
        start2: Sequelize.DATE,
        start3: Sequelize.DATE,
        // Timestamps
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },


  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('raids');
  }
};
