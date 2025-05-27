// ===================
// Field Research wizard
// ===================
// import WizardScene from 'telegraf/scenes/wizard'
import { Scenes } from 'telegraf'
import { Markup } from 'telegraf'
import models from '../models/index.js'
import moment from 'moment-timezone'
import listRaids from '../util/listRaids.js'
import Sequelize from 'sequelize'
const Op = Sequelize.Op
import setLocale from '../util/setLocale.js'

async function researchExists(stopId) {
  const today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  const researches = await models.Fieldresearch.findAll({
    where: {
      [Op.and]: [
        {
          createdAt: { [Op.gt]: today }
        },
        {
          stopId: stopId
        }
      ]
    }
  })
  if (researches.length === 0) {
    return false
  } else {
    return true
  }
}
async function listResearches() {
  const today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  const researches = await models.Fieldresearch.findAll({
    where: {
      createdAt: {
        [Op.gt]: today
      }
    },
    include: [
      {
        model: models.Stop
      }
    ],
    order: [['name', 'ASC']]
  })
  return researches
}
// List research options
async function listResearchOptionButtons() {
  const frkeys = await models.Fieldresearchkey.findAll({
    order: [['label', 'ASC']]
  })
  const out = []
  for (const key of frkeys) {
    out.push([key.label])
  }
  return out
}

function FieldresearchWizard(bot) {
  const wizsteps = {
    mainmenu: 0,
    listresearch: 2,
    addresearch: 3,
    editresearch: 8,
    deleteresearch: 12,
    cancelresearch: 15
  }

  return new Scenes.WizardScene(
    'fieldresearch-wizard',
    // Field Research menu
    async (ctx) => {
      await setLocale(ctx)
      ctx.session.newresearch = {}
      // ToDo: delete all researches from previous days?
      ctx.session.mainreseachbtns = [
        [ctx.i18n.t('fres_btn_mainmenu_showlist'), 'listresearch'],
        [ctx.i18n.t('fres_btn_mainmenu_add_research'), 'addresearch'],
        [ctx.i18n.t('fres_btn_mainmenu_edit_research'), 'editresearch'],
        [ctx.i18n.t('fres_btn_mainmenu_remove_research'), 'deleteresearch'],
        [ctx.i18n.t('cancel'), 'cancelresearch']
      ]
      return ctx
        .reply(
          ctx.i18n.t('main_menu_greeting', {
            user: ctx.from,
            first_name: ctx.from.first_name
          }),
          Markup.keyboard(ctx.session.mainreseachbtns.map((el) => el[0]))
            .oneTime()
            .resize()
        )
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let nextStep = 0
      for (let i = 0; i < ctx.session.mainreseachbtns.length; i++) {
        if (ctx.session.mainreseachbtns[i][0] === ctx.update.message.text) {
          nextStep = ctx.session.mainreseachbtns[i][1]
          break
        }
      }
      ctx.wizard.selectStep(wizsteps[nextStep])
      return ctx.wizard.steps[wizsteps[nextStep]](ctx)
    },

    // -----------------
    // list Field Researches
    // -----------------
    async (ctx) => {
      const researches = await listResearches()
      let out = ''
      if (researches.length === 0) {
        out = ctx.i18n.t('fres_no_fres_yet')
        return ctx
          .reply(out, Markup.removeKeyboard(), {
            parse_mode: 'HTML',
            remove_keyboard: true
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      let oldname = ''
      out = `${ctx.i18n.t('fres_fres_today')}\n`
      let c = 0
      for (const res of researches) {
        if (c > 35) {
          ctx.reply(out, { parse_mode: 'HTML', remove_keyboard: true })
          out = ''
          c = 0
        }
        if (oldname !== res.name) {
          out += `\r\n\r\n<b>${res.name}</b>\r\n`
          oldname = res.name
        }
        out += `${ctx.i18n.t('fres_reportedstop', {
          stopname: res.Stop.name,
          stoplink: res.Stop.googleMapsLink,
          reportername: res.reporterName,
          reporterid: res.reporterId
        })}\r\n`
        c++
      }
      out += `\r\n\r\n${ctx.i18n.t('fres_done')}`
      return ctx
        .reply(out, {
          remove_keyboard: true,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    },
    // -----------------
    // add fieldresearch
    // -----------------
    async (ctx) => {
      return ctx
        .reply(`${ctx.i18n.t('fres_intro')}\r\n`, {
          reply_markup: {
            keyboard: [
              {
                text: ctx.i18n.t('fres_btn_find_location'),
                request_location: true
              }
            ],
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let candidates = []
      ctx.session.stopcandidates = []
      if (ctx.update.message.location) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 0.35 // max radius
        const $sql = `SELECT id, name, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM stops WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Stop,
          mapToModel: true // pass true here if you have any mapped fields
        })
      } else {
        const term = ctx.update.message.text.trim()
        if (term.length < 2) {
          return ctx.reply(`${ctx.i18n.t('fres_minimum_2_chars')}`, {
            parse_mode: 'HTML'
          })
        }
        candidates = await models.Stop.findAll({
          where: {
            name: { [Op.like]: '%' + term + '%' }
          }
        })
      }
      if (candidates.length === 0) {
        return ctx.reply(`${ctx.i18n.t('fres_stop_not_found')}`, {
          parse_mode: 'HTML'
        })
      }
      ctx.session.stopcandidates = []
      for (let i = 0; i < candidates.length; i++) {
        ctx.session.stopcandidates.push([
          candidates[i].name.trim(),
          candidates[i].id
        ])
      }
      ctx.session.stopcandidates.push([ctx.i18n.t('fres_stop_not_listed'), 0])

      return ctx
        .reply(ctx.i18n.t('fres_select_stop'), {
          reply_markup: {
            keyboard: ctx.session.stopcandidates.map((el) => [el[0]]),
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.stopcandidates.length; i++) {
        if (ctx.session.stopcandidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch stop not found errors…
      if (selectedIndex === -1) {
        return ctx
          .reply(`${ctx.i18n.t('fres_select_something_wrong')}\n`, {
            remove_keyboard: true,
            parse_mode: 'HTML'
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the stop
      if (ctx.session.stopcandidates[selectedIndex][1] === 0) {
        ctx.reply(`${ctx.i18n.t('retry_or_cancel')}`, {
          remove_keyboard: true,
          parse_mode: 'HTML'
        })
        ctx.wizard.selectStep(wizsteps.addresearch)
        return ctx.wizard.steps[wizsteps.addresearch](ctx)
      } else {
        // retrieve selected candidate from session
        const selectedstop = ctx.session.stopcandidates[selectedIndex]
        ctx.session.newresearch.stopId = selectedstop[1]
        ctx.session.newresearch.stopName = selectedstop[0]
        if (await researchExists(ctx.session.newresearch.stopId)) {
          return ctx
            .reply(`${ctx.i18n.t('fres_exists')}`, {
              parse_mode: 'HTML'
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
      }
      const frkeys = await listResearchOptionButtons()
      console.log('frkeys', frkeys)
      return ctx
        .reply(`${ctx.i18n.t('fres_what_to_do')}`, {
          reply_markup: {
            keyboard: frkeys,
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.newresearch.what = ctx.update.message.text
      return ctx
        .reply(
          `<b>${ctx.session.newresearch.what}</b>\r\n${
            ctx.session.newresearch.stopName
          }\r\n\r\n${ctx.i18n.t('save_question')}`,
          {
            reply_markup: {
              keyboard: [ctx.i18n.t('yes'), ctx.i18n.t('no')],
              resize: true,
              one_time_keyboard: true
            },
            parse_mode: 'HTML'
          }
        )
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let out = ''
      if (ctx.update.message.text === ctx.i18n.t('yes')) {
        const research = models.Fieldresearch.build({
          StopId: ctx.session.newresearch.stopId,
          name: ctx.session.newresearch.what,
          reporterName: ctx.from.first_name,
          reporterId: ctx.from.id
        })
        try {
          await research.save()
        } catch (error) {
          console.log('Whoops… saving new Field Research failed', error)
          return ctx
            .reply(`${ctx.i18n.t('fres_save_failed')}`, {
              parse_mode: 'HTML',
              remove_keyboard: true
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
        console.log(
          `Research added ${ctx.session.newresearch} by ${ctx.from.first_name}, ${ctx.from.id}`
        )
        // success...
        out += `${ctx.i18n.t('fres_save_success', {
          stopname: ctx.session.newresearch.stopName
        })}\n\n`
        const researches = await listResearches()
        out += `${ctx.i18n.t('fres_fres_today')}\r\n`
        for (const res of researches) {
          out += `\n<b>${res.name}</b>\n`
          out += ctx.i18n.t('fres_added_fres', {
            stopname: res.Stop.name,
            stoplink: res.Stop.googleMapsLink,
            reportername: res.reporterName,
            reporterid: res.reporterId
          })
          out += '\n'
        }
        out += `\n\n${ctx.i18n.t('fres_done')}`
        return ctx
          .reply(out, {
            reply_markup: {
              remove_keyboard: true
            },
            disable_web_page_preview: true,
            parse_mode: 'HTML'
          })
          .then(async () => {
            ctx.session = {}
            // save users langugage
            const oldlocale = ctx.i18n.locale()
            // reason should always be in default locale
            ctx.i18n.locale(process.env.DEFAULT_LOCALE)
            const reason = ctx.i18n.t('fres_list_reason', {
              firstname: ctx.from.first_name,
              uid: ctx.from.id
            })
            // restore user locale
            ctx.i18n.locale(oldlocale)
            const raidlist = await listRaids(`${reason}`, ctx)
            bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, {
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          })
          .then(() => ctx.scene.leave())
      } else if (ctx.update.message.text === ctx.i18n.t('no')) {
        out += `${ctx.i18n.t('ok')}.\r\n\r\n`
        const researches = await listResearches()
        out += `${ctx.i18n.t('fres_fres_today')}\r\n`
        for (const res of researches) {
          out += `\r\n<b>${res.name}</b>\r\n`
          out += `${ctx.i18n.t('fres_reportedstop', {
            stopname: res.Stop.name,
            stoplink: res.Stop.googleMapsLink,
            reportername: res.reporterName,
            reporterid: res.reporterId
          })}\r\n\r\n`
          out += '\r\n'
        }
        out += `\r\n\r\n${ctx.i18n.t('fres_done')}`
        return ctx
          .reply(out, {
            reply_markup: {
              remove_keyboard: true
            },
            parse_mode: 'HTML',
            disable_web_page_preview: true``
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
    },
    // -----------------
    // Edit fieldresearch
    // -----------------
    async (ctx) => {
      const today = moment()
      today.hours(0).minutes(0).seconds(0)
      const researches = await models.Fieldresearch.findAll({
        where: {
          createdAt: {
            [Op.gt]: today
          }
        },
        include: [
          {
            model: models.Stop
          }
        ]
      })
      let out = ''
      if (researches.length === 0) {
        out = `${ctx.i18n.t('fres_no_fres_yet')}`
        return ctx
          .reply(out, {
            reply_markup: {
              remove_keyboard: true
            },
            parse_mode: 'HTML'
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.candidates = []
      out = `${ctx.i18n.t('fres_edit_which')}`
      for (const res of researches) {
        ctx.session.candidates.push(res)
      }
      return ctx
        .reply(out, {
          reply_markup: {
            keyboard: ctx.session.candidates.map((el) => [el.Stop.name]),
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.editresearch = null
      for (const candidate of ctx.session.candidates) {
        if (candidate.Stop.name.trim() === ctx.update.message.text) {
          ctx.session.editresearch = candidate
          break
        }
      }
      const frkeys = await listResearchOptionButtons()
      return ctx
        .reply(`${ctx.i18n.t('fres_what_to_do_location')}`, {
          reply_markup: {
            keyboard: frkeys,
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      ctx.session.editresearch.name = ctx.update.message.text
      ctx
        .reply(`${ctx.i18n.t('fres_save_edit')}`, {
          reply_markup: {
            keyboard: [ctx.i18n.t('yes'), ctx.i18n.t('no')],
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const confirm = ctx.update.message.text
      if (confirm === ctx.i18n.t('yes')) {
        try {
          await ctx.session.editresearch.save()

          const researches = await listResearches()
          let out = `${ctx.i18n.t('fres_saved_edit')}\r\n`
          for (const res of researches) {
            out += `\r\n<b>${res.name}</b>\r\n`
            out += `${ctx.i18n.t('fres_reportedstop', {
              stopname: res.Stop.name,
              stoplink: res.Stop.googleMapsLink,
              reportername: res.reporterName,
              reporterid: res.reporterId
            })}\n`
          }
          out += `\r\n\r\n${ctx.i18n.t('fres_done')}`

          return ctx
            .reply(out, {
              parse_mode: 'HTML',
              remove_keyboard: true
            })
            .then(async () => {
              // save users langugage
              const oldlocale = ctx.i18n.locale()
              // reason should always be in default locale
              ctx.i18n.locale(process.env.DEFAULT_LOCALE)
              const reason = ctx.i18n.t('frest_list_reason_modified', {
                firstname: ctx.from.first_name,
                uid: ctx.from.id
              })
              // restore user locale
              ctx.i18n.locale(oldlocale)
              const raidlist = await listRaids(`${reason}\n\n`, ctx)
              bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
              })
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        } catch (error) {
          console.log('Whoops… saving new Field Research failed', error)
          return ctx
            .reply(`${ctx.i18n.t('something_wrong')}`, {
              remove_keyboard: true,
              parse_mode: 'HTML'
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
      } else {
        ctx
          .reply(`${ctx.i18n.t('finished_procedure_without_saving')}`, {
            remove_keyboard: true,
            parse_mode: 'HTML'
          })
          .then(() => ctx.scene.leave())
      }
    },
    // -----------------
    // remove fieldresearch
    // -----------------
    async (ctx) => {
      // console.log('DESTROY research')
      const today = moment()
      today.hours(0).minutes(0).seconds(0)
      const researches = await models.Fieldresearch.findAll({
        where: {
          createdAt: {
            [Op.gt]: today
          }
        },
        include: [
          {
            model: models.Stop
          }
        ]
      })
      let out = ''
      if (researches.length === 0) {
        out = ctx.i18n.t('fres_no_fres_yet')
        return ctx
          .reply(out, {
            parse_mode: 'HTML',
            remove_keyboard: true
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.candidates = []
      out = `${ctx.i18n.t('fres_delete_which')}`
      for (const res of researches) {
        ctx.session.candidates.push(res)
      }
      // the escape option
      ctx.session.candidates.push({
        Stop: { name: ctx.i18n.t('cancel'), id: 0 }
      })

      return ctx
        .reply(out, {
          reply_markup: {
            keyboard: ctx.session.candidates.map((el) => [el.Stop.name]),
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.destroyresearch = null
      if (ctx.update.message.text === ctx.i18n.t('cancel')) {
        return ctx
          .reply(`${ctx.i18n.t('ok')}\r\n\r\n${ctx.i18n.t('fres_done')}`, {
            parse_mode: 'HTML',
            remove_keyboard: true
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      for (const candidate of ctx.session.candidates) {
        if (candidate.Stop.name.trim() === ctx.update.message.text) {
          ctx.session.destroyresearch = candidate
          break
        }
      }
      if (ctx.session.destroyresearch === null) {
        return ctx
          .reply(`${ctx.i18n.t('fres_done')}`, {
            parse_mode: 'HTML',
            remove_keyboard: true
          })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      return ctx
        .reply(`${ctx.i18n.t('fres_delete_confirm')}`, {
          reply_markup: {
            keyboard: [[ctx.i18n.t('yes')], [ctx.i18n.t('no')]],
            one_time_keyboard: true,
            resize_keyboard: true
          },
          parse_mode: 'HTML'
        })
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      switch (ctx.update.message.text) {
        case ctx.i18n.t('yes'):
          // Delete…
          try {
            const deleted = await models.Fieldresearch.destroy({
              where: {
                id: ctx.session.destroyresearch.id
              }
            })
            if (deleted) {
              // save users language
              const oldlocale = ctx.i18n.locale()
              // reason should always be in default locale
              ctx.i18n.locale(process.env.DEFAULT_LOCALE)
              const reason = ctx.i18n.t('fres_list_reason_delete', {
                firstname: ctx.from.first_name,
                uid: ctx.from.id
              })
              // restore user locale
              ctx.i18n.locale(oldlocale)
              const raidlist = await listRaids(`${reason}\n\n`, ctx)
              bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
              })
              console.log(
                `Research deleted ${ctx.session.destroyresearch} by ${ctx.from.first_name}, ${ctx.from.id}`
              )
            }
          } catch (error) {
            console.log(
              `Could not delete ${ctx.session.destroyresearch}`,
              error
            )
            return ctx
              .reply(`${ctx.i18n.t('fres_delete_failed')}`, {
                parse_mode: 'HTML'
              })
              .then(() => {
                ctx.session = {}
                return ctx.scene.leave()
              })
          }

          break
        default:
          console.log('Field research removal canceled')
      }
      const researches = await listResearches()
      let out = ''
      if (researches.length === 0) {
        out = `${ctx.i18n.t('fres_no_fres_now')}`
        return ctx
          .reply(out, { parse_mode: 'HTML', remove_keyboard: true })
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      out = `${ctx.i18n.t('ok')}…\r\n${ctx.i18n.t('fres_fres_today')}\r\n`
      for (const res of researches) {
        out += `\r\n<b>${res.name}</b>\r\n`
        out += `${ctx.i18n.t('fres_reportedstop', {
          stopname: res.Stop.name,
          stoplink: res.Stop.googleMapsLink,
          reportername: res.reporterName,
          reporterid: res.reporterId
        })}\n`
      }
      out += `\r\n\r\n${ctx.i18n.t('fres_done')}`

      return ctx
        .reply(out, { parse_mode: 'HTML', remove_keyboard: true })
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    },
    // -----------------
    // cancel fieldresearch
    // -----------------
    async (ctx) => {
      return ctx
        .reply(`${ctx.i18n.t('ok')}… \r\n\r\n${ctx.i18n.t('fres_done')}`, {
          parse_mode: 'HTML',
          remove_keyboard: true
        })
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    }
  )
}
export default FieldresearchWizard
