require('dotenv').config()
import Discord from 'discord.js'
import mongoose from 'mongoose'
import axios from 'axios'
import { diff } from 'fast-array-diff'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

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
    // setTimeout(() => testCreateAlert(), 1000)
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
    transaction.uuid = uuidv4()

    return transaction
  })
  const dbTransactions = await getTransactionsFromDB(_id)
  if (dbTransactions.length === 0) return await saveTransactionsToDB(apiTransactions)
  const { added } = diff(dbTransactions, apiTransactions, compareTransactions)
  if (added.length === 0) return;
  console.log('new transaction(s) found on address: ', address)
  const newTransactions = [ ...added ]
  const result = await deleteTransactionsFromDB(dbTransactions)
  if (result === false) return;
  await saveTransactionsToDB(apiTransactions)
  await createAlerts(address, name, newTransactions)
}

/**
 * Fast array diff compare method
 * @param {*} dbTransactions 
 * @param {*} apiTransactions 
 * @returns 
 */
function compareTransactions (dbTransactions, apiTransactions) {
  return (
    dbTransactions.transactionHash === apiTransactions.transactionHash
  )
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
    const walletName = (name !== '') ? `named (${name}):` : ':'
    const date = moment.unix(tx.timestamp).format('MMMM Do YYYY, h:mm:ss a')
    const exampleEmbed = new Discord.MessageEmbed()
      .setColor('#00FF00')
      .setAuthor(
        `New transaction for wallet ${walletName} ${address}`, 
        'https://cdn0.iconfinder.com/data/icons/security-double-color-red-and-black-vol-1/52/alarm__alert__light__emergency-512.png'
      )
      .setTitle(`**${txType}** transaction for **${tokenName}**`)
      .addFields(
        { name: 'From:', value: `[${tx.from}](https://etherscan.io/address/${tx.from})`, inline: true },
        { name: 'When:', value: `${date}`, inline: true },
        { name: 'To:', value: `[${tx.to}](https://etherscan.io/address/${tx.to})` },
        { name: 'Tx:' ,value: `[${tx.transactionHash}](https://etherscan.io/tx/${tx.transactionHash})` }
      )
      .setTimestamp()
    channel.send('@everyone')
    channel.send(exampleEmbed)
  }
}

/**
 * Test method for create alert message
 * @param {*} address 
 * @param {*} name 
 */
function testCreateAlert (address = '0x8c3ea8cee69ce1fdae664cc68beea5ee8f773f82', name = 'Balor') {
  const txType = 'Outgoing'
  const tokenName = `Dai ($DAI)`
  const channel = client.channels.cache.get(ALERTS_CHANNEL_ID)
  const walletName = (name !== '') ? `named (${name}):` : ':'
  const timestamp = moment.unix(1619927668).format('MMMM Do YYYY, h:mm:ss a')
  const from = '0x8c3ea8cee69ce1fdae664cc68beea5ee8f773f82'
  const exampleEmbed = new Discord.MessageEmbed()
    .setColor('#00FF00')
    .setAuthor(
      `New transaction for wallet ${walletName} ${address}`, 
      'https://cdn0.iconfinder.com/data/icons/security-double-color-red-and-black-vol-1/52/alarm__alert__light__emergency-512.png'
    )
    .setTitle(`**${txType}** transaction for **${tokenName}**`)
    // .setURL(`https://etherscan.io/tx/0xe67565ec78f8446414aab20e959fb859ad89981492fbbb13696cb1d674434d74`)
    .addFields(
      { name: 'From:', value: `[${from}](https://etherscan.io/address/${from})`, inline: true },
      { name: 'When:', value: `${timestamp}`, inline: true },
      { name: 'To:', value: `0x1b067b25f6c9293361b0352b233cbfbd2ae7a676` },
      { name: 'Tx:' ,value: `0xe67565ec78f8446414aab20e959fb859ad89981492fbbb13696cb1d674434d74` }
    )
    .setTimestamp()
    channel.send('@everyone')
    channel.send(exampleEmbed)
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

