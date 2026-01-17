import express from 'express';
import supabase from '../db/index.js';
import { signupSchema, loginSchema } from '../models/authSchemas.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', validate(signupSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signup error:', error.message);
      // More specific error handling based on Supabase error codes could be added here
      return res.status(400).json({ success: false, message: error.message || 'Signup failed' });
    }

    if (data.user && data.session) {
      // User created and session active immediately (e.g., if email confirmation is off)
      return res.status(201).json({
        success: true,
        message: 'Signup successful, user logged in.',
        user: { id: data.user.id, email: data.user.email },
        session: data.session.access_token,
      });
    } else if (data.user && !data.session) {
      // User created, but email confirmation is required
      // Use 202 Accepted to indicate the request was accepted for processing, but not yet completed.
      return res.status(202).json({
        success: true,
        message: 'Signup initiated. Please check your email to confirm your account.',
        user: { id: data.user.id, email: data.user.email },
      });
    } else {
      // This case should ideally not be reached if Supabase.auth.signUp behaves as expected
      console.error('Unexpected Supabase signup response: Neither session nor user data available post-signup without error.');
      return res.status(500).json({ success: false, message: 'An unexpected server error occurred during signup.' });
    }

  } catch (err) {
    console.error('Error during signup process:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during signup.' });
  }
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error.message);
      // Supabase often returns 400 for bad credentials. Map to 401 Unauthorized for client.
      const statusCode = error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed') ? 401 : 400;
      return res.status(statusCode).json({ success: false, message: error.message || 'Login failed' });
    }

    if (!data.session || !data.user) {
      // This case should ideally be covered by the `error` check, but as a safeguard.
      console.error('Unexpected Supabase login response: No session or user data available post-login without error.');
      return res.status(401).json({ success: false, message: 'Invalid login credentials.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: { id: data.user.id, email: data.user.email },
      session: data.session.access_token,
    });

  } catch (err) {
    console.error('Error during login process:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

export default router;