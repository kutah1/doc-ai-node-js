import express from 'express';
import supabase from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/metrics - Retrieve usage metrics for the authenticated user
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from('usage_metrics')
      .select('*') // Select all columns for metrics
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // Order by newest first

    if (error) {
      console.error('Error fetching usage metrics for user:', userId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to retrieve usage metrics.' });
    }

    return res.status(200).json({ success: true, message: 'Usage metrics retrieved successfully.', metrics: data });

  } catch (err) {
    console.error('Error in GET /api/metrics route for user:', req.userId, err.message);
    return res.status(500).json({ success: false, message: `An unexpected internal server error occurred while retrieving metrics: ${err.message}` });
  }
});

export default router;