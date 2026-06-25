  const express = require('express');
  const sql = require('mssql');
  const path = require('path'); 
  require('dotenv').config();

  const app = express();

  const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: true,
      trustServerCertificate: true
    },
    requestTimeout: 60000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };


  sql.connect(dbConfig)
    .then(() => console.log('Conexión SQL OK'))
    .catch(err => console.error('Error SQL:', err));

  app.use(express.json());

  app.use(express.static(path.join(__dirname, 'public')));

  
  const minutesRouter = require('./routes/minutes');
  app.use('/minutes', minutesRouter);

  const licensesRouter = require('./routes/licenses');
  app.use('/licenses', licensesRouter);
  
  const ivrRouter = require('./routes/ivr');
  app.use('/ivr', ivrRouter);



  module.exports = app;
