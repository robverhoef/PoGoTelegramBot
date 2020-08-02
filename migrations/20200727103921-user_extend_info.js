'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'users',
      'friendcode',
      {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      }
    ).then(() => queryInterface.addColumn(
      'users',
      'pokemonname',
      {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      }
    ))
  },

  down: (queryInterface, Sequelize) =>
    queryInterface.removeColumn('users', 'friendcode')
      .then(() =>
        queryInterface.removeColumn('users', 'pokemonname')
      )
}
