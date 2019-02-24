// ===================
// add raidboss wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const metaphone = require('metaphone')
const adminCheck = require('../util/adminCheck')

function EditRaidbossWizard (bot) {
  return new WizardScene('edit-raidboss-wizard',
    // Step 0
    // Raidboss name request
    async (ctx) => {
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }

      ctx.session.editboss = {}
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_raiddboss_intro'), Markup.removeKeyboard())

        .then(() => ctx.wizard.next())
    },

    // Step 1
    // Raidboss lookup by name
    async (ctx) => {
      let term = ctx.update.message.text.trim()
      let bosses = await models.Raidboss.findAll({
        where: {
          name: { [Op.like]: '%' + term + '%' }
        }
      })
      if (bosses.length === 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_not_found', {
          term: term === '/start help_fromgroup' ? '' : term
        }))
          .then(() => ctx.scene.leave())
      }
      ctx.session.bosscandidates = []
      for (let i = 0; i < bosses.length; i++) {
        ctx.session.bosscandidates.push({
          id: bosses[i].id,
          name: bosses[i].name,
          level: bosses[i].level,
          accounts: bosses[i].accounts
        })
      }
      ctx.session.bosscandidates.push({name: ctx.i18n.t('edit_raidboss_cancel'), id: 0})
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_select'), Markup.keyboard(ctx.session.bosscandidates.map(el => el.name)).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 2
    // Handle boss selection , ask what to change
    async (ctx) => {
      let bossindex = ctx.session.bosscandidates.length - 1
      if (ctx.session.more !== true) {
        for (let i = 0; i < ctx.session.bosscandidates.length; i++) {
          console.log(ctx.session.bosscandidates[i].name, ' === ', ctx.update.message.text)
          if (ctx.session.bosscandidates[i].name === ctx.update.message.text) {
            bossindex = i
          }
        }
        if (ctx.session.bosscandidates[bossindex].id === 0) {
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_not_listed_close'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        ctx.session.editboss = ctx.session.bosscandidates[bossindex]
      }
      ctx.session.changebtns = [
        [`${ctx.i18n.t('edit_raidboss_btn_name')}: ${ctx.session.editboss.name}`, 'name'],
        [`${ctx.i18n.t('edit_raidboss_btn_level')}: ${ctx.session.editboss.level}`, 'level'],
        [`${ctx.i18n.t('edit_raidboss_btn_number_of_accounts')}: ${ctx.session.editboss.accounts}`, 'accounts'],
        [ctx.i18n.t('edit_raidboss_btn_do_nothing'), '0']
      ]
      return ctx.replyWithMarkdown(`Wat wil je wijzigen?`, Markup.keyboard(ctx.session.changebtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // Step 3
    // Ask for value
    async (ctx) => {
      ctx.session.key = 0
      for (let i = 0; i < ctx.session.changebtns.length; i++) {
        if (ctx.session.changebtns[i][0] === ctx.update.message.text) {
          ctx.session.key = ctx.session.changebtns[i][1]
          break
        }
      }
      let question = ''
      switch (ctx.session.key) {
        case 'name':
          question = ctx.i18n.t('edit_raidboss_name_question')
          break
        case 'level':
          question = ctx.i18n.t('edit_raidboss_level_question')
          break
        case 'accounts':
          question = ctx.i18n.t('edit_raidboss_accounts_question')
          break
        case 0:
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_cancel_edit'))
            .then(() => ctx.scene.leave())
        default:
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_no_clue'))
            .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(question)
        .then(() => ctx.wizard.next())
    },

    // Step 4
    // Handle value, ask what's next?
    async (ctx) => {
      let value = ctx.update.message.text.trim()
      ctx.session.editboss[ctx.session.key] = value
      let out = `${ctx.i18n.t('edit_raidboss_overview_name')}: ${ctx.session.editboss.name}\n${ctx.i18n.t('edit_raidboss_overview_level')}: ${ctx.session.editboss.level}\n${ctx.i18n.t('edit_raidboss_overview_accounts')}: ${ctx.session.editboss.accounts}`

      ctx.session.savebtns = [
        ctx.i18n.t('edit_raidboss_btn_save_close'),
        ctx.i18n.t('edit_raidboss_btn_edit_more'),
        ctx.i18n.t('edit_raidboss_btn_cancel')
      ]
      return ctx.replyWithMarkdown(`Dit zijn nu de raidboss gegevens:\n\n${out}\n\n*Wat wil je nu doen?*`, Markup.keyboard(ctx.session.savebtns)
        .oneTime()
        .resize()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },
    // Step 5
    // Handle value, ask whats next?
    async (ctx) => {
      let action = ctx.session.savebtns.indexOf(ctx.update.message.text)
      switch (action) {
        case 0:
          // Save
          try {
            await models.Raidboss.update(
              {
                name: ctx.session.editboss.name,
                level: ctx.session.editboss.level,
                accounts: ctx.session.editboss.accounts,
                metaphone: metaphone(ctx.session.editboss.name)
              },
              {
                where: {
                  id: ctx.session.editboss.id
                }
              }
            )
            ctx.session = null
            return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
          } catch (error) {
            console.error('Error saving raidboss edit', error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
        case 1:
          // Edit more
          ctx.session.more = true
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_more'))
            .then(() => ctx.wizard.selectStep(2))
            .then(() => ctx.wizard.steps[2](ctx))
        case 2:
          // Cancel
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_cancel_edit'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        default:
          console.log('EditRaidbossWizard: action not found', action)
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_raidboss_no_clue'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
      }
    }
  )
}

module.exports = EditRaidbossWizard
