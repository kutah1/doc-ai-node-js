# API Endpoints for Postman Collection

This document outlines the API endpoints, their methods, paths, request bodies, and expected responses, suitable for creating a Postman collection.

---

## 1. API Keys Management (`src/routes/apiKeys.js`)

### POST /api-keys

*   **Description:** Create a new API key.
*   **Authentication:** Required (JWT or existing API Key).
*   **Request Body:**
    ```json
    {
      "name": "string" // A descriptive name for the API key (e.g., "My App Key")
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "API Key created successfully.",
      "apiKey": {
        "id": "uuid",          // Unique ID of the API key
        "name": "string",      // Name provided for the API key
        "api_key": "uuid",     // The generated API key (UUID format)
        "created_at": "timestamp",
        "last_used_at": "timestamp | null",
        "is_active": "boolean" // Whether the API key is active
      }
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to create API key."
    }
    ```

### GET /api-keys

*   **Description:** List all API keys for the authenticated user.
*   **Authentication:** Required (JWT or existing API Key).
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "API keys retrieved successfully.",
      "apiKeys": [
        {
          "id": "uuid",
          "name": "string",
          "api_key": "uuid",
          "created_at": "timestamp",
          "last_used_at": "timestamp | null",
          "is_active": "boolean"
        }
      ]
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to fetch API keys."
    }
    ```

### DELETE /api-keys/:keyId

*   **Description:** Delete a specific API key.
*   **Authentication:** Required (JWT or existing API Key).
*   **Request Parameters:**
    *   `keyId`: (string, UUID) The ID of the API key to delete.
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "API Key deleted successfully."
    }
    ```
*   **Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Invalid API key ID format. Must be a UUID."
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to delete API key."
    }
    ```

---

## 2. Asking Questions (`src/routes/ask.js`)

### POST /ask

*   **Description:** Authenticated endpoint for asking questions, leveraging document context and AI completion.
*   **Authentication:** Required (JWT or existing API Key).
*   **Request Body:**
    ```json
    {
      "question": "string",           // The question to ask
      "documentId": "uuid | null",    // Optional: If provided, filter relevant chunks to this document
      "conversationId": "uuid | null" // Optional: If provided, continue an existing conversation
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Question answered successfully.",
      "answer": "string",             // The AI's answer
      "conversationId": "uuid"        // The ID of the conversation (new or existing)
    }
    ```
*   **Response (404 Not Found - No Context):**
    ```json
    {
      "success": false,
      "message": "No relevant document context found to answer the question, or no chunks found for the specified document."
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Error message details (e.g., 'Failed to generate embedding...', 'Failed to create new conversation...', 'Failed to get an answer from the AI...', 'An unexpected internal server error occurred...')"
    }
    ```

---

## 3. Authentication (`src/routes/auth.js`)

### POST /auth/signup

*   **Description:** Register a new user.
*   **Authentication:** Not required.
*   **Request Body:**
    ```json
    {
      "email": "string",    // User's email address
      "password": "string"  // User's password
    }
    ```
*   **Response (201 Created - User logged in):**
    ```json
    {
      "success": true,
      "message": "Signup successful, user logged in.",
      "user": {
        "id": "uuid",
        "email": "string"
      },
      "session": "string" // JWT access token for the new session
    }
    ```
*   **Response (202 Accepted - Email confirmation required):**
    ```json
    {
      "success": true,
      "message": "Signup initiated. Please check your email to confirm your account.",
      "user": {
        "id": "uuid",
        "email": "string"
      }
    }
    ```
*   **Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Error message from Supabase (e.g., 'User already registered', 'Password too weak')"
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Internal server error during signup."
    }
    ```

### POST /auth/login

*   **Description:** Log in an existing user.
*   **Authentication:** Not required.
*   **Request Body:**
    ```json
    {
      "email": "string",    // User's email address
      "password": "string"  // User's password
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Login successful.",
      "user": {
        "id": "uuid",
        "email": "string"
      },
      "session": "string" // JWT access token for the session
    }
    ```
*   **Response (401 Unauthorized):**
    ```json
    {
      "success": false,
      "message": "Invalid login credentials."
    }
    ```
*   **Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Error message from Supabase (e.g., due to unconfirmed email)"
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Internal server error during login."
    }
    ```

---

## 4. Conversations Management (`src/routes/conversations.js`)

### GET /api/conversations

*   **Description:** List all conversations for the authenticated user.
*   **Authentication:** Required (JWT or API Key).
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Conversations retrieved successfully.",
      "conversations": [
        {
          "id": "uuid",         // Unique ID of the conversation
          "title": "string",    // Title of the conversation
          "created_at": "timestamp"
        }
      ]
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to fetch conversations."
    }
    ```

### GET /api/conversations/:conversationId

*   **Description:** Get all messages for a specific conversation.
*   **Authentication:** Required (JWT or API Key).
*   **Request Parameters:**
    *   `conversationId`: (string, UUID) The ID of the conversation to retrieve messages from.
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Messages retrieved successfully.",
      "messages": [
        {
          "id": "uuid",
          "role": "string",     // e.g., "user", "assistant"
          "content": "string",  // The message content
          "created_at": "timestamp"
        }
      ]
    }
    ```
*   **Response (404 Not Found):**
    ```json
    {
      "success": false,
      "message": "Conversation not found or you do not have permission to view it."
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to fetch messages."
    }
    ```

---

## 5. Documents Management (`src/routes/documents.js`)

### POST /upload-doc

*   **Description:** Authenticated endpoint for uploading documents. The file is uploaded as `multipart/form-data`.
*   **Authentication:** Required (JWT or API Key).
*   **Request Body (`multipart/form-data`):**
    *   `document`: (File) The document file to upload (e.g., PDF, TXT).
    *   `title`: (String) The title of the document.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Document uploaded and processed successfully.",
      "documentId": "uuid" // The ID of the newly created document
    }
    ```
*   **Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "No file uploaded. Please include a document."
    }
    ```
    or
    ```json
    {
      "success": false,
      "message": "Document title is required and cannot be empty."
    }
    ```
*   **Response (422 Unprocessable Entity):**
    ```json
    {
      "success": false,
      "message": "Failed to extract text from document: [error message]"
    }
    ```
    or
    ```json
    {
      "success": false,
      "message": "No text could be extracted or chunked from the document. Document processing halted."
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Error message details (e.g., 'Failed to upload document to storage...', 'Failed to store document metadata...', 'Failed to generate embeddings...', 'Failed to store document chunks...', 'An unexpected internal server error occurred...')"
    }
    ```

### GET /api/documents

*   **Description:** List all documents for the authenticated user.
*   **Authentication:** Required (JWT or API Key).
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Documents retrieved successfully.",
      "documents": [
        {
          "id": "uuid",         // Unique ID of the document
          "title": "string",    // Title of the document
          "source": "string",   // Path to the file in Supabase storage (if applicable)
          "created_at": "timestamp"
        }
      ]
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to fetch documents."
    }
    ```

### DELETE /api/documents/:documentId

*   **Description:** Delete a specific document and its associated file from storage.
*   **Authentication:** Required (JWT or API Key).
*   **Request Parameters:**
    *   `documentId`: (string, UUID) The ID of the document to delete.
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Document deleted successfully."
    }
    ```
*   **Response (404 Not Found):**
    ```json
    {
      "success": false,
      "message": "Document not found or you do not have permission to delete it."
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to delete document."
    }
    ```

---

## 6. Metrics Management (`src/routes/metrics.js`)

### GET /api/metrics

*   **Description:** Retrieve usage metrics for the authenticated user.
*   **Authentication:** Required (JWT or API Key).
*   **Request:** No body.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Usage metrics retrieved successfully.",
      "metrics": [
        {
          "id": "uuid",
          "user_id": "uuid",
          "api_key_id": "uuid | null",      // ID of the API key used for the event (if applicable)
          "event_type": "string",           // e.g., "api_call", "document_upload"
          "event_details": "jsonb",         // JSON object with event-specific details
          "created_at": "timestamp"
        }
      ]
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Failed to retrieve usage metrics."
    }
    ```

---

## 7. Text Upload (`src/routes/text.js`)

### POST /api/upload-text

*   **Description:** Authenticated endpoint for uploading plain text content as a document.
*   **Authentication:** Required (JWT or API Key).
*   **Request Body:**
    ```json
    {
      "text": "string",     // The plain text content to upload
      "title": "string"     // The title of the text document
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Text document uploaded and processed successfully.",
      "documentId": "uuid" // The ID of the newly created text document
    }
    ```
*   **Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Text content cannot be empty."
    }
    ```
    or
    ```json
    {
      "success": false,
      "message": "Document title is required and cannot be empty."
    }
    ```
*   **Response (422 Unprocessable Entity):**
    ```json
    {
      "success": false,
      "message": "No text could be chunked from the provided content. Document processing halted."
    }
    ```
*   **Response (500 Internal Server Error):**
    ```json
    {
      "success": false,
      "message": "Error message details (e.g., 'Failed to store text document metadata.', 'Failed to generate embeddings...', 'Failed to store text document chunks...', 'An unexpected internal server error occurred...')"
    }
    ```