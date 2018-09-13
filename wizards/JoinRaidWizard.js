// ===================
// join raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const listRaids = require('../util/listRaids')

moment.tz.setDefault('Europe/Amsterdam')

function JoinRaidWizard (bot) {
  return new WizardScene('join-raid-wizard',
    async (ctx) => {
      ctx.session.joinedraid = null
      // ToDo: check for endtime
      let raids = await models.Raid.findAll({
        include: [models.Gym, models.Raiduser],
        where: {
          endtime: {
            [Op.gt]: moment().unix()
          }
        }
      })
      if (raids.length === 0) {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('join_raid_no_raids_found')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      // buttons to show, with index from candidates as data (since maxlength of button data is 64 bytes…)
      let btns = []
      let candidates = []
      for (var a = 0; a < raids.length; a++) {
        let strttm = moment.unix(raids[a].start1).format('H:mm')
        candidates[a] = {
          gymname: raids[a].Gym.gymname,
          raidid: raids[a].id,
          startsat: strttm
        }
        btns.push(Markup.callbackButton(`${raids[a].Gym.gymname} ${strttm}; ${raids[a].target}`, a))
      }
      btns.push(Markup.callbackButton(ctx.i18n.t('join_raid_dont_participate'), candidates.length))
      candidates.push({
        gymname: 'none',
        raidid: 0
      })
      // save all candidates to session…
      ctx.session.raidcandidates = candidates
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('join_raid_select_raid'), Markup.inlineKeyboard(btns, {
          wrap: (btn, index, currentRow) => 1}).removeKeyboard().extra()))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
          .then(() => {
            ctx.session.raidcandidates = null
            return ctx.scene.leave()
          })
      }
      // retrieve selected candidate  from session…
      let selectedraid = ctx.session.raidcandidates[ctx.update.callback_query.data]
      if (selectedraid.raidid === 0) {
        return ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('join_raid_cancel')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => {
            ctx.session.raidcandidates = null
            return ctx.scene.leave()
          })
      }
      // save selected index to session
      ctx.session.joinedraid = parseInt(ctx.update.callback_query.data)
      let btns = []
      for (var a = 1; a < 6; a++) {
        btns.push(Markup.callbackButton(a, a))
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(
          () => ctx.replyWithMarkdown(
            ctx.i18n.t('join_raid_accounts_question', {
              gymname: selectedraid.gymname
            }), Markup.inlineKeyboard(btns)).removeKeyboard().extra())
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      if (!ctx.update.callback_query) {
        // console.log('afhandeling raidkeuze, geen callbackquery!')
        return ctx.replyWithMarkdown(ctx.i18n.t('something_wrong_press_button'))
      }
      const accounts = parseInt(ctx.update.callback_query.data)
      const joinedraid = ctx.session.raidcandidates[ctx.session.joinedraid]

      const user = ctx.from
      // Check already registered? If so; update else store new
      let raiduser = await models.Raiduser.find({
        where: {
          [Op.and]: [{uid: user.id}, {raidId: joinedraid.raidid}]
        }
      })
      if (raiduser) {
        // update
        try {
          await models.Raiduser.update(
            { accounts: accounts },
            { where: { [Op.and]: [{uid: user.id}, {raidId: joinedraid.raidid}] } }
          )
        } catch (error) {
          return ctx.replyWithMarkdown(ctx.i19n.t('problem_while_saving'))
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => ctx.scene.leave())
        }
      } else {
        // new raid user
        let raiduser = models.Raiduser.build({
          raidId: joinedraid.raidid,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await raiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'))
            .then(() => ctx.scene.leave())
        }
      }
      let out = await listRaids(`${ctx.i18n.t('join_raid_list_reason', {
        user: user,
        gymname: joinedraid.gymname
      })}\n\n`)
      if (out === null) {
        ctx.answerCbQuery(null, undefined, true)
          .then(() => ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found')))
          .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
          .then(() => ctx.scene.leave())
      }
      return ctx.answerCbQuery(null, undefined, true)
        .then(() => ctx.replyWithMarkdown(ctx.i18n.t('join_raid_finished', {
          joinedraid: joinedraid
        })))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(async () => {
          bot.telegram.sendMessage(process.env.GROUP_ID, out, {parse_mode: 'Markdown', disable_web_page_preview: true})
        })
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = JoinRaidWizard
