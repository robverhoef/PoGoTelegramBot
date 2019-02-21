// ===================
// admin field research  wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const { Markup } = require('telegraf')
const models = require('../models')
// const Sequelize = require('sequelize')
// const Op = Sequelize.Op
const adminCheck = require('../util/adminCheck')

function AdminFieldResearchWizard (bot) {
  const wizsteps = {
    mainmenu: 0,
    editresearch: 3,
    addresearch: 6,
    deleteresearch: 9,
    doneresearch: 11
  }
  return new WizardScene('admin-field-research-wizard',
    // Step 0
    // Gym name
    // async (ctx) => {

    // handle mainmenu input
    async (ctx) => {
      const invalidAdmin = await adminCheck(ctx, bot)
      if (invalidAdmin !== false) {
        return invalidAdmin
      }
      const keys = await models.Fieldresearchkey.findAll({
        order: [['label', 'ASC']]
      })
      ctx.session.frbtns = [{ id: 0, label: 'Field Research toevoegen…' }]
      for (let key of keys) {
        ctx.session.frbtns.push({ id: parseInt(key.id), label: key.label })
      }
      ctx.session.frbtns.push({ id: -1, label: 'Klaar!' })
      const btnlabels = ctx.session.frbtns.map(el => el.label)
      return ctx.replyWithMarkdown(`*Field Researches aanpassen*\r\nHier vind je een [lijst met Field Researches en beloningen ↗️](https://thesilphroad.com/research-tasks)`, Markup.keyboard(btnlabels).oneTime().resize().extra({ disable_web_page_preview: true })
      )
        .then(() => {
          return ctx.wizard.next()
        })
    },
    async (ctx) => {
      const input = ctx.update.message.text
      ctx.session.selectedbtn = {}
      for (let btn of ctx.session.frbtns) {
        if (btn.label === input) {
          ctx.session.selectedbtn = btn
          break
        }
      }
      if (ctx.session.selectedbtn.id === 0) {
        // jump to addition…
        ctx.wizard.selectStep(wizsteps.addresearch)
        return ctx.wizard.steps[wizsteps.addresearch](ctx)
      } else if (ctx.session.selectedbtn.id === -1) {
        ctx.wizard.selectStep(wizsteps.doneresearch)
        return ctx.wizard.steps[wizsteps.doneresearch](ctx)
      }
      return ctx.replyWithMarkdown(`Wat wil je doen met “${ctx.session.selectedbtn.label}”`, Markup.keyboard(['Wijzigen', 'Verwijderen']).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      const input = ctx.update.message.text
      if (input === 'Wijzigen') {
        ctx.wizard.selectStep(wizsteps.editresearch)
        return ctx.wizard.steps[wizsteps.editresearch](ctx)
      } else if (input === 'Verwijderen') {
        ctx.wizard.selectStep(wizsteps.deleteresearch)
        return ctx.wizard.steps[wizsteps.deleteresearch](ctx)
      }
    },
    // edit research
    async (ctx) => {
      return ctx.replyWithMarkdown(`Geef de nieuwe tekst voor “${ctx.session.selectedbtn.label}”`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      ctx.session.newtext = ctx.update.message.text
      return ctx.replyWithMarkdown(`“${ctx.session.newtext}” opslaan?`, Markup.keyboard(['Ja', 'Nee']).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      switch (ctx.update.message.text) {
        case 'Ja':
          console.log(`Research Key ${ctx.session.selectedbtn.label} gewijzigd door ${ctx.from.id} ${ctx.from.first_name}`)
          try {
            await models.Fieldresearchkey.update(
              {
                label: ctx.session.newtext
              },
              {
                returning: true,
                where: {
                  id: ctx.session.selectedbtn.id
                }
              })
          } catch (error) {
            return ctx.replyWithMarkdown(`Mmm… opslaan is mislukt!, ${error.message}`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }
          return ctx.replyWithMarkdown(`Opgeslagen!`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
        case 'Nee':
          return ctx.replyWithMarkdown(`OK, niet opgeslagen.`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
      }
    },
    // add research
    async (ctx) => {
      return ctx.replyWithMarkdown(`*Geef de tekst van de nieuwe knop*`, Markup.removeKeyboard().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      ctx.session.newbtn = ctx.update.message.text
      return ctx.replyWithMarkdown(`'${ctx.session.newbtn}'\r\nOpslaan?`, Markup.keyboard(['Ja', 'Nee']).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      switch (ctx.update.message.text) {
        case 'Ja':
          const newKey = models.Fieldresearchkey.build({
            label: ctx.session.newbtn
          })
          console.log(`Research Key ${ctx.session.newbtn} gemaakt door ${ctx.from.id} ${ctx.from.first_name}`)
          try {
            newKey.save()
          } catch (error) {
            console.log('Error adding field rearch key', error)
            ctx.replyWithMarkdown('Niet opeslagen')
            return ctx.replyWithMarkdown(`Opslaan mislukt!`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }
          return ctx.replyWithMarkdown('Nieuwe Field Research optie opgeslagen!')
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
        case 'Nee':
          return ctx.replyWithMarkdown(`OK, niet opgeslagen`)
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
      }
    },
    // delete
    async (ctx) => {
      return ctx.replyWithMarkdown(`Weet je zeker dat je '${ctx.session.selectedbtn.label}' wilt verwijderen`, Markup.keyboard(['Ja', 'Nee']).oneTime().resize().extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      // delete if yes
      switch (ctx.update.message.text) {
        case 'Ja':
          console.log(`Research Key ${ctx.session.selectedbtn.label} verwijderd door ${ctx.from.id} ${ctx.from.first_name}`)
          try {
            models.Fieldresearchkey.destroy({
              where: {
                id: ctx.session.selectedbtn.id
              }
            })
          } catch (error) {
            return ctx.replyWithMarkdown(`Verwijderen is mislukt...\r\n${error.message}`)
              .then(() => {
                ctx.wizard.selectStep(wizsteps.mainmenu)
                return ctx.wizard.steps[wizsteps.mainmenu](ctx)
              })
          }
          return ctx.replyWithMarkdown('OK, verwijderd...')
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
        case 'Nee':
          return ctx.replyWithMarkdown('OK, *niet* verwijderd.')
            .then(() => {
              ctx.wizard.selectStep(wizsteps.mainmenu)
              return ctx.wizard.steps[wizsteps.mainmenu](ctx)
            })
      }
    },
    // done
    async (ctx) => {
      return ctx.replyWithMarkdown(`OK, gebruik /start enzo als je nog iets wilt doen.`, Markup.removeKeyboard().extra)
        .then(() => {
          return ctx.scene.leave()
        })
    }
  )
}
module.exports = AdminFieldResearchWizard
