import mongoose from 'mongoose'

const Schema = mongoose.Schema

const transactionSchema = new Schema({
  timestamp: Number,
  transactionHash: String,
  blockNumber: Number,
  contract: String,
  value: String,
  intValue: Number,
  type: String,
  isEth: Boolean,
  priority: Number,
  from: String,
  to: String,
  addresses: [ String ],
  usdPrice: Number,
  walletId: String,
  uuid: String
})

const Transaction = mongoose.model('Transaction', transactionSchema)

export default Transaction
