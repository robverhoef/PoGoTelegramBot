'use strict'

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      'raids',
      'reporterId',
      Sequelize.BIGINT(20)
    )
    await queryInterface.changeColumn(
      'gyms',
      'reporterId',
      Sequelize.BIGINT(20)
    )
    await queryInterface.changeColumn(
      'fieldresearches',
      'reporterId',
      Sequelize.BIGINT(20)
    )
    await queryInterface.changeColumn(
      'exraids',
      'reporterId',
      Sequelize.BIGINT(20)
    )
    await queryInterface.changeColumn(
      'eliteraids',
      'reporterId',
      Sequelize.BIGINT(20)
    )
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      'raids',
      'reporterId',
      Sequelize.INTEGER(11)
    )
    await queryInterface.changeColumn(
      'gyms',
      'reporterId',
      Sequelize.INTEGER(11)
    )
    await queryInterface.changeColumn(
      'fieldresearches',
      'reporterId',
      Sequelize.INTEGER(11)
    )
    await queryInterface.changeColumn(
      'exraids',
      'reporterId',
      Sequelize.INTEGER(11)
    )
    await queryInterface.changeColumn(
      'eliteraids',
      'reporterId',
      Sequelize.INTEGER(11)
    )
  }
}
