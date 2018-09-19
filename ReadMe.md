# Pogo Telegram Bot

Please note: *Early Work In Progress*

This project is based on [Telegraf](https://telegraf.js.org/).  
You will need to have some experience with Telegram bots; know how to initialize a bot with Botfather, set inline mode, etc.  
Although it is being used in the wild; there are no guarantees this will work for you, yet. Your mileage may vary…

How you run this bot is entirely up to you. This version does run behind a SSL enabled proxy or, for example, [ngrok](https://ngrok.com) out of the box. But for a real standalone version additional code will be required to handle SSL certificates since this bot is using a [Webhook](https://core.telegram.org/bots/api#getting-updates).

## So what does this bot thing do?
This bot will assist a Telegram (super)group to arrange Pokemon Go Raids. A raid requires multiple people at the same time and place. This bot offers an easy way to:

* report raids (location, target, time to start, time the raid will end)
* change raid properties
* find a gym location
* join a raid
* cancel raid participation
* show the users who will participate in a raid, including the total number of accounts 
* add gyms (admins only)
* change gym properties (admins only)

## Features

* Easy to use for end users; no more copy/pasting lists of raid users.
* Predefined gym locations with optional Google Maps link
* Restricted to a specific Telegram supergroup (…might not be watertight yet)
* Starts as inline bot and moves users to a private chat to prevent littering the group 
* Keeps track of the number of accounts per raid
* Allow multiple accounts per user (…a user might bring some extra friends to the raid)
* All users are known and linked which enables quick communication when a situation changes
* Only group admins can add or modify gyms


## Requirements

* Node v8 or 9
* MySQL or MariaDB

## ToDo

* I18n; it is currently Dutch only
* Enable multiple raid start times for bigger groups
* Admins can remove gyms
* Sessions will be persistent (db). Sessions are now in memory (not good for graceful restarts)
* Code clean-up, add some more inline documentation
* Add code tests
* ?

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
You will need the Telegram group ID. To obtain this ID; 

* run the bot
* add the bot to a (super)group
* enter /whoisthebot @yourbotname
* Check the output in the terminal screen and look for the chat id. When using a supergroup it is likely to start with -100…

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

## Usage

Make sure that there is a group admin. Only group admins are allowed to add / modify gyms.  
The bot will detect addition and removal of users in a group. But all *existing* users in a group will have to say:	  
>/hi@your_bot_name  

from the Telegram group before they are allowed to use the bot. Obviously 'your_bot_name' should be replaced with YOUR real bot name.  
Frankly this is the only part that may be confusing to a few new bot users. But unfortunately it is necessary because the Telegram API has no way to verify the group ID from an inline query.  
The bot will respond with a private message to the user with instructions on how to address the bot. Note: not after the first /hi@your_bot_name, because of this Telegram limit; "Bots can't initiate conversations with users".

After the bot knows about the user, a conversation can be initiated from the group by typing
> @your_bot_name

The bot will then show a button that will take the user to a private chat.
The conversation stays private. The final output will be sent to the group.

A user can stop any conversation with the bot by entering the **/cancel** command. This is the preferred method of stopping when something appears to go wrong.
