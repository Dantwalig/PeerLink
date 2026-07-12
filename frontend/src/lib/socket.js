import { io } from 'socket.io-client';
import { getToken } from './api';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
  socket = io(url, { auth: { token: getToken() }, autoConnect: false });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) socket.disconnect();
}
