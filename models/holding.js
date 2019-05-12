const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: Number,
  quantity: Number,
  price: Number
});

const holdingSchema = new mongoose.Schema({
  userID: String,
  symbol: String,
  transactions: [transactionSchema]
});

module.exports = mongoose.model('Holding', holdingSchema);
