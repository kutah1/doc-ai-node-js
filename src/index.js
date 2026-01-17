import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// A simple root route to check if the server is running
app.get('/', (req, res) => {
  res.json({ message: 'DocSense AI Backend is running!' });
});

// TODO: Import and use routes
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import askRoutes from './routes/ask.js';
import apiKeyRoutes from './routes/apiKeys.js';
import metricsRoutes from './routes/metrics.js';
import textRoutes from './routes/text.js'; // New import

app.use('/auth', authRoutes);
app.use('/api', documentRoutes);
app.use('/api', askRoutes);
app.use('/api', apiKeyRoutes);
app.use('/api', metricsRoutes);
app.use('/api', textRoutes); // New route

import conversationsRoutes from './routes/conversations.js';
app.use('/api', conversationsRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
