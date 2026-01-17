-- Enable Row Level Security (RLS) on tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policies for 'documents' table
DROP POLICY IF EXISTS "Users can view their own documents." ON documents;
CREATE POLICY "Users can view their own documents." ON documents
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own documents." ON documents;
CREATE POLICY "Users can insert their own documents." ON documents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own documents." ON documents;
CREATE POLICY "Users can update their own documents." ON documents
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own documents." ON documents;
CREATE POLICY "Users can delete their own documents." ON documents
  FOR DELETE USING (auth.uid() = owner_id);

-- Policies for 'document_chunks' table
-- Note: document_chunks are inherently tied to documents, so policies
-- need to ensure the user owns the parent document.
DROP POLICY IF EXISTS "Users can view chunks of their own documents." ON document_chunks;
CREATE POLICY "Users can view chunks of their own documents." ON document_chunks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert chunks into their own documents." ON document_chunks;
CREATE POLICY "Users can insert chunks into their own documents." ON document_chunks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update chunks of their own documents." ON document_chunks;
CREATE POLICY "Users can update chunks of their own documents." ON document_chunks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete chunks from their own documents." ON document_chunks;
CREATE POLICY "Users can delete chunks from their own documents." ON document_chunks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.owner_id = auth.uid())
  );

-- Policies for 'api_keys' table
DROP POLICY IF EXISTS "Users can view their own API keys." ON api_keys;
CREATE POLICY "Users can view their own API keys." ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own API keys." ON api_keys;
CREATE POLICY "Users can insert their own API keys." ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own API keys." ON api_keys;
CREATE POLICY "Users can update their own API keys." ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own API keys." ON api_keys;
CREATE POLICY "Users can delete their own API keys." ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for Supabase Storage (specifically for the 'documents' bucket)
-- This assumes your storage bucket is named 'documents'
-- Ensure you enable RLS on your 'documents' storage bucket as well in the Supabase UI.
-- You might need to adjust 'bucket_id' if your bucket name is different.

-- Allow authenticated users to upload their own files
-- IMPORTANT: This policy might need to be created/edited directly in the Supabase UI 
-- under Storage -> Buckets -> 'documents' bucket -> Policies tab
-- FOR INSERT, With CHECK: (auth.uid() = STORAGE.FILENAME_TO_UUID(name)) 
-- OR (auth.uid() = (STORAGE.GET_USER_ID_FROM_PATH(path)) if you store user_id in path)

-- Here's a generic example for a storage policy (adjust to your specific path structure if needed):
-- For 'documents' bucket
-- Policy: "Allow users to upload files to their own folder"
-- Target: INSERT operation
-- WITH CHECK: (storage.foldername(name) = auth.uid()::text) -- assuming files are in user_id/filename.ext
-- OR if your storage path is like 'user_id/uuid-filename.ext', you might need to extract user_id from path
-- A simpler policy might be to allow all authenticated users to insert, then use server-side logic to enforce ownership on retrieved files.

-- For this project, a common setup would be:
-- Bucket 'documents' policies in Supabase UI:
-- 1. "Allow authenticated users to read their own files"
--    - Target: SELECT
--    - USING expression: (storage.foldername(name) = auth.uid()::text)
-- 2. "Allow authenticated users to upload to their own folder"
--    - Target: INSERT
--    - WITH CHECK expression: (storage.foldername(name) = auth.uid()::text)
-- 3. "Allow authenticated users to update/delete their own files"
--    - Target: UPDATE, DELETE
--    - USING expression: (storage.foldername(name) = auth.uid()::text)

-- NOTE ON STORAGE POLICIES:
-- It's often more practical to manage storage bucket RLS directly in the Supabase UI,
-- as SQL policies for storage buckets can be trickier to write generically,
-- especially concerning path-based user ownership.
-- For this project, assuming the file path in storage is `${current_user_id}/${uuid.uuid4()}-${file_name}`,
-- a policy like `(storage.foldername(name) = auth.uid()::text)` for INSERT/SELECT/UPDATE/DELETE
-- should work if 'name' refers to the full path including the user_id folder.
-- However, if 'name' refers only to the file name, then more complex functions are needed.

-- For now, focus on table RLS. The storage policies should be configured in the UI.
-- For the file upload to work, the storage INSERT policy needs to be correct.
