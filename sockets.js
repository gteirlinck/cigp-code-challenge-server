const configureSockets = httpServer => {
  const io = require('socket.io')(httpServer);
  const alphaVantageAPI = require('./alpha-vantage-api');

  async function sendUpdates(socket, subscribedSymbol) {
    const quote = await alphaVantageAPI.getLatestQuote(subscribedSymbol);
    if (quote) {
      socket.emit('quoteUpdate', quote);
    }

    const timeSeries = await alphaVantageAPI.getLatestTimeSeries(subscribedSymbol);
    if (timeSeries) {
      socket.emit('timeSeriesUpdate', timeSeries);
    }
  }

  io.on('connection', socket => {
    let subscribedSymbol = null;

    setInterval(async () => {
      await sendUpdates(socket, subscribedSymbol);
    }, 15000);

    socket.on('subscribe', async symbol => {
      subscribedSymbol = symbol;
      await sendUpdates(socket, symbol);
      socket.emit('subscribed', `Received your subscription to ${symbol}`);
    });

    socket.on('unsubscribe', symbol => {
      subscribedSymbol = null;
      socket.emit('unsubscribed', `Received your unsubscription from ${symbol}`);
    });

    socket.on('switchSubscription', async symbols => {
      subscribedSymbol = symbols.to;
      await sendUpdates(socket, symbols.to);
      socket.emit('switchedSubscription', `Received your subscription switch from ${symbols.from} to ${symbols.to}`);
    });
  });
};

module.exports = configureSockets;
