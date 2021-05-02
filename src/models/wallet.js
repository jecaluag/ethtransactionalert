import mongoose from 'mongoose'

const Schema = mongoose.Schema

const walletSchema = new Schema({
  address: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  tokens: [
    {
      address: String,
      name: String,
      symbol: String,
      balance: Number
    }
  ],
  addedBy: {
    type: String,
    required: true
  },
}, { timestamps: true })

walletSchema.plugin(require('mongoose-beautiful-unique-validation'))

const Wallet = mongoose.model('Wallet', walletSchema)

export default Wallet
