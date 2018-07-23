'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.renameColumn('raids', 'endtime', 'endtimebak')
  },

  down: (queryInterface, Sequelize) => {
     return queryInterface.renameColumn('raids', 'endtimebak', 'endtime')
  }
};
