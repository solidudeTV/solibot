const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { textToSpeech } = require('./voice');

module.exports.start = (port = 8222) => {
  const app = express();

  app.use(bodyParser.json());

  // CORS
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  app.get('/chat', (req, res) => {
    const {
      text,
    } = req.body;
    res.end(JSON.stringify({ allChat }));
    console.log('Handled request');
  });

  app.delete('/chat/:id', (req, res) => {
    const {
      id,
    } = req.params;

    // TODO: Fix this once I am done moving.
    // _.remove(allChat, c => c.messageId === id);
    res.sendStatus(200);

    console.log(`Deleted chat ${id}`);
  });

  app.post('/tts', (req, res) => {
    console.error(req.body);
    const {
      text,
    } = req.body;

    textToSpeech(text);
    res.sendStatus(200);
  });

  app.listen(port);
  return app;
};
