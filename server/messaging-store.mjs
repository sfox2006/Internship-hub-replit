const groupIdPattern = /^grp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MessagingStore {
  constructor(pool) {
    this.pool = pool;
  }

  async ensureUser({ clerkUserId, name }) {
    if (typeof name !== "string" || !name.trim())
      throw new Error("A real first and last name is required");
    const result = await this.pool.query(
      `INSERT INTO hub_users (issuer,subject,name,clerk_user_id)
       VALUES ('urn:cis:clerk-session',$1,$2,$1)
       ON CONFLICT (clerk_user_id) DO UPDATE SET name=excluded.name
       RETURNING id,name,clerk_user_id`,
      [clerkUserId, name.trim()],
    );
    return result.rows[0];
  }

  async updateUserName(id, name) {
    if (typeof name !== "string" || !name.trim()) return;
    await this.pool.query("UPDATE hub_users SET name=$2 WHERE id=$1", [
      id,
      name.trim(),
    ]);
  }

  async users(id) {
    return (
      await this.pool.query(
        `SELECT h.id, h.name, h.clerk_user_id
         FROM hub_users h
         JOIN app_enrollments e
           ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
         WHERE h.id <> $1
         ORDER BY h.name, h.id`,
        [id],
      )
    ).rows;
  }

  async inbox(id) {
    return (
      await this.pool.query(
        `SELECT c.id, 'direct'::text AS kind,
          u.id AS peer_id, u.name AS peer_name,
          m.body AS last_body, m.created_at AS last_at,
          (SELECT count(*)::int
           FROM hub_messages n
           WHERE n.conversation_id=c.id AND n.sender_id<>$1
             AND n.id > coalesce(r.last_message_id,0)) AS unread
         FROM hub_conversations c
         JOIN hub_users u
           ON u.id=CASE WHEN c.user_a=$1 THEN c.user_b ELSE c.user_a END
         JOIN app_enrollments e
           ON e.clerk_user_id=u.clerk_user_id AND e.status='approved'
         LEFT JOIN LATERAL (
           SELECT body, created_at, id FROM hub_messages
           WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1
         ) m ON true
         LEFT JOIN hub_reads r ON r.conversation_id=c.id AND r.user_id=$1
         WHERE $1 IN (c.user_a,c.user_b)
         ORDER BY m.id DESC NULLS LAST, c.id`,
        [id],
      )
    ).rows;
  }

  async groupInbox(id) {
    return (
      await this.pool.query(
        `SELECT g.id, 'group'::text AS kind, g.group_name,
          m.body AS last_body, m.created_at AS last_at,
          (SELECT count(*)::int
           FROM hub_group_messages n
           WHERE n.group_id=g.id AND n.sender_id<>$1
             AND n.id > coalesce(r.last_message_id,0)) AS unread
         FROM hub_group_conversations g
         JOIN hub_group_members mine ON mine.group_id=g.id AND mine.user_id=$1
         JOIN hub_users self ON self.id=$1
         JOIN app_enrollments e
           ON e.clerk_user_id=self.clerk_user_id AND e.status='approved'
         LEFT JOIN LATERAL (
           SELECT body, created_at, id FROM hub_group_messages
           WHERE group_id=g.id ORDER BY id DESC LIMIT 1
         ) m ON true
         LEFT JOIN hub_group_reads r ON r.group_id=g.id AND r.user_id=$1
         ORDER BY m.id DESC NULLS LAST, g.created_at DESC`,
        [id],
      )
    ).rows;
  }

  async start(id, peer) {
    if (id === peer) return null;
    const result = await this.pool.query(
      `INSERT INTO hub_conversations (user_a,user_b)
       SELECT least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid)
       WHERE EXISTS (
         SELECT 1 FROM hub_users h
         JOIN app_enrollments e
           ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
         WHERE h.id=$2
       )
       ON CONFLICT (user_a,user_b) DO UPDATE SET user_a=excluded.user_a
       RETURNING id`,
      [id, peer],
    );
    return result.rows[0] ?? null;
  }

  async createGroup({ id, name, createdBy, memberIds }) {
    const result = await this.pool.query(
      `WITH requested AS (
         SELECT DISTINCT unnest($3::uuid[]) AS user_id
       ),
       eligible AS (
         SELECT h.id
         FROM hub_users h
         JOIN app_enrollments e
           ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
         JOIN requested r ON r.user_id=h.id
       ),
       created AS (
         INSERT INTO hub_group_conversations (id,group_name,created_by)
         SELECT $1,$2,$4
         WHERE cardinality($3::uuid[]) >= 3
           AND (SELECT count(*) FROM eligible)=cardinality($3::uuid[])
         RETURNING id,group_name
       ),
       members AS (
         INSERT INTO hub_group_members (group_id,user_id)
         SELECT created.id,eligible.id
         FROM created CROSS JOIN eligible
         RETURNING group_id
       )
       SELECT created.id,created.group_name
       FROM created JOIN members ON members.group_id=created.id
       GROUP BY created.id,created.group_name
       HAVING count(*)=cardinality($3::uuid[])`,
      [id, name, memberIds, createdBy],
    );
    return result.rows[0] ?? null;
  }

  async groupDetails(userId, groupId) {
    const group = (
      await this.pool.query(
        `SELECT g.id,g.group_name
         FROM hub_group_conversations g
         JOIN hub_group_members mine
           ON mine.group_id=g.id AND mine.user_id=$2
         JOIN hub_users self ON self.id=$2
         JOIN app_enrollments e
           ON e.clerk_user_id=self.clerk_user_id AND e.status='approved'
         WHERE g.id=$1`,
        [groupId, userId],
      )
    ).rows[0];
    if (!group) return null;
    const members = (
      await this.pool.query(
        `SELECT h.id,h.name,h.clerk_user_id
         FROM hub_group_members gm
         JOIN hub_users h ON h.id=gm.user_id
         JOIN app_enrollments e
           ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
         WHERE gm.group_id=$1
         ORDER BY h.name,h.id`,
        [groupId],
      )
    ).rows;
    return { ...group, members };
  }

  async participant(id, conversation) {
    if (groupIdPattern.test(conversation))
      return this.groupParticipant(id, conversation);
    return (
      await this.pool.query(
        `SELECT c.id
         FROM hub_conversations c
         JOIN hub_users a ON a.id=c.user_a
         JOIN app_enrollments ea
           ON ea.clerk_user_id=a.clerk_user_id AND ea.status='approved'
         JOIN hub_users b ON b.id=c.user_b
         JOIN app_enrollments eb
           ON eb.clerk_user_id=b.clerk_user_id AND eb.status='approved'
         WHERE c.id=$1 AND $2 IN (c.user_a,c.user_b)`,
        [conversation, id],
      )
    ).rowCount > 0;
  }

  async groupParticipant(id, groupId) {
    return (
      await this.pool.query(
        `SELECT g.id
         FROM hub_group_conversations g
         JOIN hub_group_members gm ON gm.group_id=g.id AND gm.user_id=$2
         JOIN hub_users h ON h.id=$2
         JOIN app_enrollments e
           ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
         WHERE g.id=$1`,
        [groupId, id],
      )
    ).rowCount > 0;
  }

  async history(id, conversation, before) {
    if (groupIdPattern.test(conversation))
      return this.groupHistory(id, conversation, before);
    // Authorization is repeated in the data query, even after route checks.
    return (
      await this.pool.query(
        `SELECT m.id::text, m.sender_id, m.body, m.created_at
         FROM hub_messages m
         JOIN hub_conversations c ON c.id=m.conversation_id
         JOIN hub_users a ON a.id=c.user_a
         JOIN app_enrollments ea
           ON ea.clerk_user_id=a.clerk_user_id AND ea.status='approved'
         JOIN hub_users b ON b.id=c.user_b
         JOIN app_enrollments eb
           ON eb.clerk_user_id=b.clerk_user_id AND eb.status='approved'
         WHERE c.id=$1 AND $2 IN (c.user_a,c.user_b)
           AND ($3::bigint IS NULL OR m.id<$3)
         ORDER BY m.id DESC LIMIT 100`,
        [conversation, id, before ?? null],
      )
    ).rows.reverse();
  }

  async groupHistory(id, groupId, before) {
    return (
      await this.pool.query(
        `SELECT m.id::text,m.sender_id,h.name AS sender_name,m.body,m.created_at
         FROM hub_group_messages m
         JOIN hub_group_conversations g ON g.id=m.group_id
         JOIN hub_group_members mine
           ON mine.group_id=g.id AND mine.user_id=$2
         JOIN hub_users self ON self.id=$2
         JOIN app_enrollments e
           ON e.clerk_user_id=self.clerk_user_id AND e.status='approved'
         JOIN hub_group_members sender_member
           ON sender_member.group_id=g.id AND sender_member.user_id=m.sender_id
         JOIN hub_users h ON h.id=m.sender_id
         WHERE g.id=$1 AND ($3::bigint IS NULL OR m.id<$3)
         ORDER BY m.id DESC LIMIT 100`,
        [groupId, id, before ?? null],
      )
    ).rows.reverse();
  }

  async send(id, conversation, body) {
    if (groupIdPattern.test(conversation))
      return this.sendGroup(id, conversation, body);
    return (
      await this.pool.query(
        `INSERT INTO hub_messages(conversation_id,sender_id,body)
         SELECT c.id,$2,$3 FROM hub_conversations c
         JOIN hub_users a ON a.id=c.user_a
         JOIN app_enrollments ea
           ON ea.clerk_user_id=a.clerk_user_id AND ea.status='approved'
         JOIN hub_users b ON b.id=c.user_b
         JOIN app_enrollments eb
           ON eb.clerk_user_id=b.clerk_user_id AND eb.status='approved'
         WHERE c.id=$1 AND $2 IN (c.user_a,c.user_b)
         RETURNING id::text,sender_id,body,created_at`,
        [conversation, id, body],
      )
    ).rows[0] ?? null;
  }

  async sendGroup(id, groupId, body) {
    return (
      await this.pool.query(
        `INSERT INTO hub_group_messages(group_id,sender_id,body)
         SELECT g.id,$2,$3
         FROM hub_group_conversations g
         JOIN hub_group_members gm
           ON gm.group_id=g.id AND gm.user_id=$2
         JOIN hub_users h ON h.id=$2
         JOIN app_enrollments e
           ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
         WHERE g.id=$1
         RETURNING id::text,sender_id,body,created_at`,
        [groupId, id, body],
      )
    ).rows[0] ?? null;
  }

  async read(id, conversation, through) {
    if (groupIdPattern.test(conversation))
      return this.readGroup(id, conversation, through);
    await this.pool.query(
      `INSERT INTO hub_reads(conversation_id,user_id,last_message_id)
       SELECT c.id,$2,m.id FROM hub_conversations c
       JOIN hub_messages m ON m.conversation_id=c.id
       JOIN hub_users a ON a.id=c.user_a
       JOIN app_enrollments ea
         ON ea.clerk_user_id=a.clerk_user_id AND ea.status='approved'
       JOIN hub_users b ON b.id=c.user_b
       JOIN app_enrollments eb
         ON eb.clerk_user_id=b.clerk_user_id AND eb.status='approved'
       WHERE c.id=$1 AND $2 IN (c.user_a,c.user_b) AND m.id=$3
       ON CONFLICT(conversation_id,user_id) DO UPDATE
         SET last_message_id=greatest(hub_reads.last_message_id,excluded.last_message_id)`,
      [conversation, id, through],
    );
  }

  async readGroup(id, groupId, through) {
    await this.pool.query(
      `INSERT INTO hub_group_reads(group_id,user_id,last_message_id)
       SELECT g.id,$2,m.id
       FROM hub_group_conversations g
       JOIN hub_group_members gm ON gm.group_id=g.id AND gm.user_id=$2
       JOIN hub_users h ON h.id=$2
       JOIN app_enrollments e
         ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
       JOIN hub_group_messages m
         ON m.group_id=g.id AND m.id=$3
       WHERE g.id=$1
       ON CONFLICT(group_id,user_id) DO UPDATE
         SET last_message_id=greatest(hub_group_reads.last_message_id,excluded.last_message_id)`,
      [groupId, id, through],
    );
  }
}
