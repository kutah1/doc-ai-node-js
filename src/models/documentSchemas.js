import { z } from 'zod';

export const askSchema = z.object({
  question: z.string().min(1, { message: "Question cannot be empty" }),
  // documentId is optional; if not provided, search all user's documents
  documentId: z.string().uuid({ message: "Invalid document ID" }).optional(),
  // conversationId is optional; if provided, messages from this conversation will be used as context
  conversationId: z.string().uuid({ message: "Invalid conversation ID" }).optional(),
});

// This schema can be used in a validation middleware before multer processes the file.
// For now, we are mostly relying on multer's file filter.
export const uploadSchema = z.object({
  // Zod doesn't handle file uploads directly.
  // This is a placeholder for potential future metadata validation.
});

export const uploadTextSchema = z.object({
  text: z.string().min(1, { message: "Text content cannot be empty" }),
  title: z.string().min(1, { message: "Document title is required and cannot be empty" }),
});
