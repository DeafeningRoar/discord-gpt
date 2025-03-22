const Channels = require('../../database/channels');
const channels = new Channels();

const COMMANDS_LIST = {
  SET_CHANNEL: '/setchannel',
  REMOVE_CHANNEL: '/removechannel',
  CLEAR_GUILD: '/clearguild',
  CLEAR_ALL: '/clearall',
  SET_ALERT_CHANNEL: '/setalert',
  REMOVE_ALERT: '/removealert'
};

async function setChannelId(message) {
  try {
    if (!message.content.startsWith(COMMANDS_LIST.SET_CHANNEL) || message.author.bot) {
      return false;
    }

    const [channel] = await channels.find([
      {
        key: 'channelId',
        comparisonOperator: '=',
        value: message.channelId
      },
      {
        key: 'guildId',
        comparisonOperator: '=',
        value: message.guildId
      }
    ]);

    if (channel) {
      console.log(`Channel ${message.channelId} of guild ${message.guildId} already registered`);

      await message.reply(`Channel is already registered`);
      return false;
    }

    await channels.insert({
      channelId: message.channelId,
      guildId: message.guildId
    });

    await message.reply('Using current channel');
    return { isInsert: true };
  } catch (error) {
    console.log('Set channel error', error);
    return false;
  }
}

async function removeChannelId(message) {
  try {
    if (!message.content.startsWith(COMMANDS_LIST.REMOVE_CHANNEL) || message.author.bot) {
      return false;
    }

    await channels.delete([
      {
        key: 'channelId',
        comparisonOperator: '=',
        value: message.channelId
      },
      {
        key: 'guildId',
        comparisonOperator: '=',
        value: message.guildId
      }
    ]);
    await message.reply('Removed current channel');
    return true;
  } catch (error) {
    console.log('Remove channel error', error);
    return false;
  }
}

async function clearChannels(message) {
  try {
    if (
      (message.content !== COMMANDS_LIST.CLEAR_GUILD && message.content !== COMMANDS_LIST.CLEAR_ALL) ||
      message.author.bot ||
      message.author.id !== process.env.ADMIN_ID
    ) {
      return false;
    }

    let filters = [];
    if (message.content === COMMANDS_LIST.CLEAR_GUILD) {
      filters.push({ key: 'guildId', comparisonOperator: '=', value: message.guildId });
    }

    await channels.delete(filters);
    await message.reply('Removed channels');
    return true;
  } catch (error) {
    console.log('Clear channels error', error);
    return false;
  }
}

const COMMAND_HANDLERS = {
  [COMMANDS_LIST.SET_CHANNEL]: setChannelId,
  [COMMANDS_LIST.REMOVE_CHANNEL]: removeChannelId,
  [COMMANDS_LIST.CLEAR_GUILD]: clearChannels,
  [COMMANDS_LIST.CLEAR_ALL]: clearChannels
};

const getCommandHandler = message => {
  const [command] = message.content.split(' ');
  const handler = COMMAND_HANDLERS[command];

  if (!handler) {
    return;
  }

  return handler;
};

module.exports = {
  getCommandHandler,
  COMMANDS_LIST
};
