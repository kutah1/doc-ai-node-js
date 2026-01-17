import express from 'express';
import supabase from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/conversations - List all conversations for the authenticated user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('owner_id', userId);

    if (error) {
      console.error('Error fetching conversations for user:', userId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch conversations.' });
    }

    return res.status(200).json({ success: true, message: 'Conversations retrieved successfully.', conversations: data });

  } catch (err) {
    console.error('Error in GET /api/conversations route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during conversation retrieval.' });
  }
});

// GET /api/conversations/:conversationId - Get all messages for a specific conversation
router.get('/conversations/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    // First, check if the user owns the conversation
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('owner_id', userId)
      .single();

    if (convError || !convData) {
      return res.status(404).json({ success: false, message: 'Conversation not found or you do not have permission to view it.' });
    }

    const { data, error } = await supabase
      .from('conversation_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages for conversation:', conversationId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
    }

    return res.status(200).json({ success: true, message: 'Messages retrieved successfully.', messages: data });

  } catch (err) {
    console.error('Error in GET /api/conversations/:conversationId route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during message retrieval.' });
  }
});

export default router;
