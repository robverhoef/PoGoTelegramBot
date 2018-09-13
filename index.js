require('dotenv').config()
// const fs = require('fs')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const Telegraf = require('telegraf')
const {Markup} = require('telegraf')
// const MySQLSession = require('telegraf-session-mysql')
const Stage = require('telegraf/stage')
const TelegrafI18n = require('telegraf-i18n')
const path = require('path')
const i18n = new TelegrafI18n({
  defaultLanguage: 'nl',
  useSession: true,
  allowMissing: true,
  directory: path.resolve(__dirname, 'locales')
})

var models = require('./models')

// var env = process.env.NODE_ENV || 'development'
// var sessconfig = require(`${__dirname}/config/config.json`)[env]
// const session = new MySQLSession({
//   host: sessconfig.host,
//   user: sessconfig.username,
//   password: sessconfig.password,
//   database: sessconfig.database
// })

// =====================
// Let's go!
// =====================
const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(i18n.middleware())
// Set the default timezone.
// ToDo: this should could come from env
moment.tz.setDefault('Europe/Amsterdam')
/**
* This will stop the conversation immeditaly
* @param context
*/
function cancelConversation (ctx) {
  // Since something might be failing… reset session
  ctx.session = {}
  return ctx.scene.leave()
    .then(() => ctx.replyWithMarkdown(ctx.i18n.t('cancelmessage')))
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
  statsWizard
])

/**
* Show help
* @param context
*/
function showHelp (ctx) {
  ctx.reply(ctx.i18n.t('helpmessage'))
}

// bot.use(session.middleware())
bot.use(Telegraf.session())
bot.use(stage.middleware())

async function showMainMenu (ctx, user) {
  let raids = await models.Raid.findAll({
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
          'uid': user.id
        }
      }
    ]
  })
  let btns = []
  btns.push(Markup.callbackButton(ctx.i18n.t('btn_join_raid'), 'joinRaid'))
  if (raids.length > 0) {
    btns.push(Markup.callbackButton(ctx.i18n.t('btn_exit_raid'), 'exitRaid'))
  }
  btns.push(Markup.callbackButton(ctx.i18n.t('btn_add_raid'), 'addRaid'))
  btns.push(Markup.callbackButton(ctx.i18n.t('btn_edit_raid'), 'editRaid'))
  btns.push(Markup.callbackButton(ctx.i18n.t('btn_find_gym'), 'findGym'))

  // admin only:
  const admins = await bot.telegram.getChatAdministrators(process.env.GROUP_ID)

  for (let a = 0; a < admins.length; a++) {
    if (admins[a].user.id === user.id) {
      btns.push(Markup.callbackButton(ctx.i18n.t('btn_add_gym'), 'addGym'))
      btns.push(Markup.callbackButton(ctx.i18n.t('btn_edit_gym'), 'editGym'))
      btns.push(Markup.callbackButton(ctx.i18n.t('btn_add_boss'), 'addBoss'))
      btns.push(Markup.callbackButton(ctx.i18n.t('btn_edit_boss'), 'editBoss'))
      break
    }
  }

  btns.push(Markup.callbackButton(ctx.i18n.t('btn_stats'), 'stats'))

  return ctx.replyWithMarkdown(ctx.i18n.t('main_menu_greeting', {user: user}), Markup.inlineKeyboard(btns, {columns: 1}).extra())
}

// This runs after the user has 'start'ed from an inline query in the group or /start in private mode
bot.command('/start', async (ctx) => {
  // check if start is not directly coming from the group
  if (ctx.update.message.chat.id === parseInt(process.env.GROUP_ID)) {
    return
  }
  let user = ctx.update.message.from
  // validate the user
  var fuser = await models.User.find({
    where: {
      tId: user.id
    }
  })
  // if (ctx.message.text === '/start help_fromgroup') {
  if (fuser !== null) {
    return showMainMenu(ctx, user)
  } else {
    return ctx.replyWithMarkdown(ctx.i18n.t('help_from_group'))
  }
})

// set cancel command here too, not only in wizards
bot.command('cancel', (ctx) => cancelConversation(ctx))
bot.action('joinRaid', Stage.enter('join-raid-wizard'))
bot.action('exitRaid', Stage.enter('exit-raid-wizard'))
bot.action('addRaid', Stage.enter('add-raid-wizard'))
bot.action('editRaid', Stage.enter('edit-raid-wizard'))
bot.action('findGym', Stage.enter('find-gym-wizard'))
bot.action('addGym', Stage.enter('add-gym-wizard'))
bot.action('editGym', Stage.enter('edit-gym-wizard'))
bot.action('addBoss', Stage.enter('add-raidboss-wizard'))
bot.action('editBoss', Stage.enter('edit-raidboss-wizard'))
bot.action('stats', Stage.enter('stats-wizard'))

/**
* Check if valid user and show START button to switch to private mode
*/
bot.on('inline_query', async ctx => {
  // console.log('inline_query', ctx.update)
  let user = await models.User.find({
    where: {
      [Op.and]: [
        {tId: ctx.inlineQuery.from.id},
        {tGroupID: process.env.GROUP_ID.toString()}
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

/**
* Sillyness example ;-)
*/
bot.hears(/^(dankjewel|dank|bedankt|thanx|thx)/i, (ctx) => {
  return ctx.replyWithMarkdown('Graag gedaan!')
})

// ================
// authorize new group user
// ================
bot.hears(/\/hi/i, async (ctx) => {
  let chattitle = ''
  const me = await ctx.telegram.getMe()
  if (ctx.update.message.chat === undefined) {
    return ctx.replyWithMarkdown(ctx.i18n.t('hi_from_grou_warning'))
  }
  console.log('Somebody said hi', moment().format('YYYY-MM-DD HH:mm:ss'), ctx.update.message.from, ctx.update.message.chat)
  let olduser = await models.User.find({
    where: {
      [Op.and]: [
        {tGroupID: process.env.GROUP_ID.toString()},
        {tId: ctx.update.message.from.id}
      ]
    }
  })
  // console.log('olduser', olduser)
  if (olduser !== null) {
    chattitle = ctx.update.message.chat.title
    bot.telegram.sendMessage(olduser.tId, ctx.i18n.t('already_know_user', {first_name: ctx.from.first_name, me: me, chattitle: chattitle}), {parse_mode: 'Markdown'})
    return
  }
  // console.log(
  //  'given chat === correct chat?',
  //  ctx.update.message.chat.id.toString(),
  //  '===',
  //  process.env.GROUP_ID, ctx.update.message.chat.id.toString() === process.env.GROUP_ID
  // )
  if (ctx.update.message.chat.id.toString() === process.env.GROUP_ID) {
    let newuser = models.User.build({
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
      await bot.telegram.sendMessage(newuser.tId, ctx.i18n.t('just_met_message', {first_name: ctx.from.first_name, me: me, chattitle: chattitle}), {parse_mode: 'Markdown'})
    } catch (error) {
      console.log(`First time /hi for ${ctx.from.first_name}, ${ctx.from.id}`)
    }
  } else {
    return ctx.replyWithMarkdown(ctx.i18n.t('user_unknown_warning', {me: me}))
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
  if (ctx.message.chat.id.toString() === process.env.GROUP_ID) {
    let newuser = models.User.build({
      tId: newusr.id,
      tUsername: newusr.first_name,
      tGroupID: process.env.GROUP_ID.toString()
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
  let raids = await models.sequelize.query('SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,\'ONLY_FULL_GROUP_BY\',\'\'));')
    .then(() => models.Raid.findAll({
      include: [
        models.Gym,
        models.Raiduser
      ],
      where: {
        endtime: {
          [Op.gt]: moment().add(2, 'hours').format('YYYY-MM-DD HH:mm:ss')
        }
      }
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
  return ctx.replyWithMarkdown(out, {disable_web_page_preview: true})
})

// Let's fire up!
bot.telegram.setWebhook(process.env.BOT_URL)
  .then((data) => {
    console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'webhook set')
  })

bot.startWebhook(process.env.BOT_PATH, null, process.env.PORT)
console.log(moment().format('YYYY-MM-DD HH:mm:ss'), 'webhook started')
