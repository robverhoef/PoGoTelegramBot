'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER
      },
      gymId: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
    .then(() => {
      queryInterface.addConstraint(
        'notifications',
        ['userId'],
        {
          type: 'foreign key',
          name: 'FBK_userId',
          references: { //Required field
            table: 'users',
            field: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
          logging: console.log
        }
      )
    }).then(() => {
      queryInterface.addConstraint(
        'notifications',
        ['gymId'],
        {
          type: 'foreign key',
          name: 'FBK_gymId',
          references: { //Required field
            table: 'gyms',
            field: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
          logging: console.log
        }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('notifications');
  }
};
