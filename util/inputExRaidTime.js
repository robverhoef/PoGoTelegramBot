
const moment = require('moment-timezone')
moment.tz.setDefault('Europe/Amsterdam')

/**
* Converts a given time, i.e. 20:30 or 09:45, to a timestamp
* @param timein {string}
*/
module.exports = (days, timein) => {
  let thetime = timein.split(':')
  if (thetime[0] === undefined || thetime[1] === undefined) {
    return false
  }
  let hours = parseInt(thetime[0].trim())
  if (hours < 0 || hours > 23) {
    return false
  }
  let minutes = parseInt(thetime[1].trim())
  if (minutes < 0 || minutes > 59) {
    return false
  }
  var now = moment().add(days, 'days')
  now.hours(hours)
  now.minutes(minutes)
  now.seconds(0)
  // console.log('it now: ', now, 'unix', now.unix())
  return now.unix() // format('YYYY-MM-DD HH:mm:ss')
}
