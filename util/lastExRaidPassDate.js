
const moment = require('moment-timezone')
const axios = require('axios')
moment.tz.setDefault('Europe/Amsterdam')

let lastExwaveDate
let secondToLastExwaveDate
let lastExwaveParseCheck

//Hours to pass before we do a refresh of the HTML table
const refreshRate = 5

/**
* Gets the latest EX Raid passes waves from https://www.p337.info/pokemongo/pages/ex-invites/
*
*/
module.exports = async () => {
  if (!lastExwaveDate || moment().add(-refreshRate, 'minutes').unix() > lastExwaveParseCheck) {
    await axios.get('https://www.p337.info/pokemongo/pages/ex-invites/', {responseType: 'text'}).then(response => {
      let regex = /pokemon = {"response":([^]*)};/g
      let match = regex.exec(response.data)
      let list = JSON.parse(match[1])

      lastExwaveParseCheck = moment().unix()
      lastExwaveDate = moment(list[list.length - 1].id, 'DD/MM/YYYY')
      secondToLastExwaveDate = moment(list[list.length - 2].id, 'DD/MM/YYYY')
      console.log(`Refreshed the EX raid wave dates to: ${lastExwaveDate.format('DD-MM-YYYY')} and ${secondToLastExwaveDate.format('DD-MM-YYYY')}`)
    })
  }

  return {lastExwaveDate, secondToLastExwaveDate}
}
