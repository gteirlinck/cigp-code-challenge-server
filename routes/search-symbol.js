const express = require('express');
const router = express.Router();
require('request');
const request = require('request-promise-native');

router.get('/', async (req, res, next) => {
  const keyword = req.query['keyword'];

  if (!keyword) {
    res.statusCode = 400;
    res.send('Missing search keyword');
    return;
  }

  try {
    const result = await request({
      uri: process.env.ALPHA_VANTAGE_ENDPOINT,
      qs: {
        function: 'SYMBOL_SEARCH',
        keywords: keyword,
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      }
    });

    const data = JSON.parse(result);

    res.send(
      data['bestMatches'].map(m => {
        return {
          symbol: m['1. symbol'],
          name: m['2. name'],
          type: m['3. type']
        };
      })
    );
  } catch (error) {
    console.log(error);
    res.statusCode = res.send(error);
  }
});

module.exports = router;
