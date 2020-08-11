// ===================
// join raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const moment = require('moment-timezone')
const { Markup } = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')
const escapeMarkDown = require('../util/escapeMarkDown')

moment.tz.setDefault('Europe/Amsterdam')
var UserSettingsWizard = function (bot) {
  const steps = {
    start: 0,
    language: 2,
    friendcode: 4,
    pokemonname: 6,
    finish: 8
  }
  return new WizardScene('user-settings-wizard',
    // step 0
    async (ctx) => {
      await setLocale(ctx)
      const user = ctx.from
      const dbuser = await models.User.findOne({
        where: {
          tId: {
            [Op.eq]: user.id
          }
        }
      })
      if (!dbuser) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_something_wrong_finding_user')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      ctx.session.userId = dbuser.id
      if (ctx.session.usersettings === undefined) {
        const dbuser = models.User.findOne({
          where: {
            tId: user.id
          }
        })
        if (dbuser) {
          ctx.session.usersettings = {
            locale: dbuser.locale,
            pokemonname: dbuser.pokemonname,
            friendcode: dbuser.friendcode
          }
        } else {
          ctx.replyWithMarkdown(`*${'Ik kan je niet vinden* 🤷🏼‍♂️\nGebruik /start om iets anders te doen.'}`)
        }
      }
      ctx.session.settingbtns = [
        `${ctx.i18n.t('btn_usersettings_friend_code')}`,
        `${ctx.i18n.t('btn_usersettings_pokemon_naam')}`,
        `${ctx.i18n.t('btn_usersettings_language')}`
      ]
      ctx.replyWithMarkdown(`*${ctx.i18n.t('usersettings_welcome', { first_name: escapeMarkDown(user.first_name) })}*`, Markup.keyboard(ctx.session.settingbtns)
        .oneTime()
        .resize()
        .extra())
        .then(() => ctx.wizard.next())
    },
    // handle choice and jump
    // step 1
    async (ctx) => {
      const msg = ctx.update.message.text.trim()
      switch (msg) {
        case ctx.session.settingbtns[0]:
          ctx.wizard.selectStep(steps.friendcode)
          return ctx.wizard.steps[steps.friendcode](ctx)
        case ctx.session.settingbtns[1]:
          ctx.wizard.selectStep(steps.pokemonname)
          return ctx.wizard.steps[steps.pokemonname](ctx)
        case ctx.session.settingbtns[2]:
          ctx.wizard.selectStep(steps.language)
          return ctx.wizard.steps[steps.language](ctx)
      }
    },
    // ask for new lang
    // step 2
    async (ctx) => {
      const locales = JSON.parse(process.env.LOCALES)
      ctx.session.localebuttons = locales.map(locale => locale[1])
      console.log('LOCALES', ctx.session.localebuttons)
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('usersettings_language_question')}*`, Markup.keyboard(ctx.session.localebuttons)
        .oneTime()
        .resize()
        .extra())
        .then(() => ctx.wizard.next())
    },
    // store lang, finish?
    // step 3
    async (ctx) => {
      const l = ctx.update.message.text.trim()
      const locales = JSON.parse(process.env.LOCALES)
      const selectedlang = locales.filter(loc => loc[1] === l)
      if (selectedlang) {
        ctx.session.usersettings.locale = selectedlang[0][0]
      }
      ctx.wizard.selectStep(steps.finish)
      return ctx.wizard.steps[steps.finish](ctx)
    },

    // friend code
    // step 4
    async (ctx) => {
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('usersettings_friendcode_question')}*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },

    // store friend code
    // step 5
    async (ctx) => {
      let code = ctx.update.message.text.trim()
      if (code.length < 12 && code.toLowerCase() !== 'x') {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('usersettings_wrong_friendcode')}`)
          .then(() => {
            ctx.wizard.selectStep(steps.friendcode)
            return ctx.wizard.steps[steps.friendcode](ctx)
          })
      }
      if (code.length === 12) {
        // friendly format the code… ?
        code = code.substr(0, 4) + ' ' + code.substr(4, 4) + ' ' + code.substr(8)
      }
      ctx.session.usersettings.friendcode = code.toLowerCase() === 'x' ? null : code
      ctx.wizard.selectStep(steps.finish)
      return ctx.wizard.steps[steps.finish](ctx)
    },

    // pokemon name
    // step 6
    async (ctx) => {
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('usersetings_pokemon_name_question')}*`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },

    // store pokemon name
    // step 7
    async (ctx) => {
      const pokemonname = ctx.update.message.text.trim()
      ctx.session.usersettings.pokemonname = pokemonname.toLowerCase() === 'x' ? null : pokemonname
      ctx.wizard.selectStep(steps.finish)
      return ctx.wizard.steps[steps.finish](ctx)
    },

    // finish?
    // step 8
    async (ctx) => {
      ctx.session.finishbuttons = [
        ctx.i18n.t('edit_gym_btn_save_close'),
        ctx.i18n.t('btn_usersettings_edit_more')
      ]
      return ctx.replyWithMarkdown(`*${ctx.i18n.t('btn_edit_more_or_finish')}*`
        , Markup.keyboard(ctx.session.finishbuttons)
          .oneTime()
          .resize()
          .extra())
        .then(() => ctx.wizard.next())
    },

    // handle finish
    // step 9
    async (ctx) => {
      const msg = ctx.update.message.text.trim()
      switch (msg) {
        // save and quit
        case ctx.i18n.t('edit_gym_btn_save_close'):
          console.log('STORE', ctx.session.usersettings)
          try {
            await models.User.update(
              {
                locale: ctx.session.usersettings.locale,
                pokemonname: ctx.session.usersettings.pokemonname,
                friendcode: ctx.session.usersettings.friendcode
              },
              {
                where: { id: ctx.session.userId }
              }
            )
          } catch (error) {
            return ctx.replyWithMarkdown(ctx.i18n.t('problem_while_saving'), Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`*${ctx.i18n.t('finished_procedure')}*`, Markup.removeKeyboard())
            .then(() => ctx.scene.leave())
        // more editing…
        case ctx.i18n.t('btn_usersettings_edit_more'):
          ctx.wizard.selectStep(steps.start)
          return ctx.wizard.steps[steps.start](ctx)
      }
    }
  )
}

module.exports = UserSettingsWizard
