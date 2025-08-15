/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TiktokenModel } from 'tiktoken';

import { encoding_for_model } from 'tiktoken';

const countTokens = ({ model, input }: { model: string; input: any }) => {
  const encoder = encoding_for_model(model as TiktokenModel);
  const tokens = encoder.encode(JSON.stringify(input ?? 0, null, 2));

  encoder.free();

  return tokens?.length || 0;
};

const countTokensWithOverhead = ({
  model,
  input,
  perObjectOverhead = 2,
}: {
  model: string;
  input: any;
  perObjectOverhead?: number;
}): number => {
  const baseCount = countTokens({ model, input });

  const numObjects = countNestedObjects(input);

  return baseCount + numObjects * perObjectOverhead;
};

const countNestedObjects = (obj: any): number => {
  if (obj && typeof obj === 'object') {
    let count = Array.isArray(obj) ? 0 : 1;
    for (const key in obj) {
      count += countNestedObjects(obj[key]);
    }
    return count;
  }

  return 0;
};

export { countTokens, countTokensWithOverhead };
