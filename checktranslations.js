#!/usr/bin/env node

// This script will check wether all keys of nl.yaml exist in other translation files
// note: Dutch is the leading language here

const yaml = require('js-yaml')
const fs = require('fs')
const chalk = require('chalk')
const cheader = chalk.inverse
const cerror = chalk.red
const csuccess = chalk.green
require('./locales.js')

const locales = JSON.parse(process.env.LOCALES)
let nl
try {
  nl = yaml.safeLoad(fs.readFileSync('./locales/nl.yaml', 'utf8'))
} catch (error) {
  console.log(error.message)
  process.exit(1)
}
console.log(cheader('         Loading language files…        '))
const langs = {}
for (const locale of locales) {
  if (locale[0] !== 'nl') {
    try {
      langs[locale[0]] = yaml.safeLoad(fs.readFileSync('./locales/' + locale[0] + '.yaml', 'utf8'))
      langs[locale[0]].__language__ = locale[1]
    } catch (error) {
      console.log(`ERROR WHILE LOADING ${locale[0]}.yaml:\n${error.message}`)
      process.exit(1)
    }
  }
}
console.log('…language files loaded')
console.log(cheader('        Looking for missing keys…       '))
let errs = 0
Object.keys(nl).forEach(key => {
  Object.keys(langs).forEach(loc => {
    if (langs[loc][key] === undefined) {
      errs++
      console.log(cerror(` Missing  in ${langs[loc].__language__}, ${loc}.yaml: ${key} `))
    }
  })
})
if (errs > 0) {
  console.log(cheader(cerror(`          ${errs} missing keys found          `)))
} else {
  console.log(cheader(csuccess('              Looking good!             ')))
}
console.log('\n')
