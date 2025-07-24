const { createServer } = require('https');
const next = require('next');
const fs = require('fs');
const express = require('express');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem'),
};

app.prepare().then(() => {
  const server = express();

  // Correct: handle all methods and all routes with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  createServer(httpsOptions, server).listen(3001, (err) => {
    if (err) throw err;
    console.log('✅ Ready on https://localhost:3001');
  });
});
