/**
 * Chunks a given text into smaller pieces with optional overlap.
 * This function aims to split text at natural breaking points (like sentence endings)
 * to maintain readability and context, while adhering to the specified chunk size.
 *
 * @param {string} text The input text to chunk.
 * @param {number} chunkSize The approximate maximum size of each chunk. Defaults to 500.
 * @param {number} overlap The number of characters to overlap between consecutive chunks. Defaults to 0.
 * @returns {string[]} An array of text chunks.
 */
export function chunkText(text, chunkSize = 500, overlap = 0) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be a positive number.");
  }
  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error("overlap must be non-negative and less than chunkSize.");
  }

  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + chunkSize, text.length);
    let chunk = text.substring(i, end);

    // Try to find a natural break point (like end of a sentence) if we're not at the end of the text
    // and if the chunk is not too small to justify looking for a split point.
    if (end < text.length && chunk.length > chunkSize * 0.7) { // Only try to split if chunk is reasonably full
      let lastPeriod = chunk.lastIndexOf('.');
      let lastQuestion = chunk.lastIndexOf('?');
      let lastExclamation = chunk.lastIndexOf('!');
      let lastNewline = chunk.lastIndexOf('\n');
      let lastSpace = chunk.lastIndexOf(' ');

      // Prioritize sentence endings, then newlines, then spaces.
      // Ensure the split point is not too close to the beginning of the potential chunk boundary.
      let splitPoint = -1;
      if (lastPeriod > chunk.length * 0.6) splitPoint = lastPeriod;
      else if (lastQuestion > chunk.length * 0.6) splitPoint = lastQuestion;
      else if (lastExclamation > chunk.length * 0.6) splitPoint = lastExclamation;
      else if (lastNewline > chunk.length * 0.6) splitPoint = lastNewline;
      else if (lastSpace > chunk.length * 0.6) splitPoint = lastSpace;

      // If a suitable split point is found, adjust the end of the current chunk
      if (splitPoint !== -1) {
        end = i + splitPoint + 1; // Include the delimiter
        chunk = text.substring(i, end);
      }
    }

    chunks.push(chunk.trim());

    // Move to the next chunk, accounting for overlap
    // Ensure 'i' doesn't go backward if the chunk was very small and overlap was large
    i = end - overlap;
    if (i < 0) i = 0; // Prevent negative index
    if (i >= text.length) break; // If we've passed the end of the text, stop.
  }

  return chunks.filter(chunk => chunk.length > 0);
}
