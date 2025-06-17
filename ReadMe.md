# Pogo Telegram Bot

This project is based on [Telegraf](https://telegraf.js.org/).  
You will need to have some experience with Telegram bots; know how to initialize a bot with Botfather, set inline mode, etc.

How you run this bot in production is entirely up to you.  
You may want to setup SSL and run it with a webhook. BUT in most cases a simple long polling setup will do fine without the SSL hassle.  
There is a [Wiki](https://github.com/robverhoef/PoGoTelegramBot/wiki) page that explains how to run this bot from systemd (Linux) instead of nodemon. Using systemd is a more reliable way of automatically restarting your bot.

## So what does this bot thing do?

This bot will assist a Telegram (super)group to arrange Pokemon Go Raids. A raid requires multiple people at the same time and place. This bot offers an easy way to:

- report raids (location, target, time to start, time the raid will end)
- change raid properties
- find a gym location
- join a raid
- cancel raid participation
- show the users who will participate in a raid, including the total number of accounts
- statistics! Which gyms are raided most, which player report the most raids, etc.
- report Field Researches on stops, most of the time without typing
- add gyms or change gym properties (admins only)
- add or modify raidbosses (admins only)
- add, remove or modify Pokéstops (admins only)
- add, remove or modify predefined Field Research keys (admins only)
- set your preferred language by sending /lang to the bot

## Features

- Easy to use for end users; no more copying/pasting lists of raid users.
- Multilingual; comes with Dutch, Spanish and English out of the box
- Predefined gym locations with optional Google Maps link
- Predefined stop locations with Google Maps link
- Restricted to a specific Telegram supergroup (…might not be watertight yet)
- Starts as inline bot and moves users to a private chat to prevent littering the group
- Keeps track of the number of accounts per raid
- Allow multiple accounts per user (…a user might bring some extra friends to the raid)
- All users are known and linked which enables quick communication when a situation changes
- Only group admins can add or modify gyms and raidbosses
- Personal and group statistics (who is the most active player, the most reported gym, etc)
- Remotes raids are listed seperately
- Remote raids are limited to configurable amount of accounts
- Basic support for remote invites

## A few screenshots

![Report a raid](https://raw.githubusercontent.com/RobVerhoef/PoGoTelegramBot/master/bot_reportraid.png)
![A raid report](https://raw.githubusercontent.com/RobVerhoef/PoGoTelegramBot/master/bot_raid_report.png)

## Requirements

- Node v20+ (since we dumped nodemon, localtunnel / ngrok and webhooks to simplify usage a lot)
- MySQL or MariaDB (with InnoDB and utf8mb4 charset)

## ToDo

- Make timezones configurable, currently using Europe/Amsterdam

## Install

Clone this repository. Change your current directory to the project directory and run:

```sh
pnpm install
```

or

```sh
pnpm install
```

## Configure

Copy the example.env to .env
Edit your .env file

For production deployment config see below.

### Note on languages

If Dutch is not the standard language you should now modify migrations/20181222145311-useraddlanguage.js and set the locale (defaultLanguage: 'nl') to your language code **before running the migrations**.
You can also add your own language file to the locales folder.
Don't forget to modify your environment variables (DEFAULT_LOCALE and LOCALES) in locales.js when adding a language or changing your default language.

You will need the Telegram group ID. To obtain this ID;

- run the bot
- add the bot to a (super)group
- enter /whoisthebot @yourbotname
- Check the output in the terminal screen and look for the chat id. When using a supergroup it is likely to start with -100…

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

- **pnpm run dev** - uses nodemon.js and watches your sources.
- **pnpm run start** - uses forever.js. However; I recommend using [systemd](https://www.axllent.org/docs/view/nodejs-service-with-systemd/) on a Linux machine because it appears to be more reliable. In the past I've seen foreverjs failing to restart and -often-
  losing the reference to the process (showing a blank list after 'forever list' while the process was still running).
- **pnpm run eslint** - reports eslint errors
- **pnpm run eslintfix** - reports eslint errors and automagically fixes them wherever possible
- **pnpm run checklocales** - checks if all required keys exist in the YAML translation files

## Usage

Make sure that there is a group admin. Group admins are allowed to add / modify gyms.
There is also an isAdmin column in the users table. Setting this column to 1 (manually) will also grant admin privileges to a user.
The bot will detect addition and removal of users in a group. But all _existing_ users in a group will have to say:

> /hi@your_bot_name

from the Telegram group before they are allowed to use the bot. Obviously 'your_bot_name' should be replaced with YOUR real bot name.  
Frankly this is the only part that may be confusing to a few new bot users. But unfortunately it is necessary because the Telegram API has no way to verify the group ID from an inline query.  
The bot will respond with a private message to the user with instructions on how to address the bot. Note: not after the first /hi@your_bot_name, because of this Telegram limit; "Bots can't initiate conversations with users".

After the bot knows about the user, a conversation can be initiated from the group by typing

> @your_bot_name

The bot will then show a button that will take the user to a private chat.
The conversation stays private. The final output will be sent to the group.

Send /lang to the bot to change your language preference.

A user can stop any conversation with the bot by entering the **/cancel** command. This is the preferred method of stopping when something appears to go wrong.

## Production

When running in production (linux) you may want to use systemd. This is a clean, simple and solid solution without nodemon, pm2, npm, etc. Just use Node and systemd to run your masterpiece.
A systemd service can automagically restart without any dependencies when node crashes.  
Since Node V20 you can pass an env file to node with --env-file or - if you prefer - drop your entire env in the system file.  
You service file might look somewhat like this:

```console
[Unit]
Description=YOUR BOT SERVICE NAME
# Requires=After=mysql.service       # Requires the mysql service to run first
StartLimitBurst=5
StartLimitIntervalSec=2

[Service]
ExecStart=/usr/bin/node --env-file=/PATH/TO/YOUR.env /PATH/TO/YOUR/index.js
# Required on some systems
WorkingDirectory=/PATH/TO/YOUR/BOT/ROOT/
Restart=always
 # Restart service after 1 second if node service crashes
 RestartSec=1
 # Output to syslog
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=YOUR_BOT_NAME_FOR_LOGS
User=rob
Group=www-data
Environment=NODE_ENV=production
Environment=PORT=3300
Environment=TZ='Europe/Amsterdam'
Environment=BOT_TOKEN=YOUR_BOT_TOKEN
Environment=BOT_USERNAME=YOUR_BOT_TG_USERNAME
Environment=GROUP_ID=YOUR_CHATGROUP_ID
Environment=THRESHOLD_REMOTE_USERS=10

[Install]
WantedBy=multi-user.target

```
