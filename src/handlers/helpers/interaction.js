const { sleep } = require('../../utils');
const { DISCORD_MAX_LENGTH, splitText } = require('./');

const handleResponseLoading = async (interaction, query) => {
  const WAIT_TIME = 850;
  const resultMessage = `\`${query}\``;

  await interaction.reply(resultMessage + '\n。');

  let dots = 2;
  const interval = setInterval(async () => {
    if (dots > 3) dots = 1;
    await interaction.editReply(`${resultMessage}\n` + '。'.repeat(dots));
    dots++;
  }, WAIT_TIME);

  return interval;
};

const formatResponse = response => {
  let responseMessages = [];
  if (response.length > DISCORD_MAX_LENGTH) {
    responseMessages = splitText(response, DISCORD_MAX_LENGTH);
  } else {
    responseMessages.push(response);
  }

  return responseMessages;
};

const handleInteractionReply = async (interaction, query, response) => {
  const formattedResponse = formatResponse(response);

  let interactionReply = await interaction.editReply({
    content: `\`${query}\``,
    embeds: [
      {
        type: 'rich',
        title: formattedResponse.length > 1 ? `:thread: 1 / ${formattedResponse.length}` : undefined,
        description: formattedResponse[0]
      }
    ]
  });

  if (formattedResponse.length > 1) {
    for (let i = 1; i < formattedResponse.length; i++) {
      await sleep(400);
      interactionReply = await interactionReply.reply({
        embeds: [
          {
            type: 'rich',
            title: `:thread: ${i + 1} / ${formattedResponse.length}`,
            description: formattedResponse[i]
          }
        ]
      });
    }
  }
};

module.exports = {
  handleResponseLoading,
  formatResponse,
  handleInteractionReply
};
