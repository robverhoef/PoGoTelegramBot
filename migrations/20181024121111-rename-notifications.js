'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('raidboss-notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER
      },
      raidbossId: {
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
          'raidboss-notifications',
          ['userId'],
          {
            type: 'foreign key',
            name: 'FBK_raidbossUserId',
            references: { // Required field
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
          'raidboss-notifications',
          ['raidbossId'],
          {
            type: 'foreign key',
            name: 'FBK_raidboss-notificationsRaidbossId',
            references: { // Required field
              table: 'raidbosses',
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
    return queryInterface.dropTable('raidboss-notifications')
  }
}
