// ===================
// join raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')
const listRaids = require('../util/listRaids')

moment.tz.setDefault('Europe/Amsterdam')

var RemoteInvitesWizard = function (bot) {
  return new WizardScene('remote-invites-wizard',
    // step 0
    async (ctx) => {
      await setLocale(ctx)
      const user = ctx.from
      const dbuser = await models.User.findOne({
        where: {
          tId: {
            [Op.eq]: user.id
          }
        }
      })
      if (!dbuser) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_something_wrong_finding_user')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.userId = dbuser.id
      ctx.session.invitebtns = [
        `${ctx.i18n.t('hour', { hour: 0.5 })}`,
        `${ctx.i18n.t('hour', { hour: 1 })}`,
        `${ctx.i18n.t('hour', { hour: 1.5 })}`,
        `${ctx.i18n.t('hour', { hour: 2 })}`
      ]
      const now = moment().unix()
      const count = await models.Invitables.count({
        where: {
          [Op.and]: [
            {
              endTime: {
                [Op.gt]: now
              }
            },
            {
              userId: {
                [Op.eq]: ctx.session.userId
              }
            }
          ]
        }
      })
      if (count > 0) {
        ctx.session.invitebtns.push(
          `${ctx.i18n.t('remote_invites_stop')}`
        )
      }
      return ctx.replyWithMarkdown(`${ctx.i18n.t('remote_invites_until')}`, Markup.keyboard(ctx.session.invitebtns)
        .oneTime()
        .resize()
        .extra())
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      // simple look up table
      const hours = [0.5, 1, 1.5, 2, -1]
      const term = ctx.update.message.text.trim()
      const index = ctx.session.invitebtns.findIndex(e => e === term)
      ctx.session.timeval = hours[index]
      if (hours[index] === -1) {
        // no need to ask for a pokemon
        ctx.wizard.selectStep(4)
        return ctx.wizard.steps[4](ctx)
      } else {
        ctx.wizard.selectStep(2)
        return ctx.wizard.steps[2](ctx)
      }
    },
    // step 2
    async (ctx) => {
      return ctx.replyWithMarkdown(ctx.i18n.t('remote_invitables_pokemon'), Markup.removeKeyboard()).then(() => {
        return ctx.wizard.next()
      })
    },
    // store pokemon
    // step 3
    async (ctx) => {
      const pok = ctx.update.message.text.trim()
      ctx.session.pokemon = pok.toLowerCase() !== 'x' ? pok : null
      ctx.wizard.selectStep(4)
      return ctx.wizard.steps[4](ctx)
    },

    // finish
    // step 4
    async (ctx) => {
      const user = ctx.from
      if (ctx.session.timeval === -1) {
        // delete
        models.Invitables.destroy({
          where: {
            userId: ctx.session.userId
          }
        })
        ctx.replyWithMarkdown(ctx.i18n.t('remote_invites_finish_stop'), Markup.removeKeyboard().extra())
          .then(async () => {
            const out = await listRaids(ctx.i18n.t('remote_invite_stop_list', {
              first_name: user.first_name
            }), ctx)
            bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
          })
          .then(() => ctx.scene.leave())
      } else {
        // store
        const starttime = moment()
        const endtime = moment(starttime).add(ctx.session.timeval, 'hours')

        let invitable = await models.Invitables.findOne({
          where: {
            userId: {
              [Op.eq]: ctx.session.userId
            }
          }
        })
        if (invitable) {
          // update
          try {
            await models.Invitables.update(
              {
                starttime: starttime.unix(),
                endtime: endtime.unix(),
                pokemon: ctx.session.pokemon
              },
              {
                where: { userId: ctx.session.userId }
              }
            )
          } catch (error) {
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        } else {
          // new raid user
          invitable = models.Invitables.build({
            userId: ctx.session.userId,
            starttime: starttime.unix(),
            endtime: endtime.unix(),
            pokemon: ctx.session.pokemon
          })
          try {
            await invitable.save()
          } catch (error) {
            console.log('Woops… registering raiduser failed', error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard())
              .then(() => ctx.scene.leave())
          }
        }
        ctx.replyWithMarkdown(`${ctx.i18n.t('remote_invites_finish_start')}`, Markup.removeKeyboard().extra())
          .then(async () => {
            const out = await listRaids(ctx.i18n.t('remote_invite_list', {
              first_name: user.first_name, userid: user.id
            }), ctx)
            bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
          })
          .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = RemoteInvitesWizard
