# DocSense AI – Policy & Document Interpreter

## Project Overview

DocSense AI is a backend-only, institutional-grade RAG (Retrieval-Augmented Generation) system built with Node.js and Express.js. It is designed to ingest documents, securely store them with per-user ownership, and provide an authenticated API to answer questions strictly grounded in the content of those documents.

This system is intended for institutions such as schools, NGOs, and SMEs that need to manage and interpret critical documents, reducing the risk of policy misuse and administrative errors.

## Features

*   **Secure User Management:** Full authentication system with JWT-based signup and login.
*   **Multi-Tenant Data Isolation:** Documents and data are strictly isolated on a per-user basis at the database level using Supabase's Row Level Security (RLS).
*   **Document Upload:** Supports uploading plain text, `.txt`, `.pdf`, and `.docx` files.
*   **Retrieval-Augmented Generation (RAG):** Uses an embedding-based retrieval system to find relevant document chunks and an LLM to generate answers grounded in that context.
*   **Grounded Answering:** The AI is strictly instructed to answer **only** from the provided document context. If an answer is not present, it will say so, preventing hallucinations.
*   **API Key Management:** Authenticated users can generate and manage their own API keys to interact with the service programmatically.
*   **Usage Metrics:** Tracks token usage for both user sessions and API keys.

## System Architecture

The application follows a simple, robust architecture:

```
Client (e.g., Postman, curl, custom app)
        |
        v
Auth Middleware (JWT or API Key)
        |
        v
Express.js Backend
        |
        v
+----------------+      +-----------------+
| Embedding      |----->| Supabase        |
| Service        |      | (Postgres,      |
| (Google AI)    |<-----|  pgvector,      |
+----------------+      |  Storage)       |
                        +-----------------+
        |
        v
OpenRouter (LLM for grounded reasoning)
```

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   A Supabase project with the `pgvector` extension enabled.
*   A Google AI API Key for embeddings.
*   An OpenRouter API Key for the LLM.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the `.env.example` file. Then, fill in the required values.
    ```bash
    cp .env.example .env
    ```

4.  **Set up the database:**
    Execute the SQL commands in `combine.sql` in your Supabase SQL editor to create the necessary tables, functions, and policies.

### Running the Application

*   **To run the server:**
    ```bash
    npm start
    ```

*   **To run in development mode (with auto-reloading):**
    ```bash
    npm run dev
    ```

The server will be running at `http://localhost:3000`.

## Environment Variables

The following environment variables must be set in your `.env` file:

*   `SUPABASE_URL`: The URL of your Supabase project.
*   `SUPABASE_ANON_KEY`: The `anon` key for your Supabase project.
*   `GOOGLE_API_KEY`: Your API key for Google AI services (for embeddings).
*   `OPENROUTER_API_KEY`: Your API key for OpenRouter (for the LLM).
*   `OPENROUTER_MODEL`: (Optional) The LLM model to use from OpenRouter (defaults to `mistralai/devstral-2512:free`).
*   `PORT`: (Optional) The port for the server to run on (defaults to `3000`).

## API Endpoints

All protected endpoints require authentication via either a `Bearer` token (`Authorization: Bearer <JWT>`) or an API key (`X-API-Key: <API_KEY>`).

### Authentication

*   **`POST /auth/signup`**: Registers a new user.
*   **`POST /auth/login`**: Authenticates a user and returns a session JWT.

### API Keys

*   **`GET /api/api-keys`**: Lists all API keys for the authenticated user.
*   **`POST /api/api-keys`**: Creates a new API key.
*   **`DELETE /api/api-keys/:keyId`**: Deletes a specific API key.

### Documents & RAG

*   **`POST /api/upload-text`**: Uploads and processes a plain text document.
*   **`POST /api/upload-doc`**: Uploads and processes a file (`.txt`, `.pdf`, `.docx`).
*   **`POST /api/ask`**: Asks a question about a specific document.

### Metrics

*   **`GET /api/metrics`**: Retrieves usage metrics for the authenticated user.

## Technologies Used

*   **Backend:** Node.js, Express.js
*   **Database:** Supabase (PostgreSQL with `pgvector`)
*   **Authentication:** Supabase Auth (JWTs), Custom API Keys
*   **Embeddings:** Google AI (`text-embedding-004`)
*   **LLM:** OpenRouter
*   **Validation:** Zod
*   **File Handling:** Multer, pdf-parse, mammoth
