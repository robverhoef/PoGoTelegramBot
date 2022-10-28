'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('eliteraids', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        endtime: Sequelize.INTEGER,
        target: Sequelize.STRING(191),
        raidbossId: {
          type: Sequelize.INTEGER(11),
          allowNull: true
        },
        gymId: {
          type: Sequelize.INTEGER.UNSIGNED
        },
        start1: Sequelize.INTEGER,
        // Timestamps
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE,
        reporterName: Sequelize.STRING,
        reporterId: Sequelize.INTEGER
      })
      .then(() => {
        queryInterface.addConstraint('eliteraids', ['gymId'], {
          type: 'foreign key',
          name: 'FBK_elite_gymId',
          references: {
            // Required field
            table: 'gyms',
            field: 'id'
          },
          onDelete: 'cascade',
          onUpdate: 'cascade'
        })
        queryInterface.addConstraint('eliteraids', ['raidbossId'], {
          type: 'foreign key',
          name: 'FBK_elite_raidbossId',
          references: {
            // Required field
            table: 'raidbosses',
            field: 'id'
          },
          onDelete: 'cascade',
          onUpdate: 'cascade'
        })
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('eliteraids')
  }
}
