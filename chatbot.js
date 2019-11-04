const tmi = require('tmi.js');
const _ = require('lodash');
const db = require('./db');

const messages = {
  waiting: [],
  pending: [],
};

const sourceName = 'ttv';

const tmiClient = new tmi.client({
  identity: {
    username: 'solibot',
    password: process.env.TWITCH_TOKEN,
  },
  connections: {
    reconnect: true,
    secure: true,
  },
  channels: [
    '#solidudetv',
  ],
});

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
      _raw: {
        target,
        context,
        msg,
      },
      source: sourceName,
      id: `${sourceName}:${context.id}`,
      message: {
        id: context.id,
        content: messageContent,
      },
      user: {
        id: context['user-id'],
        name: context.username,
      },
    };

    logMessage(fullChatMessage);
  }

  return;
}

function logMessage(message) {
  messages.waiting.push(message);
  syncMessages();
}

let syncPromise = null;
async function syncMessages() {
  if (syncPromise) {
    return;
  }

  if (messages.waiting.length) {
    messages.pending = [...messages.pending, ...messages.waiting];
    messages.waiting = [];
  }

  if (messages.pending.length) {
    syncPromise = db.createChatMessages(messages.pending);
    const result = await syncPromise;
    if (result) {
      messages.pending = [];
    }
    syncPromise = null;
    syncMessages();
  }
}

module.exports.connect = () => {
  tmiClient.connect();
  tmiClient.on('message', onMessageHandler);
};
