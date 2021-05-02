import { CHANNEL_NAME, ROLES, PREFIX, COMMANDS, ADD_WALLET, DEL_WALLET } from './consts'
import { getAddressInfo, saveWalletToDB, getAllWallets, deleteWallet } from './api'
import { MESSAGES } from './consts'

/**
 * Checks if message is in the correct channel name
 * @param {*} message 
 * @returns 
 */
function checkIfCorrectChannel (message) {
  return (message.channel.name === CHANNEL_NAME)
}

/**
 * Check the role of the message sender
 * @param {*} message 
 * @returns 
 */
function checkRole (message) {
  return (message.member.roles.cache.find(role => ROLES.includes(role.name)))
}

/**
 * Handle command message
 * @param {*} message 
 * @returns 
 */
function handleCommands (message) {
  if (message.content.startsWith(PREFIX)) {
    const cmnds = getCommandsFromMessage(message)
    for (const command of cmnds) {
      if (COMMANDS.includes(command.name) === false) return message.reply(MESSAGES.invCommand)
      if (command.name === ADD_WALLET) {
        if (command.value === undefined || command.value.length === 0) return message.reply(MESSAGES.noWallet)
        const name = (cmnds.find(cmd => cmd.name === 'name') !== undefined)
          ? (cmnds.find(cmd => cmd.name === 'name').value !== undefined)
            ? cmnds.find(cmd => cmd.name === 'name').value : ''
          : ''
        handleAddWallet(command.value, name, message)
      } else if (command.name === DEL_WALLET) {
        if (command.value === undefined || command.value.length === 0) return message.reply(MESSAGES.noWallet)
        handleDeleteWallet(command.value, message)
      }
    }
  }
}

/**
 * Get commands from message
 * @param {*} message 
 * @returns 
 */
function getCommandsFromMessage(message) {
  const msgCommands = message.content
    .trim()
    .split('$')
    .slice(1)

  const commands = []
  for (let i = 0; msgCommands.length > i; i++) {
    const [CMD_NAME, ...args] = msgCommands[i]
      .trim()
      .split(/\s+/)

    commands.push({ 
      name: CMD_NAME,
      value: args[0] 
    })
  }

  return commands
}

/**
 * Handle add wallet
 * @param {*} message 
 */
export async function handleAddWallet (address, name, message) {
  const { success, addressInfo, msg } = await getAddressInfo(address)
  if (success === false) return message.reply(msg)
  const tokens = addressInfo.tokens.map((token) => (
    {
      address: token.tokenInfo.address,
      name: token.tokenInfo.name,
      symbol: token.tokenInfo.symbol,
      balance: token.balance
    }
  ))
  const saveMsg = await saveWalletToDB(address, name, tokens, message.author.tag)

  return message.reply(saveMsg)
}

/**
 * Handle delete wallet
 * @param {*} address 
 * @param {*} message 
 * @returns 
 */
async function handleDeleteWallet (address, message) {
  const { success, data } = await getAllWallets()
  if (success === false) return message.reply(MESSAGES.errorGetWallets)
  if (data.find(wallet => wallet.address === address) === undefined) {
    return message.reply(MESSAGES.walletNotFound)
  }
  const response = await deleteWallet(address)
  message.reply(response)
}

/**
 * Handle channel message
 * @param {*} message 
 * @returns 
 */
export function handleChannelMessage (message) {
  if (checkIfCorrectChannel(message) === false) return;
  if (message.author.bot === true) return;
  if(!checkRole(message)) return message.reply(MESSAGES.noPermission);
    
  handleCommands(message)
}
