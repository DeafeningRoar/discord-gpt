import OpenAI from 'openai';

const openai = new OpenAI();

const SEARCH_PREVIEW_MODEL = 'gpt-4o-mini-search-preview';
const TEXT_MODEL = 'gpt-4o-mini';

const webQuery = async message => {
  console.log(new Date().toISOString(), '- Processing message with', SEARCH_PREVIEW_MODEL);
  const response = await openai.chat.completions.create({
    model: SEARCH_PREVIEW_MODEL,
    messages: [
      {
        role: 'user',
        content: message
      }
    ]
  });

  return response;
};

const textQuery = async (message, img) => {
  console.log(new Date().toISOString(), '- Processing message with', TEXT_MODEL);
  const response = await openai.responses.create({
    model: TEXT_MODEL,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: message }, ...(img ? [{ type: 'input_image', image_url: img }] : [])]
      }
    ]
  });

  return response;
};

export { webQuery, textQuery };
