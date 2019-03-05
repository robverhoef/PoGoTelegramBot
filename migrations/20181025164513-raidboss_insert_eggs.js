'use strict'
var metaphone = require('metaphone')

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('raidbosses', [
      {
        name: 'Level 1 egg',
        accounts: '1',
        level: 1,
        metaphone: metaphone('Level 1 egg'),
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        name: 'Level 2 egg',
        accounts: '1',
        level: 2,
        metaphone: metaphone('Level 2 egg'),
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        name: 'Level 3 egg',
        accounts: '2',
        level: 3,
        metaphone: metaphone('Level 3 egg'),
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        name: 'Level 4 egg',
        accounts: '3-?',
        level: 4,
        metaphone: metaphone('Level 4 egg'),
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        name: 'Level 5 egg',
        accounts: '4-?',
        level: 5,
        metaphone: metaphone('Level 5 egg'),
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
    ])
  },

  down: (queryInterface, Sequelize) => {
    const Op = Sequelize.Op
    return queryInterface.bulkDelete('raidbosses',
      {
        [Op.or]: [
          { name: 'Level 1 egg' },
          { name: 'Level 2 egg' },
          { name: 'Level 3 egg' },
          { name: 'Level 4 egg' },
          { name: 'Level 5 egg' }
        ] }
    )
  }
}
