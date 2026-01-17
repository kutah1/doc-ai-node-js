-- Drop tables and functions if they exist to ensure a clean slate for recreation/update
DROP TABLE IF EXISTS api_keys CASCADE; -- CASCADE will drop dependent objects, if any

DROP FUNCTION IF EXISTS match_document_chunks(vector, uuid, float, int);

-- Enable the vector extension (if not already enabled)
create extension if not exists vector;

-- Create the api_keys table for multi-tenancy and API key management
-- NOTE: In a production environment, store hashed API keys, not plain text.
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  api_key text unique not null, -- For this example, plain text. Hashed in production.
  name text not null,
  created_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  is_active boolean default true not null
);

-- Optional: Create an index on api_key for faster lookups
create index idx_api_keys_api_key on api_keys (api_key);

-- Update/Create the RPC function for vector similarity search with multi-tenancy support
create function match_document_chunks (
  query_embedding vector(768),
  owner_id uuid, -- New parameter for multi-tenancy
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  join documents on document_chunks.document_id = documents.id
  wheres
    documents.owner_id = match_document_chunks.owner_id -- Filter by owner_id
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;