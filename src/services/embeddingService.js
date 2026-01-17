import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';

let genAI;
let embeddingModel;

/**
 * Initializes the Google AI client for embeddings.
 */
async function initializeEmbedder() {
  if (!config.google.apiKey) {
    console.error("Google API Key must be configured to use Google for embeddings.");
    process.exit(1);
  }
  genAI = new GoogleGenerativeAI(config.google.apiKey);
  embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004"});
  console.log(`Google Embeddings initialized with model: text-embedding-004`);
}

// Call initializeEmbedder once at startup
initializeEmbedder().catch(error => {
  console.error("Application failed to start due to embedding service initialization error:", error);
  process.exit(1); // Exit if embedder can't be initialized
});

/**
 * Generates embeddings for a given text using the Google AI embedding API.
 * @param {string} text The text to embed.
 * @returns {Promise<number[]>} A promise that resolves to an array of numbers representing the embedding vector.
 * @throws {Error} If the embedding service is not initialized or if there's an issue with the embedding API.
 */
async function getEmbeddings(text) {
  if (!embeddingModel) {
    throw new Error('Embedding service not initialized.');
  }
  if (!text || typeof text !== 'string') {
    throw new Error('Text input for embedding must be a non-empty string.');
  }

  try {
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding;
    if (embedding && embedding.values) {
      return embedding.values;
    } else {
      throw new Error('No embedding data received from Google.');
    }
  } catch (error) {
    console.error('Error calling Google Embeddings API:', error.message);
    throw new Error(`Failed to get embeddings from Google: ${error.message}`);
  }
}

export { getEmbeddings };
