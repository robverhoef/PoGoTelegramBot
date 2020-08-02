'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'gyms',
      'lon',
      {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        defaultValue: null
      }
    ).then(() =>
      queryInterface.addColumn(
        'gyms',
        'lat',
        {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true,
          defaultValue: null
        }
      ))
      .then(() => {
        queryInterface.sequelize.query('UPDATE gyms INNER JOIN (SELECT id, SUBSTRING_INDEX(geo," ",1) AS newlat , SUBSTRING_INDEX(geo," ",-1) AS newlon FROM gyms) AS t2 ON gyms.id=t2.id SET lat = t2.newlat, lon = t2.newlon WHERE geo IS NOT NULL AND t2.id=gyms.id')
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('gyms', 'lat')
      .then(() =>
        queryInterface.removeColumn('gyms', 'lon')
      )
  }
}
