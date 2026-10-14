export class MessagingStore {
  constructor(pool) { this.pool = pool; }
  async users(id) {
    return (await this.pool.query(`SELECT h.id, h.name
      FROM hub_users h
      JOIN app_enrollments e ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
      WHERE h.id <> $1
      ORDER BY h.name, h.id`, [id])).rows;
  }
  async inbox(id) {
    return (await this.pool.query(`SELECT c.id, u.id AS peer_id, u.name AS peer_name,
      m.body AS last_body, m.created_at AS last_at,
      (SELECT count(*)::int FROM hub_messages n WHERE n.conversation_id=c.id AND n.sender_id<>$1
        AND n.id > coalesce(r.last_message_id,0)) AS unread
      FROM hub_conversations c JOIN hub_users u ON u.id=CASE WHEN c.user_a=$1 THEN c.user_b ELSE c.user_a END
      JOIN app_enrollments e ON e.clerk_user_id=u.clerk_user_id AND e.status='approved'
      LEFT JOIN LATERAL (SELECT body, created_at, id FROM hub_messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) m ON true
      LEFT JOIN hub_reads r ON r.conversation_id=c.id AND r.user_id=$1
      WHERE $1 IN (c.user_a,c.user_b) ORDER BY m.id DESC NULLS LAST, c.id`, [id])).rows;
  }
  async start(id, peer) {
    if (id === peer) return null;
    const result = await this.pool.query(`INSERT INTO hub_conversations (user_a,user_b)
      SELECT least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid)
      WHERE EXISTS (
        SELECT 1 FROM hub_users h
        JOIN app_enrollments e ON e.clerk_user_id=h.clerk_user_id AND e.status='approved'
        WHERE h.id=$2
      )
      ON CONFLICT (user_a,user_b) DO UPDATE SET user_a=excluded.user_a RETURNING id`, [id, peer]);
    return result.rows[0] ?? null;
  }
  async participant(id, conversation) {
    return (await this.pool.query('SELECT id FROM hub_conversations WHERE id=$1 AND $2 IN (user_a,user_b)', [conversation,id])).rowCount > 0;
  }
  async history(id, conversation, before) {
    // Authorization is repeated in the data query, even after route-level checks.
    return (await this.pool.query(`SELECT m.id::text, m.sender_id, m.body, m.created_at FROM hub_messages m
      JOIN hub_conversations c ON c.id=m.conversation_id
      WHERE c.id=$1 AND $2 IN (c.user_a,c.user_b) AND ($3::bigint IS NULL OR m.id<$3)
      ORDER BY m.id DESC LIMIT 100`, [conversation,id,before ?? null])).rows.reverse();
  }
  async send(id, conversation, body) {
    return (await this.pool.query(`INSERT INTO hub_messages(conversation_id,sender_id,body)
      SELECT id,$2,$3 FROM hub_conversations WHERE id=$1 AND $2 IN (user_a,user_b)
      RETURNING id::text,sender_id,body,created_at`, [conversation,id,body])).rows[0] ?? null;
  }
  async read(id, conversation, through) {
    await this.pool.query(`INSERT INTO hub_reads(conversation_id,user_id,last_message_id)
      SELECT c.id,$2,m.id FROM hub_conversations c JOIN hub_messages m ON m.conversation_id=c.id
      WHERE c.id=$1 AND $2 IN (c.user_a,c.user_b) AND m.id=$3
      ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_message_id=greatest(hub_reads.last_message_id,excluded.last_message_id)`, [conversation,id,through]);
  }
}
