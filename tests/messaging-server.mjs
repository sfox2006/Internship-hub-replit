// Isolated browser-test entrypoint. Production never imports this module.
import express from 'express';
import { fixture } from './messaging-fixture.mjs';
const {app} = await fixture('http://127.0.0.1:3005');
app.get('/api/health',(_req,res) => res.json({ok:true}));
app.use(express.static('dist/client'));
app.get('/messages',(_req,res) => res.sendFile('dist/client/index.html',{root:process.cwd()}));
app.listen(3005,'127.0.0.1');
