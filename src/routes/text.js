import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadTextSchema } from '../models/documentSchemas.js'; // Using the new schema
import { chunkText } from '../utils/chunker.js';
import { getEmbeddings } from '../services/embeddingService.js';
import supabase from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// POST /api/upload-text - Authenticated endpoint for uploading plain text
router.post('/upload-text', authenticate, validate(uploadTextSchema), async (req, res) => {
  let documentId = null; // Initialize documentId for cleanup in catch block
  const { text, title } = req.body;
  const userId = req.userId;

  try {
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Text content cannot be empty.' });
    }
    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Document title is required and cannot be empty.' });
    }

    // Since it's plain text, we don't upload to Supabase Storage.
    // The 'source' will just be a descriptive string.
    const source = `Uploaded Text: ${title}`;

    // 1. Store document metadata in Supabase
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert([
        { owner_id: userId, title, source: source }
      ])
      .select()
      .single();

    if (documentError) {
      console.error('Error storing text document metadata for user:', userId, documentError.message);
      return res.status(500).json({ success: false, message: 'Failed to store text document metadata.' });
    }

    documentId = documentData.id; // Assign to outer scope variable for cleanup

    // 2. Chunk the extracted text
    const chunks = chunkText(text);
    if (chunks.length === 0) {
            const { error: cleanupErr } = await supabase.from('documents').delete().eq('id', documentId);
      if (cleanupErr) console.error('Cleanup metadata error:', cleanupErr.message);
      return res.status(422).json({ success: false, message: 'No text could be chunked from the provided content. Document processing halted.' });
    }
    
    const chunkInserts = [];
    // 3. Generate embeddings for each chunk and prepare for batch insert
    for (const chunk of chunks) {
      let embedding;
      try {
        embedding = await getEmbeddings(chunk);
      } catch (embeddingError) {
        console.error('Error generating embedding for a chunk of text document:', documentId, 'for user:', userId, embeddingError.message);
        const { error: cleanupErr } = await supabase.from('documents').delete().eq('id', documentId);
        if (cleanupErr) console.error('Cleanup metadata error:', cleanupErr.message);
        return res.status(500).json({ success: false, message: `Failed to generate embeddings for text document chunks: ${embeddingError.message}. Document processing halted.` });
      }
      
      chunkInserts.push({
        document_id: documentId,
        content: chunk,
        embedding: embedding,
      });
    }

    // 4. Store chunks and embeddings in Supabase
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkInserts);

    if (chunksError) {
      console.error('Error storing text document chunks for document:', documentId, 'for user:', userId, chunksError.message);
      const { error: cleanupErr } = await supabase.from('documents').delete().eq('id', documentId);
      if (cleanupErr) console.error('Cleanup metadata error:', cleanupErr.message);
      return res.status(500).json({ success: false, message: 'Failed to store text document chunks and embeddings. Document processing halted.' });
    }

    return res.status(200).json({ success: true, message: 'Text document uploaded and processed successfully.', documentId: documentId });

  } catch (err) {
    console.error('Critical error in POST /api/upload-text route for user:', userId, err.message);
    // General catch-all cleanup
    if (documentId) {
        const { error: cleanupErr } = await supabase.from('documents').delete().eq('id', documentId);
        if (cleanupErr) console.error('Final cleanup error for text document metadata:', cleanupErr.message);
    }
    return res.status(500).json({ success: false, message: `An unexpected internal server error occurred during text document upload: ${err.message}` });
  }
});

export default router;
