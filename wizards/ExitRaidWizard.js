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
        return ctx.replyWithMarkdown(ctx.i18n.t('exit_raid_not_participating'), Markup.removeKeyboard())
          .then(() => ctx.scene.leave())
      } else {
        ctx.session.raidbtns = []
        ctx.session.gymnames = {}
        for (var a = 0; a < raids.length; a++) {
          ctx.session.gymnames[raids[a].id] = raids[a].Gym.gymname

          let strttm = moment.unix(raids[a].start1).format('H:mm')
          // console.log(raids[a].start1, moment(raids[a].start1).tz(process.env.TZ))
          ctx.session.raidbtns.push([`${raids[a].Gym.gymname} ${strttm}; ${raids[a].target}`, raids[a].id])
        }
        ctx.session.raidbtns.push([ctx.i18n.t('exit_raid_not_listed'), 0])
        console.log(ctx.session.raidbtns.map(el => el[0]))
        return ctx.replyWithMarkdown(ctx.i18n.t('exit_raid_select_raid'), Markup.keyboard(ctx.session.raidbtns.map(el => el[0])).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      const user = ctx.from
      let selectedraid = 0
      for (let i = 0; i < ctx.session.raidbtns.length; i++) {
        if (ctx.session.raidbtns[i][0] === ctx.update.message.text) {
          selectedraid = ctx.session.raidbtns[i][1]
          break
        }
      }

      if (selectedraid === 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving'), Markup.removeKeyboard().extra())
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
        }), ctx)
      if (out === null) {
        ctx.replyWithMarkdown(ctx.i18n.t('no_raids_found'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
      return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = ExitRaidWizard
