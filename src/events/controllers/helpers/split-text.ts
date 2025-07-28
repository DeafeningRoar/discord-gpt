const splitText = (text: string, chunkSize: number, result: string[] = []) => {
  const sliced = text.slice(0, chunkSize);

  if (!text.slice(chunkSize).length) {
    result.push(text);

    return result;
  }

  if (sliced.endsWith('.') || sliced.endsWith('\n')) {
    const newText = text.slice(chunkSize).replace(/^\s/, '');
    const newSlice = sliced.replace(/\s$/gm, '');
    result.push(newSlice);

    return splitText(newText, chunkSize, result);
  }

  const reversed = [...sliced].reverse();
  const endIndex = reversed.findIndex(val => val === '.' || val === '\n');

  if (endIndex > -1) {
    const newChunkSize = sliced.length - endIndex;
    const newSlice = text.slice(0, newChunkSize).replace(/\s$/gm, '');
    const newText = text.slice(newChunkSize).replace(/^\s/, '');

    result.push(newSlice);

    return splitText(newText, chunkSize, result);
  }

  const lastWordEnd = reversed.findIndex(val => val === ' ');

  if (lastWordEnd > -1) {
    const newChunkSize = sliced.length - lastWordEnd;
    const newSlice = text.slice(0, newChunkSize).replace(/\s$/, '');
    const newText = text.slice(newChunkSize).replace(/^\s/, '');

    result.push(newSlice);

    return splitText(newText, chunkSize, result);
  }

  return splitText(sliced, chunkSize, result);
};

export { splitText };
