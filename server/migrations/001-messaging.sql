CREATE TABLE IF NOT EXISTS hub_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL,
  subject text NOT NULL,
  name text NOT NULL,
  clerk_user_id text NOT NULL UNIQUE,
  UNIQUE (issuer, subject)
);
CREATE TABLE IF NOT EXISTS hub_sessions (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS hub_sessions_expire ON hub_sessions(expire);
CREATE TABLE IF NOT EXISTS hub_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES hub_users(id),
  user_b uuid NOT NULL REFERENCES hub_users(id),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE TABLE IF NOT EXISTS hub_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES hub_conversations(id),
  sender_id uuid NOT NULL REFERENCES hub_users(id),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hub_messages_conversation ON hub_messages(conversation_id, id DESC);
CREATE TABLE IF NOT EXISTS hub_reads (
  conversation_id uuid NOT NULL REFERENCES hub_conversations(id),
  user_id uuid NOT NULL REFERENCES hub_users(id),
  last_message_id bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);
