const { OpenAI } = require('../');

const COMMANDS_LIST = {
  // SET_CHANNEL: 'setchannel',
  // REMOVE_CHANNEL: 'removechannel',
  // CLEAR_GUILD: 'clearguild',
  // CLEAR_ALL: 'clearall',
  GPT: 'gpt',
  GPT_WEB: 'gptweb'
};

// async function setChannelId(message) {
//   try {
//     const [channel] = await channels.find([
//       {
//         key: 'channelId',
//         comparisonOperator: '=',
//         value: message.channelId
//       },
//       {
//         key: 'guildId',
//         comparisonOperator: '=',
//         value: message.guildId
//       }
//     ]);

//     if (channel) {
//       console.log(`Channel ${message.channelId} of guild ${message.guildId} already registered`);

//       await message.reply(`Channel is already registered`);
//       return false;
//     }

//     await channels.insert({
//       channelId: message.channelId,
//       guildId: message.guildId
//     });

//     await message.reply('Using current channel');
//     return { isInsert: true };
//   } catch (error) {
//     console.log('Set channel error', error);
//     return false;
//   }
// }

// async function removeChannelId(message) {
//   try {
//     await channels.delete([
//       {
//         key: 'channelId',
//         comparisonOperator: '=',
//         value: message.channelId
//       },
//       {
//         key: 'guildId',
//         comparisonOperator: '=',
//         value: message.guildId
//       }
//     ]);
//     await message.reply('Removed current channel');
//     return true;
//   } catch (error) {
//     console.log('Remove channel error', error);
//     return false;
//   }
// }

// async function clearChannels(message, clearGuild) {
//   try {
//     let filters = [];
//     if (clearGuild) {
//       filters.push({ key: 'guildId', comparisonOperator: '=', value: message.guildId });
//     }

//     await channels.delete(filters);
//     await message.reply('Removed channels');
//     return true;
//   } catch (error) {
//     console.log('Clear channels error', error);
//     return false;
//   }
// }

// async function clearGuild(message) {
//   return clearChannels(message, true);
// }

/**
 *
 * @param {object} message
 * @param {'web'|'text'} type
 * @returns
 */
async function askGPT(message, type) {
  try {
    const OpenAIQueryTypes = {
      web: OpenAI.webQuery,
      text: OpenAI.textQuery
    };

    const OpenAIQuery = OpenAIQueryTypes[type];

    const response = await OpenAIQuery(message.content);
    const { choices, output_text } = response;

    const openAIResponse = choices ? choices[0].message.content : output_text;

    return openAIResponse;
  } catch (error) {
    console.log('Error querying OpenAI:', error);
    return false;
  }
}

async function askGPTWeb(message) {
  return askGPT(message, 'web');
}

async function askGPTText(message) {
  return askGPT(message, 'text');
}

const COMMAND_HANDLERS = {
  OWNER: {
    [COMMANDS_LIST.GPT_WEB]: askGPTWeb
  },
  ADMIN: {
    // [COMMANDS_LIST.SET_CHANNEL]: setChannelId,
    // [COMMANDS_LIST.REMOVE_CHANNEL]: removeChannelId,
    // [COMMANDS_LIST.CLEAR_ALL]: clearChannels,
    // [COMMANDS_LIST.CLEAR_GUILD]: clearGuild,
    [COMMANDS_LIST.GPT]: askGPTText
  },
  USER: {
    [COMMANDS_LIST.GPT]: askGPTText
  }
};

const getAvailableCommands = ({ isAdmin, isOwner }) => {
  if (isOwner) {
    return {
      ...COMMAND_HANDLERS.USER,
      ...COMMAND_HANDLERS.ADMIN,
      ...COMMAND_HANDLERS.OWNER
    };
  }

  if (isAdmin) {
    return {
      ...COMMAND_HANDLERS.USER,
      ...COMMAND_HANDLERS.ADMIN
    };
  }

  return COMMAND_HANDLERS.USER;
};

const getCommandHandler = (command, userType) => {
  const commandsList = getAvailableCommands(userType);
  const handler = commandsList[command];

  if (!handler) {
    return;
  }

  return handler;
};

module.exports = {
  getCommandHandler,
  COMMANDS_LIST
};
