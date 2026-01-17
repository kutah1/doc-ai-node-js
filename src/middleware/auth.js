import supabase from '../db/index.js'; // Assuming src/db/index.js exports the supabase client

export const authenticate = async (req, res, next) => {
  let token = req.headers.authorization;
  let apiKey = req.headers['x-api-key'];

  if (!token && !apiKey) {
    return res.status(401).json({ message: 'Authentication required: Missing Authorization header or X-API-Key' });
  }

  try {
    if (token && token.startsWith('Bearer ')) {
      // Handle JWT authentication
      token = token.slice(7, token.length); // Remove 'Bearer ' prefix
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        console.error('JWT authentication error:', error?.message || 'User not found');
        return res.status(401).json({ message: 'Unauthorized: Invalid JWT token' });
      }

      req.userId = data.user.id;

      // Set the session context for the Supabase client to use the user's JWT for RLS.
      supabase.auth.setSession({
        access_token: token,
        refresh_token: token, // Using access token as refresh token for simplicity in this context
      });

      // You might want to attach other user data to req if needed
      return next();

    } else if (apiKey) {
      // Handle API Key authentication
      const { data, error } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('API Key authentication error:', error?.message || 'API Key not found or inactive');
        return res.status(401).json({ message: 'Unauthorized: Invalid or inactive API Key' });
      }

      req.userId = data.user_id;
      // Update last_used_at for the API key (fire and forget)
      supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('api_key', apiKey)
        .then(({ error: updateError }) => {
          if (updateError) console.error('Failed to update API key last_used_at:', updateError);
        });

      return next();

    } else {
      // This case should ideally not be reached due to initial checks, but as a safeguard
      return res.status(401).json({ message: 'Authentication required: Invalid authentication method' });
    }
  } catch (err) {
    console.error('Authentication processing error:', err.message);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};
