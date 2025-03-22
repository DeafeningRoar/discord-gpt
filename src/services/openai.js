import OpenAI from 'openai';

const openai = new OpenAI();

const SEARCH_PREVIEW_MODEL = 'gpt-4o-mini-search-preview';
const TEXT_MODEL = 'gpt-4o-mini';

const webQuery = async message => {
  const response = await openai.chat.completions.create({
    model: SEARCH_PREVIEW_MODEL,
    messages: [
      {
        role: 'user',
        content: `Keep the response as short and straightforward as possible. ${message}`
      }
    ]
  });

  return response;
};

const textQuery = async message => {
  const response = await openai.responses.create({
    model: TEXT_MODEL,
    input: message,
    instructions: 'Keep the response as short and straightforward as possible.'
  });

  return response;
};

export { webQuery, textQuery };
