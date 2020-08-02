'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('invitables', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      starttime: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      endtime: {
        type: Sequelize.INTEGER(11),
        allowNull: false
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
          'invitables',
          ['userId'],
          {
            type: 'foreign key',
            name: 'FBK_invitables_userId',
            references: { // Required field
              table: 'users',
              field: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          }
        )
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('invitables')
  }
}
