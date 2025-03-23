const getFormattedMessage = message => {
  const [command, ...rest] = message.content.split(' ');

  return {
    command: command.replace('/', ''),
    content: rest.join(' ')
  };
};

const formatResponseMessage = message => {
  const result = message.replaceAll(/(http.*)/gi, substring => {
    const embedSafe = hideLinkEmbed(substring.replaceAll(')', ''));
    const parenthesisCount = substring.match(/\)/gi)?.length || 0;

    return `${embedSafe}${')'.repeat(parenthesisCount)}`;
  });

  return result;
};

module.exports = {
  getFormattedMessage,
  formatResponseMessage
};
