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
        ctx.replyWithMarkdown('Je doet nog niet mee met raids…\n\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start')
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            return ctx.scene.leave()
          })
      } else {
        let btns = []
        ctx.session.gymnames = {};
        for (var a = 0; a < raids.length; a++) {
          ctx.session.gymnames[raids[a].id] = raids[a].Gym.gymname;

          let strttm = moment.unix(raids[a].start1).format('H:mm')
          // console.log(raids[a].start1, moment(raids[a].start1).tz(process.env.TZ))
          btns.push(Markup.callbackButton(`${raids[a].Gym.gymname} ${strttm}; ${raids[a].target}`, raids[a].id))
        }
        btns.push(Markup.callbackButton('Mijn raid staat er niet bij…', 0))
        return ctx.replyWithMarkdown('Kies een raid…', Markup.inlineKeyboard(btns, {columns: 1}).extra())
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      const user = ctx.from
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        ctx.replyWithMarkdown('Hier ging iets niet goed…\n*Je moet op een knop klikken 👆. Of */cancel* gebruiken om mij te resetten.*')
      }
      let selectedraid = parseInt(ctx.update.callback_query.data)
      if (selectedraid === 0) {
        return ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start')
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
      let out = await listRaids(`[${user.first_name}](tg://user?id=${user.id}) meldde zich af voor raid bij ${ctx.session.gymnames[selectedraid]}\n\n`)
      if (out === null) {
        ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(`Mmmm, geen raid te vinden`))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
      ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(`Klaar!\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start`))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = ExitRaidWizard
