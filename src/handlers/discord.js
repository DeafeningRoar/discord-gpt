const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');

const { Emitter } = require('../services');
const { EVENTS } = require('../config/constants');
const { getCommandHandler } = require('../services/helpers/discord-commands');
const Discord = require('../services/discord');
const Channels = require('../database/channels');

const channelsDB = new Channels();

/**
 * @param {Object} params
 * @param {Discord} params.discord
 */
module.exports = ({ discord }) => {
  Emitter.on(EVENTS.DISCORD_READY, async () => {
    if (!discord.client?.isReady?.()) {
      throw new Error(`${EVENTS.DISCORD_READY} - Discord client not ready`);
    }

    const dbChannels = await channelsDB.find([]);
    if (!dbChannels.length) {
      console.log('No channels registered');
      return;
    }

    console.log(
      'Registered channels:',
      dbChannels.map(({ channelId, guildId }) => ({ guildId, channelId }))
    );
  });

  Emitter.on(EVENTS.DISCORD_MESSAGE_CREATED, async ({ message }) => {
    const permissions = new PermissionsBitField(BigInt(PermissionFlagsBits.Administrator));

    const isAdmin = message.member.permissions.has(permissions);
    const isBot = message.author.bot;

    if (isBot || !isAdmin) return;
    const commandHandler = getCommandHandler(message);

    if (!commandHandler) return;

    await commandHandler(message);
  });
};
