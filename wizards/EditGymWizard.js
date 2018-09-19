// ===================
// Edit raid wizard
// ===================
const WizardScene = require('telegraf/scenes/wizard')
const {Markup} = require('telegraf')
var models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function EditGymWizard (bot) {
  return new WizardScene('edit-gym-wizard',
    // step 0
    async (ctx) => {
      return ctx.replyWithMarkdown(`We gaan de gym zoeken die je wilt wijzigen.\n*Voer een deel van de naam in, minimaal 2 tekens…*`)
        .then(() => ctx.wizard.next())
    },
    // step 1
    async (ctx) => {
      const term = ctx.update.message.text.trim()
      ctx.session.gymbtns = []
      if (term.length < 2) {
        return ctx.replyWithMarkdown(`Minimaal 2 tekens van de gymnaam…\n*Probeer het nog eens.* 🤨`)
          .then(() => ctx.wizard.back())
      } else {
        const candidates = await models.Gym.findAll({
          where: {
            gymname: {[Op.like]: '%' + term + '%'}
          }
        })
        if (candidates.length === 0) {
          return ctx.replyWithMarkdown(`Ik kon geen gym vinden met '${term === '/start help_fromgroup' ? '' : term}' in de naam…\n\n*Gebruik */start* als je nog een actie wilt uitvoeren. Of ga terug naar de groep.*`)
            .then(() => ctx.scene.leave())
        }
        ctx.session.gymcandidates = []
        for (let i = 0; i < candidates.length; i++) {
          ctx.session.gymcandidates.push({
            id: candidates[i].id,
            gymname: candidates[i].gymname,
            googleMapsLink: candidates[i].googleMapsLink,
            address: candidates[i].address,
            exRaidTrigger: candidates[i].exRaidTrigger
          })
          ctx.session.gymbtns.push(candidates[i].gymname)
        }
        ctx.session.gymbtns.push('Mijn gym staat er niet bij…')
        ctx.session.gymcandidates.push({gymname: 'Mijn gym staat er niet bij…', id: 0})
        return ctx.replyWithMarkdown('Kies een gym.', Markup.keyboard(ctx.session.gymbtns).resize().oneTime().extra())
          .then(() => ctx.wizard.next())
      }
    },
    // step 2
    async (ctx) => {
      let selectedIndex
      if (ctx.session.more !== true) {
        selectedIndex = ctx.session.gymcandidates.length - 1
        for (let i = 0; i < ctx.session.gymcandidates.length; i++) {
          if (ctx.session.gymcandidates[i].gymname === ctx.update.message.text) {
            selectedIndex = i
            break
          }
        }

        if (ctx.session.gymcandidates[selectedIndex].id === 0) {
          return ctx.replyWithMarkdown('Jammer! \n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
            .then(() => {
              ctx.session.gymcandidates = null
              ctx.session.gymbtns = null
              ctx.session.editgym = null
              ctx.session.more = null
              return ctx.scene.leave()
            })
        } else {
          // retrieve selected candidate from session
          let selectedgym = ctx.session.gymcandidates[selectedIndex]
          ctx.session.editgym = selectedgym
        }
      }
      ctx.session.changebtns = [
        [`Naam: ${ctx.session.editgym.gymname}`, 'gymname'],
        [`Google Maps link: ${ctx.session.editgym.googleMapsLink !== null ? ctx.session.editgym.googleMapsLink : 'Niets opgegegven'}`, 'googleMapsLink'],
        [`Adres: ${ctx.session.editgym.address !== null ? ctx.session.editgym.address : 'Niets opgegeven'}`, 'address'],
        [`Ex-Raid kans: ${ctx.session.editgym.exRaidTrigger === 1 || ctx.session.editgym.exRaidTrigger === true ? 'Ja' : 'Nee'}`, 'exRaidTrigger'],
        [`Ik wil toch niets wijzigen en niets bewaren…`, '0']
      ]
      return ctx.replyWithMarkdown(`*Wat wil je wijzigen?*`, Markup.keyboard(ctx.session.changebtns.map(el => el[0]))
        .resize()
        .oneTime()
        .extra())
        .then(() => ctx.wizard.next())
    },
    async (ctx) => {
      let editattr
      for(let i = 0; i < ctx.session.changebtns.length; i++) {
        if (ctx.session.changebtns[i][0] === ctx.update.message.text) {
          editattr = ctx.session.changebtns[i][1]
          break
        }
      }
      if (editattr === '0') {
        return ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard())
          .then(() => {
            ctx.session.gymcandidates = null
            ctx.session.editgym = null
            ctx.session.more = null
            return ctx.scene.leave()
          })
      } else {
        let question = ''
        switch (editattr) {
          case 'gymname':
            ctx.session.editattr = 'gymname'
            question = `*Geef een nieuwe naam:*`
            break
          case 'address':
            ctx.session.editattr = 'address'
            question = `*Geef een nieuw adres:*\nType 'x' om het adres te wissen`
            break
          case 'googleMapsLink':
            ctx.session.editattr = 'googleMapsLink'
            question = `*Geef een nieuwe googleMapsLink*\nType 'x' de link te wissen\n[Hulp bij het maken van een Google Maps link](https://dev.romeen.nl/pogo_googlemaps/)`
            break
          case 'exRaidTrigger':
            ctx.session.editattr = 'exRaidTrigger'
            question = `*Kan hier een ExRaid op vallen?*\nType *Ja* of *Nee*`
            break
          default:
            question = 'Sorry. Ik heb geen idee wat je wilt wijzigen\n*Klik op */start* om het nog eens te proberen. Of ga terug naar de groep.*'
            break
        }
        return ctx.replyWithMarkdown(question, Markup.removeKeyboard())
          .then(() => ctx.wizard.next())
      }
    },
    async (ctx) => {
      let key = ctx.session.editattr
      let value = ctx.update.message.text.trim()
      if (key === 'exRaidTrigger') {
        ctx.session.editgym.exRaidTrigger = value.toLowerCase() === 'ja' ? 1 : 0
      } else if (value.toLowerCase() === 'x') {
        ctx.session.editgym[key] = null
      } else {
        ctx.session.editgym[key] = value
      }
      let out = `Naam: ${ctx.session.editgym.gymname}\nAdres: ${ctx.session.editgym.address !== null ? ctx.session.editgym.address : 'Niet opgegeven'}\nGoogle maps link: ${ctx.session.editgym.googleMapsLink !== null ? ctx.session.editgym.googleMapsLink : 'Niet opgegeven'}\nEx-raid kanidaat: ${ctx.session.editgym.exRaidTrigger === 1 ? 'Ja' : 'Nee'}\n\n`

      ctx.session.savebtns = [
        'Opslaan en afsluiten',
        'Nog iets wijzigen aan deze gym',
        'Annuleren'
      ]
      return ctx.replyWithMarkdown(`Dit zijn nu de gym gegevens:\n\n${out}*Wat wil je nu doen?*`, Markup.keyboard(ctx.session.savebtns).resize().oneTime().extra())
        .then(() => ctx.wizard.next())
    },

    async (ctx) => {
      const choice = ctx.session.savebtns.indexOf(ctx.update.message.text.trim())
      switch (choice) {
        case 0:
          // save and exit
          try {
            await models.Gym.update(
              {
                gymname: ctx.session.editgym.gymname,
                address: ctx.session.editgym.address,
                googleMapsLink: ctx.session.editgym.googleMapsLink,
                exRaidTrigger: ctx.session.editgym.exRaidTrigger
              },
              {
                where: {
                  id: ctx.session.editgym.id
                }
              })
            return ctx.replyWithMarkdown('Dankjewel.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          } catch (error) {
            console.error(error)
            return ctx.replyWithMarkdown('Het bewaren van deze wijziging is mislukt\n*Je kunt het nog eens proberen met */start*. Of terug naar de groep gaan.*', Markup.removeKeyboard().extra())
              .then(() => ctx.scene.leave())
          }
        case 1:
          // more edits
          // set cursor to step 1 and trigger jump to step 1
          ctx.session.more = true
          return ctx.replyWithMarkdown(`OK, meer wijzigingen…`, Markup.removeKeyboard().extra())
            .then(() => ctx.wizard.selectStep(2))
            .then(() => ctx.wizard.steps[2](ctx))
        case 2:
          // Don't save and leave
          ctx.session.raidcandidates = null
          ctx.session.editgym = null
          ctx.session.savebtns = null
          return ctx.replyWithMarkdown('OK.\n*Je kunt nu weer terug naar de groep gaan. Wil je nog een actie uitvoeren? Klik dan hier op */start', Markup.removeKeyboard().extra())
            .then(() => ctx.scene.leave())
      }
      return ctx.replyWithMarkdown('OK', Markup.removeKeyboard().extra())
        .then(() => ctx.scene.leave())
    }
  )
}
module.exports = EditGymWizard
