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
        if (ctx.update.callback_query) {
          ctx.answerCbQuery(null, undefined, true)
          ctx.deleteMessage(ctx.update.callback_query.message.message_id)
        }
        return ctx.replyWithMarkdown('Je doet nog niet mee met raids…\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start')
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
        ctx.session.raidbtns.push(['Mijn raid staat er niet bij…', 0])
        if (ctx.update.callback_query) {
          ctx.answerCbQuery(null, undefined, true)
          ctx.deleteMessage(ctx.update.callback_query.message.message_id)
        }
        return ctx.replyWithMarkdown('Kies een raid…', Markup.keyboard(ctx.session.raidbtns.map(el => el[0])).oneTime().resize().extra())
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
        return ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
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
      let out = await listRaids(`[${user.first_name}](tg://user?id=${user.id}) meldde zich af voor raid bij ${ctx.session.gymnames[selectedraid]}\n\n`)
      if (out === null) {
        ctx.replyWithMarkdown(`Mmmm, geen raid te vinden`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
      return ctx.replyWithMarkdown(`Klaar!\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`, Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = ExitRaidWizard
