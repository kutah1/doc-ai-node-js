import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { askSchema } from '../models/documentSchemas.js';
import { getEmbeddings } from '../services/embeddingService.js';
import { getGroundedCompletion } from '../services/openRouterService.js';
import supabase from '../db/index.js';

const router = express.Router();

// POST /ask - Authenticated endpoint for asking questions
router.post('/ask', authenticate, validate(askSchema), async (req, res) => {
  let conversationId = req.body.conversationId; // Get conversationId from request body
  let conversationTitle = 'New Conversation'; // Default title for new conversations

  try {
    const { question, documentId } = req.body;
    const userId = req.userId;
    // Assuming apiKeyId might be attached by auth middleware if using API Key
    const apiKeyId = req.apiKeyId || undefined;

    // Handle conversation history
    let messages = [];
    if (conversationId) {
      // Fetch existing conversation messages
      const { data: convMessages, error: convMessagesError } = await supabase
        .from('conversation_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (convMessagesError) {
        console.error('Error fetching conversation messages:', convMessagesError.message);
        // Continue without conversation history if there's an error
        conversationId = undefined; // Treat as new conversation
      } else {
        messages = convMessages.map(msg => ({ role: msg.role, content: msg.content }));
        // Also fetch conversation title if conversationId is provided
        const { data: convData, error: convDataError } = await supabase
          .from('conversations')
          .select('title')
          .eq('id', conversationId)
          .single();

        if (!convDataError && convData) {
          conversationTitle = convData.title;
        }
      }
    } else {
      // Create a new conversation
      const { data: newConvData, error: newConvError } = await supabase
        .from('conversations')
        .insert([{ owner_id: userId, title: 'New Conversation' }])
        .select('id, title')
        .single();

      if (newConvError) {
        console.error('Error creating new conversation:', newConvError.message);
        return res.status(500).json({ success: false, message: 'Failed to create new conversation.' });
      }
      conversationId = newConvData.id;
      conversationTitle = newConvData.title;
    }

    // Add user's current question to messages for LLM context
    messages.push({ role: 'user', content: question });


    // 1. Generate embedding for the question
    let questionEmbedding;
    try {
      questionEmbedding = await getEmbeddings(question);
    } catch (embeddingError) {
      console.error('Error generating embedding for question for user:', userId, embeddingError.message);
      return res.status(500).json({ success: false, message: `Failed to generate embedding for your question: ${embeddingError.message}` });
    }

    // 2. Perform vector search in Supabase
    const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: questionEmbedding,
      p_owner_id: userId,
      match_threshold: 0.5, // TODO: Make configurable via config.js
      match_count: 10 // TODO: Make configurable via config.js
    });

    if (rpcError) {
      console.error('Error during Supabase RPC call for document chunks for user:', userId, rpcError.message);
      return res.status(500).json({ success: false, message: 'Error retrieving relevant document context from database.' });
    }

    // Filter by documentId client-side if it was provided and the RPC function doesn't handle it
    const filteredChunks = documentId
      ? matchedChunks.filter(chunk => chunk.document_id === documentId)
      : matchedChunks;

    if (!filteredChunks || filteredChunks.length === 0) {
      // If no chunks found, it's not a server error, but rather lack of information
      return res.status(404).json({ success: false, message: 'No relevant document context found to answer the question, or no chunks found for the specified document.' });
    }

    // 3. Construct context from retrieved chunks
    const context = filteredChunks.map(chunk => chunk.content).join('\n\n');

    // 4. Get grounded completion from OpenRouter
    let completion;
    try {
      const completionResult = await getGroundedCompletion(messages, context, userId, apiKeyId);
      completion = completionResult.completion;

      // Save user message
      const { error: userMsgError } = await supabase.from('conversation_messages').insert([
        { conversation_id: conversationId, role: 'user', content: question }
      ]);
      if (userMsgError) {
        console.error('Error saving user message to conversation:', userMsgError.message);
      }

      // Save assistant message
      const { error: assistantMsgError } = await supabase.from('conversation_messages').insert([
        { conversation_id: conversationId, role: 'assistant', content: completion }
      ]);
      if (assistantMsgError) {
        console.error('Error saving assistant message to conversation:', assistantMsgError.message);
      }

    } catch (llmError) {
      console.error('Error getting grounded completion from OpenRouter for user:', userId, llmError.message);
      return res.status(500).json({ success: false, message: `Failed to get an answer from the AI: ${llmError.message}` });
    }
    
    return res.status(200).json({ success: true, message: 'Question answered successfully.', answer: completion, conversationId: conversationId });

  } catch (err) {
    console.error('Critical error in POST /ask route for user:', req.userId, err.message);
    return res.status(500).json({ success: false, message: `An unexpected internal server error occurred while processing your question: ${err.message}` });
  }
});

export default router;