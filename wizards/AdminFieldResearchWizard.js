// ===================
// admin field research  wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
const models = require('../models')
// const Sequelize = require('sequelize')
// const Op = Sequelize.Op
const adminCheck = require('../util/adminCheck')

function AdminFieldResearchWizard (bot) {
  const wizsteps = {
    mainmenu: 0,
    editresearch: 3,
    addresearch: 6,
    deleteresearch: 9,
    doneresearch: 11
  }
  return new WizardScene('admin-field-research-wizard',
    // Step 0
    // Gym name
    // async (ctx) => {

    // handle mainmenu input
    async (ctx) => {
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }
      const keys = await models.Fieldresearchkey.findAll({
        order: [['label', 'ASC']]
      })
      ctx.session.frbtns = [{ id: 0, label: ctx.i18n.t('admin_fres_btn_add_fres') }]
      for (let key of keys) {
        ctx.session.frbtns.push({ id: parseInt(key.id), label: key.label })
      }
      ctx.session.frbtns.push({ id: -1, label: ctx.i18n.t('done') })
      const btnlabels = ctx.session.frbtns.map(el => el.label)
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_modify')}`, Markup.keyboard(btnlabels).oneTime().resize().extra({ disable_web_page_preview: true })
      )
        .then(() => {
          return ctx.wizard.next()
        })
    },
    async (ctx) => {
      const input = ctx.update.message.text
      ctx.session.selectedbtn = {}
      for (let btn of ctx.session.frbtns) {
        if (btn.label === input) {
          ctx.session.selectedbtn = btn
          break
        }
      }
      if (ctx.session.selectedbtn.id === 0) {
        // jump to addition…
        ctx.wizard.selectStep(wizsteps.addresearch)
        return ctx.wizard.steps[wizsteps.addresearch](ctx)
      } else if (ctx.session.selectedbtn.id === -1) {
        ctx.wizard.selectStep(wizsteps.doneresearch)
        return ctx.wizard.steps[wizsteps.doneresearch](ctx)
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('admin_fres_do_what', {
        label: ctx.session.selectedbtn.label
      }), Markup.keyboard([ctx.i18n.t('admin_fres_edit'), ctx.i18n.t('admin_fres_delete')]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text
      if (input === ctx.i18n.t('admin_fres_edit')) {
        ctx.wizard.selectStep(wizsteps.editresearch)
        return ctx.wizard.steps[wizsteps.editresearch](ctx)
      } else if (input === ctx.i18n.t('fres_admin_delete')) {
        ctx.wizard.selectStep(wizsteps.deleteresearch)
        return ctx.wizard.steps[wizsteps.deleteresearch](ctx)
      }
    },
    // edit research
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_new_label', {
        label: ctx.session.selectedbtn.label
      })}`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      ctx.session.newtext = ctx.update.message.text
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_save_edit', {
        newtext: ctx.session.newtext
      })}`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')])
        .oneTime()
        .resize()
        .extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      switch (ctx.update.message.text) {
        case ctx.i18n.t('yes'):
          console.log(`Research Key ${ctx.session.selectedbtn.label} edited by ${ctx.from.id} ${ctx.from.first_name}`)
          try {
            await models.Fieldresearchkey.update(
              {
                label: ctx.session.newtext
              },
              {
                returning: true,
                where: {
                  id: ctx.session.selectedbtn.id
                }
              })
          } catch (error) {
            return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_save_failed', {
              message: error.message
            })}`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_saved_success')}`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
        case 'Nee':
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_save_canceled')}`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
      }
    },
    // add research
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_add_new_label')}`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      ctx.session.newbtn = ctx.update.message.text
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_save_new', {
        newbtn: ctx.session.newbtn
      })}`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      switch (ctx.update.message.text) {
        case ctx.i18n.t('yes'):
          const newKey = models.Fieldresearchkey.build({
            label: ctx.session.newbtn
          })
          console.log(`Research Key ${ctx.session.newbtn} created by ${ctx.from.id} ${ctx.from.first_name}`)
          try {
            newKey.save()
          } catch (error) {
            console.log('Error adding field rearch key', error)
            ctx.replyWithMarkdown(ctx.i18n.t('admin_fres_not_saved'))
            return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_save_failed', {
              message: error.message
            })}`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_saved_new')}`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
        case ctx.i18n.t('no'):
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_save_canceled')}`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
      }
    },
    // delete
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_confirm_delete', {
        label: ctx.session.selectedbtn.label
      })}`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // delete if yes
      switch (ctx.update.message.text) {
        case ctx.i18n.t('yes'):
          console.log(`Research Key ${ctx.session.selectedbtn.label} deleted by ${ctx.from.id} ${ctx.from.first_name}`)
          try {
            models.Fieldresearchkey.destroy({
              where: {
                id: ctx.session.selectedbtn.id
              }
            })
          } catch (error) {
            return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_delete_failed', { message: error.message })}`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_delete_success')}`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
        case ctx.i18n.t('no'):
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_delete_canceled')}`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
      }
    },
    // done
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_finished')}`, Markup.removeKeyboard().extra())
        .then(() => {
          return ctx.scene.leave()
        })
    }
  )
}
module.exports = AdminFieldResearchWizard
