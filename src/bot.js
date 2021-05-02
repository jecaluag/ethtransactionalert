require('dotenv').config()
import { Client } from 'discord.js'

import { handleChannelMessage, handleAddWallet } from './utils'

/**
 * Client instance
 */
const client = new Client();

/**
 * Client Init
 */
client.on('ready', () => {
  console.log(`${client.user.tag} is now listening for new transactions!`)
  // handleAddWallet('0x42f96260274982366be8b1832daf1c20c970b6d2')
})

client.on('message', (message) => {
  handleChannelMessage(message)
})

/**
 * Client init Login
 */
client.login(process.env.DISCORDJS_BOT_TOKEN) 


export default client