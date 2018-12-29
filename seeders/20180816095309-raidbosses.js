'use strict';
var metaphone = require('metaphone')
module.exports = {
  up: (queryInterface, Sequelize) => {
      return queryInterface.bulkInsert('raidbosses', [
                {
            name: "Anorith",
            level:1,
            accounts : "1",
            metaphone: metaphone('Anorith'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Bayleef",
            level: 1,
            accounts: "1",
            metaphone: metaphone('Bayleef'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Bulbasaur",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Bulbasaur'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Charmander",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Charmander'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Charmeleon",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Charmeleon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Ivysaur",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Ivysaur'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Kabuto",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Kabuto'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Lileep",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Lileep'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Magikarp",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Magikarp'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Makuhita",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Makuhita'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Meditite",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Meditite'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Metapod",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Metapod'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Omanyte",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Omanyte'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Quilava",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Quilava'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Shellder",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Shellder'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Snorunt",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Snorunt'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Squirtle",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Squirtle'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Swablu",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Swablu'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Wailmer",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Wailmer'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Wartortle",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Wartortle'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Alolan Exeggutor",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Alolan Exeggutor'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Cloyster",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Cloyster'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Combusken",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Combusken'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Dewgong",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Dewgong'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Electabuzz",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Electabuzz'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Exeggutor",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Exeggutor'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Kirlia",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Kirlia'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Magmar",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Magmar'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Magneton",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Magneton'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Manectric",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Manectric'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Marowak",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Marowak'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Marshtomp",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Marshtomp'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Mawile",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Mawile'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Muk",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Muk'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Nosepass",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Nosepass'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Primeape",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Primeape'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Sableye",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Sableye'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Sandslash",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Sandslash'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Slowbro",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Slowbro'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Sudowoodo",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Sudowoodo'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Tentacruel",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Tentacruel'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Weezing",
            level: 2,
            accounts : "1",
            metaphone: metaphone('Weezing'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Aerodactyl",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Aerodactyl'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Alakazam",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Alakazam'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Alolan Raichu",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Alolan Raichu'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Azumarill",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Azumarill'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Breloom",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Breloom'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Claydol",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Claydol'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Donphan",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Donphan'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Flareon",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Flareon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Gengar",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Gengar'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Hitmonchan",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Hitmonchan'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Hitmonlee",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Hitmonlee'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Jolteon",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Jolteon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Jynx",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Jynx'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Lunatone",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Lunatone'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Machamp",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Machamp'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Ninetales",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Ninetales'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Omastar",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Omastar'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Onix",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Onix'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Piloswine",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Piloswine'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Porygon",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Porygon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Scyther",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Scyther'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Sharpedo",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Sharpedo'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Shuckle",
            level: 3,
            accounts : "4",
            metaphone: metaphone('Shuckle'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Solrock",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Solrock'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Starmie",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Starmie'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Vaporeon",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Vaporeon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Absol",
            level: 4,
            accounts : "2-3",
            metaphone: metaphone('Absol'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Aggron",
            level: 4,
            accounts : "6-8",
            metaphone: metaphone('Aggron'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Alolan Marowak",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Alolan Marowak'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Blastoise",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Blastoise'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Charizard",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Charizard'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Feraligator",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Feraligator'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Golem",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Golem'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Houndoom",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Houndoom'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Lapras",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Lapras'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Nidoking",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Nidoking'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Nidoqueen",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Nidoqueen'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Poliwrath",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Poliwrath'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Rhydon",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Rhydon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Snorlax",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Snorlax'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Tyranitar",
            level: 4,
            accounts : "3-5",
            metaphone: metaphone('Tyranitar'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Venusaur",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Venusaur'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Victreebell",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Victreebell'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Walrein",
            level: 4,
            accounts : "4",
            metaphone: metaphone('Walrein'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Articuno",
            level: 5,
            accounts : "4-5",
            metaphone: metaphone('Articuno'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Entei",
            level: 5,
            accounts : "5-6",
            metaphone: metaphone('Entei'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Groudon",
            level: 5,
            accounts : "7-8",
            metaphone: metaphone('Groudon'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Ho-Oh",
            level: 5,
            accounts : "6",
            metaphone: metaphone('Ho-Oh'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Kyogre",
            level: 5,
            accounts : "7-8",
            metaphone: metaphone(''),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Latias",
            level: 5,
            accounts : "6-7",
            metaphone: metaphone('Kyogre'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Latios",
            level: 5,
            accounts : "5-6",
            metaphone: metaphone('Latios'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Lugia",
            level: 5,
            accounts : "7-8",
            metaphone: metaphone('Lugia'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Moltres",
            level: 5,
            accounts : "3-5",
            metaphone: metaphone('Moltres'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Raikou",
            level: 5,
            accounts : "6",
            metaphone: metaphone('Raikou'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Rayquaza",
            level: 5,
            accounts : "4-5",
            metaphone: metaphone('Rayquaza'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Regice",
            level: 5,
            accounts : "8",
            metaphone: metaphone('Regice'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Regirock",
            level: 5,
            accounts : "7-8",
            metaphone: metaphone('Regirock'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Registeel",
            level: 5,
            accounts : "6-7",
            metaphone: metaphone('Registeel'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Suicune",
            level: 5,
            accounts : "5-6",
            metaphone: metaphone('Suicune'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Zapdos",
            level: 5,
            accounts : "5-6",
            metaphone: metaphone('Zapdos'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Tangela",
            level: 3,
            accounts : "2",
            metaphone: metaphone('Tangela'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Mewtwo",
            level: 5,
            accounts : "7",
            metaphone: metaphone('Mewtwo'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Giratina",
            level: 5,
            accounts : "3-4",
            metaphone: metaphone('Giratina'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Shinx",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Shinx'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Togetic",
            level: 4,
            accounts : "2-3",
            metaphone: metaphone('Togetic'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Buizel",
            level: 1,
            accounts : "1",
            metaphone: metaphone('Buizel'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Cresselia",
            level: 5,
            accounts : "3-6",
            metaphone: metaphone('Cresselia'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Skarmory",
            level: 3,
            accounts : "2-4",
            metaphone: metaphone('Skarmory'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        },
        {
            name: "Heatran",
            level: 5,
            accounts : "3-4",
            metaphone: metaphone('Heatran'),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        }
      ],
    {})
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.bulkDelete('raidbosses', null, {});
  }
};
