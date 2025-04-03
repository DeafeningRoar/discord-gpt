import OpenAI from 'openai';

const openai = new OpenAI();
const perplexityai = new OpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY
});

const MODELS = {
  OpenAI: {
    SEARCH_PREVIEW_MODEL: 'gpt-4o-mini-search-preview',
    TEXT_MODEL: 'gpt-4o-mini'
  },
  PerplexityAI: {
    SONAR: 'sonar'
  }
};

const formatPerplexityResponse = response => {
  try {
    const { citations } = response;

    response.choices[0].message.content = response.choices[0].message.content.replaceAll(
      /\[(\d+)\]/gm,
      (substring, captureGroup) => {
        const citation = citations[Number(captureGroup) - 1];
        return `[${substring}](${citation})`;
      }
    );
  } catch (error) {
    console.log(new Date().toISOString(), 'Error formatting Perplexity response', {
      message: error.message
    });
  }

  return response;
};

const webQuery = async message => {
  console.log(new Date().toISOString(), '- Processing message with', MODELS.PerplexityAI.SONAR);

  const response = await perplexityai.chat.completions.create({
    model: MODELS.PerplexityAI.SONAR,
    messages: [
      { role: 'system', content: 'Be precise, concise and organized' },
      { role: 'user', content: message }
    ]
  });

  return formatPerplexityResponse(response);
};

const textQuery = async (message, img, { user, previousResponseId }) => {
  console.log(new Date().toISOString(), '- Processing message with', MODELS.OpenAI.TEXT_MODEL);

  const response = await openai.responses.create({
    model: MODELS.OpenAI.TEXT_MODEL,
    previous_response_id: previousResponseId,
    input: [
      {
        role: 'system',
        content:
          'You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate. Multiple users could be in this conversation.'
      },
      { role: 'system', content: `Message sent by user: ${user}` },
      {
        role: 'user',
        content: [{ type: 'input_text', text: message }, ...(img ? [{ type: 'input_image', image_url: img }] : [])]
      }
    ]
  });

  return response;
};

export { webQuery, textQuery };
