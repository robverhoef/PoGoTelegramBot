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
const inputRaidDaysTime = require('../util/inputRaidDaysTime')
const resolveRaidBoss = require('../util/resolveRaidBoss')
const TIMINGS = require('../timeSettings.js')
const escapeMarkDown = require('../util/escapeMarkDown')

async function listEliteraids() {
  const today = moment()
  today.hours(0)
  today.minutes(0)
  today.seconds(0)
  const eliteraids = await models.Eliteraid.findAll({
    where: {
      start1: {
        [Op.gt]: today.unix()
      }
    },
    include: [models.Gym, models.Eliteraiduser],
    order: [
      ['start1', 'ASC'],
      [models.Eliteraiduser, 'id', 'DESC']
    ]
  })
  return eliteraids
}

function makeEliteraidShow(eliteraids, ctx) {
  var out = '*ELITE RAIDS*\n\n'
  for (const eliteraid of eliteraids) {
    const strtime = moment.unix(eliteraid.start1)
    out += `${strtime.format('DD-MM-YYYY')} `
    if (eliteraid.Gym.googleMapsLink) {
      out += `[${eliteraid.Gym.gymname}](${eliteraid.Gym.googleMapsLink})\n`
    } else {
      out += `${eliteraid.Gym.gymname}\n`
    }
    const endtime = moment.unix(eliteraid.endtime)
    out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
    out += `*${eliteraid.target}*\n`
    out += `${ctx.i18n.t('start')}: ${strtime.format('H:mm')} `
    let userlist = ''
    let accounter = 0
    for (var b = 0; b < eliteraid.Eliteraidusers.length; b++) {
      accounter += eliteraid.Eliteraidusers[b].accounts
      if (eliteraid.Eliteraidusers[b].delayed != null) {
        userlist += `[<⏰ ${eliteraid.Eliteraidusers[b].delayed} ${
          eliteraid.Eliteraidusers[b].username
        }>](tg://user?id=${eliteraid.Eliteraidusers[b].uid})${
          eliteraid.Eliteraidusers[b].accounts > 1
            ? '+' + (eliteraid.Eliteraidusers[b].accounts - 1)
            : ''
        } `
      } else {
        userlist += `[${eliteraid.Eliteraidusers[b].username}](tg://user?id=${
          eliteraid.Eliteraidusers[b].uid
        })${
          eliteraid.Eliteraidusers[b].accounts > 1
            ? '+' + (eliteraid.Eliteraidusers[b].accounts - 1)
            : ''
        } `
      }
    }
    out += `${ctx.i18n.t('number')}: ${accounter}\n`
    out += `${ctx.i18n.t('participants')}: ${userlist}\n\n`
  }
  return out
}
async function findEliteraid(eid) {
  var r = await models.Eliteraid.findOne({
    where: {
      id: eid
    },
    include: [models.Gym, models.Eliteraiduser, models.Raidboss]
  })
  return r
}

function EliteraidWizard(bot) {
  // a bit annoying, but count the next "async (ctx)" to get the right jump locations
  // these are being used for wizard.selectStep
  const wizsteps = {
    mainmenu: 0,
    addeliteraid: 2,
    eliteraidselected: 12,
    eliteraidjoin: 14,
    eliteraidmodifymore: 16,
    eliteraidmodifydate: 19,
    eliteraidmoreorsave: 21,
    eliteraidmodifygymsearch: 23,
    eliteraiddone: 26
  }
  return new WizardScene(
    'eliteraid-wizard',
    // Eliteraid mainmenu, step 0
    async (ctx) => {
      await setLocale(ctx)
      ctx.session.neweliteraid = {}
      ctx.session.maineliteraidbtns = []
      ctx.session.savedeliteraids = await listEliteraids()
      for (const eliteraid of ctx.session.savedeliteraids) {
        ctx.session.maineliteraidbtns.push([
          moment.unix(eliteraid.start1).format('DD-MM-YYYY HH:mm') +
            ' ' +
            eliteraid.Gym.gymname,
          eliteraid.id
        ])
      }
      ctx.session.maineliteraidbtns.push([ctx.i18n.t('eliteraid_btn_add'), 0])
      ctx.session.maineliteraidbtns.push([
        ctx.i18n.t('eliteraid_btn_done'),
        'eliteraiddone'
      ])
      const showraidlist = makeEliteraidShow(ctx.session.savedeliteraids, ctx)
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_greeting', {
            user_first_name: ctx.from.first_name
          }),
          Markup.keyboard(ctx.session.maineliteraidbtns.map((el) => el[0]))
            .oneTime()
            .resize()
            .extra()
        )
        .then(() =>
          ctx
            .replyWithMarkdown(showraidlist, { disable_web_page_preview: true })
            .then(() => ctx.wizard.next())
        )
    },
    // handle choice, step 1
    async (ctx) => {
      const answer = ctx.update.message.text
      let answerid = -1
      // user wants to add eliteraid or leave?
      // else get eliteraid id
      for (const btn of ctx.session.maineliteraidbtns) {
        if (btn[0] === answer) {
          answerid = btn[1]
          break
        }
      }
      if (answerid === 0) {
        // add an eliteraid
        ctx.wizard.selectStep(wizsteps.addeliteraid)
        return ctx.wizard.steps[wizsteps.addeliteraid](ctx)
      } else if (answerid === 'eliteraiddone') {
        // where done here
        ctx.wizard.selectStep(wizsteps.eliteraiddone)
        return ctx.wizard.steps[wizsteps.eliteraiddone](ctx)
      } else {
        // do something with selected eliteraid
        ctx.session.selectedRaid = await findEliteraid(answerid)
        if (ctx.session.selectedRaid !== null) {
          ctx.wizard.selectStep(wizsteps.eliteraidselected)
          return ctx.wizard.steps[wizsteps.eliteraidselected](ctx)
        }
      }
    },

    // add eliteraid, step 2
    async (ctx) => {
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_add_welcome'),
          Markup.keyboard([
            {
              text: ctx.i18n.t('btn_gym_find_location'),
              request_location: true
            }
          ])
            .resize()
            .extra({ disable_web_page_preview: true })
        )
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
            ctx.replyWithMarkdown(
              ctx.i18n.t('find_gym_failed_retry', { term: term })
            )
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

      ctx.session.gymcandidates.push([ctx.i18n.t('btn_gym_not_found'), 0])
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('select_a_gym'),
          Markup.keyboard(ctx.session.gymcandidates.map((el) => el[0]))
            .oneTime()
            .resize()
            .extra()
        )
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
        return ctx
          .replyWithMarkdown(
            `${ctx.i18n.t('add_raid_wrong_while_selecting')}\n`,
            Markup.removeKeyboard().extra()
          )
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the gym

      if (ctx.session.gymcandidates[selectedIndex][1] === 0) {
        ctx
          .replyWithMarkdown(
            ctx.i18n.t('retry_or_cancel'),
            Markup.removeKeyboard().extra()
          )
          .then(() => {
            ctx.wizard.selectStep(wizsteps.mainmenu)
            return ctx.wizard.steps[wizsteps.mainmenu](ctx)
          })
      } else {
        // retrieve selected candidate from session
        const selectedgym = ctx.session.gymcandidates[selectedIndex]
        ctx.session.neweliteraid.gymId = selectedgym[1]
        ctx.session.neweliteraid.gymname = selectedgym[0]

        ctx.session.dateOptions = []
        for (let i = 0; i < 2; i++) {
          const mnts = [
            'jan',
            'feb',
            'mar',
            'apr',
            'may',
            'jun',
            'jul',
            'aug',
            'sep',
            'oct',
            'nov',
            'dec'
          ]
          var dat = moment().add(i, 'days').toArray()
          var datstr = dat[2] + ' ' + ctx.i18n.t(mnts[dat[1]]) + ' ' + dat[0]
          ctx.session.dateOptions.push([datstr, i])
        }
        const btns = []
        for (var j = 0; j < ctx.session.dateOptions.length; j += 2) {
          btns.push([
            ctx.session.dateOptions[j][0],
            ctx.session.dateOptions[j + 1][0]
          ])
        }
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('eliteraid_date'),
            Markup.keyboard(btns).oneTime().resize().extra()
          )
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
      ctx.session.eliteraiddays = days
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_days', {
            eliteraiddays: ctx.session.eliteraiddays
          }),
          Markup.removeKeyboard().extra()
        )
        .then(() => ctx.wizard.next())
    },

    // step 6
    async (ctx) => {
      let tmptime = false
      const answer = ctx.update.message.text
      tmptime = inputRaidDaysTime(ctx.session.eliteraiddays, answer)
      // check valid time
      if (tmptime === false) {
        return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
      }
      ctx.session.neweliteraid.endtime = moment
        .unix(tmptime)
        .add(TIMINGS.ELITERAIDBOSS, 'minutes')
        .unix()
      ctx.session.neweliteraid.start1 = tmptime
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_enter_starttime', {
            start1: moment
              .unix(ctx.session.neweliteraid.start1)
              .format('HH:mm'),
            endtime: moment
              .unix(ctx.session.neweliteraid.endtime)
              .subtract(5, 'minutes')
              .format('HH:mm')
          })
        )
        .then(() => ctx.wizard.next())
    },

    // step 7
    async (ctx) => {
      let tmptime = false
      const answer = ctx.update.message.text.toLowerCase()
      if (answer === 'x') {
        tmptime = ctx.session.neweliteraid.start1
      } else {
        tmptime = inputRaidDaysTime(ctx.session.eliteraiddays, answer)
        if (
          moment
            .unix(tmptime)
            .isBefore(moment.unix(ctx.session.neweliteraid.start1)) ||
          moment
            .unix(tmptime)
            .isAfter(
              moment
                .unix(ctx.session.neweliteraid.endtime)
                .subtract(5, 'minutes')
            )
        ) {
          return ctx.replyWithMarkdown(
            ctx.i18n.t('eliteraid_invalid_starttime', {
              start1: moment
                .unix(ctx.session.neweliteraid.start1)
                .format('HH:mm'),
              endtime: moment
                .unix(ctx.session.neweliteraid.endtime)
                .subtract(5, 'minutes')
                .format('HH:mm')
            })
          )
        }
      }
      ctx.session.neweliteraid.start1 = tmptime
      return ctx
        .replyWithMarkdown(ctx.i18n.t('eliteraid_raidboss'))
        .then(() => ctx.wizard.next())
    },

    // step 8
    async (ctx) => {
      ctx.session.neweliteraid.target = ctx.update.message.text
      var rboss = resolveRaidBoss(ctx.update.message.text)
      ctx.session.neweliteraid.raidbossId = rboss !== null ? rboss.id : null
      const out = `*Ex Raid* ${moment
        .unix(ctx.session.neweliteraid.start1)
        .format('YYYY-MM-DD')}\n${ctx.i18n.t('until')} ${moment
        .unix(ctx.session.neweliteraid.endtime)
        .format('HH:mm')}: *${ctx.session.neweliteraid.target}*\n${
        ctx.session.neweliteraid.gymname
      }\n${ctx.i18n.t('start')}: ${moment
        .unix(ctx.session.neweliteraid.start1)
        .format('HH:mm')}`
      ctx.session.saveOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
      return ctx
        .replyWithMarkdown(
          `${out}\n\n*${ctx.i18n.t('save_question')}*`,
          Markup.keyboard(ctx.session.saveOptions).resize().oneTime().extra()
        )
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
        var raidexists = await models.Eliteraid.findOne({
          where: {
            [Op.and]: [
              {
                gymId: {
                  [Op.eq]: ctx.session.neweliteraid.gymId
                }
              },
              {
                start1: {
                  [Op.eq]: ctx.session.neweliteraid.start1
                }
              },
              {
                endtime: {
                  [Op.eq]: ctx.session.neweliteraid.endtime
                }
              }
            ]
          }
        })
        if (raidexists) {
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('eliteraid_exists_warning'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session.neweliteraid = null
              return ctx.scene.leave()
            })
        }
        const neweliteraid = models.Eliteraid.build({
          GymId: ctx.session.neweliteraid.gymId,
          start1: ctx.session.neweliteraid.start1,
          target: ctx.session.neweliteraid.target,
          raidbossId: ctx.session.neweliteraid.bossid,
          endtime: ctx.session.neweliteraid.endtime,
          reporterName: user.first_name,
          reporterId: user.id
        })
        // save...
        try {
          await neweliteraid.save().then((saved) => {
            ctx.session.savedraid = saved
          })
        } catch (error) {
          console.log('Woops… registering new raid failed', error)
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        const oldlocale = ctx.i18n.locale()
        // reason should always be in default locale
        ctx.i18n.locale(process.env.DEFAULT_LOCALE)
        const reason = ctx.i18n.t('eliteraid_added_list', {
          gymname: ctx.session.neweliteraid.gymname,
          user: user,
          user_first_name: escapeMarkDown(user.first_name)
        })
        // restore user locale
        ctx.i18n.locale(oldlocale)
        const out = await listRaids(reason, ctx)
        bot.telegram.sendMessage(process.env.GROUP_ID, out, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
        // saved…
        ctx.session.participateOptions = [ctx.i18n.t('yes'), ctx.i18n.t('no')]
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('eliteraid_do_you_participate'),
            Markup.keyboard(ctx.session.participateOptions)
              .resize()
              .oneTime()
              .extra()
          )
          .then(() => ctx.wizard.next())
      } else {
        // user declined save
        return ctx
          .replyWithMarkdown(
            `${ctx.i18n.t('join_raid_cancel')}`,
            Markup.removeKeyboard().extra()
          )
          .then(() => {
            ctx.session = null
            return ctx.scene.leave()
          })
      }
    },

    // step 10
    async (ctx) => {
      const participate = ctx.session.participateOptions.indexOf(
        ctx.update.message.text
      )
      if (participate === 1) {
        // user does NOT participate, exit
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('finished_procedure'),
            Markup.removeKeyboard().extra()
          )
          .then(() => {
            ctx.session = null
            return ctx.scene.leave()
          })
      }
      const user = ctx.from
      // Check already registered? If so; update else store new
      const eliteraiduser = await models.Eliteraiduser.findOne({
        where: {
          [Op.and]: [
            { uid: user.id },
            { eliteraidId: ctx.session.savedraid.id }
          ]
        }
      })
      if (eliteraiduser) {
        // update, set accounts = 1
        try {
          await models.Eliteraiduser.update(
            {
              accounts: 1
            },
            {
              where: {
                [Op.and]: [
                  {
                    uid: user.id
                  },
                  {
                    eliteraidId: ctx.session.savedraid.id
                  }
                ]
              }
            }
          )
        } catch (error) {
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
      } else {
        // new raid user
        const eliteraiduser = models.Eliteraiduser.build({
          eliteraidId: ctx.session.savedraid.id,
          username: user.first_name,
          uid: user.id,
          accounts: 1
        })
        try {
          await eliteraiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
        // ask for number of accounts
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('join_raid_accounts_question', {
              gymname: ctx.session.neweliteraid.gymname
            }),
            Markup.keyboard([['1'], ['2', '3', '4', '5']])
              .resize()
              .oneTime()
              .extra()
          )
          .then(() => ctx.wizard.next())
      }
    },
    // 11 deleted

    // step 11
    // handle number accounts for enlisting
    async (ctx) => {
      const accounts = parseInt(ctx.update.message.text)
      const user = ctx.from
      // Check already registered? If so; update else store new
      const eliteraiduser = await models.Eliteraiduser.findOne({
        where: {
          [Op.and]: [
            { uid: user.id },
            { eliteraidId: ctx.session.savedraid.id }
          ]
        }
      })
      if (eliteraiduser) {
        // update
        try {
          await models.Eliteraiduser.update(
            {
              accounts: accounts
            },
            {
              where: {
                [Op.and]: [
                  {
                    uid: user.id
                  },
                  {
                    eliteraidId: ctx.session.savedraid.id
                  }
                ]
              }
            }
          )
        } catch (error) {
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
      } else {
        // new raid user
        const eliteraiduser = models.Eliteraiduser.build({
          eliteraidId: ctx.session.savedraid.id,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await eliteraiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
      }

      const oldlocale = ctx.i18n.locale()
      // reason should always be in default locale
      ctx.i18n.locale(process.env.DEFAULT_LOCALE)
      const reason = ctx.i18n.t('eliteraid_joined_message', {
        gymname: ctx.session.neweliteraid.gymname,
        user: user,
        user_first_name: user.first_name
      })
      // restore user locale
      ctx.i18n.locale(oldlocale)
      const out = await listRaids(reason + '\n\n', ctx)
      bot.telegram.sendMessage(process.env.GROUP_ID, out, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('raid_add_finish', {
            gymname: ctx.session.neweliteraid.gymname,
            starttm: moment
              .unix(ctx.session.neweliteraid.start1)
              .format('YYYY-MM-DD HH:mm')
          }),
          Markup.removeKeyboard().extra()
        )
        .then(() => {
          ctx.session = null
          return ctx.scene.leave()
        })
    },

    // step 12
    // do something with the selected raid
    async (ctx) => {
      const btns = [
        ctx.i18n.t('eliteraid_btn_join'),
        ctx.i18n.t('eliteraid_btn_edit')
      ]
      // user did join this raid?
      let joined = false
      for (const exuser of ctx.session.selectedRaid.Eliteraidusers) {
        if (ctx.from.id === parseInt(exuser.uid)) {
          joined = true
          break
        }
      }
      if (joined) {
        btns.push(ctx.i18n.t('eliteraid_btn_leave'))
      }
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_intro', {
            start1: moment
              .unix(ctx.session.selectedRaid.start1)
              .format('DD-MM-YYYY HH:mm'),
            gymname: ctx.session.selectedRaid.Gym.gymname
          }),
          Markup.keyboard(btns).oneTime().resize().extra()
        )
        .then(() => ctx.wizard.next())
    },

    // step 13 handle action
    async (ctx) => {
      const answer = ctx.update.message.text
      switch (answer) {
        // leave
        case ctx.i18n.t('eliteraid_btn_leave'):
          const user = ctx.from
          try {
            await models.Eliteraiduser.destroy({
              where: {
                [Op.and]: [
                  {
                    eliteraidId: ctx.session.selectedRaid.id
                  },
                  {
                    uid: parseInt(user.id)
                  }
                ]
              }
            })
          } catch (error) {
            return ctx
              .replyWithMarkdown(
                ctx.i18n.t('unexpected_raid_not_found'),
                Markup.removeKeyboard().extra()
              )
              .then(() => {
                ctx.session = null
                return ctx.scene.leave()
              })
          }
          const oldlocale = ctx.i18n.locale()
          // reason should always be in default locale
          ctx.i18n.locale(process.env.DEFAULT_LOCALE)
          const reason = ctx.i18n.t('eliteraid_exit_list_message', {
            gymname: ctx.session.selectedRaid.Gym.gymname,
            user: user,
            user_first_name: escapeMarkDown(user.first_name)
          })
          // restore user locale
          ctx.i18n.locale(oldlocale)
          const out = await listRaids(reason + '\n\n', ctx)
          bot.telegram.sendMessage(process.env.GROUP_ID, out, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })

          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('eliteraid_user_left'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        // change or enlist
        case ctx.i18n.t('eliteraid_btn_join'):
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('eliteraid_join', {
                gymname: ctx.session.selectedRaid.Gym.gymname,
                start1: moment
                  .unix(ctx.session.selectedRaid.start1)
                  .format('DD-MM-YYYY HH:mm')
              })
            )
            .then(() => {
              // return ctx.wizard.next()
              ctx.wizard.selectStep(wizsteps.eliteraidjoin)
              return ctx.wizard.steps[wizsteps.eliteraidjoin](ctx)
            })
        // edit raid
        case ctx.i18n.t('eliteraid_btn_edit'):
          return ctx
            .replyWithMarkdown(ctx.i18n.t('eliteraid_edit'))
            .then(() => {
              ctx.wizard.selectStep(wizsteps.eliteraidmodifymore)
              return ctx.wizard.steps[wizsteps.eliteraidmodifymore](ctx)
            })
      }
    },

    // step 14, join raid
    async (ctx) => {
      // ask for number of accounts
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('join_raid_accounts_question', {
            gymname: ctx.session.selectedRaid.Gym.gymname
          }),
          Markup.keyboard([['1'], ['2', '3', '4', '5']])
            .resize()
            .oneTime()
            .extra()
        )
        .then(() => ctx.wizard.next())
    },

    // step 15
    // register number of accounts joining
    async (ctx) => {
      const accounts = parseInt(ctx.update.message.text)
      const user = ctx.from
      // Check already registered? If so; update else store new
      const eliteraiduser = await models.Eliteraiduser.findOne({
        where: {
          [Op.and]: [
            {
              uid: user.id
            },
            {
              eliteraidId: ctx.session.selectedRaid.id
            }
          ]
        }
      })
      if (eliteraiduser) {
        // update
        try {
          await models.Eliteraiduser.update(
            {
              accounts: accounts
            },
            {
              where: {
                [Op.and]: [
                  {
                    uid: user.id
                  },
                  {
                    eliteraidId: ctx.session.selectedRaid.id
                  }
                ]
              }
            }
          )
        } catch (error) {
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
      } else {
        // new raid user
        const eliteraiduser = models.Eliteraiduser.build({
          eliteraidId: ctx.session.selectedRaid.id,
          username: user.first_name,
          uid: user.id,
          accounts: accounts
        })
        try {
          await eliteraiduser.save()
        } catch (error) {
          console.log('Woops… registering raiduser failed', error)
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('problem_while_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session = null
              return ctx.scene.leave()
            })
        }
      }
      // save users language
      const oldlocale = ctx.i18n.locale()
      // reason should always be in default locale
      ctx.i18n.locale(process.env.DEFAULT_LOCALE)
      const reason = ctx.i18n.t('eliteraid_user_added_list', {
        gymname: ctx.session.selectedRaid.Gym.gymname,
        user: user,
        user_first_name: escapeMarkDown(user.first_name)
      })
      // restore user locale
      ctx.i18n.locale(oldlocale)
      const out = await listRaids(reason, ctx)
      bot.telegram.sendMessage(process.env.GROUP_ID, out, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })

      const eliteraids = await listEliteraids()
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_add_finish', {
            gymname: ctx.session.selectedRaid.Gym.gymname,
            starttm: moment
              .unix(ctx.session.selectedRaid.start1)
              .format('YYYY-MM-DD HH:mm')
          }),
          Markup.removeKeyboard().extra()
        )
        .then(() => ctx.scene.leave())
    },

    // step 16 eliteraidmodifymore
    async (ctx) => {
      ctx.session.changebtns = [
        [
          `${ctx.i18n.t('edit_raid_gym')}: ${
            ctx.session.selectedRaid.Gym.gymname
          }`,
          'gym'
        ],
        [
          `Datum ${moment
            .unix(ctx.session.selectedRaid.endtime)
            .format('DD-MM-YYYY')}`,
          'raiddate'
        ],
        [
          `${ctx.i18n.t('edit_raid_endtime')}: ${moment
            .unix(ctx.session.selectedRaid.endtime)
            .format('HH:mm')}`,
          'endtime'
        ],
        [
          `${ctx.i18n.t('edit_raid_starttime')}: ${moment
            .unix(ctx.session.selectedRaid.start1)
            .format('HH:mm')}`,
          'start1'
        ],
        [
          `${ctx.i18n.t('edit_raid_pokemon')}: ${
            ctx.session.selectedRaid.target
          }`,
          'target'
        ],
        [ctx.i18n.t('btn_edit_gym_cancel'), 0]
      ]
      return ctx
        .replyWithMarkdown(
          `${ctx.i18n.t('eliteraid_edit_what')}`,
          Markup.keyboard(ctx.session.changebtns.map((el) => el[0]))
            .oneTime()
            .resize()
            .extra()
        )
        .then(() => ctx.wizard.next())
    },

    // step 17
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
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('cancelmessage'),
            Markup.removeKeyboard().extra()
          )
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
            const endtimestr = moment
              .unix(ctx.session.selectedRaid.endtime)
              .format('HH:mm')
            const start1str = moment
              .unix(ctx.session.selectedRaid.endtime)
              .subtract(TIMINGS.ELITERAIDBOSS, 'minutes')
              .format('HH:mm')
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
            ctx.wizard.selectStep(wizsteps.eliteraidmodifygymsearch)
            return ctx.wizard.steps[wizsteps.eliteraidmodifygymsearch](ctx)
          case 'raiddate':
            ctx.session.editattr = 'raiddate'
            ctx.wizard.selectStep(wizsteps.eliteraidmodifydate)
            return ctx.wizard.steps[wizsteps.eliteraidmodifydate](ctx)
          default:
            question = ctx.i18n.t('edit_raidboss_no_clue')
            return ctx.replyWithMarkdown(question).then(() => ctx.scene.leave())
        }
        return ctx.replyWithMarkdown(question).then(() => ctx.wizard.next())
      }
    },

    // step 18: enter new value or jump to 6 for entering a new gym
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
        // ToDo: handle eliteraid days…
        const timevalue = inputRaidDaysTime(days, value)
        if (timevalue === false) {
          return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
        }
        if (key === 'start1') {
          const endtime = moment.unix(ctx.session.selectedRaid.endtime)
          const start = moment
            .unix(ctx.session.selectedRaid.endtime)
            .subtract(TIMINGS.ELITERAIDBOSS, 'minutes')
          const tempstart1 = moment.unix(timevalue)
          const h = tempstart1.hours()
          const m = tempstart1.minutes()
          const start1 = moment.unix(ctx.session.selectedRaid.endtime)
          start1.hours(h)
          start1.minutes(m)
          start1.seconds(0)
          if (start1.diff(moment(start)) < 0 || endtime.diff(start1) < 0) {
            return ctx.replyWithMarkdown(ctx.i18n.t('invalid_time_retry'))
          }
        }
        value = timevalue
      }
      if (key === 'raiddate') {
        ctx.wizard.selectStep(wizsteps.eliteraidmodifydate)
        return ctx.wizard.steps[wizsteps.eliteraidmodifydate](ctx)
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
      ctx.wizard.selectStep(wizsteps.eliteraidmoreorsave)
      return ctx.wizard.steps[wizsteps.eliteraidmoreorsave](ctx)
    },

    // step 19 change date
    async (ctx) => {
      ctx.session.dateOptions = []
      for (let i = 0; i < 2; i++) {
        const mnts = [
          'jan',
          'feb',
          'mar',
          'apr',
          'may',
          'jun',
          'jul',
          'aug',
          'sep',
          'oct',
          'nov',
          'dec'
        ]
        var dat = moment().add(i, 'days').toArray()
        var datstr = dat[2] + ' ' + ctx.i18n.t(mnts[dat[1]]) + ' ' + dat[0]
        ctx.session.dateOptions.push([datstr, i])
      }
      const btns = []
      for (var j = 0; j < ctx.session.dateOptions.length; j += 2) {
        btns.push([
          ctx.session.dateOptions[j][0],
          ctx.session.dateOptions[j + 1][0]
        ])
      }
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('eliteraid_date'),
          Markup.keyboard(btns).oneTime().resize().extra()
        )
        .then(() => ctx.wizard.next())
    },

    // step 20
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
      ctx.replyWithMarkdown(ctx.i18n.t('eliteraid_date_changed'))
      ctx.wizard.selectStep(wizsteps.eliteraidmoreorsave)
      return ctx.wizard.steps[wizsteps.eliteraidmoreorsave](ctx)
    },

    // step 21: do more or save?
    async (ctx) => {
      const out = `${ctx.i18n.t('until')}: ${moment
        .unix(ctx.session.selectedRaid.endtime)
        .format('DD-MM-YYYY HH:mm')}: *${ctx.session.selectedRaid.target}*\n${
        ctx.session.selectedRaid.Gym.gymname
      }\nStart: ${moment
        .unix(ctx.session.selectedRaid.start1)
        .format('HH:mm')}\n\n`
      ctx.session.savebtns = [
        ctx.i18n.t('edit_raidboss_btn_save_close'),
        ctx.i18n.t('edit_raid_edit_more'),
        ctx.i18n.t('cancel')
      ]
      return ctx
        .replyWithMarkdown(
          ctx.i18n.t('edit_eliteraid_overview_data', {
            out: out
          }),
          Markup.keyboard(ctx.session.savebtns).resize().oneTime().extra()
        )
        .then(() => ctx.wizard.next())
    },

    // step 22: save & exit or jump to 2
    async (ctx) => {
      const choice = ctx.session.savebtns.indexOf(ctx.update.message.text)
      switch (choice) {
        case 0:
          // save and exit
          const user = ctx.update.message.from
          try {
            await models.Eliteraid.update(
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
            const reason = ctx.i18n.t('edit_eliteraid_list_message', {
              gymname: ctx.session.selectedRaid.Gym.gymname,
              user: user,
              user_first_name: escapeMarkDown(user.first_name)
            })
            // restore user locale
            ctx.i18n.locale(oldlocale)
            const out = await listRaids(reason, ctx)
            bot.telegram.sendMessage(process.env.GROUP_ID, out, {
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            })
            return ctx
              .replyWithMarkdown(
                ctx.i18n.t('finished_procedure'),
                Markup.removeKeyboard().extra()
              )
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.error(error)
            return ctx
              .replyWithMarkdown(
                ctx.i18n.t('problem_while_saving'),
                Markup.removeKeyboard().extra()
              )
              .then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor and trigger jump to step 1
          ctx.session.more = true
          return ctx.replyWithMarkdown(ctx.i18n.t('edit_more')).then(() => {
            ctx.wizard.selectStep(wizsteps.eliteraidmodifymore)
            return ctx.wizard.steps[wizsteps.eliteraidmodifymore](ctx)
          })
        case 2:
          // Don't save and leave
          return ctx
            .replyWithMarkdown(
              ctx.i18n.t('finished_procedure_without_saving'),
              Markup.removeKeyboard().extra()
            )
            .then(() => {
              ctx.session.raidcandidates = null
              ctx.session.selectedRaid = null
              return ctx.scene.leave()
            })
      }
    },
    // =======

    // step 23: handle gym search
    async (ctx) => {
      const question = ctx.i18n.t('edit_raid_question_gym')
      return ctx.replyWithMarkdown(question).then(() => ctx.wizard.next())
    },

    // Step 24: find gyms
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
          return ctx.replyWithMarkdown(
            ctx.i18n.t('find_gym_failed_retry', {
              term: term === '/start help_fromgroup' ? '' : term
            })
          )
          // .then(() => ctx.wizard.back())
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push({
            gymname: candidates[i].gymname,
            id: candidates[i].id
          })
          ctx.session.gymbtns.push(candidates[i].gymname)
        }
        ctx.session.gymcandidates.push({
          name: ctx.i18n.t('btn_gym_not_found'),
          id: 0
        })
        ctx.session.gymbtns.push(ctx.i18n.t('btn_gym_not_found'))
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('select_a_gym'),
            Markup.keyboard(ctx.session.gymbtns).oneTime().resize().extra()
          )
          .then(() => ctx.wizard.next())
      }
    },

    // step 25: handle gym selection
    async (ctx) => {
      const gymIndex = ctx.session.gymbtns.indexOf(ctx.update.message.text)
      const selectedGym = ctx.session.gymcandidates[gymIndex]
      if (selectedGym.id === 0) {
        // mmm, let's try searching for a gym again
        return ctx
          .replyWithMarkdown(
            ctx.i18n.t('edit_raid_search_gym_again'),
            Markup.removeKeyboard().extra()
          )
          .then(() => {
            ctx.wizard.selectStep(wizsteps.eliteraidmodifygymsearch)
            return ctx.wizard.steps[wizsteps.eliteraidmodifygymsearch](ctx)
          })
      } else {
        ctx.session.newgymid = selectedGym.id
        ctx.session.selectedRaid.Gym = selectedGym
        ctx.wizard.selectStep(wizsteps.eliteraidmoreorsave)
        return ctx.wizard.steps[wizsteps.eliteraidmoreorsave](ctx)
      }
    },

    // done step 26
    async (ctx) => {
      // save users language
      return ctx
        .replyWithMarkdown(
          `${ctx.i18n.t('admin_fres_finished')}`,
          Markup.removeKeyboard()
        )
        .then(() => ctx.scene.leave())
    }
  )
}

module.exports = EliteraidWizard
