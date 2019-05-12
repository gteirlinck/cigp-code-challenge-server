const express = require('express');
const router = express.Router();
const alphaVantageAPI = require('../alpha-vantage-api');

router.get('/', async (req, res) => {
  const keyword = req.query['keyword'];

  if (!keyword) {
    res.statusCode = 400;
    res.send('Missing search keyword');
    return;
  }

  try {
    const result = await alphaVantageAPI.getSearchResult(keyword);

    if (result) {
      res.send(result);
    } else {
      res.statusCode = 404;
      res.send(`No result for '${keyword}'`);
    }
  } catch (error) {
    console.log(error);
    res.statusCode = 500;
    res.send(error);
  }
});

module.exports = router;
