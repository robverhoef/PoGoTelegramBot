// ===================
// Edit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function EditGymWizard (bot) {
  return new WizardScene('edit-gym-wizard',
    // step 0
    async (ctx) => {
      return ctx.replyWithMarkdown(ctx.i18n.t(ctx.i18n.t('edit_gym_intro'), Markup.removeKeyboard().extra()))
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      const term = ctx.update.message.text.trim()
      ctx.session.gymbtns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
          .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', {term: term}))
          return
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push({
            id: candidates[i].id,
            gymname: candidates[i].gymname,
            googleMapsLink: candidates[i].googleMapsLink,
            address: candidates[i].address,
            exRaidTrigger: candidates[i].exRaidTrigger
          })
          ctx.session.gymbtns.push(candidates[i].gymname)
        }
        ctx.session.gymbtns.push(ctx.i18n.t('btn_gym_not_found'))
        ctx.session.gymcandidates.push({gymname: ctx.i18n.t('btn_gym_not_found'), id: 0})
        return ctx.replyWithMarkdown(ctx.i18n.t('select_a_gym'), Markup.keyboard(ctx.session.gymbtns).resize().oneTime().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 2
    async (ctx) => {
      let selectedIndex
      if (ctx.session.more !== true) {
        selectedIndex = ctx.session.gymcandidates.length - 1
        for (let i = 0; i < ctx.session.gymcandidates.length; i++) {
          if (ctx.session.gymcandidates[i].gymname === ctx.update.message.text) {
            selectedIndex = i
            break
          }
        }

        if (ctx.session.gymcandidates[selectedIndex].id === 0) {
          return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_cancel'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session.gymcandidates = null
              ctx.session.gymbtns = null
              ctx.session.editgym = null
              ctx.session.more = null
              ctx.wizard.selectStep(1)
              return ctx.wizard.steps[1](ctx)
            })
        } else {
          // retrieve selected candidate from session
          let selectedgym = ctx.session.gymcandidates[selectedIndex]
          ctx.session.editgym = selectedgym
        }
      }
      ctx.session.changebtns = [
        [`${ctx.i18n.t('btn_edit_gym_name')}: ${ctx.session.editgym.gymname}`, 'gymname'],
        [`${ctx.i18n.t('btn_edit_gym_gmlink')}: ${ctx.session.editgym.googleMapsLink !== null ? ctx.session.editgym.googleMapsLink : 'Niets opgegegven'}`, 'googleMapsLink'],
        [`${ctx.i18n.t('btn_edit_gym_address')}: ${ctx.session.editgym.address !== null ? ctx.session.editgym.address : ctx.i18n.t('no_input')}`, 'address'],
        [`${ctx.i18n.t('btn_edit_gym_exraid')}: ${ctx.session.editgym.exRaidTrigger === 1 || ctx.session.editgym.exRaidTrigger === true ? ctx.i18n.t('yes') : ctx.i18n.t('no_dont_know')}`, 'exRaidTrigger'],
        [ctx.i18n.t('btn_edit_gym_cancel'), '0']
      ]
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('edit_what')}*`, Markup.keyboard(ctx.session.changebtns.map(el => el[0]))
        .resize()
        .oneTime()
        .extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let editattr
      for (let i = 0; i < ctx.session.changebtns.length; i++) {
        if (ctx.session.changebtns[i][0] === ctx.update.message.text) {
          editattr = ctx.session.changebtns[i][1]
          break
        }
      }
      if (editattr === '0') {
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving'), Markup.removeKeyboard())
          .then(() => {
            ctx.session.gymcandidates = null
            ctx.session.editgym = null
            ctx.session.more = null
            return ctx.scene.leave()
          })
      } else {
        let question = ''
        switch (editattr) {
          case 'gymname':
            ctx.session.editattr = 'gymname'
            question = ctx.i18n.t('edit_gym_question_name')
            break
          case 'address':
            ctx.session.editattr = 'address'
            question = ctx.i18n.t('edit_gym_question_address')
            break
          case 'googleMapsLink':
            ctx.session.editattr = 'googleMapsLink'
            question = ctx.i18n.t('edit_gym_question_gmlink')
            break
          case 'exRaidTrigger':
            ctx.session.editattr = 'exRaidTrigger'
            question = ctx.i18n.t('edit_gym_question_exraid')
            break
          default:
            question = ctx.i18n.t('edit_gym_question_not_found')
            break
        }
        return ctx.replyWithMarkdown(question, Markup.removeKeyboard())
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      let key = ctx.session.editattr
      let value = ctx.update.message.text.trim()
      if (key === 'exRaidTrigger') {
        ctx.session.editgym.exRaidTrigger = value.toLowerCase() === ctx.i18n.t('yes') ? 1 : 0
      } else if (value.toLowerCase() === 'x') {
        ctx.session.editgym[key] = null
      } else {
        ctx.session.editgym[key] = value
      }
      let out = `${ctx.i18n.t('btn_edit_gym_name')}: ${ctx.session.editgym.gymname}\n${ctx.i18n.t('btn_edit_gym_address')}: ${ctx.session.editgym.address !== null ? ctx.session.editgym.address : ctx.i18n.t('no_input')}\n${ctx.i18n.t('btn_edit_gym_gmlink')}: ${ctx.session.editgym.googleMapsLink !== null ? ctx.session.editgym.googleMapsLink : ctx.i18n.t('no_input')}\n${ctx.i18n.t('btn_edit_gym_exraid')}: ${ctx.session.editgym.exRaidTrigger === 1 ? ctx.i18n.t('yes') : ctx.i18n.t('no')}\n\n`

      ctx.session.savebtns = [
        ctx.i18n.t('edit_gym_btn_save_close'),
        ctx.i18n.t('edit_gym_btn_edit_more'),
        ctx.i18n.t('edit_gym_btn_cancel')
      ]
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_gym_overview', {
        out: out
      }), Markup.keyboard(ctx.session.savebtns).resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      const choice = ctx.session.savebtns.indexOf(ctx.update.message.text)
      switch (choice) {
        case 0:
          // save and exit
          try {
            await models.Gym.update(
              {
                gymname: ctx.session.editgym.gymname,
                address: ctx.session.editgym.address,
                googleMapsLink: ctx.session.editgym.googleMapsLink,
                exRaidTrigger: ctx.session.editgym.exRaidTrigger
              },
              {
                where: {
                  id: ctx.session.editgym.id
                }
              })
            return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.error(error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor to step 1 and trigger jump to step 1
          ctx.session.more = true
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_more'), Markup.removeKeyboard().extra())
            .then(() => ctx.wizard.selectStep(2))
            .then(() => ctx.wizard.steps[2](ctx))
        case 2:
          // Don't save and leave
          ctx.session.raidcandidates = null
          ctx.session.editgym = null
          ctx.session.savebtns = null
          return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('ok'), Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = EditGymWizard
