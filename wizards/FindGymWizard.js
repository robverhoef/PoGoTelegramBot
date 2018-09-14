// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

var FindGymWizard = function () {
  return new WizardScene('find-gym-wizard',
    (ctx) => {
      ctx.replyWithMarkdown(`Geef minstens 2 tekens van de gymnaam…`)
        .finally(() => ctx.wizard.next())
    },
    async (ctx) => {
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        ctx.replyWithMarkdown(`Minimaal 2 tekens van de gymnaam… \n*Probeer het nog eens.* 🤨`)
          .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymName: {
              [Op.like]: '%' + term + '%'
            }
          }
        })
        let out = ''
        let l = candidates.length
        for (let i = 0; i < l; i++) {
          out += `*${candidates[i].gymname}\n*`
          if (candidates[i].exRaidTrigger) {
            out += `ExRaid Trigger\n`
          }
          if (candidates[i].googleMapsLink) {
            out += `[Kaart](${candidates[i].googleMapsLink})`
          } else {
            out += `[Geen locatie beschikbaar]`
          }
          out += '\n\n'
        }
        ctx.replyWithMarkdown(`Ik heb ${l} gym${l === 1 ? '' : 's'} gevonden voor '${term}' 🤓\n\n${out}*Gebruik */start* als je nog een actie wilt uitvoeren. Of ga terug naar de groep.*`, {disable_web_page_preview: true})
          .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = FindGymWizard
