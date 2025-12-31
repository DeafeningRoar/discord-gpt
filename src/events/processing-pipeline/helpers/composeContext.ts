import type { Conversation } from '../../../database/schemas';

const buildContext = (document: Conversation, systemPrompt: string) => [
  { role: 'system', content: systemPrompt },
  ...(document.summary?.factual
    ? [
        {
          role: 'system',
          content: `
[SUMMARY]
The following is a summary of the conversation so far
---
${document.summary.factual}
`.trim(),
        },
      ]
    : []),
  ...document.liveBuffer
    .toSorted((a, b) => a.ts.getTime() - b.ts.getTime())
    .map(({ role, content, files }) => {
      const { url, expiresAt } = files.image || {};

      if (typeof expiresAt !== 'undefined' && Date.now() >= expiresAt?.getTime()) {
        return { role, content: `${content}\n\n**Expired Image URL <${url}>**`, files: {} };
      }

      return { role, content, files: { image: url } };
    }),
];

export { buildContext };
