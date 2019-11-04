const chatbot = require('./chatbot');
const db = require('./db');
const httpserv = require('./httpserv');

chatbot.connect();

db.getAllChat();

httpserv.start();
