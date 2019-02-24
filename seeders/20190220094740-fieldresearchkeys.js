'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('fieldresearchkeys', [
      {label: 'Catch 3 Grass-, Water-, or Fire Type Pokémon: 5 Silver Pinaps'},
      {label: 'Catch 10 Pokémon: Magikarp✨ / Houndour✨'},
      {label: 'Hatch 3 Eggs: Magmar'},
      {label: 'Hatch 5 Eggs: Chansey / 3 rare candy'},
      {label: 'Make 3 Excellent Throws in a Row: Larvitar'},
      {label: 'Make 5 Great Curveball Throws in a Row: Spinda'},
      {label: 'Spin 10 Pokéstops/Gyms: 5 silver Pinaps'},
      {label: 'Use an item to evolve a Pokémon: Aerodactyl✨'},
      {label: 'Use 5 Berries to help catch a Pokémon: Growlithe✨'},
      {label: 'Win a Level 3 or Higher Raid: Omanyte✨/Kabuto✨'},
      {label: 'Win 5 Gym Battles: Lapras'}
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.bulkDelete('fieldresearchkeys', null, {});
  }
};
