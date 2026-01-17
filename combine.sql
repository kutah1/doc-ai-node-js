-- Ensure safe re-execution by dropping existing objects in reverse dependency order with CASCADE

-- Drop tables first, which will cascade to drop policies and foreign keys
drop table if exists usage_metrics cascade;
drop table if exists document_chunks cascade;
drop table if exists api_keys cascade;
drop table if exists documents cascade;
drop table if exists conversation_messages cascade;
drop table if exists conversations cascade;

-- Drop functions
drop function if exists match_document_chunks(vector, uuid, float, int);

-- Drop extension
drop extension if exists vector cascade;


-- Chronological creation of objects

-- Enable pgvector extension
create extension if not exists vector;

-- Table: documents
-- Stores document metadata and enforces per-user ownership.
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  source text,
  created_at timestamp with time zone default now()
);

-- Table: api_keys
-- Stores API keys for user authentication.
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  api_key text unique not null,
  name text not null,
  created_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  is_active boolean default true not null
);

-- Table: document_chunks
-- Stores chunks of documents and their embeddings.
-- Using 1024 dimensions for Qwen3-Embedding-0.6B model from OpenRouter.
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  created_at timestamp with time zone default now()
);

-- Table: usage_metrics
-- Tracks token usage for each user or API key.
create table usage_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  api_key_id uuid references api_keys(id) on delete set null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  model_name text,
  created_at timestamp with time zone default now()
);

-- Table: conversations
-- Stores conversation metadata.
create table conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamp with time zone default now()
);

-- Table: conversation_messages
-- Stores messages within a conversation.
create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null, -- 'user' or 'assistant'
  content text not null,
  created_at timestamp with time zone default now()
);


-- RPC FUNCTION: match_document_chunks
-- Searches for document chunks based on a query embedding and owner.
create or replace function match_document_chunks (
  query_embedding vector(768),
  p_owner_id uuid,
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
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    d.owner_id = match_document_chunks.p_owner_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;


-- RLS Policies for 'documents' table
alter table documents enable row level security;

create policy "Users can view their own documents"
on documents for select
using ( auth.uid() = owner_id );

create policy "Users can insert documents for themselves"
on documents for insert
with check ( auth.uid() = owner_id );

create policy "Users can update their own documents"
on documents for update
using ( auth.uid() = owner_id );

create policy "Users can delete their own documents"
on documents for delete
using ( auth.uid() = owner_id );


-- RLS Policies for 'document_chunks' table
alter table document_chunks enable row level security;

create policy "Users can view chunks of their own documents"
on document_chunks for select
using ( exists (
  select 1
  from documents
  where documents.id = document_chunks.document_id
    and documents.owner_id = auth.uid()
));

create policy "Users can insert chunks for their own documents"
on document_chunks for insert
with check ( exists (
  select 1
  from documents
  where documents.id = document_chunks.document_id
    and documents.owner_id = auth.uid()
));

create policy "Users can update chunks of their own documents"
on document_chunks for update
using ( exists (
  select 1
  from documents
  where documents.id = document_chunks.document_id
    and documents.owner_id = auth.uid()
));

create policy "Users can delete chunks of their own documents"

on document_chunks for delete

using ( exists (

  select 1

  from documents

  where documents.id = document_chunks.document_id

    and documents.owner_id = auth.uid()

));

-- RLS Policies for 'conversations' table
alter table conversations enable row level security;

create policy "Users can view their own conversations"
on conversations for select
using ( auth.uid() = owner_id );

create policy "Users can insert conversations for themselves"
on conversations for insert
with check ( auth.uid() = owner_id );

-- RLS Policies for 'conversation_messages' table
alter table conversation_messages enable row level security;

create policy "Users can view messages in their own conversations"
on conversation_messages for select
using ( exists (
  select 1
  from conversations
  where conversations.id = conversation_messages.conversation_id
    and conversations.owner_id = auth.uid()
));

create policy "Users can insert messages in their own conversations"
on conversation_messages for insert
with check ( exists (
  select 1
  from conversations
  where conversations.id = conversation_messages.conversation_id
    and conversations.owner_id = auth.uid()
));


-- Storage Bucket and Policies



-- Create a 'documents' bucket if it doesn't exist

insert into storage.buckets (id, name, public)

values ('documents', 'documents', false)

on conflict (id) do nothing; -- Use on conflict to handle idempotency for bucket creation



-- Policy: Allow users to upload files to their own folder within the 'documents' bucket

create policy "User can upload their own documents"

on storage.objects for insert with check (

  bucket_id = 'documents' and auth.uid()::text = split_part(name, '/', 1)

);



-- Policy: Allow users to view their own files in the 'documents' bucket

create policy "User can view their own documents"

on storage.objects for select using (

  bucket_id = 'documents' and auth.uid()::text = split_part(name, '/', 1)

);



-- Policy: Allow users to delete their own files in the 'documents' bucket

create policy "User can delete their own documents"

on storage.objects for delete using (

  bucket_id = 'documents' and auth.uid()::text = split_part(name, '/', 1)

);
