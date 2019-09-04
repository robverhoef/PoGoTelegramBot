// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const metaphone = require('metaphone')
const adminCheck = require('../util/adminCheck')
const setLocale = require('../util/setLocale')

function AddRaidbossWizard (bot) {
  return new WizardScene('add-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      await setLocale(ctx)
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }
      ctx.session.newboss = {}
      return ctx.replyWithMarkdown(`${ctx.i18n.t('add_raidboss_intro')}`, Markup.removeKeyboard())
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
        return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_exists'))
          .then(() => ctx.scene.leave())
      }
      const btns = ['1', '2', '3', '4', '5']
      return ctx.replyWithMarkdown(`${ctx.i18n.t('raidboss_level_question', {
        bossname: bossname
      })}`, Markup.keyboard(btns)
        .resize()
        .oneTime()
        .extra()
      )
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle level, ask for recommended number of accounts
    (ctx) => {
      ctx.session.newboss.level = parseInt(ctx.update.message.text.trim())
      return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_recommended_accounts', {
        bossname: ctx.session.newboss.name
      }))
        .then(() => ctx.wizard.next())
    },

    // Handle recommended number of accounts
    async (ctx) => {
      ctx.session.newboss.accounts = parseInt(ctx.update.message.text.trim())
      ctx.session.savebtns = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      ctx.replyWithMarkdown(ctx.i18n.t('raidboss_save_question', {
        bossname: ctx.session.newboss.name,
        bosslevel: ctx.session.newboss.level,
        numaccounts: ctx.session.newboss.accounts
      }), Markup.keyboard(ctx.session.savebtns)
        .oneTime()
        .resize()
        .extra()
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
        console.log('new boss', newboss)
        try {
          await newboss.save()
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_save_canceled'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('add_raidboss_finished'), Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = AddRaidbossWizard
