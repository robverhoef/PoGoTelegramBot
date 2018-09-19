'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raids',
      'raidbossId',
      {
        type: Sequelize.INTEGER(11),
        allowNull: true
      }
    )
    .then(() => {
      queryInterface.addConstraint(
        'raids',
        ['raidbossId'],
        {
          type: 'foreign key',
          name: 'FBK_raidbossId',
          references: { //Required field
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
    return queryInterface.removeColumn(
      'raids',
      'raidbossId'
    )
  }
};
