require('dotenv').config()
import Discord from 'discord.js'
import mongoose from 'mongoose'
import axios from 'axios'
import { diff } from 'fast-array-diff'

import client from './bot'
import Wallet from './models/wallet'
import Transaction from './models/transaction'
import { MESSAGES, ALERTS_CHANNEL_ID, INTERVAL_TIME_MS } from './consts'

const apiTransactions = [
  {
    addresses: [],
    _id: '',
    timestamp: 1619795705,
    transactionHash: '0x6586f7a89da817f15f2a0ddfe845415a78e8ccace1c20cdb03f89c327f36f115',
    blockNumber: 12342588,
    contract: '0x6b175474e89094c44da98b954eedeac495271d0f',
    value: '2209195836251829420151',
    intValue: 2.2091958362518294e+21,
    type: 'transfer',
    isEth: false,
    priority: 40,
    from: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    to: '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11',
    usdPrice: 0.99994678944404,
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd77302345fe3f7',
    timestamp: 1619807135,
    transactionHash: '0xca8209926fcf11887b8caa074569aca3b7e7a147c7551e5c0db86b27f6374f75',
    blockNumber: 12343426,
    from: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    to: '0x8df42a9117f6ddee4b182ae474a2f6e338a9d55a',
    contract: 'ETH',
    value: '1',
    intValue: 1,
    type: 'transfer',
    isEth: true,
    usdPrice: 2763.1076769087963,
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3f7',
    timestamp: 1619806421,
    transactionHash: '0x11d8580d0613a58889089fb771eede9ca129f5b438e573888e78335917261878',
    blockNumber: 12343370,
    contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: '3200000000',
    intValue: 3200000000,
    type: 'transfer',
    isEth: false,
    priority: 37,
    from: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    to: '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc',
    usdPrice: 0.9999348328506,
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3f8',
    timestamp: 1619798990,
    transactionHash: '0x7ccd5a0b1363254aa63ce96e6519c7625e1c045e03fb6f0a30564192392ac6f5',
    blockNumber: 12342829,
    contract: '0x6b175474e89094c44da98b954eedeac495271d0f',
    value: '2355679349641969984557',
    intValue: 2.35567934964197e+21,
    type: 'transfer',
    isEth: false,
    priority: 16,
    from: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    to: '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11',
    usdPrice: 1.00004099130146,
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3f9',
    timestamp: 1619798990,
    transactionHash: '0x7ccd5a0b1363254aa63ce96e6519c7625e1c045e03fb6f0a30564192392ac6f5',
    blockNumber: 12342829,
    contract: '0xf65b5c5104c4fafd4b709d9d60a185eae063276c',
    value: '10000000000000000000000',
    intValue: 1e+22,
    type: 'transfer',
    isEth: false,
    priority: 20,
    from: '0x80b4d4e9d88d9f78198c56c5a27f3bacb9a685c5',
    to: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3fa',
    timestamp: 1619797847,
    transactionHash: '0x78c9f2caeb7284fb8effe8f58d5f310965331286c410035d776c6a36d33e9c06',
    blockNumber: 12342732,
    contract: '0x6b175474e89094c44da98b954eedeac495271d0f',
    value: '2274153383924171788783',
    intValue: 2.2741533839241718e+21,
    type: 'transfer',
    isEth: false,
    priority: 18,
    from: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    to: '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11',
    usdPrice: 1.00056826510996,
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3fb',
    timestamp: 1619797847,
    transactionHash: '0x78c9f2caeb7284fb8effe8f58d5f310965331286c410035d776c6a36d33e9c06',
    blockNumber: 12342732,
    contract: '0xf65b5c5104c4fafd4b709d9d60a185eae063276c',
    value: '10000000000000000000000',
    intValue: 1e+22,
    type: 'transfer',
    isEth: false,
    priority: 22,
    from: '0x80b4d4e9d88d9f78198c56c5a27f3bacb9a685c5',
    to: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3fc',
    timestamp: 1619796187,
    transactionHash: '0xb84ede6a97908eab0fd0940ec022d476c58cccfd6a9c786530ca36b78c386094',
    blockNumber: 12342627,
    contract: '0x6b175474e89094c44da98b954eedeac495271d0f',
    value: '2123983220397428936763',
    intValue: 2.123983220397429e+21,
    type: 'transfer',
    isEth: false,
    priority: 17,
    from: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    to: '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11',
    usdPrice: 1.00054399800174,
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '608d23080fd773075c5fe3fd',
    timestamp: 1619796187,
    transactionHash: '0xb84ede6a97908eab0fd0940ec022d476c58cccfd6a9c786530ca36b78c386094',
    blockNumber: 12342627,
    contract: '0xf65b5c5104c4fafd4b709d9d60a185eae063276c',
    value: '10000000000000000000000',
    intValue: 1e+22,
    type: 'transfer',
    isEth: false,
    priority: 21,
    from: '0x80b4d4e9d88d9f78198c56c5a27f3bacb9a685c5',
    to: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  },
  {
    addresses: [],
    _id: '',
    timestamp: 1619795705,
    transactionHash: '0xe46318871b86e978ec56d3b2268dbe7a2de22d32ecb0b17b3dfbecfe2d0767fb',
    blockNumber: 12342588,
    contract: '0xf65b5c5104c4fafd4b709d9d60a185eae063276c',
    value: '10000000000000000000000',
    intValue: 1e+22,
    type: 'transfer',
    isEth: false,
    priority: 44,
    from: '0x80b4d4e9d88d9f78198c56c5a27f3bacb9a685c5',
    to: '0x1e898058a3404b9cb4a1ebe0190c45bf84226ce6',
    walletId: '6087f76dea1c090a94021912',
    __v: 0
  }
]

// const apiTransactionHashes = [
//   '0xb6c354c5a1edba35922d9556f9196de238d1484f89332fc6405f69895f79ec44',
//   '0xd1361991da71a7db2318e63f9376661912efe1baaf0ef606b2c2a87738dc2eca',
//   '0x57d964142cd9f199df8c5f73f641c62928772eec4e0bd4241d471945c289a263',
//   '0xacd4bc798c0dcf387cf98090c588f3982bb3cdd1b42990cad530daff8fbd06ae',
//   '0x6586f7a89da817f15f2a0ddfe845415a78e8ccace1c20cdb03f89c327f36f115',
//   '0x6eb27b0be4c23afb725dccf8788b814614ae235895d08705b50860b7dbac8a7b',
//   '0x6eb27b0be4c23afb725dccf8788b814614ae235895d08705b50860b7dbac8a7b',
//   '0x356945d490e2558e0951a8e98e95d858ac00595b6d8595df0710a0a2d8833fa2',
//   '0x356945d490e2558e0951a8e98e95d858ac00595b6d8595df0710a0a2d8833fa2',
//   '0x9e295a5ac1818cc1d9ebe38c5a1f6cee7ad8ca2eb1db5455215a3375a6b19786'
// ]
// const dbTransactionHashes = [
//   '0xd1361991da71a7db2318e63f9376661912efe1baaf0ef606b2c2a87738dc2eca',
//   '0x57d964142cd9f199df8c5f73f641c62928772eec4e0bd4241d471945c289a263',
//   '0xacd4bc798c0dcf387cf98090c588f3982bb3cdd1b42990cad530daff8fbd06ae',
//   '0x6586f7a89da817f15f2a0ddfe845415a78e8ccace1c20cdb03f89c327f36f115',
//   '0x6eb27b0be4c23afb725dccf8788b814614ae235895d08705b50860b7dbac8a7b',
//   '0x6eb27b0be4c23afb725dccf8788b814614ae235895d08705b50860b7dbac8a7b',
//   '0x356945d490e2558e0951a8e98e95d858ac00595b6d8595df0710a0a2d8833fa2',
//   '0x356945d490e2558e0951a8e98e95d858ac00595b6d8595df0710a0a2d8833fa2',
//   '0x9e295a5ac1818cc1d9ebe38c5a1f6cee7ad8ca2eb1db5455215a3375a6b19786',
//   '0x9e295a5ac1818cc1d9ebe38c5a1f6cee7ad8ca2eb1db5455215a3375a6b19786'
// ]


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

export async function deleteAll () {
  await Wallet.deleteMany({})
  await Transaction.deleteMany({})
}

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

function runScheduler () {
  scanWalletAddresses()
}

async function scanWalletAddresses () {
  const { success, data: wallets } = await getAllWallets()
  if (success === false) return;
  await scanSingleWallet(wallets[0])
  // for (const wallet of wallets) {
  //   await scanSingleWallet(wallet)
  // }
} 

async function scanSingleWallet (wallet) {
  const { address, name, _id } = wallet
  // let apiTransactions = await getTransactionsFromApi(address)
  // apiTransactions = apiTransactions.map(transaction => {
  //   transaction.walletId = _id.toString()

  //   return transaction
  // })
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
  // const result = await deleteTransactionsFromDB(dbTransactions)
  // if (result === false) return;
  // await saveTransactionsToDB(apiTransactions)
  await createAlerts(address, name, newTransactions)
}

async function createAlerts (address, name, newTransactions) {
  for (const tx of newTransactions) {
    console.log({ address, name, newTransactions })
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

async function getTransactionsFromDB (id) {
  try {
    const transactions = await Transaction.find({ walletId: id })
    
    return transactions
  } catch (error) {
    console.log(`[getTransactionsFromDB error]: ${error.message}`)
  }
}


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

