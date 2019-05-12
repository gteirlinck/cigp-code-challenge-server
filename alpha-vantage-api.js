require('request');
const request = require('request-promise-native');

const CACHING_DURATION_MS = 15000; // Alpha Vantage API guidelines limit the number of requests to no more than 5 per minute

const latestQuotes = {};
const latestTimeSeries = {};

const activeQuoteRequests = {};
const activeTimeSeriesRequests = {};

function throttleTimeSeriesRequests(result, symbol) {
  if (
    result.Note &&
    result.Note.includes('Our standard API call frequency is 5 calls per minute and 500 calls per day')
  ) {
    console.log(`Throttle time series request for ${symbol} by 60 seconds`);
    activeTimeSeriesRequests[symbol] = Date.now() + 60000;
    return true;
  }

  return false;
}

async function loadLatestQuote(symbol) {
  if (activeQuoteRequests[symbol] && activeQuoteRequests[symbol] > Date.now() - CACHING_DURATION_MS) return;

  activeQuoteRequests[symbol] = Date.now();

  try {
    const result = await request({
      uri: process.env.ALPHA_VANTAGE_ENDPOINT,
      qs: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      }
    });

    if (!result) {
      activeQuoteRequests[symbol] = null;
      return;
    }

    const data = JSON.parse(result)['Global Quote'];

    if (!data) {
      activeQuoteRequests[symbol] = null;
      return;
    }

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

    if (!quote.symbol) {
      activeQuoteRequests[symbol] = null;
      return;
    }

    latestQuotes[symbol] = { quote, timestamp: Date.now() };
  } catch (error) {
    console.log(error);
  }

  activeQuoteRequests[symbol] = null;
}

getLatestQuote = async symbol => {
  if (!symbol) return null;

  if (!latestQuotes[symbol]) {
    console.log(`New quote request: ${symbol}`);
    await loadLatestQuote(symbol);
  } else if (latestQuotes[symbol].timestamp < Date.now() - CACHING_DURATION_MS) {
    console.log(`Quote ${symbol} is expired. Refreshing`);
    await loadLatestQuote(symbol);
  }

  if (latestQuotes[symbol]) {
    return { ...latestQuotes[symbol].quote, lastUpdated: new Date() };
  } else {
    return null;
  }
};

async function getDailyTimeSeries(symbol) {
  try {
    const result = await request({
      uri: process.env.ALPHA_VANTAGE_ENDPOINT,
      qs: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol.toUpperCase(),
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      }
    });

    if (!result || throttleTimeSeriesRequests(result, symbol)) return null;

    const json = JSON.parse(result);
    if (!json || !json['Time Series (Daily)']) return null;

    const backward = Object.entries(json['Time Series (Daily)']).map(kvp => {
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
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function getIntraDayTimeSeries(symbol) {
  try {
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

    if (!result || throttleTimeSeriesRequests(result, symbol)) return null;

    const json = JSON.parse(result);
    if (!json || !json['Time Series (1min)']) return null;

    const backward = Object.entries(json['Time Series (1min)']).map(kvp => {
      return {
        close: Number(kvp[1]['4. close']),
        timestamp: new Date(kvp[0] + '-0400'),
        high: Number(kvp[1]['2. high']),
        low: Number(kvp[1]['3. low']),
        open: Number(kvp[1]['1. open']),
        volume: Number(kvp[1]['5. volume'])
      };
    });

    backward.reverse();

    return backward;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function loadCombinedTimeSeries(symbol) {
  if (activeTimeSeriesRequests[symbol] && activeTimeSeriesRequests[symbol] > Date.now() - CACHING_DURATION_MS) return;

  activeTimeSeriesRequests[symbol] = Date.now();

  const dailyData = await getDailyTimeSeries(symbol);

  if (!dailyData) {
    activeTimeSeriesRequests[symbol] = null;
    return;
  }

  const intradayData = await getIntraDayTimeSeries(symbol);

  if (!intradayData) {
    activeTimeSeriesRequests[symbol] = null;
    return;
  }

  latestTimeSeries[symbol] = {
    series: dailyData.filter(i => i.timestamp < intradayData[0].timestamp).concat(intradayData),
    timestamp: Date.now()
  };

  activeTimeSeriesRequests[symbol] = null;
}

getLatestTimeSeries = async symbol => {
  if (!symbol) return null;

  if (!latestTimeSeries[symbol]) {
    console.log(`New time series request: ${symbol}`);
    await loadCombinedTimeSeries(symbol);
  } else if (latestTimeSeries[symbol].timestamp < Date.now() - CACHING_DURATION_MS) {
    console.log(`Time series ${symbol} is expired. Refreshing`);
    await loadCombinedTimeSeries(symbol);
  }

  return latestTimeSeries[symbol] ? latestTimeSeries[symbol].series : null;
};

module.exports = { getLatestQuote, getLatestTimeSeries };
