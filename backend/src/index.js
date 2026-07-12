require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutors');
const sessionRoutes = require('./routes/sessions');
const resourceRoutes = require('./routes/resources');
const groupRoutes = require('./routes/groups');
const ratingRoutes = require('./routes/ratings');
const messageRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// SRS 3.4 Communications Interfaces: WebSocket (Socket.io) for real-time messaging
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*' },
});

io.use((socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  // Each user joins a private room so messages route to them directly (see routes/messages.js)
  socket.join(`user:${socket.user.userId}`);
});

app.set('io', io);

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))); // STUB for S3-served files

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Central error handler - never leak stack traces or raw Prisma errors to the client
app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'The requested record was not found' });
  }

  res.status(err.status || 500).json({ message: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`PeerLink API + WebSocket running on http://localhost:${PORT}`));
