# Pogo Telegram Bot

This project is based on [Telegraf](https://telegraf.js.org/).  
You will need to have some experience with Telegram bots; know how to initialize a bot with Botfather, set inline mode, etc.  

How you run this bot is entirely up to you. This version does run behind a SSL enabled proxy or, for example, [ngrok](https://ngrok.com) out of the box. But for a real standalone version additional code will be required to handle SSL certificates since this bot is using a [Webhook](https://core.telegram.org/bots/api#getting-updates).
There is a [Wiki](https://github.com/robverhoef/PoGoTelegramBot/wiki) page that explains how to run this bot from systemd (Linux) instead of forever.js. Using systemd is a more reliable way of automatically restarting your bot.

## So what does this bot thing do?
This bot will assist a Telegram (super)group to arrange Pokemon Go Raids. A raid requires multiple people at the same time and place. This bot offers an easy way to:

* report raids (location, target, time to start, time the raid will end)
* change raid properties
* find a gym location
* join a raid
* cancel raid participation
* show the users who will participate in a raid, including the total number of accounts 
* statistics! Which gyms are raided most, which player report the most raids, etc.
* report Field Researches on stops, most of the time without typing
* add gyms or change gym properties (admins only)
* add or modify raidbosses (admins only)
* add, remove or modify Pokéstops (admins only)
* add, remove or modify predefined Field Research keys (admins only)
* set your preferred language by sending /lang to the bot

## Features

* Easy to use for end users; no more copying/pasting lists of raid users.
* Multilingual; comes with Dutch, Spanish and English out of the box
* Predefined gym locations with optional Google Maps link
* Predefined stop locations with Google Maps link
* Restricted to a specific Telegram supergroup (…might not be watertight yet)
* Starts as inline bot and moves users to a private chat to prevent littering the group 
* Keeps track of the number of accounts per raid
* Allow multiple accounts per user (…a user might bring some extra friends to the raid)
* All users are known and linked which enables quick communication when a situation changes
* Only group admins can add or modify gyms and raidbosses
* Personal and group statistics (who is the most active player, the most reported gym, etc)

## A few screenshots
![Report a raid](https://raw.githubusercontent.com/RobVerhoef/PoGoTelegramBot/master/bot_reportraid.png)
![A raid report](https://raw.githubusercontent.com/RobVerhoef/PoGoTelegramBot/master/bot_raid_report.png)

## Requirements

* Node v8 or 9
* MySQL or MariaDB (with InnoDB and utf8mb4 charset)

## ToDo

* Make timezones configurable, currently using Europe/Amsterdam

## Install

Clone this repository. Change your current directory to the project directory and run: 
```sh 
yarn install
``` 
or 
```sh 
npm install
```

## Configure

Copy the example.env to .env  
Edit your .env file  

### Note on languages
If Dutch is not the standard language you should now modify migrations/20181222145311-useraddlanguage.js and set the locale (defaultLanguage: 'nl') to your language code **before running the migrations**.
You can also add your own language file to the locales folder. 
Don't forget to modify your environment variables (DEFAULT_LOCALE and LOCALES) in locales.js when adding a language or changing your default language.

You will need the Telegram group ID. To obtain this ID; 

* run the bot
* add the bot to a (super)group
* enter /whoisthebot @yourbotname
* Check the output in the terminal screen and look for the chat id. When using a supergroup it is likely to start with -100…
* Configure ngrok to listen to the port your bot is running on

Copy the config/config_example.env to config/config.json.  
Edit config/config.json to set your database settings.

Run from the project directory: 
```sh
./node_modules/.bin/sequelize db:migrate
```
To seed the list of raid bosses: 
```sh
./node_modules/.bin/sequelize db:seed:all
```
## Available commands

* **npm run dev** - uses forever.js and watches your sources. Tip: runs great with ngrok!
* **npm run start** - uses forever.js. However; I recommend using [systemd](https://www.axllent.org/docs/view/nodejs-service-with-systemd/) on a Linux machine because it appears to be more reliable. In the past I've seen foreverjs failing to restart and -often-
 losing the reference to the process (showing a blank list after 'forever list' while the process was still running).
* **npm run eslint**  - reports eslint errors
* **npm run eslintfix** - reports eslint errors and automagically fixes them wherever possible
* **npm run checklocales** - checks if all required keys exist in the YAML translation files
## Usage

Make sure that there is a group admin. Group admins are allowed to add / modify gyms. 
There is also an isAdmin column in the users table. Setting this column to 1 (manually) will also grant admin privileges to a user. 
The bot will detect addition and removal of users in a group. But all *existing* users in a group will have to say:	  
>/hi@your_bot_name  

from the Telegram group before they are allowed to use the bot. Obviously 'your_bot_name' should be replaced with YOUR real bot name.  
Frankly this is the only part that may be confusing to a few new bot users. But unfortunately it is necessary because the Telegram API has no way to verify the group ID from an inline query.  
The bot will respond with a private message to the user with instructions on how to address the bot. Note: not after the first /hi@your_bot_name, because of this Telegram limit; "Bots can't initiate conversations with users".

After the bot knows about the user, a conversation can be initiated from the group by typing
> @your_bot_name

The bot will then show a button that will take the user to a private chat.
The conversation stays private. The final output will be sent to the group.

Send /lang to the bot to change your language preference.

A user can stop any conversation with the bot by entering the **/cancel** command. This is the preferred method of stopping when something appears to go wrong.
