import { io, Socket } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token')
    socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function refreshSocketAuth() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  return getSocket()
}
