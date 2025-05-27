// ===================
// add raidboss wizard
// ===================
// // import WizardScene from 'telegraf/scenes/wizard'

import { Markup, Scenes } from 'telegraf'
import models from '../models/index.js'
import Sequelize from 'sequelize'
const Op = Sequelize.Op
import { metaphone } from 'metaphone'
import adminCheck from '../util/adminCheck.js'
import setLocale from '../util/setLocale.js'

function AddRaidbossWizard(bot) {
  return new Scenes.WizardScene(
    'add-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      await setLocale(ctx)
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }
      ctx.session.newboss = {}
      return ctx
        .replyWithHTML(
          `${ctx.i18n.t('add_raidboss_intro')}`,
          Markup.removeKeyboard()
        )
        .then(() => ctx.wizard.next())
    },

    // Step 1: Handle raidboss name and ask for level
    async (ctx) => {
      const bossname = ctx.update.message.text.trim()
      ctx.session.newboss.name = bossname
      // lookup raidboss, prevent double bosses
      const oldboss = await models.Raidboss.findOne({
        where: {
          name: {
            [Op.eq]: bossname
          }
        }
      })
      if (oldboss !== null) {
        return ctx
          .replyWithHTML(ctx.i18n.t('raidboss_exists'))
          .then(() => ctx.scene.leave())
      }
      const btns = ['1', '2', '3', '4', '5']
      return ctx
        .replyWithHTML(
          `${ctx.i18n.t('raidboss_level_question', {
            bossname: bossname
          })}`,
          Markup.keyboard(btns).resize().oneTime()
        )
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle level, ask for recommended number of accounts
    (ctx) => {
      ctx.session.newboss.level = parseInt(ctx.update.message.text.trim())
      return ctx
        .replyWithHTML(
          ctx.i18n.t('raidboss_recommended_accounts', {
            bossname: ctx.session.newboss.name
          })
        )
        .then(() => ctx.wizard.next())
    },

    // Handle recommended number of accounts
    async (ctx) => {
      ctx.session.newboss.accounts = parseInt(ctx.update.message.text.trim())
      ctx.session.savebtns = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      ctx
        .replyWithHTML(
          ctx.i18n.t('raidboss_save_question', {
            bossname: ctx.session.newboss.name,
            bosslevel: ctx.session.newboss.level,
            numaccounts: ctx.session.newboss.accounts
          }),
          Markup.keyboard(ctx.session.savebtns).oneTime().resize()
        )
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle save
    async (ctx) => {
      const dosave = ctx.session.savebtns.indexOf(ctx.update.message.text) === 0
      if (dosave) {
        const newboss = models.Raidboss.build({
          name: ctx.session.newboss.name,
          level: ctx.session.newboss.level,
          accounts: ctx.session.newboss.accounts,
          metaphone: metaphone(ctx.session.newboss.name)
        })
        console.log('Added new boss', newboss)
        try {
          await newboss.save()
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx
            .replyWithHTML(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard()
            )
            .then(() => ctx.scene.leave())
        }
      } else {
        return ctx
          .replyWithHTML(
            ctx.i18n.t('raidboss_save_canceled'),
            Markup.removeKeyboard()
          )
          .then(() => ctx.scene.leave())
      }
      return ctx
        .replyWithHTML(
          ctx.i18n.t('add_raidboss_finished'),
          Markup.removeKeyboard()
        )
        .then(() => ctx.scene.leave())
    }
  )
}

export default AddRaidbossWizard
