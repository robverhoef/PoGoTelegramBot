// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')

var FindGymWizard = function () {
  return new WizardScene('find-gym-wizard',
    async (ctx) => {
      await setLocale(ctx)
      return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_location_intro'), Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymName: {
              [Op.like]: '%' + term + '%'
            }
          }
        })
        let out = ''
        const l = candidates.length
        for (let i = 0; i < l; i++) {
          out += `*${candidates[i].gymname}\n*`
          if (candidates[i].exRaidTrigger) {
            out += `${ctx.i18n.t('exraid_candidate')}\n`
          }
          if (candidates[i].googleMapsLink) {
            out += `[${ctx.i18n.t('map')}](${candidates[i].googleMapsLink})`
          } else {
            out += `[${ctx.i18n.t('no_input')}]`
          }
          out += '\n\n'
        }
        ctx.replyWithMarkdown(ctx.i18n.t('find_gym_location_overview', {
          out: out,
          term: term,
          l: l
        }), { disable_web_page_preview: true })
          .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = FindGymWizard
