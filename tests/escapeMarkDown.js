var chai = require('chai')
const expect = chai.expect
const should = chai.should()

const escapeMarkDown = require('../util/escapeMarkDown')
var assert = require('assert')

describe('escapeMarkDown Test', function () {
  it('with input \'_Rob\' should return: \\_Rob', async function () {
    const tst = escapeMarkDown('_Rob')
    assert.strictEqual(tst, '\\_Rob')
  })
  it('with input \'_Rob_\' should return: \\_Rob\\_', async function () {
    const tst = escapeMarkDown('_Rob_')
    assert.strictEqual(tst, '\\_Rob\\_')
  })
  it('with input \'#Rob\' should return: \\#Rob', async function () {
    const tst = escapeMarkDown('#Rob')
    assert.strictEqual(tst, '\\#Rob')
  })
  it('with input \'*Rob\' should return: \\*Rob', async function () {
    const tst = escapeMarkDown('*Rob')
    assert.strictEqual(tst, '\\*Rob')
  })
  it('with input \'`Rob\' should return: \\`Rob', async function () {
    const tst = escapeMarkDown('`Rob')
    assert.strictEqual(tst, '\\`Rob')
  })
})
