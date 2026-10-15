-- Group conversations are stored separately so existing direct-chat rows,
-- identifiers, messages, and read markers remain unchanged.
CREATE TABLE IF NOT EXISTS hub_group_conversations (
  id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL
    CHECK (length(btrim(group_name)) BETWEEN 1 AND 80),
  created_by UUID NOT NULL REFERENCES hub_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id ~ '^grp_[0-9a-f-]{36}$')
);

CREATE TABLE IF NOT EXISTS hub_group_members (
  group_id TEXT NOT NULL
    REFERENCES hub_group_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hub_users(id),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS hub_group_members_user_idx
  ON hub_group_members (user_id, group_id);

CREATE TABLE IF NOT EXISTS hub_group_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id TEXT NOT NULL
    REFERENCES hub_group_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (group_id, sender_id)
    REFERENCES hub_group_members (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS hub_group_messages_conversation_idx
  ON hub_group_messages (group_id, id DESC);

CREATE TABLE IF NOT EXISTS hub_group_reads (
  group_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  last_message_id BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id, user_id)
    REFERENCES hub_group_members (group_id, user_id) ON DELETE CASCADE
);
