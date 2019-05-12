const express = require('express');
const router = express.Router();
const HoldingModel = require('../models/holding');

function sendError(res, error, statusCode = 500) {
  res.statusCode = statusCode;
  res.send(error);
}

router.get('/:userID/:symbol', async (req, res, next) => {
  const userID = req.params['userID'];
  const symbol = req.params['symbol'];

  try {
    const holding = await HoldingModel.findOne({ userID, symbol });
    res.send(holding);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/:userID', async (req, res) => {
  const userID = req.params['userID'];

  try {
    const holdings = await HoldingModel.find({ userID });
    res.send(holdings);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/', async (req, res) => {
  const holdingToCreate = req.body;

  if (!holdingToCreate) {
    sendError(res, 'Missing body', 400);
    return;
  }

  try {
    const holding = new HoldingModel({
      userID: holdingToCreate.userID,
      symbol: holdingToCreate.symbol,
      transactions: holdingToCreate.transactions
    });

    await holding.save();

    res.statusCode = 201;
    res.send({});
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/:userID/:symbol', async (req, res) => {
  const userID = req.params['userID'];
  const symbol = req.params['symbol'];
  const holdingToUpdate = req.body;

  if (!holdingToUpdate) {
    sendError(res, 'Missing body', 400);
    return;
  }

  try {
    await HoldingModel.findOneAndUpdate({ userID, symbol }, { transactions: holdingToUpdate.transactions });
    res.statusCode = 202;
    res.send({}); // Need to send an empty body as this is expected by the frontend Angular HTTP client (even though it doesn't correspond to HTTP protocol specs)
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
