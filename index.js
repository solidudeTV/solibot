const tmi = require('tmi.js');
const request = require('superagent');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { textToSpeech } = require('./voice');

const opts = {
  identity: {
    username: 'solibot',
    password: process.env.TWITCH_TOKEN,
  },
  channels: [
    '#solidudetv',
  ],
};

const tmiClient = new tmi.client(opts);
tmiClient.on('message', onMessageHandler);
tmiClient.connect();

const allChat = [];

const commands = {
  '!repo': `All code repos can be found at github.com/solidudeTV`,
  '!social': `Follow solidude on twitter at twitter.com/solidudeTV`
};

function onMessageHandler(target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  const messageContent = msg.trim();

  const commandResponse = commands[messageContent];
  if (commandResponse) {
    tmiClient.say(target, commandResponse);
  } else {
    const fullChatMessage = {
      userName: context.username,
      messageContent: messageContent,
    };

    allChat.push(fullChatMessage);
  }

  return;
}

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', '*');
	res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  next();
});

app.get('/chat', (req, res) => {
  res.end(JSON.stringify({ allChat }));
  console.log('Handled request');
});

app.post('/tts', (req, res) => {
  const {
    text,
  } = req.body;

  textToSpeech(text);
  res.sendStatus(200);
});

app.listen(8222);
