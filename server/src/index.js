require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure it.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(port, host, () => {
    console.log(`Solace API listening on http://${host}:${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => {
        void mongoose.disconnect().finally(() => process.exit(0));
      });
    });
  }
}

start().catch((error) => {
  console.error('Could not start Solace API:', error.message);
  process.exitCode = 1;
});
