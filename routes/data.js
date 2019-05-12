const express = require('express');
const router = express.Router();
require('request');
const request = require('request-promise-native');

// const CACHING_DURATION_MS = 15000; // Alpha Vantage API guidelines limit the number of requests to no more than 5 per minute
const CACHING_DURATION_MS = 3600000; // For testing only. Remove

const latestQuotes = {};

async function loadLatestQuote(symbol) {
  try {
    const result = await request({
      uri: process.env.ALPHA_VANTAGE_ENDPOINT,
      qs: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      }
    });

    if (!result) return;

    const data = JSON.parse(result)['Global Quote'];

    if (!data) return;

    const quote = {
      symbol: data['01. symbol'],
      open: Number(data['02. open']),
      high: Number(data['03. high']),
      low: Number(data['04. low']),
      close: Number(data['05. price']),
      volume: Number(data['06. volume']),
      latestTradingDay: new Date(data['07. latest trading day']),
      previousClose: Number(data['08. previous close']),
      change: Number(data['09. change']),
      changePercent: Number(data['10. change percent'].replace('%', '')) / 100
    };

    if (!quote.symbol) return;

    latestQuotes[symbol] = { quote, timestamp: Date.now() };
  } catch (error) {
    console.log(error);
  }
}

router.get('/:symbol/latest', async (req, res, next) => {
  const symbol = req.params['symbol'];

  if (!symbol) {
    res.statusCode = 400;
    res.send('Missing symbol');
    return;
  }

  if (!latestQuotes[symbol]) {
    console.log(`New quote request: ${symbol}`);
    await loadLatestQuote(symbol);
  } else if (
    latestQuotes[symbol].timestamp <
    Date.now() - CACHING_DURATION_MS
  ) {
    console.log(`Quote ${symbol} is expired. Refreshing`);
    latestQuotes[symbol] = undefined;
    await loadLatestQuote(symbol);
  }

  if (latestQuotes[symbol]) {
    res.send(latestQuotes[symbol].quote);
  } else {
    res.statusCode = 500;
    res.send(error);
  }
});

async function getDailyTimeSeries(symbol) {
  const result = await request({
    uri: process.env.ALPHA_VANTAGE_ENDPOINT,
    qs: {
      function: 'TIME_SERIES_DAILY',
      symbol: symbol.toUpperCase(),
      apikey: process.env.ALPHA_VANTAGE_API_KEY
    }
  });

  const backward = Object.entries(
    JSON.parse(result)['Time Series (Daily)']
  ).map(kvp => {
    return {
      close: Number(kvp[1]['4. close']),
      timestamp: new Date(kvp[0] + ' 16:00:00-0400'),
      high: Number(kvp[1]['2. high']),
      low: Number(kvp[1]['3. low']),
      open: Number(kvp[1]['1. open']),
      volume: Number(kvp[1]['5. volume'])
    };
  });

  backward.reverse();

  return backward;
}

async function getIntraDayTimeSeries(symbol) {
  const result = await request({
    uri: process.env.ALPHA_VANTAGE_ENDPOINT,
    qs: {
      function: 'TIME_SERIES_INTRADAY',
      symbol: symbol.toUpperCase(),
      apikey: process.env.ALPHA_VANTAGE_API_KEY,
      interval: '1min',
      outputsize: 'full'
    }
  });

  const backward = Object.entries(JSON.parse(result)['Time Series (1min)']).map(
    kvp => {
      return {
        close: Number(kvp[1]['4. close']),
        timestamp: new Date(kvp[0] + '-0400'),
        high: Number(kvp[1]['2. high']),
        low: Number(kvp[1]['3. low']),
        open: Number(kvp[1]['1. open']),
        volume: Number(kvp[1]['5. volume'])
      };
    }
  );

  backward.reverse();

  return backward;
}

router.get('/:symbol/series', async (req, res, next) => {
  const symbol = req.params['symbol'];

  if (!symbol) {
    res.statusCode = 400;
    res.send('Missing symbol');
    return;
  }

  try {
    const dailyData = await getDailyTimeSeries(symbol);

    const intradayData = await getIntraDayTimeSeries(symbol);

    res.send(
      dailyData
        .filter(i => i.timestamp < intradayData[0].timestamp)
        .concat(intradayData)
    );
  } catch (error) {
    console.log(error);
    res.statusCode = 500;
    res.send(error);
  }
});

module.exports = router;
