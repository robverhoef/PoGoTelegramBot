'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('exraidusers', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      username: Sequelize.STRING(191),
      uid: Sequelize.STRING(191),
      hasinvite: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      delayed: {
        type: Sequelize.STRING(32),
        defaultValue: null,
        allowNull: true
      },
      accounts: {
        type: Sequelize.INTEGER, defaultValue: 1
      },
      exraidId: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: 'exraids',
          key: 'id',
          onDelete: 'CASCADE'
        }
      },
      // Timestamps
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('exraidusers')
  }
}
