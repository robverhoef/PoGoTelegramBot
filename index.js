require('dotenv').config()
// const fs = require('fs')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment-timezone')
const Telegraf = require('telegraf')
const {Markup} = require('telegraf')
// const MySQLSession = require('telegraf-session-mysql')
const Stage = require('telegraf/stage')
// const {session} = require('telegraf')
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
    .then(() => ctx.replyWithMarkdown('Ok.\n *Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra()))
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

const AddNotificationWizard = require('./wizards/NotificationWizard')
const addNotificationWizard = AddNotificationWizard(bot)
addNotificationWizard.command('cancel', (ctx) => cancelConversation(ctx))

const UserDelayedWizard = require('./wizards/UserDelayedWizard')
const userDelayedWizard = UserDelayedWizard(bot)
userDelayedWizard.command('cancel', (ctx) => cancelConversation(ctx))

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
  addNotificationWizard,
  userDelayedWizard
])

/**
* Show help
* @param context
*/
function showHelp (ctx) {
  bot.telegram.getChat(process.env.GROUP_ID)
    .then((ch) => {
      console.log('showHelp', ch, 'pinned message', ch.pinned_message)
    })
    .then(() => ctx.reply('Doet de bot vaag? Heb je een foutje gemaakt?\nJe kunt een chat met de bot altijd afbreken met het \'/cancel\' commando.'))
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
  btns.push(`Meedoen met een raid`)
  if (raids.length > 0) {
    btns.push(`Afmelden bij een raid`)
    btns.push(`Ik kom te laat voor een raid…`)
  }
  btns.push(`Een nieuwe raid melden`)
  btns.push(`Een raid wijzigen`)
  btns.push(`Vind een gymlocatie`)

  // group admins:
  let admins = await bot.telegram.getChatAdministrators(process.env.GROUP_ID)
  // or marked admin from database
  let dbAdmin = await models.User.find({
    where: {
      tId: {
        [Op.eq]: user.id
      },
      [Op.and]: {
        isAdmin: true
      }
    }
  })
  for (let a = 0; a < admins.length; a++) {
    if ((admins[a].user.id === user.id) || dbAdmin !== null) {
      btns.push(`Een gym toevoegen`)
      btns.push(`Een gym wijzigen`)
      btns.push(`Een raidboss toevoegen`)
      btns.push(`Een raidboss wijzigen`)
      break
    }
  }

  btns.push(`Notificaties van gyms of raidbosses`)
  btns.push(`Statistieken`)

  return ctx.replyWithMarkdown(`Hallo ${user.first_name}.\nWat wil je doen?`, Markup.keyboard(
    btns).oneTime().resize().extra())
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
    return ctx.replyWithMarkdown(`Ik help je graag verder als je via de Raid groep komt… 🤔`)
  }
})

// set cancel command here too, not only in wizards
bot.command('cancel', (ctx) => cancelConversation(ctx))
bot.hears('Meedoen met een raid', Stage.enter('join-raid-wizard'))
bot.hears('Afmelden bij een raid', Stage.enter('exit-raid-wizard'))
bot.hears('Een nieuwe raid melden', Stage.enter('add-raid-wizard'))
bot.hears('Een raid wijzigen', Stage.enter('edit-raid-wizard'))
bot.hears('Vind een gymlocatie', Stage.enter('find-gym-wizard'))
bot.hears('Een gym toevoegen', Stage.enter('add-gym-wizard'))
bot.hears('Een gym wijzigen', Stage.enter('edit-gym-wizard'))
bot.hears('Een raidboss toevoegen', Stage.enter('add-raidboss-wizard'))
bot.hears('Een raidboss wijzigen', Stage.enter('edit-raidboss-wizard'))
bot.hears('Statistieken', Stage.enter('stats-wizard'))
bot.hears('Notificaties van gyms of raidbosses', Stage.enter('notification-wizard'))
bot.hears('Ik kom te laat voor een raid…', Stage.enter('user-delayed-wizard'))

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
    console.log(`NIET OK, ik ken ${ctx.inlineQuery.from.id}, ${ctx.inlineQuery.from.first_name} niet`)
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
    return ctx.replyWithMarkdown(`Nee joh… doe dit vanuit de groep!`)
  }
  console.log('Iemand zei hi', moment().format('YYYY-MM-DD HH:mm:ss'), ctx.update.message.from, ctx.update.message.chat)
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
    bot.telegram.sendMessage(olduser.tId, `Dag ${ctx.from.first_name}!\n Wij kennen elkaar al 👍\nJe kunt mij aanspreken vanuit *${chattitle}* met \n*@${me.username} actie*`, {parse_mode: 'Markdown'})
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
      await bot.telegram.sendMessage(newuser.tId, `Dag ${ctx.from.first_name}!\n Je kunt mij vanaf nu aanspreken vanuit *${chattitle}* met *@${me.username} actie*`, {parse_mode: 'Markdown'})
    } catch (error) {
      console.log(`First time /hi for ${ctx.from.first_name}, ${ctx.from.id}`)
    }
  } else {
    return ctx.replyWithMarkdown(`Uhm… ik ken je niet, sorry. Meldt je bij mij aan in je groep met \n\n*/hi@${me.username}*\n\nDan stuur ik je instructies.`)
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
          [Op.gt]: moment().unix()
        }
      },
      order: [
        ['start1', 'ASC']
      ]
    }))
  let out = ''
  if (raids.length === 0) {
    ctx.reply('Geen raids gevonden…')
    return
  }
  for (let a = 0; a < raids.length; a++) {
    const endtime = moment(new Date(raids[a].endtime))
    out += `Tot: ${endtime.format('H:mm')} `
    out += `* ${raids[a].target}*\n`
    out += `${raids[a].Gym.gymname}\n`
    if (raids[a].Gym.googleMapsLink) {
      out += `[Kaart](${raids[a].Gym.googleMapsLink})\n`
    }
    const strtime = moment(raids[a].start1)
    out += `Start: ${strtime.format('H:mm')} `
    let userlist = ''
    let accounter = 0
    for (var b = 0; b < raids[a].Raidusers.length; b++) {
      accounter += raids[a].Raidusers[b].accounts
      userlist += `${raids[a].Raidusers[b].username} `
    }
    out += `Aantal: ${accounter}\n`
    out += `Deelnemers: ${userlist}`
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
