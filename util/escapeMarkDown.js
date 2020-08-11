module.exports = (strin) => {
  let strout = strin.replace(/_/g, '\\_')
  strout = strout.replace(/#/g, '\\#')
  strout = strout.replace(/\*/g, '\\*')
  strout = strout.replace(/`/g, '\\`')
  return strout
}
