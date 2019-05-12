const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');

require('dotenv').config();

mongoose.set('useFindAndModify', false);
mongoose.connect(process.env.DB_CONNECTION_STRING, { useNewUrlParser: true });
const db = mongoose.connection;

db.once('open', () => console.log('Connected to MongoDB'));

const app = express();

app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const searchSymbolRouter = require('./routes/search-symbol');
app.use('/api/search-symbol', searchSymbolRouter);

const dataRouter = require('./routes/data');
app.use('/api/data', dataRouter);

const holdingsRouter = require('./routes/holdings');
app.use('/api/holdings', holdingsRouter);

const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

module.exports = app;
