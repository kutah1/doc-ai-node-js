import axios from 'axios';
import config from '../config/index.js';
import supabase from '../db/index.js';
import { usageMetricSchema } from '../models/usageMetricSchemas.js';

const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Generates a grounded completion using the OpenRouter LLM.
 *
 * @param {string} prompt The user's question or prompt.
 * @param {string} context The context to ground the LLM's response.
 * @param {string} userId The ID of the user making the request.
 * @param {string | null} apiKeyId The ID of the API key used, if any.
 * @returns {Promise<object>} An object containing the LLM's response text and usage metrics.
 * @throws {Error} If the OpenRouter API call fails or grounding rules are violated.
 */
export async function getGroundedCompletion(messages, context, userId, apiKeyId = null) {
  if (!config.openRouter.apiKey) {
    throw new Error('OpenRouter API Key is not configured.');
  }
  if (!messages || messages.length === 0) {
    throw new Error('Messages cannot be empty.');
  }
  if (!context) {
    // If context is empty, LLM cannot be grounded, which violates a core constraint.
    // The node_js.md explicitly states: "Grounding is mandatory."
    // "Answer ONLY from the provided context. If the answer is not present, say you do not know."
    return { completion: "I do not know, as no context was provided to answer your question.", usage: null };
  }

  const systemPrompt = `You are a helpful assistant. Answer ONLY from the provided context. If the answer is not present in the context, say you do not know.
  
  Context:
  ${context}`;

  try {
    // Construct messages array for OpenRouter API
    const openRouterMessages = [{ role: 'system', content: systemPrompt }];
    messages.forEach(msg => openRouterMessages.push(msg)); // Add previous messages and current user question

    const response = await axios.post(
      `${OPENROUTER_API_BASE_URL}/chat/completions`,
      {
        model: config.openRouter.model,
        messages: openRouterMessages,
        // Optional: stream: true for streaming responses if needed
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://docsense-ai.com', // Replace with your app domain (example from node_js.md)
          'X-Title': 'DocSense AI', // Replace with your app name (example from node_js.md)
        },
      }
    );

    const { choices, usage } = response.data;
    const completionText = choices[0]?.message?.content || 'No response from LLM.';

    // Record usage metrics
    const metrics = {
      user_id: userId,
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
      model_name: config.openRouter.model,
    };

    if (apiKeyId) {
      metrics.api_key_id = apiKeyId;
    }

    // Validate metrics before inserting
    const parsedMetrics = usageMetricSchema.parse(metrics);

    const { error: metricsError } = await supabase.from('usage_metrics').insert([parsedMetrics]);
    if (metricsError) {
      console.error('Failed to record usage metrics:', metricsError.message);
      // Do not throw error here, as the LLM response was successful
    }

    return { completion: completionText, usage: parsedMetrics };

  } catch (error) {
    console.error('Error calling OpenRouter API:', error.message);
    if (error.response) {
      console.error('OpenRouter API Response Error Data:', error.response.data);
      throw new Error(`OpenRouter API error: ${error.response.status} - ${error.response.data.message || 'Unknown OpenRouter error'}`);
    }
    throw new Error(`Failed to get completion from OpenRouter: ${error.message}`);
  }
}
