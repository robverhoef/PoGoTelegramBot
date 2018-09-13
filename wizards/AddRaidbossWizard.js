// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')

function AddRaidbossWizard (bot) {
  return new WizardScene('add-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      ctx.session.newboss = {}
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('add_raidboss_intro'))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    // Step 1: Handle raidboss name and ask for level
    async (ctx) => {
      let bossname = ctx.update.message.text.trim()
      ctx.session.newboss.name = bossname
      // lookup raidboss, prevent double bosses
      let oldboss = await models.Raidboss.find({
        where: {
          name: bossname
        }
      })
      if (oldboss !== null) {
        return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_exists'))
          .then(() => ctx.scene.leave())
      }
      let btns = []
      for (let i = 0; i < 5; i++) {
        btns.push(Markup.callbackButton(i + 1, i + 1))
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_level_question', {
        bossname: bossname
      }), Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle level, ask for recommended number of accounts
    (ctx) => {
      ctx.session.newboss.level = ctx.update.callback_query.data
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
        ctx.deleteMessage(ctx.update.callback_query.message.message_id)
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_recommended_accounts', {
        bossname: ctx.session.newboss.name
      }))
        .then(() => ctx.wizard.next())
    },

    // Handle recommended number of accounts
    async (ctx) => {
      ctx.session.newboss.accounts = ctx.update.message.text.trim()
      let btns = [
        Markup.callbackButton(ctx.i18n.t('yes'), 'yes'),
        Markup.callbackButton(ctx.i18n.t('no'), 'no')
      ]
      ctx.replyWithMarkdown(ctx.i18n.t('raidboss_save_question', {
        bossname: ctx.session.newboss.name,
        bosslevel: ctx.session.newboss.level,
        numaccounts: ctx.session.newboss.accounts
      }), Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .then(() => {
          return ctx.wizard.next()
        })
    },

    // Handle save
    async (ctx) => {
      if (ctx.update.callback_query.data === 'yes') {
        let newboss = models.Raidboss.build({
          name: ctx.session.newboss.name,
          level: ctx.session.newboss.level,
          accounts: ctx.session.newboss.accounts
        })
        try {
          await newboss.save()
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'))
            .then(() => ctx.scene.leave())
        }
      } else {
        if (ctx.update.callback_query) {
          ctx.answerCbQuery(null, undefined, true)
          ctx.deleteMessage(ctx.update.callback_query.message.message_id)
        }
        return ctx.replyWithMarkdown(ctx.i18n.t('raidboss_save_canceled'))
          .then(() => ctx.scene.leave())
      }
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
        ctx.deleteMessage(ctx.update.callback_query.message.message_id)
      }

      return ctx.replyWithMarkdown(ctx.i18n.t('add_raidboss_finished'))
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = AddRaidbossWizard
