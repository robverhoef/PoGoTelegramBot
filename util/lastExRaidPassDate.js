
const moment = require('moment-timezone')
const axios = require('axios')

let lastExwaveDate
let secondToLastExwaveDate
let lastExwaveParseCheck

// Hours to pass before we do a refresh of the HTML table
const refreshRate = 5

function parseDateString (element) {
  return moment.tz(`${element.id} ${element.it}`, 'DD/MM/YYYY HH:mm', 'GMT').tz('Europe/Amsterdam')
}

/**
* Gets the latest EX Raid passes waves from https://www.p337.info/pokemongo/pages/ex-invites/
*/
module.exports = async () => {
  if (!lastExwaveDate || moment().add(-refreshRate, 'minutes').unix() > lastExwaveParseCheck) {
    await axios.get('https://www.p337.info/pokemongo/pages/ex-invites/', { responseType: 'text' }).then(response => {
      const regex = /pokemon = {"response":([^]*)};/g
      const match = regex.exec(response.data)

      const listJson = match[1].trim()
      const resultJson = listJson.endsWith('},\n]') ? listJson.replace('},\n]', '}]') : listJson

      const list = JSON.parse(resultJson)

      lastExwaveParseCheck = moment().unix()

      lastExwaveDate = parseDateString(list[list.length - 1])
      console.log(lastExwaveDate)
      secondToLastExwaveDate = parseDateString(list[list.length - 2])
      console.log(`Refreshed the EX raid wave dates to: ${lastExwaveDate.format('DD-MM-YYYY HH:mm')} and ${secondToLastExwaveDate.format('DD-MM-YYYY HH:mm')}`)
    })
  }

  return { lastExwaveDate, secondToLastExwaveDate }
}
