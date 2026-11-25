const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true }, pingInterval: 25000, pingTimeout: 20000 });
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 30;
const rooms = new Map();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

function roomState(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}
function snapshot(players) {
  return [...players.values()].map(({ id, name, x, y, color, coins, level, fish }) => ({ id, name, x, y, color, coins, level, fish }));
}
function safeName(value) {
  return String(value || 'Angler').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Angler';
}

io.on('connection', socket => {
  let currentRoom = null;
  socket.on('join', ({ room = 'pond-1', name = 'Angler' } = {}, reply = () => {}) => {
    room = String(room).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'pond-1';
    const players = roomState(room);
    if (players.size >= MAX_PLAYERS) return reply({ ok: false, error: 'Room penuh (maksimal 30 pemain).' });
    if (currentRoom) leaveRoom();
    currentRoom = room;
    socket.join(room);
    const player = {
      id: socket.id, name: safeName(name), x: 480 + Math.random() * 160,
      y: 300 + Math.random() * 120, color: ['#ff9f43','#65d6ce','#b28cff','#ff7892','#f5d76e'][Math.floor(Math.random()*5)],
      coins: 0, level: 1, fish: 0, lastFish: 0
    };
    players.set(socket.id, player);
    reply({ ok: true, id: socket.id, room, players: snapshot(players), maxPlayers: MAX_PLAYERS });
    socket.to(room).emit('player:joined', player);
    io.to(room).emit('room:count', players.size);
    io.to(room).emit('system:message', `${player.name} joined the pond.`);
  });
  socket.on('player:move', ({ x, y } = {}) => {
    if (!currentRoom) return;
    const player = roomState(currentRoom).get(socket.id);
    if (!player || !Number.isFinite(x) || !Number.isFinite(y)) return;
    player.x = Math.max(30, Math.min(930, x));
    player.y = Math.max(30, Math.min(570, y));
    socket.to(currentRoom).emit('player:moved', { id: socket.id, x: player.x, y: player.y });
  });
  socket.on('fish:cast', (_data, reply = () => {}) => {
    if (!currentRoom) return;
    const player = roomState(currentRoom).get(socket.id);
    if (!player) return;
    const now = Date.now();
    if (now - player.lastFish < 3500) return reply({ ok: false, error: 'Tunggu sebentar sebelum memancing lagi.' });
    player.lastFish = now;
    const catches = [
      { name: 'Common Carp', coins: 8, chance: 48 }, { name: 'Blue Tilapia', coins: 14, chance: 28 },
      { name: 'Golden Koi', coins: 35, chance: 15 }, { name: 'Crystal Fish', coins: 80, chance: 7 }, { name: 'Ancient Dragonfish', coins: 180, chance: 2 }
    ];
    const roll = Math.random() * 100;
    let total = 0, caught = catches[0];
    for (const item of catches) { total += item.chance; if (roll <= total) { caught = item; break; } }
    player.coins += caught.coins; player.fish += 1;
    player.level = 1 + Math.floor(player.fish / 5);
    const result = { ok: true, fish: caught.name, coins: caught.coins, totalCoins: player.coins, fishCount: player.fish, level: player.level };
    reply(result);
    io.to(currentRoom).emit('player:stats', { id: socket.id, coins: player.coins, fish: player.fish, level: player.level });
    socket.to(currentRoom).emit('system:message', `${player.name} caught a ${caught.name}!`);
  });
  socket.on('chat:send', text => {
    if (!currentRoom) return;
    const player = roomState(currentRoom).get(socket.id);
    if (!player) return;
    const message = String(text || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 120);
    if (message) io.to(currentRoom).emit('chat:message', { name: player.name, text: message, at: Date.now() });
  });
  function leaveRoom() {
    if (!currentRoom) return;
    const players = roomState(currentRoom);
    const old = players.get(socket.id);
    players.delete(socket.id);
    socket.to(currentRoom).emit('player:left', socket.id);
    if (old) io.to(currentRoom).emit('system:message', `${old.name} left the pond.`);
    io.to(currentRoom).emit('room:count', players.size);
    if (!players.size) rooms.delete(currentRoom);
    socket.leave(currentRoom);
    currentRoom = null;
  }
  socket.on('disconnect', leaveRoom);
});

server.listen(PORT, '0.0.0.0', () => console.log(`Pixel Pond Online listening on ${PORT}`));
