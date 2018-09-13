// ===================
// Exit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const listRaids = require('../util/listRaids')

moment.tz.setDefault('Europe/Amsterdam')

function ExitRaidWizard (bot) {
  return new WizardScene('exit-raid-wizard',
    async (ctx) => {
      const user = ctx.from
      // ToDo: check for endtime
      let raids = await models.Raid.findAll({
        where: {
          endtime: {
            [Op.gt]: moment().unix()
          }
        },
        include: [
          models.Gym,
          {
            model: models.Raiduser,
            where: {
              'uid': user.id
            }
          }
        ]
      })
      if (raids.length === 0) {
        ctx.replyWithMarkdown(ctx.i18n.t('exit_raid_not_participating'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            return ctx.scene.leave()
          })
      } else {
        let btns = []
        ctx.session.gymnames = {}
        for (var a = 0; a < raids.length; a++) {
          ctx.session.gymnames[raids[a].id] = raids[a].Gym.gymname

          let strttm = moment.unix(raids[a].start1).format('H:mm')
          // console.log(raids[a].start1, moment(raids[a].start1).tz(process.env.TZ))
          btns.push(Markup.callbackButton(`${raids[a].Gym.gymname} ${strttm}; ${raids[a].target}`, raids[a].id))
        }
        btns.push(Markup.callbackButton(ctx.i18n.t('exit_raid_not_listed'), 0))
        return ctx.replyWithMarkdown(ctx.i18n.t('exit_raid_select_raid'), Markup.inlineKeyboard(btns, {columns: 1}).extra())
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      const user = ctx.from
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      let selectedraid = parseInt(ctx.update.callback_query.data)
      if (selectedraid === 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving'))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            return ctx.scene.leave()
          })
      }
      try {
        await models.Raiduser.destroy({
          where: {
            [Op.and]: [
              {
                'uid': user.id
              },
              {
                'raidId': selectedraid
              }
            ]
          }
        })
      } catch (error) {
        console.log('Error removing user from raid', error)
      }
      let out = await listRaids(
        ctx.i18n.t('exit_raid_list_message', {
          user: user,
          gymname: ctx.session.gymnames[selectedraid]
        }))
      if (out === null) {
        ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('no_raids_found')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
      ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure')))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = ExitRaidWizard
