'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('exraids', {
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
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: 'gyms',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      start1: Sequelize.INTEGER,
      // Timestamps
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
      reporterName: Sequelize.STRING,
      reporterId: Sequelize.INTEGER
    }
    )
    .then(() => {
        queryInterface.addConstraint(
          'exraids',
          ['raidbossId'],
          {
            type: 'foreign key',
            name: 'FBK_exraid_raidbossId',
            references: { // Required field
              table: 'raidbosses',
              field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            logging: console.log
          }
        )
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('exraids')
  }
}
