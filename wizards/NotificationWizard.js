// ===================
// add gym wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
var models = require('../models')
const { Markup } = require('telegraf')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const setLocale = require('../util/setLocale')

var NotificationWizard = function () {
  return new WizardScene('notification-wizard',
    // step 0
    async (ctx) => {
      await setLocale(ctx)
      const user = ctx.from
      let dbuser = await models.User.findOne({
        where: {
          tId: {
            [Op.eq]: user.id
          }
        }
      })
      if (!dbuser) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_something_wrong_finding_user')}`, Markup.removeKeyboard().extra())
          .then(() => ctx.scene.leave())
      }

      ctx.session.userId = dbuser.id
      ctx.session.notificatiesbtns = [`${ctx.i18n.t('noti_gyms')}`, `${ctx.i18n.t('noti_raidbosses')}`]

      return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_which_notification')}`, Markup.keyboard(ctx.session.notificatiesbtns)
        .oneTime()
        .resize()
        .extra())
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      ctx.session.chosenNotificatie = ctx.session.notificatiesbtns.indexOf(ctx.update.message.text)
      ctx.session.chosenGymNotification = ctx.session.chosenNotificatie === 0
      ctx.session.chosenNotificationString = ctx.session.chosenGymNotification ? 'gyms' : 'raidbosses'
      ctx.session.chosenNotificationSingleString = ctx.session.chosenGymNotification ? 'gym' : 'raidboss'

      if (ctx.session.chosenNotificatie === -1) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('something_wrong')}`, Markup.removeKeyboard().extra())
      }

      let existingNotifications = []
      if (ctx.session.chosenGymNotification) {
        existingNotifications = await models.GymNotification.findAll({
          include: [
            models.Gym
          ],
          where: {
            userId: {
              [Op.eq]: ctx.session.userId
            }
          }
        })
        console.log(existingNotifications.length)
      } else {
        existingNotifications = await models.RaidbossNotification.findAll({
          include: [
            models.Raidboss
          ],
          where: {
            userId: {
              [Op.eq]: ctx.session.userId
            }
          }
        })
      }

      let message = ''
      for (let existingNotification of existingNotifications) {
        message += `\n- ${ctx.session.chosenGymNotification ? existingNotification.Gym.gymname : existingNotification.Raidboss.name}`
      }

      if (message === '') {
        message = `\n${ctx.i18n.t('noti_nothing_set')}`
      }
      message += '\n'

      return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_current_notifications', {
        noti_string: ctx.session.chosenNotificationString,
        message: message,
        noti_single_string: ctx.session.chosenNotificationSingleString
      })}`, Markup.removeKeyboard())
        .then(() => ctx.wizard.next())
    },
    // step 2
    async (ctx) => {
      // console.log('step 1', ctx.update.message.text)
      const term = ctx.update.message.text.trim()
      if (term.length < 2) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_min_2_chars')}`)
      } else {
        let candidates = []
        if (ctx.session.chosenGymNotification) {
          candidates = await models.Gym.findAll({
            where: {
              gymname: { [Op.like]: '%' + term + '%' }
            }
          })
        } else {
          candidates = await models.Raidboss.findAll({
            where: {
              name: { [Op.like]: '%' + term + '%' }
            }
          })
        }
        if (candidates.length === 0) {
          return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_subject_not_found', {
            noti_string: ctx.session.chosenNotificationString,
            term: term
          })}`)
        }
        ctx.session.candidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.candidates.push([
            ctx.session.chosenGymNotification ? candidates[i].gymname.trim() : candidates[i].name.trim(),
            candidates[i].id
          ])
        }
        ctx.session.candidates.push([
          `${ctx.i18n.t('noti_subject_not_listed', {
            noti_single_string: ctx.session.chosenNotificationSingleString
          })}`, 0
        ])
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_select_subject', {
          noti_single_string: ctx.session.chosenNotificationSingleString
        })}.`, Markup.keyboard(ctx.session.candidates.map(el => el[0])).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 3
    async (ctx) => {
      let selectedIndex = -1
      for (var i = 0; i < ctx.session.candidates.length; i++) {
        if (ctx.session.candidates[i][0] === ctx.update.message.text) {
          selectedIndex = i
          break
        }
      }
      // Catch gym not found errors…
      if (selectedIndex === -1) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_select_something_wrong', {
          noti_single_string: ctx.session.chosenNotificationSingleString
        })}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }
      // User can't find the gym/raidboss
      if (ctx.session.candidates[selectedIndex][1] === 0) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('retry_or_cancel')}`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.back())
      } else {
        // retrieve selected candidate from session
        let selectedCandidate = ctx.session.candidates[selectedIndex]
        ctx.session.selected = selectedCandidate
        let existingNotification
        if (ctx.session.chosenGymNotification) {
          existingNotification = await models.GymNotification.findOne({
            where: {
              userId: {
                [Op.eq]: ctx.session.userId
              },
              gymId: {
                [Op.eq]: selectedCandidate[1]
              }
            }
          })
        } else {
          existingNotification = await models.RaidbossNotification.findOne({
            where: {
              userId: {
                [Op.eq]: ctx.session.userId
              },
              raidbossId: {
                [Op.eq]: selectedCandidate[1]
              }
            }
          })
        }
        let message = `${ctx.i18n.t('noti_want_notification', {
          selected_candidate: selectedCandidate[0]
        })}`
        if (existingNotification) {
          ctx.session.existingNotificationId = existingNotification.id
          message = `${ctx.i18n.t('noti_turn_off', {
            selected_candidate: selectedCandidate[0]
          })}`
        } else {
          ctx.session.existingNotificationId = null
        }

        return ctx.replyWithMarkdown(message, Markup.keyboard([ctx.i18n.t('yes'), ctx.i18n.t('no')]).oneTime().resize().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 3
    async (ctx) => {
      if (ctx.update.message.text === ctx.i18n.t('no')) {
        return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_no_save')}`, Markup.removeKeyboard().extra())
          .then(() => {
            ctx.session = {}
            return ctx.scene.leave()
          })
      }

      let selected = ctx.session.selected
      let userId = ctx.session.userId

      // save new
      if (!ctx.session.existingNotificationId) {
        if (ctx.session.chosenGymNotification) {
          let gymNotification = models.GymNotification.build({
            gymId: selected[1],
            userId: userId
          })
          try {
            await gymNotification.save()
          } catch (error) {
            console.log('Woops… registering gymNotification failed', error)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('problem_while_saving')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_gym_finished', {
            selected: selected[0]
          })}`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        } else {
          let raidbossNotification = models.RaidbossNotification.build({
            raidbossId: selected[1],
            userId: userId
          })
          try {
            await raidbossNotification.save()
          } catch (error) {
            console.log('Woops… registering raidbossNotification failed', error)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('problem_while_saving')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_raidboss_finished', {
            selected: selected[0]
          })}`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      } else {
        // remove old
        if (ctx.session.chosenGymNotification) {
          try {
            await models.GymNotification.destroy({
              where: {
                id: {
                  [Op.eq]: ctx.session.existingNotificationId
                }
              }
            })
          } catch (error) {
            console.log('Woops… deleting gymNotification failed', error)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('problem_while_saving')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_finished_gym_removal', {
            selected: selected[0]
          })}`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        } else {
          try {
            await models.RaidbossNotification.destroy({
              where: {
                id: {
                  [Op.eq]: ctx.session.existingNotificationId
                }
              }
            })
          } catch (error) {
            console.log('Woops… deleting raidbossNotification failed', error)
            return ctx.replyWithMarkdown(`${ctx.i18n.t('problem_while_saving')}`, Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
          return ctx.replyWithMarkdown(`${ctx.i18n.t('noti_finished_raidboss_removal', {
            selected: selected[0]
          })}`, Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
        }
      }
    }
  )
}

module.exports = NotificationWizard
