const { sleep } = require('../../utils');
const { DISCORD_MAX_LENGTH } = require('./');
const { splitText } = require('./splitText');

const handleResponseLoading = async (interaction, user, query, img) => {
  const WAIT_TIME = 850;
  const resultMessage = `**${user}**: ${query}`;
  const files = img
    ? [
        {
          attachment: img,
          name: 'user-image.png'
        }
      ]
    : undefined;

  await interaction.reply({
    content: resultMessage + '\n。',
    files
  });

  let dots = 2;
  const interval = setInterval(async () => {
    if (dots > 3) dots = 1;
    await interaction.editReply({
      content: `${resultMessage}\n` + '。'.repeat(dots)
    });
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

const handleInteractionReply = async (interaction, user, query, response) => {
  const formattedResponse = formatResponse(response);

  let interactionReply = await interaction.editReply({
    content: `**${user}**: ${query}`,
    embeds: [
      {
        type: 'rich',
        title: formattedResponse.length > 1 ? `:thread: 1 / ${formattedResponse.length}` : undefined,
        description: formattedResponse[0]
      }
    ],
    files: interaction.img
      ? [
          {
            attachment: interaction.img,
            name: 'user-image.png'
          }
        ]
      : undefined
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
