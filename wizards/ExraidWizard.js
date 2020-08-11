// ===================
// Field Research wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
var models = require('../models')
const moment = require('moment-timezone')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const listRaids = require('../util/listRaids')
const setLocale = require('../util/setLocale')
const inputExRaidTime = require('../util/inputExRaidTime')
const resolveRaidBoss = require('../util/resolveRaidBoss')
const TIMINGS = require('../timeSettings.js')
const escapeMarkDown = require('../util/escapeMarkDown')

async function listExraids () {
  const today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  const exraids = await models.Exraid.findAll({
    where: {
      start1: {
        [Op.gt]: today.unix()
      }
    },
    include: [
      models.Gym,
      models.Exraiduser
    ],
    order: [
      ['start1', 'ASC'],
      [models.Exraiduser, 'hasinvite', 'DESC']
    ]
  })
  return exraids
}

function makeExraidShow (exraids, ctx) {
  var out = '*EX RAIDS*\n\n'
  for (const exraid of exraids) {
    const strtime = moment.unix(exraid.start1)
    out += `${strtime.format('DD-MM-YYYY')} `
    if (exraid.Gym.googleMapsLink) {
      out += `[${exraid.Gym.gymname}](${exraid.Gym.googleMapsLink})\n`
    } else {
      out += `${exraid.Gym.gymname}\n`
    }
    const endtime = moment.unix(exraid.endtime)
    out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
    out += `*${exraid.target}*\n`
    out += `${ctx.i18n.t('start')}: ${strtime.format('H:mm')} `
    let userlist = ''
    let wantedlist = ''
    let accounter = 0
    for (var b = 0; b < exraid.Exraidusers.length; b++) {
      if (exraid.Exraidusers[b].hasinvite) {
        accounter += exraid.Exraidusers[b].accounts
        if (exraid.Exraidusers[b].delayed != null) {
          userlist += `[<⏰ ${exraid.Exraidusers[b].delayed} ${exraid.Exraidusers[b].username}>](tg://user?id=${exraid.Exraidusers[b].uid})${exraid.Exraidusers[b].accounts > 1 ? ('+' + (exraid.Exraidusers[b].accounts - 1)) : ''} `
        } else {
          userlist += `[${exraid.Exraidusers[b].username}](tg://user?id=${exraid.Exraidusers[b].uid})${exraid.Exraidusers[b].accounts > 1 ? ('+' + (exraid.Exraidusers[b].accounts - 1)) : ''} `
        }
      } else {
        wantedlist += `[${exraid.Exraidusers[b].username}](tg://user?id=${exraid.Exraidusers[b].uid}) `
      }
    }
    out += `${ctx.i18n.t('number')}: ${accounter}\n`
    out += `${ctx.i18n.t('participants')}: ${userlist}\n`
    if (wantedlist.length > 0) {
      out += `Nog geen invite: ${wantedlist}`
    }
    out += '\n\n'
  }
  return out
}
async function findExraid (eid) {
  var r = await models.Exraid.findOne({
    where: {
      id: eid
    },
    include: [
      models.Gym,
      models.Exraiduser,
      models.Raidboss
    ]
  })
  return r
}

function ExraidWizard (bot) {
  // a bit annoying, but count the next "async (ctx)" to get the right jump locations
  const wizsteps = {
    mainmenu: 0,
    addexraid: 2,
    exraidselected: 13,
    exraidleave: 15,
    exraidmodifymore: 17,
    exraidmodifydate: 20,
    exraidmoreorsave: 22,
    exraidmodifygymsearch: 24,
    exraiddone: 27
  }
  return new WizardScene('exraid-wizard',
    // Exraid mainmenu, step 0
    async (ctx) => {
      await setLocale(ctx)
      ctx.session.newexraid = {}
      ctx.session.mainexraidbtns = []
      ctx.session.savedexraids = await listExraids()
      for (const exraid of ctx.session.savedexraids) {
        ctx.session.mainexraidbtns.push([moment.unix(exraid.start1).format('DD-MM-YYYY HH:mm') + ' ' + exraid.Gym.gymname, exraid.id])
      }
      ctx.session.mainexraidbtns.push([ctx.i18n.t('exraid_btn_add'), 0])
      ctx.session.mainexraidbtns.push([ctx.i18n.t('exraid_btn_done'), 'exraiddone'])
      const showraidlist = makeExraidShow(ctx.session.savedexraids, ctx)
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_greeting', { user: ctx.from }), Markup.keyboard(ctx.session.mainexraidbtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.replyWithMarkdown(showraidlist, { disable_web_page_preview: true })
          .then(() => ctx.wizard.next()))
    },
    // handle choice, step 1
    async (ctx) => {
      const answer = ctx.update.message.text
      let answerid = -1
      // user wants to add ex raid or leave?
      // else get ex raid id
      for (const btn of ctx.session.mainexraidbtns) {
        if (btn[0] === answer) {
          answerid = btn[1]
          break
        }
      }
      if (answerid === 0) {
        // add an exraid
        ctx.wizard.selectStep(wizsteps.addexraid)
        return ctx.wizard.steps[wizsteps.addexraid](ctx)
      } else if (answerid === 'exraiddone') {
        // where done here
        ctx.wizard.selectStep(wizsteps.exraiddone)
        return ctx.wizard.steps[wizsteps.exraiddone](ctx)
      } else {
        // do something with selected exraid
        ctx.session.selectedRaid = await findExraid(answerid)
        if (ctx.session.selectedRaid !== null) {
          ctx.wizard.selectStep(wizsteps.exraidselected)
          return ctx.wizard.steps[wizsteps.exraidselected](ctx)
        }
      }
    },

    // add ex raid, step 2
    async (ctx) => {
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_add_welcome'), Markup.keyboard([{ text: ctx.i18n.t('btn_gym_find_location'), request_location: true }]).resize().extra({ disable_web_page_preview: true }))
        .then(() => ctx.wizard.next())
    },

    // step 3
    async (ctx) => {
      let candidates = []
      if (ctx.update.message.location) {
        const lat = ctx.update.message.location.latitude
        const lon = ctx.update.message.location.longitude
        const sf = 3.14159 / 180 // scaling factor
        const er = 6371 // earth radius in km, approximate
        const mr = 1.0 // max radius in Km
        const $sql = `SELECT id, gymname, lat, lon, (ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})))*${er} AS d FROM gyms WHERE ${mr} >= ${er} * ACOS(SIN(lat*${sf})*SIN(${lat}*${sf}) + COS(lat*${sf})*COS(${lat}*${sf})*COS((lon-${lon})*${sf})) AND removed = 0 ORDER BY d`
        candidates = await models.sequelize.query($sql, {
          model: models.Gym,
          mapToModel: {
            [Op.eq]: true // pass true here if you have any mapped fields
          }
        })
      } else {
        // User was typing
        const term = ctx.update.message.text.trim()
        if (term.length < 2) {
          return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
          // .then(() => ctx.wizard.back())
        } else {
          candidates = await models.Gym.findAll({
            where: {
              [Op.and]: [
                {
                  gymname: {
                    [Op.like]: '%' + term + '%'
                  }
                },
                {
                  removed: {
                    [Op.eq]: false
                  }
                }
              ]
            }
          })
          if (candidates.length === 0) {
            ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', { term: term }))
            return
          }
        }
      }
      ctx.session.gymcandidates = []
      for (let i = 0; i < candidates.length; i++) {
        ctx.session.gymcandidates.push([
          candidates[i].gymname.trim(),
          candidates[i].id
        ])
      }

      ctx.session.gymcandidates.push([
        ctx.i18n.t('btn_gym_not_found'), 0
      ])
      return ctx.replyWithMarkdown(ctx.i18n.t('select_a_gym'), Markup.keyboard(ctx.session.gymcandidates.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // step 4
    async (ctx) => {
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.gymcandidates.length; i++) {
        if (ctx.session.gymcandidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch gym not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('add_raid_wrong_while_selecting')}\n`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the gym

      if (ctx.session.gymcandidates[selectedIndex][1] === 0) {
        ctx.replyWithMarkdown(ctx.i18n.t('retry_or_cancel'), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.wizard.selectStep(wizsteps.mainmenu)
            return ctx.wizard.steps[wizsteps.mainmenu](ctx)
          })
      } else {
        // retrieve selected candidate from session
        const selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.newexraid.gymId = selectedgym[1]
        ctx.session.newexraid.gymname = selectedgym[0]

        ctx.session.dateOptions = []
        for (let i = 0; i < 14; i++) {
          const mnts = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
          var dat = moment().add(i, 'days').toArray()
          var datstr = dat[2] + ' ' + ctx.i18n.t(mnts[dat[1]]) + ' ' + dat[0]
          ctx.session.dateOptions.push([datstr, i])
        }
        const btns = []
        for (var j = 0; j < ctx.session.dateOptions.length; j += 2) {
          btns.push([ctx.session.dateOptions[j][0], ctx.session.dateOptions[j + 1][0]])
        }
        return ctx.replyWithMarkdown(ctx.i18n.t('exraid_date'), Markup.keyboard(btns).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },

    // step 5
    async (ctx) => {
      const answer = ctx.update.message.text
      let days = 0
      for (const d of ctx.session.dateOptions) {
        if (answer === d[0]) {
          days = d[1]
          break
        }
      }
      ctx.session.exraiddays = days
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_days', {
        exraiddays: ctx.session.exraiddays
      }), Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },

    // step 6
    async (ctx) => {
      let tmptime = false
      const answer = ctx.update.message.text
      tmptime = inputExRaidTime(ctx.session.exraiddays, answer)
      // check valid time
      if (tmptime === false) {
        return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
      }
      ctx.session.newexraid.endtime = moment.unix(tmptime).add(TIMINGS.EXRAIDBOSS, 'minutes').unix()
      ctx.session.newexraid.start1 = tmptime
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_enter_starttime', {
        start1: moment.unix(ctx.session.newexraid.start1).format('HH:mm'),
        endtime: moment.unix(ctx.session.newexraid.endtime).subtract(10, 'minutes').format('HH:mm')
      })
      )
        .then(() => ctx.wizard.next())
    },

    // step 7
    async (ctx) => {
      let tmptime = false
      const answer = ctx.update.message.text.toLowerCase()
      if (answer === 'x') {
        tmptime = ctx.session.newexraid.start1
      } else {
        tmptime = inputExRaidTime(ctx.session.exraiddays, answer)
        if (moment.unix(tmptime).isBefore(moment.unix(ctx.session.newexraid.start1)) || moment.unix(tmptime).isAfter(moment.unix(ctx.session.newexraid.endtime).subtract(10, 'minutes'))) {
          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_invalid_starttime', {
            start1: moment.unix(ctx.session.newexraid.start1).format('HH:mm'),
            endtime: moment.unix(ctx.session.newexraid.endtime).subtract(10, 'minutes').format('HH:mm')
          }
          ))
        }
      }
      ctx.session.newexraid.start1 = tmptime
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_raidboss'))
        .then(() => ctx.wizard.next())
    },

    // step 8
    async (ctx) => {
      ctx.session.newexraid.target = ctx.update.message.text
      var rboss = resolveRaidBoss(ctx.update.message.text)
      ctx.session.newexraid.raidbossId = rboss !== null ? rboss.id : null
      const out = `*Ex Raid* ${moment.unix(ctx.session.newexraid.start1).format('YYYY-MM-DD')}\n${ctx.i18n.t('until')} ${moment.unix(ctx.session.newexraid.endtime).format('HH:mm')}: *${ctx.session.newexraid.target}*\n${ctx.session.newexraid.gymname}\n${ctx.i18n.t('start')}: ${moment.unix(ctx.session.newexraid.start1).format('HH:mm')}`
      ctx.session.saveOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      return ctx.replyWithMarkdown(`${out}\n\n*${ctx.i18n.t('save_question')}*`, Markup.keyboard(ctx.session.saveOptions)
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    // step 9
    async (ctx) => {
      const user = ctx.from
      const answer = ctx.update.message.text
      if (answer === ctx.i18n.t('no')) {
        // don't save

      }
      // save
      if (answer === ctx.i18n.t('yes')) {
        var raidexists = await models.Exraid.findOne({
          where: {
            [Op.and]: [
              {
                gymId: {
                  [Op.eq]: ctx.session.newexraid.gymId
                }
              },
              {
                start1: {
                  [Op.eq]: ctx.session.newexraid.start1
                }
              },
              {
                endtime: {
                  [Op.eq]: ctx.session.newexraid.endtime
                }
              }
            ]
          }
        })
        if (raidexists) {
          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_exists_warning'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session.newexraid = null
              return ctx.scene.leave()
            })
        }
        const newexraid = models.Exraid.build({
          GymId: ctx.session.newexraid.gymId,
          start1: ctx.session.newexraid.start1,
          target: ctx.session.newexraid.target,
          raidbossId: ctx.session.newexraid.bossid,
          endtime: ctx.session.newexraid.endtime,
          reporterName: user.first_name,
          reporterId: user.id
        })
        // save...
        try {
          await newexraid.save()
            .then((saved) => {
              ctx.session.savedraid = saved
            })
        } catch (error) {
          console.log('Woops… registering new raid failed', error)

          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        const oldlocale = ctx.i18n.locale()
        // reason should always be in default locale
        ctx.i18n.locale(process.env.DEFAULT_LOCALE)
        const reason = ctx.i18n.t('exraid_added_list', {
          gymname: ctx.session.newexraid.gymname,
          user: user,
          user_first_name: escapeMarkDown(user.first_name)
        })
        // restore user locale
        ctx.i18n.locale(oldlocale)
        const out = await listRaids(reason, ctx)
        bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
        // saved…
        ctx.session.participateOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
        return ctx.replyWithMarkdown(ctx.i18n.t('exraid_do_you_participate'), Markup.keyboard(ctx.session.participateOptions).resize().oneTime().extra())
          .then(() => ctx.wizard.next())
      } else {
        // user declined save
        return ctx.replyWithMarkdown(`${ctx.i18n.t('join_raid_cancel')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = null
            return ctx.scene.leave()
          })
      }
    },

    // step 10
    async (ctx) => {
      const participate = ctx.session.participateOptions.indexOf(ctx.update.message.text)
      if (participate === 1) {
        // user does NOT participate, exit
        return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }
      // user does participate
      // Ask for invite
      return ctx.replyWithMarkdown(`${ctx.i18n.t('exraid_has_pass')}`, Markup.keyboard([[ctx.i18n.t('yes')], [ctx.i18n.t('no')]]).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // step 11
    async (ctx) => {
      const answer = ctx.update.message.text
      // User does not have an invite?
      if (answer === ctx.i18n.t('no')) {
        // register for 1 account
        const user = ctx.from
        // Check already registered? If so; update else store new
        const exraiduser = await models.Exraiduser.findOne({
          where: {
            [Op.and]: [{ uid: user.id }, { exraidId: ctx.session.savedraid.id }]
          }
        })
        if (exraiduser) {
          // update, set hasinvite = false, accounts = 1
          try {
            await models.Exraiduser.update(
              {
                accounts: 1,
                hasinvite: false
              },
              {
                where: {
                  [Op.and]: [{
                    uid: user.id
                  }, {
                    exraidId: ctx.session.savedraid.id
                  }]
                }
              }
            )
          } catch (error) {
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        } else {
          // new raid user
          const exraiduser = models.Exraiduser.build({
            exraidId: ctx.session.savedraid.id,
            username: user.first_name,
            uid: user.id,
            accounts: 1,
            hasinvite: false
          })
          try {
            await exraiduser.save()
          } catch (error) {
            console.log('Woops… registering raiduser failed', error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
          const oldlocale = ctx.i18n.locale()
          // reason should always be in default locale
          ctx.i18n.locale(process.env.DEFAULT_LOCALE)
          const reason = ctx.i18n.t('exraid_joined_noinvite_message', {
            gymname: ctx.session.newexraid.gymname,
            user: user,
            user_first_name: escapeMarkDown(user.first_name)
          })
          // restore user locale
          ctx.i18n.locale(oldlocale)
          const out = await listRaids(reason + '\n\n', ctx)
          bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_registered_without_pass'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      }
      // User has an invite…
      // ask for number of accounts
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
        gymname: ctx.session.newexraid.gymname
      }), Markup.keyboard([['1'], ['2', '3', '4', '5']])
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    // step 12
    // handle accounts for enlisting of invited user
    async (ctx) => {
      const accounts = parseInt(ctx.update.message.text)
      const user = ctx.from
      // Check already registered? If so; update else store new
      const exraiduser = await models.Exraiduser.findOne({
        where: {
          [Op.and]: [{ uid: user.id }, { exraidId: ctx.session.savedraid.id }]
        }
      })
      if (exraiduser) {
        // update
        try {
          await models.Exraiduser.update(
            {
              accounts: accounts,
              hasinvite: true
            },
            {
              where: {
                [Op.and]: [
                  {
                    uid: user.id
                  },
                  {
                    exraidId: ctx.session.savedraid.id
                  }
                ]
              }
            }
          )
        } catch (error) {
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        // new raid user
        const exraiduser = models.Exraiduser.build({
          exraidId: ctx.session.savedraid.id,
          username: user.first_name,
          uid: user.id,
          hasinvite: true,
          accounts: accounts
        })
        try {
          await exraiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        const oldlocale = ctx.i18n.locale()
        // reason should always be in default locale
        ctx.i18n.locale(process.env.DEFAULT_LOCALE)
        const reason = ctx.i18n.t('exraid_joined_message', {
          gymname: ctx.session.newexraid.gymname,
          user: user,
          user_first_name: user.first_name,
        })
        // restore user locale
        ctx.i18n.locale(oldlocale)
        const out = await listRaids(reason + '\n\n', ctx)
        bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
        return ctx.replyWithMarkdown(ctx.i18n.t('raid_add_finish', {
          gymname: ctx.session.newexraid.gymname,
          starttm: moment.unix(ctx.session.newexraid.start1).format('YYYY-MM-DD HH:mm')
        }), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = null
            return ctx.scene.leave()
          })
      }
    },

    // step 13
    // do something with the selected raid
    async (ctx) => {
      const btns = [
        ctx.i18n.t('exraid_btn_join'),
        ctx.i18n.t('exraid_btn_edit')
      ]
      // user did join this raid?
      let joined = false
      for (const exuser of ctx.session.selectedRaid.Exraidusers) {
        if (ctx.from.id === parseInt(exuser.uid)) {
          joined = true
          break
        }
      }
      if (joined) {
        btns.push(ctx.i18n.t('exraid_btn_leave'))
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_intro', {
        start1: moment.unix(ctx.session.selectedRaid.start1).format('DD-MM-YYYY HH:mm'),
        gymname: ctx.session.selectedRaid.Gym.gymname
      }), Markup.keyboard(btns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // step 14 handle action
    async (ctx) => {
      const answer = ctx.update.message.text
      switch (answer) {
        // leave
        case ctx.i18n.t('exraid_btn_leave'):
          const user = ctx.from
          try {
            await models.Exraiduser.destroy({
              where: {
                [Op.and]: [
                  {
                    exraidId: ctx.session.selectedRaid.id
                  },
                  {
                    uid: parseInt(user.id)
                  }
                ]
              }
            })
          } catch (error) {
            return ctx.replyWithMarkdown(ctx.i18n.t('unexpected_raid_not_found'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          const oldlocale = ctx.i18n.locale()
          // reason should always be in default locale
          ctx.i18n.locale(process.env.DEFAULT_LOCALE)
          const reason = ctx.i18n.t('exraid_exit_list_message', {
            gymname: ctx.session.selectedRaid.Gym.gymname,
            user: user,
            user_first_name: escapeMarkDown(user.first_name)
          })
          // restore user locale
          ctx.i18n.locale(oldlocale)
          const out = await listRaids(reason + '\n\n', ctx)
          bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })

          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_user_left'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        // change or enlist
        case ctx.i18n.t('exraid_btn_join'):
          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_join', {
            gymname: ctx.session.selectedRaid.Gym.gymname,
            start1: moment.unix(ctx.session.selectedRaid.start1).format('DD-MM-YYYY HH:mm')
          }), Markup.keyboard([[ctx.i18n.t('yes')], [ctx.i18n.t('no')]]).oneTime().resize().extra())
            .then(() => ctx.wizard.next())
        // edit raid
        case ctx.i18n.t('exraid_btn_edit'):
          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_edit'))
            .then(() => {
              ctx.wizard.selectStep(wizsteps.exraidmodifymore)
              return ctx.wizard.steps[wizsteps.exraidmodifymore](ctx)
            })
      }
    },

    // step 15, join raid
    async (ctx) => {
      const answer = ctx.update.message.text
      // User does not have an invite?
      if (answer === ctx.i18n.t('no')) {
        // register for 1 account
        const user = ctx.from
        // Check already registered? If so; update else store new
        const exraiduser = await models.Exraiduser.findOne({
          where: {
            [Op.and]: [
              {
                uid: user.id
              }, {
                exraidId: ctx.session.selectedRaid.id
              }
            ]
          }
        })

        if (exraiduser) {
          // update, set hasinvite = false, accounts = 1
          try {
            await models.Exraiduser.update(
              {
                accounts: 1,
                hasinvite: false
              },
              {
                where: {
                  [Op.and]: [{
                    uid: user.id
                  }, {
                    exraidId: ctx.session.selectedRaid.id
                  }]
                }
              }
            )
          } catch (error) {
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        } else {
          // new raid user
          const exraiduser = models.Exraiduser.build({
            exraidId: ctx.session.selectedRaid.id,
            username: user.first_name,
            uid: user.id,
            accounts: 1,
            hasinvite: false
          })
          try {
            await exraiduser.save()
          } catch (error) {
            console.log('Woops… registering raiduser failed', error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
        }

        const exraids = await listExraids()
        const raidlist = makeExraidShow(exraids, ctx)
        const oldlocale = ctx.i18n.locale()
        // reason should always be in default locale
        ctx.i18n.locale(process.env.DEFAULT_LOCALE)
        const reason = ctx.i18n.t('exraid_joined_noinvite_message', {
          gymname: ctx.session.selectedRaid.Gym.gymname,
          user: user,
          user_first_name: escapeMarkDown(user.first_name)
        })
        // restore user locale
        ctx.i18n.locale(oldlocale)
        const out = await listRaids(reason + '\n\n', ctx)
        bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
        return ctx.replyWithMarkdown(ctx.i18n.t('exraid_registered_without_pass'), Markup.removeKeyboard().extra())
          .then(() => ctx.replyWithMarkdown(raidlist, {
            disable_web_page_preview: true
          }))
          .then(() => ctx.scene.leave())
      }
      // User has an invite…
      // ask for number of accounts
      return ctx.replyWithMarkdown(ctx.i18n.t('join_raid_accounts_question', {
        gymname: ctx.session.selectedRaid.Gym.gymname
      }), Markup.keyboard([['1'], ['2', '3', '4', '5']])
        .resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    // step 16
    // handle enlisting of invited user
    async (ctx) => {
      const accounts = parseInt(ctx.update.message.text)
      const user = ctx.from
      // Check already registered? If so; update else store new
      const exraiduser = await models.Exraiduser.findOne({
        where: {
          [Op.and]: [
            {
              uid: user.id
            }, {
              exraidId: ctx.session.selectedRaid.id
            }
          ]
        }
      })
      if (exraiduser) {
        // update
        try {
          await models.Exraiduser.update(
            {
              accounts: accounts,
              hasinvite: true
            },
            {
              where: {
                [Op.and]: [
                  {
                    uid: user.id
                  }, {
                    exraidId: ctx.session.selectedRaid.id
                  }
                ]
              }
            }
          )
        } catch (error) {
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        // new raid user
        const exraiduser = models.Exraiduser.build({
          exraidId: ctx.session.selectedRaid.id,
          username: user.first_name,
          uid: user.id,
          hasinvite: true,
          accounts: accounts
        })
        try {
          await exraiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
      }
      const oldlocale = ctx.i18n.locale()
      // reason should always be in default locale
      ctx.i18n.locale(process.env.DEFAULT_LOCALE)
      const reason = ctx.i18n.t('exraid_user_added_list', {
        gymname: ctx.session.selectedRaid.Gym.gymname,
        user: user,
        user_first_name: escapeMarkDown(user.first_name)
      })
      const out = await listRaids(reason + '\n\n', ctx)
      // restore user locale
      ctx.i18n.locale(oldlocale)
      bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })

      const exraids = await listExraids()
      const raidlist = makeExraidShow(exraids, ctx)
      return ctx.replyWithMarkdown(raidlist, { disable_web_page_preview: true })
        .then(() => {
          return ctx.replyWithMarkdown(ctx.i18n.t('exraid_add_finish', {
            gymname: ctx.session.selectedRaid.Gym.gymname,
            starttm: moment.unix(ctx.session.selectedRaid.start1).format('YYYY-MM-DD HH:mm')
          }), Markup.removeKeyboard().extra())
        })
        .then(() => {
          // ctx.session = null
          return ctx.scene.leave()
        })
    },

    // step 17 exraidmodifymore
    async (ctx) => {
      ctx.session.changebtns = [
        [`${ctx.i18n.t('edit_raid_gym')}: ${ctx.session.selectedRaid.Gym.gymname}`, 'gym'],
        [`Datum ${moment.unix(ctx.session.selectedRaid.endtime).format('DD-MM-YYYY')}`, 'raiddate'],
        [`${ctx.i18n.t('edit_raid_endtime')}: ${moment.unix(ctx.session.selectedRaid.endtime).format('HH:mm')}`, 'endtime'],
        [`${ctx.i18n.t('edit_raid_starttime')}: ${moment.unix(ctx.session.selectedRaid.start1).format('HH:mm')}`, 'start1'],
        [`${ctx.i18n.t('edit_raid_pokemon')}: ${ctx.session.selectedRaid.target}`, 'target'],
        [ctx.i18n.t('btn_edit_gym_cancel'), 0]
      ]
      return ctx.replyWithMarkdown(`${ctx.i18n.t('exraid_edit_what')}`, Markup.keyboard(ctx.session.changebtns.map(el => el[0])).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // step 18
    async (ctx) => {
      const answer = ctx.update.message.text
      let editattr = 0
      for (let i = 0; i < ctx.session.changebtns.length; i++) {
        if (answer === ctx.session.changebtns[i][0]) {
          editattr = ctx.session.changebtns[i][1]
          break
        }
      }
      // cancelled modification
      if (editattr === 0) {
        return ctx.replyWithMarkdown(ctx.i18n.t('cancelmessage'), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      } else {
        let question = ''
        switch (editattr) {
          case 'endtime':
            ctx.session.editattr = 'endtime'
            question = ctx.i18n.t('edit_raid_question_endtime')
            break
          case 'start1':
            ctx.session.editattr = 'start1'
            const endtimestr = moment.unix(ctx.session.selectedRaid.endtime).format('HH:mm')
            const start1str = moment.unix(ctx.session.selectedRaid.endtime).subtract(TIMINGS.EXRAIDBOSS, 'minutes').format('HH:mm')
            question = ctx.i18n.t('edit_raid_question_starttime_range', {
              start1str: start1str,
              endtimestr: endtimestr
            })
            break
          case 'target':
            ctx.session.editattr = 'target'
            question = ctx.i18n.t('edit_raid_question_pokemon')
            break
          case 'gym':
            ctx.session.editattr = 'gym'
            ctx.wizard.selectStep(wizsteps.exraidmodifygymsearch)
            return ctx.wizard.steps[wizsteps.exraidmodifygymsearch](ctx)
          case 'raiddate':
            ctx.session.editattr = 'raiddate'
            ctx.wizard.selectStep(wizsteps.exraidmodifydate)
            return ctx.wizard.steps[wizsteps.exraidmodifydate](ctx)
          default:
            question = ctx.i18n.t('edit_raidboss_no_clue')
            return ctx.replyWithMarkdown(question)
              .then(() => ctx.scene.leave())
        }
        return ctx.replyWithMarkdown(question)
          .then(() => ctx.wizard.next())
      }
    },

    // step 19: enter new value or jump to 6 for entering a new gym
    async (ctx) => {
      const key = ctx.session.editattr
      let value = null
      // user has not just updated gym? If not expect text message
      if (key !== 'gymId') {
        value = ctx.update.message.text.trim()
      } else {
        value = ctx.session.newgymid
      }
      const raidstart = moment.unix(ctx.session.selectedRaid.start1)
      const now = moment()
      const days = raidstart.diff(now, 'days')
      if (key === 'endtime' || key === 'start1') {
        // ToDo: handle exraid days…
        const timevalue = inputExRaidTime(days, value)
        if (timevalue === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
        }
        if (key === 'start1') {
          const endtime = moment.unix(ctx.session.selectedRaid.endtime)
          const start = moment.unix(ctx.session.selectedRaid.endtime).subtract(TIMINGS.EXRAIDBOSS, 'minutes')
          const tempstart1 = moment.unix(timevalue)
          const h = tempstart1.hours()
          const m = tempstart1.minutes()
          const start1 = moment.unix(ctx.session.selectedRaid.endtime)
          start1.hours(h)
          start1.minutes(m)
          start1.seconds(0)
          // console.log('endtime', endtime, 'start', start, 'start1', start1)
          if (start1.diff(moment(start)) < 0 || endtime.diff(start1) < 0) {
            return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
          }
        }
        value = timevalue
      }
      if (key === 'raiddate') {
        ctx.wizard.selectStep(wizsteps.exraidmodifydate)
        return ctx.wizard.steps[wizsteps.exraidmodifydate](ctx)
      }
      // Handle the raidboss:
      if (key === 'target') {
        const target = ctx.update.message.text.trim()
        // let's see if we can find the raidboss…
        const boss = await resolveRaidBoss(target)
        if (boss !== null) {
          ctx.session.selectedRaid.target = boss.name
          ctx.session.selectedRaid.bossid = boss.id
          ctx.session.selectedRaid.accounts = boss.accounts
        } else {
          ctx.session.selectedRaid.target = target
          ctx.session.selectedRaid.accounts = null
          ctx.session.selectedRaid.bossid = null
        }
      } else {
        ctx.session.selectedRaid[key] = value
      }
      ctx.wizard.selectStep(wizsteps.exraidmoreorsave)
      return ctx.wizard.steps[wizsteps.exraidmoreorsave](ctx)
    },

    // step 20 change date
    async (ctx) => {
      ctx.session.dateOptions = []
      for (let i = 0; i < 14; i++) {
        const mnts = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        var dat = moment().add(i, 'days').toArray()
        var datstr = dat[2] + ' ' + ctx.i18n.t(mnts[dat[1]]) + ' ' + dat[0]
        ctx.session.dateOptions.push([datstr, i])
      }
      const btns = []
      for (var j = 0; j < ctx.session.dateOptions.length; j += 2) {
        btns.push([ctx.session.dateOptions[j][0], ctx.session.dateOptions[j + 1][0]])
      }
      return ctx.replyWithMarkdown(ctx.i18n.t('exraid_date'), Markup.keyboard(btns).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },

    // step 21
    async (ctx) => {
      let hours
      let minutes
      let newdate
      const answer = ctx.update.message.text
      let days = 0
      for (const d of ctx.session.dateOptions) {
        if (answer === d[0]) {
          days = d[1]
          break
        }
      }
      const start1 = moment.unix(ctx.session.selectedRaid.start1)
      hours = start1.hours()
      minutes = start1.minutes()
      newdate = moment()
      newdate.add(days, 'days')
      newdate.hours(hours)
      newdate.minutes(minutes)
      newdate.seconds(0)
      ctx.session.selectedRaid.start1 = newdate.unix()

      const endtime = moment.unix(ctx.session.selectedRaid.endtime)
      hours = endtime.hours()
      minutes = endtime.minutes()
      newdate = moment()
      newdate.add(days, 'days')
      newdate.hours(hours)
      newdate.minutes(minutes)
      newdate.seconds(0)
      ctx.session.selectedRaid.endtime = newdate.unix()
      ctx.replyWithMarkdown(ctx.i18n.t('exraid_date_changed'))
      ctx.wizard.selectStep(wizsteps.exraidmoreorsave)
      return ctx.wizard.steps[wizsteps.exraidmoreorsave](ctx)
    },

    // step 22: do more or save?
    async (ctx) => {
      const out = `${ctx.i18n.t('until')}: ${moment.unix(ctx.session.selectedRaid.endtime).format('DD-MM-YYYY HH:mm')}: *${ctx.session.selectedRaid.target}*\n${ctx.session.selectedRaid.Gym.gymname}\nStart: ${moment.unix(ctx.session.selectedRaid.start1).format('HH:mm')}\n\n`
      ctx.session.savebtns = [
        ctx.i18n.t('edit_raidboss_btn_save_close'),
        ctx.i18n.t('edit_raid_edit_more'),
        ctx.i18n.t('cancel')
      ]
      return ctx.replyWithMarkdown(ctx.i18n.t('edit_exraid_overview_data', {
        out: out
      }), Markup.keyboard(ctx.session.savebtns)
        .resize()
        .oneTime()
        .extra()
      )
        .then(() => ctx.wizard.next())
    },

    // step 23: save & exit or jump to 2
    async (ctx) => {
      const choice = ctx.session.savebtns.indexOf(ctx.update.message.text)
      switch (choice) {
        case 0:
          // save and exit
          const user = ctx.update.message.from
          try {
            await models.Exraid.update(
              {
                endtime: ctx.session.selectedRaid.endtime,
                start1: ctx.session.selectedRaid.start1,
                target: ctx.session.selectedRaid.target,
                gymId: ctx.session.selectedRaid.Gym.id,
                raidbossId: ctx.session.selectedRaid.bossid
              },
              {
                where: {
                  id: ctx.session.selectedRaid.id
                }
              }
            )
            // save users language
            const oldlocale = ctx.i18n.locale()
            // reason should always be in default locale
            ctx.i18n.locale(process.env.DEFAULT_LOCALE)
            const reason = ctx.i18n.t('edit_exraid_list_message', {
              gymname: ctx.session.selectedRaid.Gym.gymname,
              user: user,
              user_first_name: escapeMarkDown(user.first_name),
            })
            // restore user locale
            ctx.i18n.locale(oldlocale)
            const out = await listRaids(reason, ctx)
            bot.telegram.sendMessage(process.env.GROUP_ID, out, { parse_mode: 'Markdown', disable_web_page_preview: true })
            return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.error(error)
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor and trigger jump to step 1
          ctx.session.more = true
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_more'))
            .then(() => {
              ctx.wizard.selectStep(wizsteps.exraidmodifymore)
              return ctx.wizard.steps[wizsteps.exraidmodifymore](ctx)
            })
        case 2:
          // Don't save and leave
          return ctx.replyWithMarkdown(ctx.i18n.t('finished_procedure_without_saving'), Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.selectedRaid = null
              return ctx.scene.leave()
            })
      }
    },
    // =======

    // step 24: handle gym search
    async (ctx) => {
      const question = ctx.i18n.t('edit_raid_question_gym')
      return ctx.replyWithMarkdown(question)
        .then(() => ctx.wizard.next())
    },

    // Step 25: find gyms
    async (ctx) => {
      // why do i need this??
      if (ctx.update.message === undefined) {
        return
      }

      const term = ctx.update.message.text.trim()
      ctx.session.gymbtns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_two_chars_minimum'))
        // .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {
              [Op.like]: '%' + term + '%'
            }
          }
        })
        if (candidates.length === 0) {
          // ToDo: check dit dan...
          return ctx.replyWithMarkdown(ctx.i18n.t('find_gym_failed_retry', {
            term: term === '/start help_fromgroup' ? '' : term
          }))
          // .then(() => ctx.wizard.back())
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push(
            {
              gymname: candidates[i].gymname, id: candidates[i].id
            }
          )
          ctx.session.gymbtns.push(candidates[i].gymname)
        }
        ctx.session.gymcandidates.push(
          {
            name: ctx.i18n.t('btn_gym_not_found'),
            id: 0
          }
        )
        ctx.session.gymbtns.push(ctx.i18n.t('btn_gym_not_found'))
        return ctx.replyWithMarkdown(ctx.i18n.t('select_a_gym'), Markup.keyboard(ctx.session.gymbtns)
          .oneTime()
          .resize().extra())
          .then(() => ctx.wizard.next())
      }
    },

    // step 26: handle gym selection
    async (ctx) => {
      const gymIndex = ctx.session.gymbtns.indexOf(ctx.update.message.text)
      const selectedGym = ctx.session.gymcandidates[gymIndex]
      if (selectedGym.id === 0) {
        // mmm, let's try searching for a gym again
        return ctx.replyWithMarkdown(ctx.i18n.t('edit_raid_search_gym_again'), Markup.removeKeyboard().extra())
          .then(() => {
            ctx.wizard.selectStep(wizsteps.exraidmodifygymsearch)
            return ctx.wizard.steps[wizsteps.exraidmodifygymsearch](ctx)
          })
      } else {
        ctx.session.newgymid = selectedGym.id
        ctx.session.selectedRaid.Gym = selectedGym
        ctx.wizard.selectStep(wizsteps.exraidmoreorsave)
        return ctx.wizard.steps[wizsteps.exraidmoreorsave](ctx)
      }
    },

    // done step 27
    async (ctx) => {
      // save users language
      return ctx.replyWithMarkdown(`${ctx.i18n.t('admin_fres_finished')}`, Markup.removeKeyboard())
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = ExraidWizard
