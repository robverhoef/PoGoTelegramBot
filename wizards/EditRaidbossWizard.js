// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function EditRaidbossWizard (bot) {
  return new WizardScene('edit-raidboss-wizard',
    // Step 0: Raidboss name request
    async (ctx) => {
      ctx.session.editboss = {}
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_raiddboss_intro'))
        .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
        .then(() => ctx.wizard.next())
    },

    // Step 1: Raidboss lookup by name
    async (ctx) => {
      let term = ctx.update.message.text.trim()
      let bosses = await models.Raidboss.findAll({
        where: {
          name: {[Op.like]: '%' + term + '%'}
        }
      })
      if (bosses.length === 0) {
        return ctx.replyWithMarkdown(('edit_raidboss_not_found', {
          term: term === '/start help_fromgroup' ? '' : term
        }))
          .then(() => ctx.scene.leave())
      }
      let btns = []
      ctx.session.bosscandidates = []
      for (let i = 0; i < bosses.length; i++) {
        ctx.session.bosscandidates.push({
          id: bosses[i].id,
          name: bosses[i].name,
          level: bosses[i].level,
          accounts: bosses[i].accounts
        })
        btns.push(Markup.callbackButton(bosses[i].name, i))
      }
      ctx.session.bosscandidates.push({name: 'none', id: 0})
      btns.push(Markup.callbackButton(ctx.i18n.t('edit_raidboss_not_listed'), bosses.length))
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_select'), Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 2: handle boss selection , ask what to change
    async (ctx) => {
      if (ctx.session.more !== true) {
        let bossindex = ctx.update.callback_query.data
        if (ctx.session.bosscandidates[bossindex].id === 0) {
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_not_listed_close'))
            .then(() => ctx.scene.leave())
        }
        ctx.session.editboss = ctx.session.bosscandidates[bossindex]
      }
      let btns = [
        Markup.callbackButton(`${ctx.i18n.t('edit_raidboss_btn_name')}: ${ctx.session.editboss.name}`, 'name'),
        Markup.callbackButton(`${ctx.i18n.t('edit_raidboss_btn_level')}: ${ctx.session.editboss.level}`, 'level'),
        Markup.callbackButton(`${ctx.i18n.t('edit_raidboss_btn_number_of_accounts')}: ${ctx.session.editboss.accounts}`, 'accounts'),
        Markup.callbackButton(ctx.i18n.t('edit_raidboss_btn_do_nothing'), 0)
      ]
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_what'), Markup.inlineKeyboard(btns, {columns: 1}).removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 3: ask for value
    async (ctx) => {
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      let attr = ctx.update.callback_query.data
      let question = ''
      ctx.session.key = attr
      if (ctx.update.callback_query) {
        ctx.deleteMessage(ctx.update.callback_query.message.message_id)
      }
      switch (attr) {
        case 'name':
          question = ctx.i18n.t('edit_raidboss_name_question')
          break
        case 'level':
          question = ctx.i18n.t('edit_raidboss_level_question')
          break
        case 'accounts':
          question = ctx.i18n.t('edit_raidboss_accounts_question')
          break
        case '0':
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_cancel_edit'))
            .then(() => ctx.scene.leave())
        default:
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_no_clue'))
            .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(question)
        .then(() => ctx.wizard.next())
    },
    // Step 4 handle value, ask whats next?
    async (ctx) => {
      let value = ctx.update.message.text.trim()
      ctx.session.editboss[ctx.session.key] = value
      let out = `${ctx.i18n.t('edit_raidboss_overview_name')}: ${ctx.session.editboss.name}\n${ctx.i18n.t('edit_raidboss_overview_level')}: ${ctx.session.editboss.level}\n${ctx.i18n.t('edit_raidboss_overview_accounts')}: ${ctx.session.editboss.accounts}`
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_overview', {
        out: out
      }), Markup.inlineKeyboard([
        Markup.callbackButton(ctx.i18n.t('edit_raidboss_btn_save_close'), 0),
        Markup.callbackButton(ctx.i18n.t('edit_raidboss_btn_edit_more'), 1),
        Markup.callbackButton(ctx.i18n.t('edit_raidboss_btn_cancel'), 2)
      ], {columns: 1})
        .removeKeyboard()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },
    // Step 4 handle value, ask whats next?
    async (ctx) => {
      if (ctx.update.callback_query) {
        ctx.answerCbQuery(null, undefined, true)
      }
      let action = parseInt(ctx.update.callback_query.data)
      switch (action) {
        case 0:
          // Save
          try {
            await models.Raidboss.update(
              {
                name: ctx.session.editboss.name,
                level: ctx.session.editboss.level,
                accounts: ctx.session.editboss.accounts
              },
              {
                where: {
                  id: ctx.session.editboss.id
                }
              }
            )

            if (ctx.update.callback_query) {
              ctx.deleteMessage(ctx.update.callback_query.message.message_id)
            }
            return ctx.answerCbQuery('', undefined, true)
              .then(() => {
                ctx.session = null
                return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'))
              })
          } catch (error) {
            console.error('Error saving raidboss edit', error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'))
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
        case 1:
          // Edit more
          return ctx.answerCbQuery(null, undefined, true)
            .then(() => ctx.deleteMessage(ctx.update.callback_query.message.message_id))
            .then(() => {
              ctx.session.more = true
              return ctx.replyWithMarkdown(ctx.i18n.t('edit_more'))
                .then(() => ctx.wizard.selectStep(2))
                .then(() => ctx.wizard.steps[2](ctx))
            })
        case 2:
          // Cancel
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_cancel_edit'))
            .then(() => ctx.scene.leave())
        default:
          console.log('EditRaidbossWizard: action not found', action)
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_no_clue'))
            .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = EditRaidbossWizard
