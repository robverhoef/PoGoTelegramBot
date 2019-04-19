// ===================
// join raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const listRaids = require('../util/listRaids')
const setLocale = require('../util/setLocale')

moment.tz.setDefault('Europe/Amsterdam')

function JoinRaidWizard (bot) {
  return new WizardScene('join-raid-wizard',
    async (ctx) => {
      await setLocale(ctx)
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
        return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_no_raids_found'), Markup.removeKeyboard())
          .then(() => ctx.scene.leave())
      }
      // buttons to show, with index from candidates as data (since maxlength of button data is 64 bytes…)
      ctx.session.raidbtns = []
      let candidates = []
      for (var a = 0; a < raids.length; a++) {
        let strttm = moment.unix(raids[a].start1).format('H:mm')
        candidates[a] = {
          gymname: raids[a].Gym.gymname,
          raidid: raids[a].id,
          startsat: strttm
        }
        ctx.session.raidbtns.push(`${raids[a].Gym.gymname} ${strttm}; ${raids[a].target}`)
      }
      candidates.push({
        gymname: ctx.i18n.t('join_raid_dont_participate'),
        raidid: 0
      })
      ctx.session.raidbtns.push(ctx.i18n.t('join_raid_dont_participate'))
      // save all candidates to session…
      ctx.session.raidcandidates = candidates
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_select_raid'), Markup.keyboard(ctx.session.raidbtns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      // retrieve selected candidate  from session…
      let ind = ctx.session.raidbtns.indexOf(ctx.update.message.text)
      if (ind === -1) {
        return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_not_found'), Markup.removeKeyboard().extra())
      }
      let selectedraid = ctx.session.raidcandidates[ind]
      if (selectedraid.raidid === 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_cancel'), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session.raidcandidates = null
            return ctx.scene.leave()
          })
      }
      // save selected index to session
      ctx.session.joinedraid = parseInt(ind)
      ctx.session.accountbtns = [['1'], ['2', '3', '4', '5']]
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
        gymname: selectedraid.gymname
      }), Markup.keyboard(ctx.session.accountbtns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // some people manage to enter a NaN… so: || 1
      const accounts = parseInt(ctx.update.message.text) || 1
      const joinedraid = ctx.session.raidcandidates[ctx.session.joinedraid]

      const user = ctx.from
      // Check already registered? If so; update else store new
      let raiduser = await models.Raiduser.findOne({
        where: {
          [Op.and]: [{ uid: user.id }, { raidId: joinedraid.raidid }]
        }
      })
      if (raiduser) {
        // update
        try {
          await models.Raiduser.update(
            { accounts: accounts },
            {
              where: {
                [Op.and]: [
                  { uid: user.id },
                  { raidId: joinedraid.raidid }
                ]
              }
            }
          )
        } catch (error) {
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
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
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard())
            .then(() => ctx.scene.leave())
        }
      }
      const oldlocale = ctx.i18n.locale()
      ctx.i18n.locale(process.env.DEFAULT_LOCALE)
      const reason = ctx.i18n.t('join_raid_list_reason', {
        user: user,
        gymname: joinedraid.gymname
      })
      ctx.i18n.locale(oldlocale)
      let out = await listRaids(`${reason}\n\n`, ctx)
      if (out === null) {
        return ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found'), Markup.removeKeyboard())
          .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_finished', {
        joinedraid: joinedraid
      }), Markup.removeKeyboard().extra())
        .then(async () => {
          bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
        })
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = JoinRaidWizard
