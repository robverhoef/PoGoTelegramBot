import Sequelize from 'sequelize'
const Op = Sequelize.Op
import moment from 'moment-timezone'
import { Telegraf, Markup, session } from 'telegraf'

import Scenes from 'telegraf/scenes'
import TelegrafI18n from 'telegraf-i18n'

import path from 'path'
import models from './models/index.js'

import './locales.js'

import setLocale from './util/setLocale.js'

import listRaids from './util/listRaids.js'
import AddRaidWizard from './wizards/AddRaidWizard.js'
import ExitRaidWizard from './wizards/ExitRaidWizard.js'
import JoinRaidWizard from './wizards/JoinRaidWizard.js'
import EditRaidWizard from './wizards/EditRaidWizard.js'
import FindGymWizard from './wizards/FindGymWizard.js'
import AddGymWizard from './wizards/AddGymWizard.js'
import EditGymWizard from './wizards/EditGymWizard.js'
import AddRaidbossWizard from './wizards/AddRaidbossWizard.js'
import EditRaidbossWizard from './wizards/EditRaidbossWizard.js'
import StatsWizard from './wizards/StatsWizard.js'
import EliteraidWizard from './wizards/EliteraidWizard.js'
import AddNotificationWizard from './wizards/NotificationWizard.js'
import LocaleWizard from './wizards/LocaleWizard.js'
import UserDelayedWizard from './wizards/UserDelayedWizard.js'
import FieldresearchWizard from './wizards/FieldresearchWizard.js'
import AdminFieldResearchWizard from './wizards/AdminFieldResearchWizard.js'
import AdminStopsWizard from './wizards/AdminStopsWizard.js'
import RemoteInvitesWizard from './wizards/RemoteInvitesWizard.js'
import UserSettingsWizard from './wizards/UserSettingsWizard.js'
// =====================
// Let's go!
// =====================

/**
 * @type {import('telegraf').Context}
 */

if(!process.env.BOT_TOKEN){
  console.error('A bot token is required. Check your .env config…')
  process.exit(1);
}
const bot = new Telegraf(process.env.BOT_TOKEN)
bot.catch((err) => {
  console.log('\nOoops! Unhandled error:', err)
})

bot.use(session())
const i18n = new TelegrafI18n({
  defaultLanguage: 'nl',
  useSession: true,
  sessionName: 'session',
  allowMissing: true,
  directory: path.resolve(import.meta.dirname, 'locales')
})
bot.use(i18n.middleware())
// Set the default timezone.
// ToDo: this should could come from env
moment.tz.setDefault('Europe/Amsterdam')
/*
 * This will stop the conversation immeditaly
 * @param {Context} ctx
 */
async function cancelConversation(ctx) {
  // Since something might be failing… reset session
  ctx.session = {}
  // session cleared; resetting locale
  await setLocale(ctx)
  return ctx.scene
    .leave()
    .then(() =>
      ctx.replyWithHTML(ctx.i18n.t('cancelmessage'), Markup.removeKeyboard())
    )
}

// Setup for all wizards
const addRaidWizard = AddRaidWizard(bot)
addRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const exitRaidWizard = ExitRaidWizard(bot)
exitRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const joinRaidWizard = JoinRaidWizard(bot)
joinRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const editRaidWizard = EditRaidWizard(bot)
editRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const findGymWizard = FindGymWizard(bot)
findGymWizard.command('cancel', (ctx) => cancelConversation(ctx))

const addGymWizard = AddGymWizard(bot)
addGymWizard.command('cancel', (ctx) => cancelConversation(ctx))

const editGymWizard = EditGymWizard(bot)
editGymWizard.command('cancel', (ctx) => cancelConversation(ctx))

const addRaidbossWizard = AddRaidbossWizard(bot)
addRaidbossWizard.command('cancel', (ctx) => cancelConversation(ctx))

const editRaidbossWizard = EditRaidbossWizard(bot)
editRaidbossWizard.command('cancel', (ctx) => cancelConversation(ctx))

const statsWizard = StatsWizard(bot)
statsWizard.command('cancel', (ctx) => cancelConversation(ctx))

// const ExraidWizard =require('./wizards/ExraidWizard')
// const exraidWizard = ExraidWizard(bot)
// exraidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const eliteraidWizard = EliteraidWizard(bot)
eliteraidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const addNotificationWizard = AddNotificationWizard(bot)
addNotificationWizard.command('cancel', (ctx) => cancelConversation(ctx))

const localeWizard = LocaleWizard(bot)
localeWizard.command('cancel', (ctx) => cancelConversation(ctx))

const userDelayedWizard = UserDelayedWizard(bot)
userDelayedWizard.command('cancel', (ctx) => cancelConversation(ctx))

const fieldresearchWizard = FieldresearchWizard(bot)
fieldresearchWizard.command('cancel', (ctx) => cancelConversation(ctx))

const adminFieldResearchWizard = AdminFieldResearchWizard(bot)
adminFieldResearchWizard.command('cancel', (ctx) => cancelConversation(ctx))

const adminStopsWizard = AdminStopsWizard(bot)
adminStopsWizard.command('cancel', (ctx) => cancelConversation(ctx))

const remoteInvitesWizard = RemoteInvitesWizard(bot)
remoteInvitesWizard.command('cancel', (ctx) => cancelConversation(ctx))

const userSettingsWizard = UserSettingsWizard(bot)
userSettingsWizard.command('cancel', (ctx) => cancelConversation(ctx))

const stage = new Scenes.Stage([
  addRaidWizard,
  editRaidWizard,
  exitRaidWizard,
  joinRaidWizard,
  findGymWizard,
  addGymWizard,
  editGymWizard,
  addRaidbossWizard,
  editRaidbossWizard,
  statsWizard,
  eliteraidWizard,
  // exraidWizard,
  addNotificationWizard,
  localeWizard,
  userDelayedWizard,
  fieldresearchWizard,
  adminFieldResearchWizard,
  adminStopsWizard,
  remoteInvitesWizard,
  userSettingsWizard
])

/**
 * Show help
 * @param {Context} ctx
 */
function showHelp(ctx) {
  setLocale(ctx)
  ctx.reply(ctx.i18n.t('helpmessage'))
}
bot.use(stage.middleware())

// async function showRemoteInviteData (ctx, user) {
//   ctx.session = {}
//   ctx.scene.leave()
// }
/**
 * @param {Context} ctx
 */
async function showMainMenu(ctx, user) {
  ctx.session = {}
  ctx.scene.leave()
  const raids = await models.Raid.findAll({
    where: {
      endtime: {
        [Op.gt]: moment().unix()
      }
    },
    include: [
      models.Gym,
      {
        model: models.Raiduser,
        where: {
          uid: user.id
        }
      }
    ]
  })
  const btns = []
  btns.push(ctx.i18n.t('btn_join_raid'))
  if (raids.length > 0) {
    btns.push(ctx.i18n.t('btn_exit_raid'))
    // btns.push(ctx.i18n.t('btn_user_delayed'))
  }
  btns.push(ctx.i18n.t('btn_add_raid'))
  btns.push(ctx.i18n.t('btn_eliteraids'))
  btns.push(ctx.i18n.t('btn_edit_raid'))
  btns.push(ctx.i18n.t('btn_usersettings'))
  btns.push(ctx.i18n.t('btn_remote_invites'))
  btns.push(ctx.i18n.t('btn_field_researches'))
  btns.push(ctx.i18n.t('btn_find_gym'))
  btns.push(ctx.i18n.t('btn_notifications'))
  btns.push(ctx.i18n.t('btn_stats'))
  // btns.push(ctx.i18n.t('btn_exraids'))

  // group admins:
  const admins = await bot.telegram.getChatAdministrators(process.env.GROUP_ID)
  // or marked admin from database
  const dbAdmin = await models.User.findOne({
    where: {
      [Op.and]: [
        {
          tId: {
            [Op.eq]: user.id
          }
        },
        {
          isAdmin: {
            [Op.eq]: true
          }
        }
      ]
    }
  })
  for (let a = 0; a < admins.length; a++) {
    if (admins[a].user.id === user.id || dbAdmin !== null) {
      btns.push(ctx.i18n.t('btn_manage_fieldresearches'))
      btns.push(ctx.i18n.t('btn_add_gym'))
      btns.push(ctx.i18n.t('btn_edit_gym'))
      btns.push(ctx.i18n.t('btn_admin_stops'))
      btns.push(ctx.i18n.t('btn_add_boss'))
      btns.push(ctx.i18n.t('btn_edit_boss'))
      break
    }
  }

  // for testing only
  // btns.push('Trigger raidlist')
  return ctx.replyWithHTML(
    ctx.i18n.t('main_menu_greeting', {
      first_name: user.first_name
    }),
    Markup.keyboard(btns).oneTime().resize()
  )
}

// This runs after the user has started from an inline query in the group or /start in private mode
bot.command('start', async (ctx) => {
  // check if start is not directly coming from the group
  console.debug('Start command')
  if (ctx.update.message.chat.id === parseInt(process.env.GROUP_ID)) {
    return
  }

  const user = ctx.update.message.from
  // validate the user
  var fuser = await models.User.findOne({
    where: {
      tId: user.id
    }
  })
  // if (ctx.message.text === '/start help_fromgroup') {
  if (fuser !== null) {
    ctx.locale = fuser.locale
    ctx.i18n.locale(fuser.locale)
    if (ctx.update.message.text.indexOf('udetail_') > -1) {
      const uid = parseInt(ctx.update.message.text.split('udetail_')[1], 10)
      const inv = await models.User.findOne({
        where: {
          id: uid
        }
      })
      if (inv) {
        return ctx.replyWithHTML(
          `${ctx.i18n.t('telegram_name')}: ${inv.tUsername}\n${ctx.i18n.t(
            'trainer_name'
          )}: ${inv.pokemonname ? inv.pokemonname : '?'}\n${ctx.i18n.t(
            'friend_code'
          )}: ${inv.friendcode ? inv.friendcode : '?'}\n`
        )
      }
    }
    return showMainMenu(ctx, user)
  } else {
    // ToDo: check if user language is available
    ctx.i18n.locale(ctx.from.language_code)
    return ctx.replyWithHTML(ctx.i18n.t('help_from_group'))
  }
})

// set cancel command here too, not only in wizards
bot.command('cancel', (ctx) => cancelConversation(ctx))
bot.command('lang', Scenes.Stage.enter('locale-wizard'))
// iterate over languages
for (var key in i18n.repository) {
  bot.hears(
    i18n.repository[key].btn_join_raid.call(),
    Scenes.Stage.enter('join-raid-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_exit_raid.call(),
    Scenes.Stage.enter('exit-raid-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_add_raid.call(),
    Scenes.Stage.enter('add-raid-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_edit_raid.call(),
    Scenes.Stage.enter('edit-raid-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_find_gym.call(),
    Scenes.Stage.enter('find-gym-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_usersettings.call(),
    Scenes.Stage.enter('user-settings-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_field_researches.call(),
    Scenes.Stage.enter('fieldresearch-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_stats.call(),
    Scenes.Stage.enter('stats-wizard')
  )

  bot.hears(
    i18n.repository[key].btn_eliteraids.call(),
    Scenes.Stage.enter('eliteraid-wizard')
  )

  bot.hears(
    i18n.repository[key].btn_exraids.call(),
    Scenes.Stage.enter('exraid-wizard')
  )

  bot.hears(
    i18n.repository[key].btn_notifications.call(),
    Scenes.Stage.enter('notification-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_remote_invites.call(),
    Scenes.Stage.enter('remote-invites-wizard')
  )
  // bot.hears(i18n.repository[key].btn_user_delayed.call(), Scenes.Stage.enter('user-delayed-wizard'))
  // Admin
  bot.hears(
    i18n.repository[key].btn_manage_fieldresearches.call(),
    Scenes.Stage.enter('admin-field-research-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_add_gym.call(),
    Scenes.Stage.enter('add-gym-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_edit_gym.call(),
    Scenes.Stage.enter('edit-gym-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_add_boss.call(),
    Scenes.Stage.enter('add-raidboss-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_edit_boss.call(),
    Scenes.Stage.enter('edit-raidboss-wizard')
  )
  bot.hears(
    i18n.repository[key].btn_admin_stops.call(),
    Scenes.Stage.enter('admin-stops-wizard')
  )

  bot.hears('Trigger raidlist', async (ctx) => {
    const out = await listRaids('\n', ctx)
    bot.telegram.sendMessage(process.env.GROUP_ID, out, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  })
}

/**
 * Check if valid user and show START button to switch to private mode
 */
bot.on('inline_query', async (ctx) => {
  const user = await models.User.findOne({
    where: {
      [Op.and]: [
        { tId: ctx.inlineQuery.from.id },
        { tGroupID: process.env.GROUP_ID.toString() }
      ]
    }
  })
  if (!user) {
    console.log(
      `NOT OK, I don't know ${ctx.inlineQuery.from.id}, ${ctx.inlineQuery.from.first_name}`
    )
    return
  }

  // if (ctx.inlineQuery.query === 'actie') {
  return ctx.answerInlineQuery([], {
    switch_pm_text: 'STARTEN',
    switch_pm_parameter: 'help_fromgroup'
  })
  // }
})

// ================
// authorize new group user
// ================

bot.hears(/\/hi/i, async (ctx) => {
  let chattitle = ''
  const me = await ctx.telegram.getMe()
  setLocale(ctx)
  if (ctx.update.message.chat === undefined) {
    return ctx.replyWithHTML(ctx.i18n.t('hi_from_group_warning'))
  }
  console.log(
    'Somebody said hi',
    moment().format('YYYY-MM-DD HH:mm:ss'),
    ctx.update.message.from,
    ctx.update.message.chat
  )
  const olduser = await models.User.findOne({
    where: {
      [Op.and]: [
        { tGroupID: process.env.GROUP_ID.toString() },
        { tId: ctx.update.message.from.id }
      ]
    }
  })
  if (olduser !== null) {
    chattitle = ctx.update.message.chat.title
    bot.telegram.sendMessage(
      olduser.tId,
      ctx.i18n.t('already_know_user', {
        first_name: ctx.from.first_name,
        me: me,
        chattitle: chattitle
      }),
      { parse_mode: 'HTML' }
    )
    return
  }
  // console.log(
  //  'given chat === correct chat?',
  //  ctx.update.message.chat.id.toString(),
  //  '===',
  //  process.env.GROUP_ID, ctx.update.message.chat.id.toString() === process.env.GROUP_ID
  // )
  if (ctx.update.message.chat.id.toString() === process.env.GROUP_ID) {
    const newuser = models.User.build({
      tId: ctx.update.message.from.id,
      tUsername: ctx.update.message.from.first_name,
      tGroupID: process.env.GROUP_ID.toString()
    })
    try {
      await newuser.save()
      // eslint no-unused-vars: "none"
    } catch (error) {
      console.error(
        'Error saving user',
        ctx.update.message.from.first_name,
        error
      )
    }
    const chattitle = ctx.update.message.chat.title
    // Catch error in case the bot is responding for the first time to user
    // Telegram: "Bots can't initiate conversations with users." …despite having said /hi
    try {
      await bot.telegram.sendMessage(
        newuser.tId,
        ctx.i18n.t('just_met_message', {
          first_name: ctx.from.first_name,
          me: me,
          chattitle: chattitle
        }),
        { parse_mode: 'HTML' }
      )
    } catch (error) {
      console.log(
        `First time /hi for ${ctx.from.first_name}, ${ctx.from.id}, ${error}`
      )
    }
  } else {
    return ctx.replyWithHTML(ctx.i18n.t('user_unknown_warning', { me: me }))
  }
})

/**
 * Remind the user of /cancel. Maybe more later (read pinned message?)
 */
bot.command(/help/i, async (ctx) => {
  showHelp(ctx)
})

/**
 *  Method to get the Telegram group Id
 */
bot.command(/whoisthebot/i, async (ctx) => {
  console.log('whoisthebot:', ctx.message)
  ctx.reply('Check the logs…')
})

/**
 * Register new member
 */
bot.on('new_chat_members', async (ctx) => {
  var newusr = ctx.message.new_chat_member
  if (newusr.is_bot === true) {
    console.log('A bot tried to become a group member…')
    return
  }
  // Find the user's language
  const lang = newusr.language_code
  let userlang = process.env.LOCALE
  const rawlocales = process.env.LOCALES
  for (const rawlocale of rawlocales) {
    if (lang === rawlocale[0]) {
      userlang = lang
      break
    }
  }
  if (ctx.message.chat.id.toString() === process.env.GROUP_ID) {
    const newuser = models.User.build({
      tId: newusr.id,
      tUsername: newusr.first_name,
      tGroupID: process.env.GROUP_ID.toString(),
      locale: userlang
    })
    try {
      await newuser.save()
      console.log('new user added', newusr)
    } catch (error) {
      console.error(
        'Error saving user',
        ctx.update.message.from.first_name,
        error
      )
    }
  } else {
    console.log('User tried to join but group check failed', newusr)
  }
})

/**
 * Removing members who left the group
 */
bot.on('left_chat_member', async (ctx) => {
  var removed = ctx.message.left_chat_member
  try {
    await models.User.destroy({
      where: {
        tId: removed.id
      }
    })
    console.log('user removed:', removed)
  } catch (error) {
    console.log('caught error removing user', removed, error)
  }
})

/**
 * Convenience method, just for checking
 */
bot.hears(/\/raids/i, async (ctx) => {
  setLocale(ctx)
  const raids = await models.sequelize
    .query(
      "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));"
    )
    .then(() =>
      models.Raid.findAll({
        include: [models.Gym, models.Raiduser],
        where: {
          endtime: {
            [Op.gt]: moment().unix()
          }
        },
        order: [['start1', 'ASC']]
      })
    )
  let out = ''
  if (raids.length === 0) {
    ctx.reply(ctx.i18n.t('no_raids_found'))
    return
  }
  for (let a = 0; a < raids.length; a++) {
    const endtime = moment(new Date(raids[a].endtime))
    out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
    out += `<b> ${raids[a].target}</b>\n`
    out += `${raids[a].Gym.gymname}\n`
    if (raids[a].Gym.googleMapsLink) {
      out += `<a href="${raids[a].Gym.googleMapsLink}">${ctx.i18n.t(
        'map'
      )}</a>\n`
    }
    const strtime = moment(raids[a].start1)
    out += `${ctx.i18n.t('start')}: ${strtime.format('H:mm')} `
    let userlist = ''
    let accounter = 0
    for (var b = 0; b < raids[a].Raidusers.length; b++) {
      accounter += raids[a].Raidusers[b].accounts
      userlist += `${raids[a].Raidusers[b].username} `
    }
    out += `${ctx.i18n.t('number')}: ${accounter}\n`
    out += `${ctx.i18n.t('participants')}: ${userlist}`
    out += '\n\n'
  }
  return ctx.replyWithHTML(out, { disable_web_page_preview: true })
})

async function startBot() {
  let botUrl = process.env.BOT_URL
  // if (process.env.NODE_ENV === 'development') {
    console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'start polling bot')
    bot.launch()
  // } else {
  //   console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'starting bot')
  //   bot.telegram.setWebhook(botUrl, {certificate: process.env.CERTIFICATE}).then(() => {
  //     console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'webhook set', botUrl)
  //   })

  //   bot.startWebhook(process.env.BOT_PATH, null, process.env.PORT)
  //   console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'webhook started')
  // }
}
// Let's fire up!
startBot()
