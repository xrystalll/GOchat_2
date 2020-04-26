# GOchat 2
![GOchat 2](/gochat2_screen.png)

## Features
- Real-time messages
- Users online counter
- Typing indicator
- Uploading user avatar
- Uploading and sending images and other files from device
- Sending images by url from internet
- Catching links in text
- Link preview
- Deletion self messages
- Clearing all messages via command with password
- Quote messages
- Sending videos by url from internet
- Browser notifications
- Voice messages

## Install
clone repo via git
`git clone https://github.com/xrystalll/GOchat_2.git`

or download
https://github.com/xrystalll/GOchat_2/archive/master.zip

go to project path
`cd GOchat_2`

install dependencies
`npm install`

create cluster on https://mongodb.com and change url on config file

(if you don't want to use the mongoDB cloud database then you need to install it on your computer or server. More information at https://mongodb.com)

## Run
`npm run dev` via nodemon

or

`npm start`

and open in browser https://localhost:3000

## Others
**Config file description**

- port - Default port for server
- localdb (true/false) - If the flag is 'true', then is used local database. Default 'false' - cloud DB
- mongolocal - Url of local DB
- mongoremote - Url of cloud DB
- maxsize - Max size of uploaded user files
- password - Password for clearing all messages via command `/clear <PASSWORD>`