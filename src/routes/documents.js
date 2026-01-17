import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { extractTextFromFile } from '../utils/fileProcessor.js';
import { chunkText } from '../utils/chunker.js';
import { getEmbeddings } from '../services/embeddingService.js';
import supabase from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// POST /upload-doc - Authenticated endpoint for uploading documents
router.post(
  '/upload-doc',
  authenticate,
  upload.single('document'),
  async (req, res) => {
    let documentId = null;
    let filePathInStorage = null;

    try {
      let cleanupErrorResult = null;

      const userId = req.userId;
      const file = req.file;
      const { title } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please include a document.',
        });
      }

      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Document title is required and cannot be empty.',
        });
      }

      const fileName = file.originalname;
      filePathInStorage = `${userId}/${uuidv4()}/${fileName}`;

      // 1. Upload file to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePathInStorage, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageError) {
        console.error(
          'Error uploading file to Supabase Storage for user:',
          userId,
          storageError.message
        );
        return res.status(500).json({
          success: false,
          message: `Failed to upload document to storage: ${storageError.message}`,
        });
      }

      // 2. Extract text from file
      let extractedText;
      try {
        extractedText = await extractTextFromFile(
          file.buffer,
          file.mimetype
        );
      } catch (extractError) {
        console.error(
          'Error extracting text from uploaded file for user:',
          userId,
          extractError.message
        );

        ({ error: cleanupErrorResult } = await supabase.storage
          .from('documents')
          .remove([filePathInStorage]));

        if (cleanupErrorResult) {
          console.error(
            'Cleanup storage error:',
            cleanupErrorResult.message
          );
        }

        return res.status(422).json({
          success: false,
          message: `Failed to extract text from document: ${extractError.message}`,
        });
      }

      // 3. Store document metadata
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert([
          {
            owner_id: userId,
            title,
            source: filePathInStorage,
          },
        ])
        .select()
        .single();

      if (documentError) {
        ({ error: cleanupErrorResult } = await supabase.storage
          .from('documents')
          .remove([filePathInStorage]));

        if (cleanupErrorResult) {
          console.error(
            'Cleanup storage error:',
            cleanupErrorResult.message
          );
        }

        return res.status(500).json({
          success: false,
          message: 'Failed to store document metadata.',
        });
      }

      documentId = documentData.id;

      // 4. Chunk text
      const chunks = chunkText(extractedText);

    if (chunks.length === 0) {
      console.warn('No chunks generated for document:', documentId, 'for user:', userId);
      ({ error: cleanupErrorResult } = await supabase.from('documents').delete().eq('id', documentId));
      if (cleanupErrorResult) console.error('Cleanup metadata error:', cleanupErrorResult.message);
      ({ error: cleanupErrorResult } = await supabase.storage.from('documents').remove([filePathInStorage]));
      if (cleanupErrorResult) console.error('Cleanup storage error:', cleanupErrorResult.message);
      return res.status(422).json({ success: false, message: 'No text could be extracted or chunked from the document. Document processing halted.' });
    }

      // 5. Generate embeddings
      const chunkInserts = [];

      for (const chunk of chunks) {
        let embedding;

        try {
          embedding = await getEmbeddings(chunk);
        } catch (embeddingError) {
          await supabase.from('documents').delete().eq('id', documentId);
          await supabase.storage
            .from('documents')
            .remove([filePathInStorage]);

          return res.status(500).json({
            success: false,
            message: `Failed to generate embeddings for document chunks: ${embeddingError.message}. Document processing halted.`,
          });
        }

        chunkInserts.push({
          document_id: documentId,
          content: chunk,
          embedding,
        });
      }

      // 6. Store chunks
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(chunkInserts);

      if (chunksError) {
        console.error(
          'Error storing document chunks for document:',
          documentId,
          'for user:',
          userId,
          chunksError.message
        );

        await supabase.from('documents').delete().eq('id', documentId);
        await supabase.storage
          .from('documents')
          .remove([filePathInStorage]);

        return res.status(500).json({
          success: false,
          message:
            'Failed to store document chunks and embeddings. Document processing halted.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Document uploaded and processed successfully.',
        documentId,
      });
    } catch (err) {
      console.error(
        'Critical error in POST /upload-doc route for user:',
        req.userId,
        err.message
      );

      if (documentId) {
        const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentId);

        if (error) {
          console.error(
            'Final cleanup error for document metadata:',
            error.message
          );
        }
      }

      if (filePathInStorage) {
        const { error } = await supabase.storage
          .from('documents')
          .remove([filePathInStorage]);

        if (error) {
          console.error(
            'Final cleanup error for storage object:',
            error.message
          );
        }
      }

      return res.status(500).json({
        success: false,
        message:
          'An unexpected internal server error occurred during document upload.',
      });
    }
  }
);

// GET /api/documents - List all documents for the authenticated user
router.get('/documents', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabase
      .from('documents')
      .select('id, title, source, created_at')
      .eq('owner_id', userId);

    if (error) {
      console.error('Error fetching documents for user:', userId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
    }

    return res.status(200).json({ success: true, message: 'Documents retrieved successfully.', documents: data });

  } catch (err) {
    console.error('Error in GET /api/documents route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during document retrieval.' });
  }
});

// DELETE /api/documents/:documentId - Delete a specific document
router.delete('/documents/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId;

    // First, get the document to get the file path from storage
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('source')
      .eq('id', documentId)
      .eq('owner_id', userId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ success: false, message: 'Document not found or you do not have permission to delete it.' });
    }

    // Delete the file from storage
    if (document.source) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.source]);

      if (storageError) {
        console.error('Error deleting document from storage:', storageError.message);
        // Don't block deletion of metadata if storage deletion fails
      }
    }

    // Delete the document from the database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Error deleting document from database:', deleteError.message);
      return res.status(500).json({ success: false, message: 'Failed to delete document.' });
    }

    return res.status(200).json({ success: true, message: 'Document deleted successfully.' });

  } catch (err) {
    console.error('Error in DELETE /api/documents/:documentId route:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during document deletion.' });
  }
});

export default router;
