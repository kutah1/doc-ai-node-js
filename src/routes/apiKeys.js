import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createApiKeySchema } from '../models/apiKeySchemas.js';

const router = express.Router();

// POST /api/api-keys - Create a new API key
router.post('/api-keys', authenticate, validate(createApiKeySchema), async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    const newApiKey = uuidv4(); // Generate a UUID for the API key

    const { data, error } = await supabase
      .from('api_keys')
      .insert([
        { user_id: userId, api_key: newApiKey, name: name }
      ])
      .select('id, name, api_key, created_at, last_used_at, is_active')
      .single();

    if (error) {
      console.error('Error creating API key for user:', userId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to create API key.' });
    }

    return res.status(201).json({ success: true, message: 'API Key created successfully.', apiKey: data });

  } catch (err) {
    console.error('Error in POST /api-keys route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during API key creation.' });
  }
});

// GET /api/api-keys - List all API keys for the authenticated user
router.get('/api-keys', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, api_key, created_at, last_used_at, is_active')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching API keys for user:', userId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch API keys.' });
    }

    return res.status(200).json({ success: true, message: 'API keys retrieved successfully.', apiKeys: data });

  } catch (err) {
    console.error('Error in GET /api-keys route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during API key retrieval.' });
  }
});

// DELETE /api/api-keys/:keyId - Delete a specific API key
router.delete('/api-keys/:keyId', authenticate, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.userId;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
        return res.status(400).json({ success: false, message: "Invalid API key ID format. Must be a UUID." });
    }

    const { error, count } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId); // Ensure user can only delete their own keys

    if (error) {
      console.error('Error deleting API key:', keyId, 'for user:', userId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to delete API key.' });
    }

    // Supabase delete doesn't return count reliably with RLS.
    // Assuming successful response from Supabase means deletion was attempted/successful.
    return res.status(200).json({ success: true, message: 'API Key deleted successfully.' });

  } catch (err) {
    console.error('Error in DELETE /api-keys/:keyId route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during API key deletion.' });
  }
});

export default router;