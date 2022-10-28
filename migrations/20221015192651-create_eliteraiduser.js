'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('eliteraidusers', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        username: Sequelize.STRING(191),
        uid: Sequelize.STRING(191),
        accounts: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        eliteraidId: {
          type: Sequelize.INTEGER.UNSIGNED
        },
        delayed: {
          type: Sequelize.STRING(32),
          defaultValue: null,
          allowNull: true
        },
        // Timestamps
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      })
      .then(() => {
        queryInterface.addConstraint('eliteraidusers', ['eliteraidId'], {
          type: 'foreign key',
          name: 'FBK_eliteraidId',
          references: {
            // Required field
            table: 'eliteraids',
            field: 'id'
          },
          onDelete: 'cascade',
          onUpdate: 'cascade'
        })
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('eliteraidusers')
  }
}
