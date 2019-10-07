require('dotenv').config()
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const Telegraf = require('telegraf')
const { Markup } = require('telegraf')
const Stage = require('telegraf/stage')
const TelegrafI18n = require('telegraf-i18n')
const path = require('path')
const models = require('./models')
require('./locales.js')
const setLocale = require('./util/setLocale')

// =====================
// Let's go!
// =====================
const bot = new Telegraf(process.env.BOT_TOKEN)

bot.catch((err) => {
  console.log('Ooops', err)
})

bot.use(Telegraf.session())
const i18n = new TelegrafI18n({
  defaultLanguage: 'nl',
  useSession: true,
  sessionName: 'session',
  allowMissing: true,
  directory: path.resolve(__dirname, 'locales')
})
bot.use(i18n.middleware())
// Set the default timezone.
// ToDo: this should could come from env
moment.tz.setDefault('Europe/Amsterdam')
/**
* This will stop the conversation immeditaly
* @param context
*/
async function cancelConversation (ctx) {
  // Since something might be failing… reset session
  ctx.session = {}
  // session cleared; resetting locale
  await setLocale(ctx)
  return ctx.scene.leave()
    .then(() => ctx.replyWithMarkdown(ctx.i18n.t('cancelmessage'), Markup.removeKeyboard().extra()))
}

// Setup for all wizards
const AddRaidWizard = require('./wizards/AddRaidWizard')
const addRaidWizard = AddRaidWizard(bot)
addRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const ExitRaidWizard = require('./wizards/ExitRaidWizard')
const exitRaidWizard = ExitRaidWizard(bot)
exitRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const JoinRaidWizard = require('./wizards/JoinRaidWizard')
const joinRaidWizard = JoinRaidWizard(bot)
joinRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const EditRaidWizard = require('./wizards/EditRaidWizard')
const editRaidWizard = EditRaidWizard(bot)
editRaidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const FindGymWizard = require('./wizards/FindGymWizard')
const findGymWizard = FindGymWizard(bot)
findGymWizard.command('cancel', (ctx) => cancelConversation(ctx))

const AddGymWizard = require('./wizards/AddGymWizard')
const addGymWizard = AddGymWizard(bot)
addGymWizard.command('cancel', (ctx) => cancelConversation(ctx))

const EditGymWizard = require('./wizards/EditGymWizard')
const editGymWizard = EditGymWizard(bot)
editGymWizard.command('cancel', (ctx) => cancelConversation(ctx))

const AddRaidbossWizard = require('./wizards/AddRaidbossWizard')
const addRaidbossWizard = AddRaidbossWizard(bot)
addRaidbossWizard.command('cancel', (ctx) => cancelConversation(ctx))

const EditRaidbossWizard = require('./wizards/EditRaidbossWizard')
const editRaidbossWizard = EditRaidbossWizard(bot)
editRaidbossWizard.command('cancel', (ctx) => cancelConversation(ctx))

const StatsWizard = require('./wizards/StatsWizard')
const statsWizard = StatsWizard(bot)
statsWizard.command('cancel', (ctx) => cancelConversation(ctx))

const ExraidWizard = require('./wizards/ExraidWizard')
const exraidWizard = ExraidWizard(bot)
exraidWizard.command('cancel', (ctx) => cancelConversation(ctx))

const AddNotificationWizard = require('./wizards/NotificationWizard')
const addNotificationWizard = AddNotificationWizard(bot)
addNotificationWizard.command('cancel', (ctx) => cancelConversation(ctx))

const LocaleWizard = require('./wizards/LocaleWizard')
const localeWizard = LocaleWizard(bot)
localeWizard.command('cancel', (ctx) => cancelConversation(ctx))

const UserDelayedWizard = require('./wizards/UserDelayedWizard')
const userDelayedWizard = UserDelayedWizard(bot)
userDelayedWizard.command('cancel', (ctx) => cancelConversation(ctx))

const FieldresearchWizard = require('./wizards/FieldresearchWizard')
const fieldresearchWizard = FieldresearchWizard(bot)
fieldresearchWizard.command('cancel', (ctx) => cancelConversation(ctx))

const AdminFieldResearchWizard = require('./wizards/AdminFieldResearchWizard')
const adminFieldResearchWizard = AdminFieldResearchWizard(bot)
adminFieldResearchWizard.command('cancel', (ctx) => cancelConversation(ctx))

const AdminStopsWizard = require('./wizards/AdminStopsWizard')
const adminStopsWizard = AdminStopsWizard(bot)
adminStopsWizard.command('cancel', (ctx) => cancelConversation(ctx))

const stage = new Stage([
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
  exraidWizard,
  addNotificationWizard,
  localeWizard,
  userDelayedWizard,
  fieldresearchWizard,
  adminFieldResearchWizard,
  adminStopsWizard
])

/**
* Show help
* @param context
*/
function showHelp (ctx) {
  setLocale(ctx)
  ctx.reply(ctx.i18n.t('helpmessage'))
}
bot.use(stage.middleware())

async function showMainMenu (ctx, user) {
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
    btns.push(ctx.i18n.t('btn_user_delayed'))
  }
  btns.push(ctx.i18n.t('btn_add_raid'))
  btns.push(ctx.i18n.t('btn_edit_raid'))
  btns.push(ctx.i18n.t('btn_field_researches'))
  btns.push(ctx.i18n.t('btn_find_gym'))
  btns.push(ctx.i18n.t('btn_notifications'))
  btns.push(ctx.i18n.t('btn_stats'))
  btns.push(ctx.i18n.t('btn_exraids'))

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
  return ctx.replyWithMarkdown(ctx.i18n.t('main_menu_greeting', { user: user }), Markup.keyboard(
    btns).oneTime().resize().extra())
}

// This runs after the user has started from an inline query in the group or /start in private mode
bot.command('/start', async (ctx) => {
  // check if start is not directly coming from the group
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
    return showMainMenu(ctx, user)
  } else {
    // ToDo: check if user language is available
    ctx.i18n.locale(ctx.from.language_code)
    return ctx.replyWithMarkdown(ctx.i18n.t('help_from_group'))
  }
})

// set cancel command here too, not only in wizards
bot.command('cancel', (ctx) => cancelConversation(ctx))
bot.command('lang', Stage.enter('locale-wizard'))
// iterate over languages
for (var key in i18n.repository) {
  bot.hears(i18n.repository[key].btn_join_raid.call(), Stage.enter('join-raid-wizard'))
  bot.hears(i18n.repository[key].btn_exit_raid.call(), Stage.enter('exit-raid-wizard'))
  bot.hears(i18n.repository[key].btn_add_raid.call(), Stage.enter('add-raid-wizard'))
  bot.hears(i18n.repository[key].btn_edit_raid.call(), Stage.enter('edit-raid-wizard'))
  bot.hears(i18n.repository[key].btn_find_gym.call(), Stage.enter('find-gym-wizard'))
  bot.hears(i18n.repository[key].btn_field_researches.call(), Stage.enter('fieldresearch-wizard'))
  bot.hears(i18n.repository[key].btn_stats.call(), Stage.enter('stats-wizard'))

  bot.hears(i18n.repository[key].btn_exraids.call(), Stage.enter('exraid-wizard'))

  bot.hears(i18n.repository[key].btn_notifications.call(), Stage.enter('notification-wizard'))
  bot.hears(i18n.repository[key].btn_user_delayed.call(), Stage.enter('user-delayed-wizard'))
  // Admin
  bot.hears(i18n.repository[key].btn_manage_fieldresearches.call(), Stage.enter('admin-field-research-wizard'))
  bot.hears(i18n.repository[key].btn_add_gym.call(), Stage.enter('add-gym-wizard'))
  bot.hears(i18n.repository[key].btn_edit_gym.call(), Stage.enter('edit-gym-wizard'))
  bot.hears(i18n.repository[key].btn_add_boss.call(), Stage.enter('add-raidboss-wizard'))
  bot.hears(i18n.repository[key].btn_edit_boss.call(), Stage.enter('edit-raidboss-wizard'))
  bot.hears(i18n.repository[key].btn_admin_stops.call(), Stage.enter('admin-stops-wizard'))
}

/**
* Check if valid user and show START button to switch to private mode
*/
bot.on('inline_query', async ctx => {
  // console.log('inline_query', ctx.update)
  const user = await models.User.findOne({
    where: {
      [Op.and]: [
        { tId: ctx.inlineQuery.from.id },
        { tGroupID: process.env.GROUP_ID.toString() }
      ]
    }
  })
  if (!user) {
    console.log(`NOT OK, I don't know ${ctx.inlineQuery.from.id}, ${ctx.inlineQuery.from.first_name}`)
    return
  }

  // if (ctx.inlineQuery.query === 'actie') {
  return ctx.answerInlineQuery([],
    {
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
    return ctx.replyWithMarkdown(ctx.i18n.t('hi_from_group_warning'))
  }
  console.log('Somebody said hi', moment().format('YYYY-MM-DD HH:mm:ss'), ctx.update.message.from, ctx.update.message.chat)
  const olduser = await models.User.findOne({
    where: {
      [Op.and]: [
        { tGroupID: process.env.GROUP_ID.toString() },
        { tId: ctx.update.message.from.id }
      ]
    }
  })
  // console.log('olduser', olduser)
  if (olduser !== null) {
    chattitle = ctx.update.message.chat.title
    bot.telegram.sendMessage(olduser.tId, ctx.i18n.t('already_know_user', { first_name: ctx.from.first_name, me: me, chattitle: chattitle }), { parse_mode: 'Markdown' })
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
    } catch (error) {
      console.error('Error saving user', ctx.update.message.from.first_name, error)
    }
    const chattitle = ctx.update.message.chat.title
    // Catch error in case the bot is responding for the first time to user
    // Telegram: "Bots can't initiate conversations with users." …despite having said /hi
    try {
      await bot.telegram.sendMessage(newuser.tId, ctx.i18n.t('just_met_message', { first_name: ctx.from.first_name, me: me, chattitle: chattitle }), { parse_mode: 'Markdown' })
    } catch (error) {
      console.log(`First time /hi for ${ctx.from.first_name}, ${ctx.from.id}`)
    }
  } else {
    return ctx.replyWithMarkdown(ctx.i18n.t('user_unknown_warning', { me: me }))
  }
})

/**
* Remind the user of /cancel. Maybe more later (read pinned message?)
*/
bot.hears(/\/help/i, async (ctx) => {
  showHelp(ctx)
})

/**
*  Method to get the Telegram group Id
*/
bot.hears(/\/whoisthebot/i, async (ctx) => {
  console.log('whoisthebot:', ctx.message)
  ctx.reply('Check the logs…')
})

/**
* Register new member
*/
bot.on('new_chat_members', async (ctx) => {
  // console.log('new chat member', ctx.message)
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
      console.error('Error saving user', ctx.update.message.from.first_name, error)
    }
  } else {
    console.log('User tried to join but group check failed', newusr)
  }
})

/**
* Removing members who left the group
*/
bot.on('left_chat_member', async (ctx) => {
  // console.log('chat member left', ctx.message.left_chat_member)
  var removed = ctx.message.left_chat_member
  try {
    await models.User.destroy({
      where: {
        tId: removed.id
      }
    })
    console.log('user removed:', removed)
  } catch (error) {
    console.log('caught error removing user', removed)
  }
})

/**
* Convenience method, just for checking
*/
bot.hears(/\/raids/i, async (ctx) => {
  setLocale(ctx)
  const raids = await models.sequelize.query('SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,\'ONLY_FULL_GROUP_BY\',\'\'));')
    .then(() => models.Raid.findAll({
      include: [
        models.Gym,
        models.Raiduser
      ],
      where: {
        endtime: {
          [Op.gt]: moment().unix()
        }
      },
      order: [
        ['start1', 'ASC']
      ]
    }))
  let out = ''
  if (raids.length === 0) {
    ctx.reply(ctx.i18n.t('no_raids_found'))
    return
  }
  for (let a = 0; a < raids.length; a++) {
    const endtime = moment(new Date(raids[a].endtime))
    out += `${ctx.i18n.t('until')}: ${endtime.format('H:mm')} `
    out += `* ${raids[a].target}*\n`
    out += `${raids[a].Gym.gymname}\n`
    if (raids[a].Gym.googleMapsLink) {
      out += `[${ctx.i18n.t('map')}](${raids[a].Gym.googleMapsLink})\n`
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
  return ctx.replyWithMarkdown(out, { disable_web_page_preview: true })
})
// Let's fire up!
bot.telegram.setWebhook(process.env.BOT_URL)
  .then((data) => {
    console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'webhook set')
  })

bot.startWebhook(process.env.BOT_PATH, null, process.env.PORT)
console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'webhook started')
