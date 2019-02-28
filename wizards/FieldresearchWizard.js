// ===================
// Field Research wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const moment = require('moment-timezone')
const listRaids = require('../util/listRaids')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')

async function researchExists (stopId) {
  let today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  let researches = await models.Fieldresearch.findAll({
    where: {
      [Op.and]: [
        {
          createdAt: { [Op.gt]: today }
        }, {
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
async function listResearches () {
  let today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  let researches = await models.Fieldresearch.findAll({
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
  return researches
}
// List research options
async function listResearchOptionButtons () {
  const frkeys = await models.Fieldresearchkey.findAll({
    order: [
      ['label', 'ASC']
    ]
  })
  let out = []
  for (let key of frkeys) {
    out.push(key.label)
  }
  return out
}

function FielresearchWizard (bot) {
  const wizsteps = {
    mainmenu: 0,
    listresearch: 2,
    addresearch: 3,
    editresearch: 8,
    deleteresearch: 12,
    cancelresearch: 15
  }

  return new WizardScene('fieldresearch-wizard',
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
      return ctx.replyWithMarkdown(ctx.i18n.t('main_menu_greeting', { user: ctx.from }), Markup.keyboard(ctx.session.mainreseachbtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // return ctx.replyWithMarkdown('Handle choice…')
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
      let researches = await listResearches()
      let out = ''
      if (researches.length === 0) {
        out = ctx.i18n.t('fres_no_fres_yet')
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      out = `${ctx.i18n.t('fres_fres_today')}\n`
      for (let res of researches) {
        out += `\r\n*${res.name}*\r\n`
        out += `${ctx.i18n.t('fres_reportedstop', { stopname: res.Stop.name, stoplink: res.Stop.googleMapsLink, reportername: res.reporterName, reporterid: res.reporterId })}\r\n\r\n`
      }
      out += `\r\n\r\n${ctx.i18n.t('fres_done')}`

      return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    },
    // -----------------
    // add fieldresearch
    // -----------------
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_intro')}\r\n`, Markup.keyboard([{ text: ctx.i18n.t('fres_btn_find_location'), request_location: true }]).resize().extra({ disable_web_page_preview: true }))
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
        let $sql = `SELECT id, name, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM stops WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Stop,
          mapToModel: true // pass true here if you have any mapped fields
        })
      } else {
        let term = ctx.update.message.text.trim()
        if (term.length < 2) {
          return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_minimum_2_chars')}`)
        }
        candidates = await models.Stop.findAll({
          where: {
            name: { [Op.like]: '%' + term + '%' }
          }
        })
      }
      if (candidates.length === 0) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_stop_not_found')}`)
      }
      ctx.session.stopcandidates = []
      for (let i = 0; i < candidates.length; i++) {
        ctx.session.stopcandidates.push([
          candidates[i].name.trim(),
          candidates[i].id
        ])
      }
      ctx.session.stopcandidates.push([
        ctx.i18n.t('fres_stop_not_listed'), 0
      ])

      return ctx.replyWithMarkdown(ctx.i18n.t('fres_select_stop'), Markup.keyboard(ctx.session.stopcandidates.map(el => el[0])).oneTime().resize().extra())
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
        return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_select_something_wrong')}\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the stop
      if (ctx.session.stopcandidates[selectedIndex][1] === 0) {
        ctx.replyWithMarkdown(`${ctx.i18n.t('retry_or_cancel')}`, Markup.removeKeyboard().extra())
        ctx.wizard.selectStep(wizsteps.addresearch)
        return ctx.wizard.steps[wizsteps.addresearch](ctx)
      } else {
        // retrieve selected candidate from session
        let selectedstop = ctx.session.stopcandidates[selectedIndex]
        ctx.session.newresearch.stopId = selectedstop[1]
        ctx.session.newresearch.stopName = selectedstop[0]
        if (await researchExists(ctx.session.newresearch.stopId)) {
          return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_exists')}`)
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
      }
      const frkeys = await listResearchOptionButtons()
      console.log('frkeys', frkeys)
      return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_what_to_do')}`,
        Markup.keyboard(frkeys).oneTime().resize().extra()
      )
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.newresearch.what = ctx.update.message.text
      return ctx.replyWithMarkdown(`*${ctx.session.newresearch.what}*\r\n${ctx.session.newresearch.stopName}\r\n\r\n${ctx.i18n.t('save_question')}`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let out = ''
      if (ctx.update.message.text === ctx.i18n.t('yes')) {
        // console.log('USER SAYS YES TO SAVING RESEARCH')
        let research = models.Fieldresearch.build({
          StopId: ctx.session.newresearch.stopId,
          name: ctx.session.newresearch.what,
          reporterName: ctx.from.first_name,
          reporterId: ctx.from.id
        })
        try {
          await research.save()
        } catch (error) {
          console.log('Whoops… saving new Field Research failed', error)
          return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_save_failed')}`, Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
        console.log(`Research added ${ctx.session.newresearch} by ${ctx.from.first_name}, ${ctx.from.id}`)
        // success...
        out += `${ctx.i18n.t('fres_save_success', {
          stopname: ctx.session.newresearch.stopName
        })}\r\n\r\n`
        let researches = await listResearches()
        out += `${ctx.i18n.t('fres_fres_today')}\r\n`
        for (let res of researches) {
          out += `\n*${res.name}*\n`
          out += ctx.i18n.t('fres_added_fres', {
            stopname: res.Stop.name,
            stoplink: res.Stop.googleMapsLink,
            reportername: res.reporterName,
            reporterid: res.reporterId
          })
        }
        out += `\n\n${ctx.i18n.t('fres_done')}`
        console.log('OUT', out)
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(async () => {
            ctx.session = {}
            // save users langugage
            ctx.session.oldlang = ctx.i18n.locale()
            // reason should always be in default locale
            ctx.i18n.locale(process.env.DEFAULT_LOCALE)
            const reason = ctx.i18n.t('fres_list_reason', {
              firstname: ctx.from.first_name,
              uid: ctx.from.id
            })
            // restore user locale
            ctx.i18n.locale(ctx.session.oldlang)
            let raidlist = await listRaids(`${reason}`, ctx)
            bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, { parse_mode: 'Markdown', disable_web_page_preview: true })
          })
          .then(() => ctx.scene.leave())
      } else if (ctx.update.message.text === ctx.i18n.t('no')) {
        out += `${ctx.i18n.t('ok')}.\r\n\r\n`
        let researches = await listResearches()
        out += `${ctx.i18n.t('fres_fres_today')}\r\n`
        for (let res of researches) {
          out += `\r\n*${res.name}*\r\n`
          out += `${ctx.i18n.t('fres_reportedstop', { stopname: res.Stop.name, stoplink: res.Stop.googleMapsLink, reportername: res.reporterName, reporterid: res.reporterId })}\r\n\r\n`
          out += `\r\n`
        }
        out += `\r\n\r\n${ctx.i18n.t('fres_done')}`
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
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
      let today = moment()
      today.hours(0).minutes(0).seconds(0)
      let researches = await models.Fieldresearch.findAll({
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
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.candidates = []
      out = `${ctx.i18n.t('fres_edit_which')}`
      for (let res of researches) {
        ctx.session.candidates.push(res)
      }
      return ctx.replyWithMarkdown(out, Markup.keyboard(ctx.session.candidates.map(el => el.Stop.name)).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.editresearch = null
      for (let candidate of ctx.session.candidates) {
        if (candidate.Stop.name.trim() === ctx.update.message.text) {
          ctx.session.editresearch = candidate
          break
        }
      }
      const frkeys = await listResearchOptionButtons()
      return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_what_to_do_location')}`,
        Markup.keyboard(frkeys).oneTime().resize().extra()
      )
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      ctx.session.editresearch.name = ctx.update.message.text
      ctx.replyWithMarkdown(`${ctx.i18n.t('fres_save_edit')}`, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let confirm = ctx.update.message.text
      if (confirm === ctx.i18n.t('yes')) {
        try {
          await ctx.session.editresearch.save()

          let researches = await listResearches()
          let out = `${ctx.i18n.t('fres_saved_edit')}\r\n`
          for (let res of researches) {
            out += `\r\n*${res.name}*\r\n`
            out += `${ctx.i18n.t('fres_reportedstop', { stopname: res.Stop.name, stoplink: res.Stop.googleMapsLink, reportername: res.reporterName, reporterid: res.reporterId })}\n`
          }
          out += `\r\n\r\n${ctx.i18n.t('fres_done')}`

          return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
            .then(async () => {
              // save users langugage
              ctx.session.oldlang = ctx.i18n.locale()
              // reason should always be in default locale
              ctx.i18n.locale(process.env.DEFAULT_LOCALE)
              const reason = ctx.i18n.t('fres_list_reason_modified', {
                firstname: ctx.from.first_name,
                uid: ctx.from.id
              })
              // restore user locale
              ctx.i18n.locale(ctx.session.oldlang)
              let raidlist = await listRaids(`${reason}\n\n`, ctx)
              bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, { parse_mode: 'Markdown', disable_web_page_preview: true })
            })
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        } catch (error) {
          console.log('Whoops… saving new Field Research failed', error)
          return ctx.replyWithMarkdown(`${ctx.i18n.t('something_wrong')}`, Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = {}
              return ctx.scene.leave()
            })
        }
      } else {
        ctx.replyWithMarkdown(`${ctx.i18n.t('finished_procedure_without_saving')}`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
    },
    // -----------------
    // remove fieldresearch
    // -----------------
    async (ctx) => {
      // console.log('DESTROY research')
      let today = moment()
      today.hours(0).minutes(0).seconds(0)
      let researches = await models.Fieldresearch.findAll({
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
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.candidates = []
      out = `${ctx.i18n.t('fres_delete_which')}`
      for (let res of researches) {
        ctx.session.candidates.push(res)
      }
      // the escape option
      ctx.session.candidates.push({ Stop: { name: ctx.i18n.t('cancel'), id: 0 } })

      return ctx.replyWithMarkdown(out, Markup.keyboard(ctx.session.candidates.map(el => el.Stop.name)).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      ctx.session.destroyresearch = null
      if (ctx.update.message.text === ctx.i18n.t('cancel')) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('ok')}\r\n\r\n${ctx.i18n.t('fres_done')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      for (let candidate of ctx.session.candidates) {
        if (candidate.Stop.name.trim() === ctx.update.message.text) {
          ctx.session.destroyresearch = candidate
          break
        }
      }
      if (ctx.session.destroyresearch === null) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_done')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_delete_confirm')}`, Markup.keyboard([[ctx.i18n.t('yes')], [ctx.i18n.t('no')]]).oneTime().resize().extra())
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
              ctx.session.oldlang = ctx.i18n.locale()
              // reason should always be in default locale
              ctx.i18n.locale(process.env.DEFAULT_LOCALE)
              const reason = ctx.i18n.t('fres_list_reason_delete', {
                firstname: ctx.from.first_name,
                uid: ctx.from.id
              })
              // restore user locale
              ctx.i18n.locale(ctx.session.oldlang)
              let raidlist = await listRaids(`${reason}\n\n`, ctx)
              bot.telegram.sendMessage(process.env.GROUP_ID, raidlist, { parse_mode: 'Markdown', disable_web_page_preview: true })
              console.log(`Research deleted ${ctx.session.destroyresearch} by ${ctx.from.first_name}, ${ctx.from.id}`)
            }
          } catch (error) {
            console.log(`Could not delete ${ctx.session.destroyresearch}`, error)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('fres_delete_failed')}`)
              .then(() => {
                ctx.session = {}
                return ctx.scene.leave()
              })
          }

          break
        default:
          console.log('removal canceled')
      }
      let researches = await listResearches()
      let out = ''
      if (researches.length === 0) {
        out = `${ctx.i18n.t('fres_no_fres_now')}`
        return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      out = `${ctx.i18n.t('ok')}…\r\n${ctx.i18n.t('fres_fres_today')}\r\n`
      for (let res of researches) {
        out += `\r\n*${res.name}*\r\n`
        out += `${ctx.i18n.t('fres_reportedstop', {
          stopname: res.Stop.name,
          stoplink: res.Stop.googleMapsLink,
          reportername: res.reporterName,
          reporterid: res.reporterId })}\n`
      }
      out += `\r\n\r\n${ctx.i18n.t('fres_done')}`

      return ctx.replyWithMarkdown(out, Markup.removeKeyboard().extra({ disable_web_page_preview: true }))
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    },
    // -----------------
    // cancel fieldresearch
    // -----------------
    async (ctx) => {
      return ctx.replyWithMarkdown(`${ctx.i18n.t('ok')}… \r\n\r\n${ctx.i18n.t('fres_done')}`, Markup.removeKeyboard().extra())
        .then(() => {
          ctx.session = {}
          return ctx.scene.leave()
        })
    }
  )
}
module.exports = FielresearchWizard
