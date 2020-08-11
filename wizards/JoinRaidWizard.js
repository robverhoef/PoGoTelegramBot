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
const escapeMarkDown = require('../util/escapeMarkDown')
moment.tz.setDefault('Europe/Amsterdam')

function JoinRaidWizard (bot) {
  return new WizardScene('join-raid-wizard',
    async (ctx) => {
      await setLocale(ctx)
      ctx.session.joinedraid = null
      // ToDo: check for endtime
      const raids = await models.Raid.findAll({
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
      const candidates = []
      for (var a = 0; a < raids.length; a++) {
        const strttm = moment.unix(raids[a].start1).format('H:mm')
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
      const ind = ctx.session.raidbtns.indexOf(ctx.update.message.text)
      if (ind === -1) {
        return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_not_found'), Markup.removeKeyboard().extra())
      }
      ctx.session.selectedraid = ctx.session.raidcandidates[ind]
      if (ctx.session.selectedraid.raidid === 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_cancel'), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session.raidcandidates = null
            return ctx.scene.leave()
          })
      }
      // save selected index to session
      ctx.session.joinedraid = parseInt(ind, 10)
      // Extra question for remote raid
      ctx.session.remoteOptions = [ctx.i18n.t('remote_raid_confirm'), ctx.i18n.t('local_raid_confirm')]
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('remote_raid_question')}*\n\n${ctx.i18n.t('covid19_disclaimer')}`, Markup.keyboard(ctx.session.remoteOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      // save selected answer to session
      ctx.session.remoteraidanswer = ctx.update.message.text.trim()
      if (ctx.session.remoteraidanswer !== ctx.i18n.t('remote_raid_confirm') && ctx.session.remoteraidanswer !== ctx.i18n.t('local_raid_confirm')) {
        ctx.replyWithMarkdown(ctx.i18n.t('retry_or_cancel'), Markup.keyboard(ctx.session.remoteOptions).resize().oneTime().extra())
          .then(() => {

          })
      } else {
      // ctx.session.remoteraidanswer  How many accounts question
        ctx.session.accountbtns = [['1'], ['2', '3', '4'], ['5', '6', '7']]
        return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
          gymname: ctx.session.selectedraid.gymname
        }), Markup.keyboard(ctx.session.accountbtns).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      let remoteraidusers = 0
      // some people manage to enter a NaN… so: || 1
      ctx.session.accounts = parseInt(ctx.update.message.text, 10) || 1
      ctx.session.remote = false
      const joinedraid = ctx.session.raidcandidates[ctx.session.joinedraid]
      let remotecurrentusers = 0
      if (ctx.session.remoteraidanswer === ctx.i18n.t('remote_raid_confirm')) {
        ctx.session.remote = true

        const rucount = await models.sequelize.query('select sum(accounts) as remotes from raidusers where raidId = ? and uid != ? and remote = 1', {
          replacements: [joinedraid.raidid, ctx.from.id],
          type: models.sequelize.QueryTypes.SELECT
        })
        remotecurrentusers = 0
        if (rucount !== null) {
          remotecurrentusers = rucount.length > 0 ? parseInt(rucount[0].remotes, 10) : 0
        }
        remoteraidusers = remotecurrentusers + parseInt(ctx.session.accounts, 10)
      }
      if (remoteraidusers > parseInt(process.env.THRESHOLD_REMOTE_USERS, 10)) {
        console.info(`TOO MANY REMOTES current remotes ${remotecurrentusers}, requested to add: ${parseInt(ctx.session.accounts, 10)} limit ${parseInt(process.env.THRESHOLD_REMOTE_USERS, 10)}`)
        return ctx.replyWithMarkdown(`*${ctx.i18n.t('maximum_remote_raid_reached')}* ${process.env.THRESHOLD_REMOTE_USERS}\n\n${ctx.i18n.t('current_number_remote_users')} ${remotecurrentusers} ${ctx.i18n.t('try_again_remote_limit')}`)
          .then(() => ctx.scene.leave())
      }

      // some people manage to enter a NaN… so: || 1
      const accounts = ctx.session.accounts
      const user = ctx.from
      // Check already registered? If so; update else store new
      const raiduser = await models.Raiduser.findOne({
        where: {
          [Op.and]: [{ uid: user.id }, { raidId: joinedraid.raidid }]
        }
      })
      if (raiduser) {
      // update
        try {
          await models.Raiduser.update(
            {
              accounts: accounts,
              remote: ctx.session.remote
            },
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
        const raiduser = models.Raiduser.build({
          raidId: joinedraid.raidid,
          username: user.first_name,
          uid: user.id,
          accounts: accounts,
          remote: ctx.session.remote
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
        user_first_name: escapeMarkDown(user.first_name),
        gymname: joinedraid.gymname
      })
      ctx.i18n.locale(oldlocale)
      const out = await listRaids(`${reason}\n\n`, ctx)
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
