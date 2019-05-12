const express = require('express');
const router = express.Router();
require('request');
const alphaVantageAPI = require('../alpha-vantage-api');

router.get('/:symbol/latest', async (req, res) => {
  const symbol = req.params['symbol'];

  const quote = await alphaVantageAPI.getLatestQuote(symbol);
  if (quote) {
    res.send(quote);
  } else {
    res.statusCode = 404;
    res.send(`No quote available for ${symbol}`);
  }
});

router.get('/:symbol/series', async (req, res) => {
  const symbol = req.params['symbol'];

  const timeSeries = await alphaVantageAPI.getLatestTimeSeries(symbol);
  if (timeSeries) {
    res.send(timeSeries);
  } else {
    res.statusCode = 404;
    res.send(`No time series available for ${symbol}`);
  }
});

module.exports = router;
