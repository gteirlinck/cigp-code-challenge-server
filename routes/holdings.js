const express = require('express');
const router = express.Router();
const HoldingModel = require('../models/holding');
const jwtCheck = require('../jwt-check');

function readUserID(req, res) {
  const userID = req.user.sub;

  if (!userID) {
    sendError(res, 'Missing body', 400);
  }

  return userID;
}

function sendError(res, error, statusCode = 500) {
  res.statusCode = statusCode;
  res.send(error);
}

router.get('/:symbol', jwtCheck, async (req, res) => {
  const userID = readUserID(req, res);
  if (!userID) return;

  const symbol = req.params['symbol'];

  try {
    const holding = await HoldingModel.findOne({ userID, symbol });
    res.send(holding);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/', jwtCheck, async (req, res) => {
  const userID = readUserID(req, res);
  if (!userID) return;

  try {
    const holdings = await HoldingModel.find({ userID });
    res.send(holdings);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/', jwtCheck, async (req, res) => {
  const userID = readUserID(req, res);
  if (!userID) return;

  const holdingToCreate = req.body;

  if (!holdingToCreate) {
    sendError(res, 'Missing body', 400);
    return;
  }

  try {
    const holding = new HoldingModel({
      userID,
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

router.put('/:symbol', jwtCheck, async (req, res) => {
  const userID = readUserID(req, res);
  if (!userID) return;

  const symbol = req.params['symbol'];
  const holdingToUpdate = req.body;

  if (!holdingToUpdate) {
    sendError(res, 'Missing body', 400);
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
