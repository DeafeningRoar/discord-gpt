import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

const openai = new OpenAI();

const SEARCH_PREVIEW_MODEL = 'gpt-4o-mini-search-preview';

const webQuery = async message => {
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

export { webQuery };
