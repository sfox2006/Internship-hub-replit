import express from 'express';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messageId = value => typeof value === 'string' && /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
export function messagingRouter(store, { origin, isValidCsrf }) {
  const router = express.Router();
  router.use((req,res,next) => {
    res.set('Cache-Control','no-store');
    if (!req.messagingUser || !req.messagingClerkUserId)
      return res.status(401).json({error:"Verified sign-in required"});
    if (req.method !== 'GET') {
      const token = req.get('X-CSRF-Token') || '';
      if (
        req.get('Origin') !== origin ||
        !isValidCsrf(token, req.messagingCsrf)
      )
        return res.status(403).json({error:'Invalid request origin or token'});
    }
    next();
  });
  router.get('/users', async (req,res) => res.json(await store.users(req.messagingUser.id)));
  router.get('/conversations', async (req,res) => res.json(await store.inbox(req.messagingUser.id)));
  router.post('/conversations', async (req,res) => {
    if (!uuid.test(req.body?.peerId)) return res.status(400).json({error:'Choose a valid recipient'});
    const conversation = await store.start(req.messagingUser.id,req.body.peerId);
    if (!conversation) return res.status(404).json({error:'Recipient unavailable'});
    res.status(201).json(conversation);
  });
  router.use('/conversations/:id', async (req,res,next) => {
    if (!uuid.test(req.params.id) || !await store.participant(req.messagingUser.id,req.params.id))
      return res.status(404).json({error:'Conversation not found'});
    next();
  });
  router.get('/conversations/:id/messages', async (req,res) => {
    if (req.query.before !== undefined && !messageId(req.query.before)) return res.status(400).json({error:'Invalid message cursor'});
    res.json(await store.history(req.messagingUser.id, req.params.id, req.query.before));
  });
  router.post('/conversations/:id/messages', async (req,res) => {
    const body = req.body?.body;
    if (typeof body !== 'string' || !body.trim() || [...body.trim()].length > 4000)
      return res.status(400).json({error:'Enter a message of 1–4000 characters'});
    const message = await store.send(req.messagingUser.id,req.params.id,body.trim());
    if (!message) return res.status(404).json({error:'Conversation not found'});
    res.status(201).json(message);
  });
  router.post('/conversations/:id/read', async (req,res) => {
    if (!messageId(req.body?.through)) return res.status(400).json({error:'Invalid message cursor'});
    await store.read(req.messagingUser.id,req.params.id,req.body.through);
    res.sendStatus(204);
  });
  return router;
}
