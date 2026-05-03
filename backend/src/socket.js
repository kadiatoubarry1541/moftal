import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

let io = null;
const onlineUsers = new Map(); // numeroH -> socketId

export function initSocket(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true
    },
    maxHttpBufferSize: 1e7 // 10MB max pour les petits fichiers via socket
  });

  // Middleware d'authentification JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { numeroH, prenom, nomFamille } = socket.user;
    onlineUsers.set(numeroH, socket.id);

    // Room personnelle
    socket.join(`user-${numeroH}`);

    // Informer les autres que l'utilisateur est en ligne
    socket.broadcast.emit('user-online', { numeroH, prenom, nomFamille });

    // Rejoindre la room familiale
    socket.on('join-family', (familyName) => {
      if (familyName) socket.join(`family-${familyName}`);
    });

    // ──── Signaling WebRTC ────────────────────────────────────────────────────

    // Appel sortant : l'appelant envoie une offre SDP
    socket.on('call-offer', ({ to, offer, callType, callerName }) => {
      const targetId = onlineUsers.get(to);
      if (targetId) {
        io.to(targetId).emit('incoming-call', {
          from: numeroH,
          callerName: callerName || `${prenom} ${nomFamille}`,
          offer,
          callType: callType || 'audio'
        });
      }
    });

    // Réponse de l'appelé
    socket.on('call-answer', ({ to, answer }) => {
      const targetId = onlineUsers.get(to);
      if (targetId) {
        io.to(targetId).emit('call-answered', { from: numeroH, answer });
      }
    });

    // Échange de candidats ICE
    socket.on('ice-candidate', ({ to, candidate }) => {
      const targetId = onlineUsers.get(to);
      if (targetId) {
        io.to(targetId).emit('ice-candidate', { from: numeroH, candidate });
      }
    });

    // Fin d'appel
    socket.on('call-end', ({ to }) => {
      const targetId = onlineUsers.get(to);
      if (targetId) {
        io.to(targetId).emit('call-ended', { from: numeroH });
      }
    });

    // Appel refusé
    socket.on('call-rejected', ({ to }) => {
      const targetId = onlineUsers.get(to);
      if (targetId) {
        io.to(targetId).emit('call-rejected', { from: numeroH });
      }
    });

    // ──── Déconnexion ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(numeroH);
      socket.broadcast.emit('user-offline', { numeroH });
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function isUserOnline(numeroH) {
  return onlineUsers.has(numeroH);
}
