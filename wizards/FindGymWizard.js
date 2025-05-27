// ===================
// add gym wizard
// ===================
// import WizardScene from 'telegraf/scenes/wizard'
import { Scenes } from 'telegraf'
import { Markup } from 'telegraf'
import models from '../models/index.js'
import Sequelize from 'sequelize'
const Op = Sequelize.Op
import setLocale from '../util/setLocale.js'

var FindGymWizard = function () {
  return new Scenes.WizardScene(
    'find-gym-wizard',
    async (ctx) => {
      await setLocale(ctx)
      return ctx
        .replyWithHTML(
          ctx.i18n.t('find_gym_location_intro'),
          Markup.removeKeyboard()
        )
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        ctx.replyWithHTML(ctx.i18n.t('find_gym_two_chars_minimum'))
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
          out += `<b>${candidates[i].gymname}\n</b>`
          if (candidates[i].exRaidTrigger) {
            out += `${ctx.i18n.t('exraid_candidate')}\n`
          }
          if (candidates[i].googleMapsLink) {
            out += `<a href="${candidates[i].googleMapsLink}">${ctx.i18n.t(
              'map'
            )}</a>`
          } else {
            out += `[${ctx.i18n.t('no_input')}]`
          }
          out += '\n\n'
        }
        ctx
          .replyWithHTML(
            ctx.i18n.t('find_gym_location_overview', {
              out: out,
              term: term,
              l: l
            }),
            { disable_web_page_preview: true }
          )
          .then(() => ctx.scene.leave())
      }
    }
  )
}

export default FindGymWizard
