// ===================
// Admin stops wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const adminCheck = require('../util/adminCheck')
const setLocale = require('../util/setLocale')

const wizsteps = {
  // to get the correct step number; count the 'async (ctx)' lines
  mainmenu: 0,
  add_stop: 2,
  edit_stop: 6,
  delete_stop: 12
}
function AdminStopsWizard (bot) {
  return new WizardScene('admin-stops-wizard',
    // step 0
    async (ctx) => {
      await setLocale(ctx)
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }
      ctx.session.stopactionbtns = [
        ctx.i18n.t('admin_stops_btn_add'),
        ctx.i18n.t('admin_stops_btn_edit'),
        ctx.i18n.t('admin_stops_btn_delete')
      ]
      return ctx.replyWithMarkdown(ctx.i18n.t('admin_stops_intro'), Markup.keyboard(ctx.session.stopactionbtns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text
      switch (input) {
        case ctx.i18n.t('admin_stops_btn_add'):
          ctx.wizard.selectStep(wizsteps.add_stop)
          return ctx.wizard.steps[wizsteps.add_stop](ctx)
        case ctx.i18n.t('admin_stops_btn_edit'):
          ctx.wizard.selectStep(wizsteps.edit_stop)
          return ctx.wizard.steps[wizsteps.edit_stop](ctx)
        case ctx.i18n.t('admin_stops_btn_delete'):
          ctx.wizard.selectStep(wizsteps.delete_stop)
          return ctx.wizard.steps[wizsteps.delete_stop](ctx)
      }
    },
    // Add stop
    async (ctx) => {
      ctx.session.newstop = {}
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_add')}`, Markup.removeKeyboard().extra())
        .then(() => {
          return ctx.wizard.next()
        })
    },
    async (ctx) => {
      ctx.session.newstop.name = ctx.update.message.text
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_location_question')}`)
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      if (ctx.update.message.text.toLowerCase() !== 'x') {
        const input = ctx.update.message.text
        const coords = input.split(',')
        if (coords.length !== 2) {
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_invalid_location')}`)
        }
        ctx.session.newstop.lat = coords[0].trim()
        ctx.session.newstop.lon = coords[1].trim()
        ctx.session.newstop.googleMapsLink = 'https://www.google.com/maps/dir/?api=1&destination=' + ctx.session.newstop.lat + ',' + ctx.session.newstop.lon
      } else {
        ctx.session.newstop.lat = null
        ctx.session.newstop.lon = null
        ctx.session.newstop.googleMapsLink = null
      }
      const out = `${ctx.i18n.t('admin_stops_name')}: ${ctx.session.newstop.name}\n
      ${ctx.i18n.t('map')}: ${ctx.session.newstop.googleMapsLink === null ? ctx.i18n.t('no_input') : ctx.session.newstop.googleMapsLink}\n${ctx.i18n.t('coordinates')}: ${(ctx.session.newstop.lat !== null && ctx.session.newstop.lon !== null ? ctx.session.newstop.lat + ' ' + ctx.session.newstop.lon : ctx.i18n.t('no_input'))}`

      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text.toLowerCase()
      if (ctx.i18n.t('yes').toLowerCase() === input) {
        // Yes store
        const newstop = models.Stop.build(
          ctx.session.newstop
        )
        try {
          await newstop.save()
        } catch (error) {
          console.log('Error saving new stop:', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
        ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_save_success')}`)
          .then(() => ctx.scene.leave())
      } else if (ctx.i18n.t('no').toLowerCase() === input) {
        ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_save_canceled')}`)
          .then(() => ctx.scene.leave())
      }
    },

    // Edit stop
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_edit')}`, Markup.keyboard([{
        text: ctx.i18n.t('admin_stops_list_nearby'), request_location: true }]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let candidates = []
      if (ctx.update.message.location !== undefined) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 1.0 // max radius in Km
        let $sql = `SELECT id, name, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM stops WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Stop,
          mapToModel: true
        })
      } else {
        const term = ctx.update.message.text
        if (term.length < 2) {
          // stay in this scene!
          return ctx.replyWithMarkdown(ctx.i18n.t('admin_stops_two_chars_minimum'))
        } else {
          candidates = await models.Stop.findAll({
            where: {
              name: { [Op.like]: '%' + term + '%' }
            }
          })
        }
      }

      candidates.push({ name: ctx.i18n.t('admin_stops_my_stop_not_listed'), id: 0 })

      ctx.session.candidates = candidates
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_select')}`, Markup.keyboard(ctx.session.candidates.map((el) => {
        return el.name
      })).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      const input = ctx.update.message.text
      ctx.session.editbtns = [
        ctx.i18n.t('admin_stops_name'),
        ctx.i18n.t('coordinates')
      ]
      for (let cand of ctx.session.candidates) {
      // NOTE: possible problem when stopnames are not unique!
        if (cand.name === input) {
          ctx.session.editstop = cand
          break
        }
      }
      if (ctx.session.editstop.id === 0) {
        // wanted stop is not listed
        return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_not_listed')}`)
          .then(() => {
            ctx.wizard.selectStep(wizsteps.edit_stop)
            return ctx.wizard.steps[wizsteps.edit_stop](ctx)
          })
      }
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('edit_what')}*`, Markup.keyboard(ctx.session.editbtns).resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.editattribute = ctx.update.message.text.toLowerCase()
      let question = ''
      switch (ctx.session.editattribute) {
        case ctx.i18n.t('admin_stops_name').toLowerCase():
          question = ctx.i18n.t('admin_stops_edit_name', { stopname: ctx.session.editstop.name })
          break
        case ctx.i18n.t('coordinates').toLowerCase():
          question = ctx.i18n.t('admin_stops_edit_location', { stopname: ctx.session.editstop.name })
          break
      }
      return ctx.replyWithMarkdown(`${question}`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text
      switch (ctx.session.editattribute) {
        case ctx.i18n.t('admin_stops_name').toLowerCase():
          ctx.session.editstop.name = input
          break
        case ctx.i18n.t('coordinates').toLowerCase():
          const coords = input.split(',')
          if (coords.length < 2) {
            return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_invalid_location')}`)
          } else {
            ctx.session.editstop.lat = coords[0].trim()
            ctx.session.editstop.lon = coords[1].trim()
            ctx.session.editstop.googleMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${ctx.session.editstop.lat},${ctx.session.editstop.lon}`
          }
          break
      }
      const out = `${ctx.i18n.t('admin_stops_name')}: ${ctx.session.editstop.name}\n${ctx.i18n.t('map')}: ${ctx.session.editstop.googleMapsLink === null ? ctx.i18n.t('no_input') : ctx.session.editstop.googleMapsLink}\n${ctx.i18n.t('coordinates')}: ${(ctx.session.editstop.lat !== null && ctx.session.editstop.lon !== null ? ctx.session.editstop.lat + ' ' + ctx.session.editstop.lon : ctx.i18n.t('no_input'))}`

      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text.toLowerCase()
      switch (input) {
        case ctx.i18n.t('yes').toLowerCase():
          try {
            await models.Stop.update(
              {
                name: ctx.session.editstop.name,
                googleMapsLink: ctx.session.editstop.googleMapsLink,
                lat: ctx.session.editstop.lat,
                lon: ctx.session.editstop.lon
              },
              {
                where: {
                  id: ctx.session.editstop.id
                }
              }
            )
            return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_save_success')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.log('Error saving stop:', error)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('problem_while_saving')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        case ctx.i18n.t('no').toLowerCase():
          return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_save_canceled')}`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
      }
    },

    // delete stop
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_delete')}`, Markup.keyboard([
        {
          text: ctx.i18n.t('admin_stops_list_nearby'),
          request_location: true
        }
      ]).oneTime().resize().extra())
        .then(() => {
          return ctx.wizard.next()
        })
    },

    async (ctx) => {
      let candidates = []
      if (ctx.update.message.location !== undefined) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 1.0 // max radius in Km
        let $sql = `SELECT id, name, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM stops WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Stop,
          mapToModel: true
        })
      } else {
        const term = ctx.update.message.text
        if (term.length < 2) {
          // stay in this scene!
          return ctx.replyWithMarkdown(ctx.i18n.t('admin_stops_two_chars_minimum'))
        } else {
          candidates = await models.Stop.findAll({
            where: {
              name: { [Op.like]: '%' + term + '%' }
            }
          })
        }
      }
      if (candidates.length === 0) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_not_found')}`)
      }
      candidates.push({ name: ctx.i18n.t('admin_stops_my_stop_not_listed'), id: 0 })

      ctx.session.candidates = candidates
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_select')}`, Markup.keyboard(ctx.session.candidates.map((el) => {
        return el.name
      })).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.delselected = null
      for (const cand of ctx.session.candidates) {
        if (cand.name === ctx.update.message.text) {
          ctx.session.delselected = cand
          break
        }
      }
      if (ctx.session.delselected.id === 0) {
        // wanted stop is not listed
        return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_not_listed')}`)
          .then(() => {
            ctx.wizard.selectStep(wizsteps.delete_stop)
            return ctx.wizard.steps[wizsteps.delete_stop](ctx)
          })
      } else if (ctx.session.delselected !== null) {
        const delbtns = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
        return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_stops_confirm_delete', { label: ctx.session.delselected.name })}`, Markup.keyboard(delbtns).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },

    async (ctx) => {
      const input = ctx.update.message.text.toLowerCase()
      switch (input) {
        case ctx.i18n.t('yes').toLowerCase():
          try {
            await models.Stop.destroy({
              where: {
                id: ctx.session.delselected.id
              }
            })
            return ctx.replyWithMarkdown(`${ctx.i18n.t('edit_gym_delete_success')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.log('something went wrong while deleting', ctx.session.delselected)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_delete_failed')}`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }

        case ctx.i18n.t('no').toLowerCase():
          return ctx.replyWithMarkdown(`${ctx.i18n.t('edit_gym_delete_canceled')}`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
      }
    }
  )
}
module.exports = AdminStopsWizard
