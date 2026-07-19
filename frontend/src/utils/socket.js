import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});
