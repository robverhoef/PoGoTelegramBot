var chai = require('chai')
const expect = chai.expect
const should = chai.should()

const resolveRaidBoss = require('../util/resolveRaidBoss')
var assert = require('assert')

describe('Resolve raid boss Test', function () {
  it('with input \'level 5 ei\' should return raidboss: Level 5 egg and level: 5', async function () {
    const boss = await resolveRaidBoss('level 5 ei')
    assert.strictEqual(boss.name, 'Level 5 egg')
    assert.strictEqual(boss.level, 5)
  })

  it('with input \'lvl3\' should return raidboss: Level 3 egg and level: 3', async function () {
    const boss = await resolveRaidBoss('lvl3')
    assert.strictEqual(boss.name, 'Level 3 egg')
    assert.strictEqual(boss.level, 3)
  })

  it('with input \'lvl 2\' should return raidboss: Level 2 egg and level: 2', async function () {
    const boss = await resolveRaidBoss('lvl 2')
    assert.strictEqual(boss.name, 'Level 2 egg')
    assert.strictEqual(boss.level, 2)
  })

  // need to set up sequelize mock first… some day
  it('with input \'Tyranitar\' should return raidboss: Tyranitar and level: 4', async function () {
    const boss = await resolveRaidBoss('Tyranitar')
    assert.strictEqual(boss.name, 'Tyranitar')
    assert.strictEqual(boss.level, 4)
  })

  it('with input \'Tiranitar\' should return raidboss: Tyranitar and level: 4', async function () {
    const boss = await resolveRaidBoss('Tiranitar')
    assert.strictEqual(boss.name, 'Tyranitar')
    assert.strictEqual(boss.level, 4)
  })

  it('with input \'Regiruk\' should return raidboss: Regirock and level: 5', async function () {
    const boss = await resolveRaidBoss('Regiruk')
    assert.strictEqual(boss.name, 'Regirock')
    assert.strictEqual(boss.level, 5)
  })
  it('with input \'Mewto\' should return raidboss: null', async function () {
    const boss = await resolveRaidBoss('Mewto')
    assert.deepEqual(boss, null)
  })
})
