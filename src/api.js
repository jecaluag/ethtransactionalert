require('dotenv').config()
import Discord from 'discord.js'
import mongoose from 'mongoose'
import axios from 'axios'
import { diff } from 'fast-array-diff'

import client from './app'
import Wallet from './models/wallet'
import Transaction from './models/transaction'
import { MESSAGES, ALERTS_CHANNEL_ID, INTERVAL_TIME_MS } from './consts'

/**
 * Connect to mongodb
 */
const DB_URI = 'mongodb+srv://bot-owner:heisenberg23@cluster0.t2yap.mongodb.net/eth-transaction-alert?retryWrites=true&w=majority'
mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to the database.')
    // deleteAll()
    runScheduler()
  })
  .catch((err) => console.log(err))

/**
 * Ethplorer user api axios instance
 */
const apiEthplorer = axios.create({
  baseURL: 'https://api.ethplorer.io/',
  params: {
    apiKey: process.env.API_KEY
  }
});

/**
 * Ethplorer service api axios instance
 */
 const serviceEthplorer = axios.create({
  baseURL: 'https://ethplorer.io/service/'
});

/**
 * Delete data on wallet and transaction collection on db
 */
export async function deleteAll () {
  await Wallet.deleteMany({})
  await Transaction.deleteMany({})
}

/**
 * Delete data on transaction collection on db
 */
export async function deleteAllTransactions () {
  await Transaction.deleteMany({})
}

/**
 * Get address data from ethxplorer api
 */
export async function getAddressInfo (address) {
  try {
    const { data: addressInfo } = await apiEthplorer.get(`getAddressInfo/${address}`)
    
    return { success: true, addressInfo }
  } catch (error) {
    return { success: false, msg: MESSAGES.invAddress }
  } 
}

/**
 * Save wallet to db
 * @param {*} address 
 * @param {*} name 
 * @param {*} tokens 
 * @param {*} addedBy 
 * @returns 
 */
export async function saveWalletToDB (address, name, tokens, addedBy) {
  try {
    const wallet = new Wallet({
      address,
      name,
      tokens,
      addedBy
    })
    await wallet.save()
    
    return MESSAGES.succAddWallet
  } catch (error) {
    if (error.errors['address'].path === 'address' && error.errors['address'].kind === 'unique') {
      return MESSAGES.walletAlreadyExist
    }
    
    return MESSAGES.failAddWallet
  }
}

/**
 * Get all wallets from database
 * @returns 
 */
export async function getAllWallets () {
  try {
    const wallets = await Wallet.find()

    return { success: true, data: wallets }
  } catch (error) {
    console.log(error.message)
    return { success: false, data: null }
  }
}

/**
 * Get single wallets from database
 * @returns 
 */
 export async function getWallet (address) {
  try {
    const wallet = await Wallet.find({ address })

    return { success: true, data: wallet }
  } catch (error) {
    console.log(error.message)
    return { success: false, data: null }
  }
}

/**
 * Delete wallet from database
 * @param {*} address 
 * @returns 
 */
export async function deleteWallet (address) {
  try {
    const { data: wallet } = await getWallet(address)
    await Wallet.deleteOne({ address })
    const transactions = await getTransactionsFromDB(wallet[0]._id)
    await deleteTransactionsFromDB(transactions)

    return MESSAGES.succDelWallet
  } catch (error) {
    return MESSAGES.failDelWallet
  }
}

/**
 * Run scan wallet scheduler
 */
function runScheduler () {
  scanWalletAddresses()
  setInterval(function () {
    scanWalletAddresses()
  }, INTERVAL_TIME_MS)
}

/**
 * Scan all wallet address
 * @returns 
 */
async function scanWalletAddresses () {
  const { success, data: wallets } = await getAllWallets()
  if (success === false) return;
  for (const wallet of wallets) {
    await scanSingleWallet(wallet)
  }
} 

/**
 * Scan single wallet
 * @param {*} wallet 
 * @returns 
 */
async function scanSingleWallet (wallet) {
  const { address, name, _id } = wallet
  console.log('scanning wallet with address of', address)
  let apiTransactions = await getTransactionsFromApi(address)
  apiTransactions = apiTransactions.map(transaction => {
    transaction.walletId = _id.toString()

    return transaction
  })
  const dbTransactions = await getTransactionsFromDB(_id)
  if (dbTransactions.length === 0) return await saveTransactionsToDB(apiTransactions)
  const apiTransactionHashes = apiTransactions.map(transaction => transaction.transactionHash)
  const dbTransactionHashes = dbTransactions.map(transaction => transaction.transactionHash)
  const { added } = diff(dbTransactionHashes, apiTransactionHashes)
  if (added.length === 0) return;
  const newTransactions = []
  for (const tx of added) {
    const transaction = apiTransactions.find(apiTx => apiTx.transactionHash === tx)
    newTransactions.push(transaction)
  }
  const result = await deleteTransactionsFromDB(dbTransactions)
  if (result === false) return;
  await saveTransactionsToDB(apiTransactions)
  await createAlerts(address, name, newTransactions)
}

/**
 * Create and send alert message to the channel
 * @param {*} address 
 * @param {*} name 
 * @param {*} newTransactions 
 */
async function createAlerts (address, name, newTransactions) {
  for (const tx of newTransactions) {
    const txType = (address === tx.from) ? 'Outgoing' : 'Incoming'
    const { data: tokenInfo } = await apiEthplorer.get(`getTokenInfo/${tx.contract}`)
    const tokenName = `${tokenInfo.name} ($${tokenInfo.symbol})`
    const channel = client.channels.cache.get(ALERTS_CHANNEL_ID)
    const walletName = (name !== '') ? `(${name})` : ''
    const exampleEmbed = new Discord.MessageEmbed()
      .setColor('#00FF00')
      .setAuthor(
        `New transaction for wallet ${walletName} ${address}`, 
        'https://cdn0.iconfinder.com/data/icons/security-double-color-red-and-black-vol-1/52/alarm__alert__light__emergency-512.png'
      )
      .setTitle(`**${txType}** transaction for **${tokenName}**`)
      .setURL(`https://etherscan.io/tx/${tx.transactionHash}`)
      .addFields(
        { name: 'From:', value: `${tx.from}` },
        { name: 'To:', value: `${tx.to}` },
        { name: 'Tx:' ,value: `${tx.transactionHash}` }
      )
      .setTimestamp()
    channel.send('@everyone')
    channel.send(exampleEmbed)
  }
}

/**
 * Get transactions from api
 * @param {} address 
 * @returns 
 */
async function getTransactionsFromApi (address) {
  try {
    const { data } = await serviceEthplorer.get('service.php', {
      params: {
        data: address,
        showTx: 'all'
      }
    })
    
    return data.transfers
  } catch (error) {
    console.log(`[getTransactionsFromApi error]: ${error.message}`)
  }
}

/**
 * Get transaction from database
 * @param {*} id 
 * @returns 
 */
async function getTransactionsFromDB (id) {
  try {
    const transactions = await Transaction.find({ walletId: id })
    
    return transactions
  } catch (error) {
    console.log(`[getTransactionsFromDB error]: ${error.message}`)
  }
}

/**
 * Save transactions from database
 * @param {*} transactions
 * @returns 
 */
async function saveTransactionsToDB (transactions) {
  for (const apiTransaction of transactions) {
    try {
      const transaction = new Transaction({
        ...apiTransaction
      })
      await transaction.save()
    } catch (error) {
      console.log('save transaction error', error.message)
    }
  }
}

/**
 * Delete transactions from database
 * @param {*} transactions
 * @returns 
 */
async function deleteTransactionsFromDB (transactions) {
  const ids = transactions.map(transaction => transaction._id)
  try {
    await Transaction.deleteMany({_id: { $in: ids}})
    
    return true
  } catch (error) {
    console.log('delete transactions error', error.message)

    return false
  }
}

