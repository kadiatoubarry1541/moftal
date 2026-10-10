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
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.purpose) return next(new Error('Invalid token')); // jeton de récupération : jamais une session
      // Compte réel et actif (désactivé ou supprimé → plus de temps réel)
      const { findUserFollowingAlias } = await import('./middleware/auth.js');
      const user = await findUserFollowingAlias(decoded.numeroH);
      if (!user || !user.isActive) return next(new Error('Invalid token'));
      socket.user = { numeroH: user.numeroH, prenom: user.prenom, nomFamille: user.nomFamille, role: user.role };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // Un salon de discussion n'est rejoint que par ceux qui en font partie :
  // sinon n'importe qui recevait en direct les messages privés des autres.
  const estAdmin = (u) => ['admin', 'super-admin'].includes(String(u.role || '').toLowerCase());
  async function peutRejoindre(user, room) {
    const m = /^(couple|friend|parent-child)-(.+)$/.exec(String(room || ''));
    if (!m) return false;
    const [, type, id] = m;
    const n = user.numeroH;
    try {
      if (type === 'friend') {
        const { default: Friend } = await import('./models/Friend.js');
        const f = await Friend.findByPk(id);
        return !!f && (f.userNumeroH === n || f.friendNumeroH === n);
      }
      if (type === 'couple') {
        const { default: CoupleLink } = await import('./models/CoupleLink.js');
        const l = await CoupleLink.findByPk(id);
        return !!l && [l.numeroH1, l.numeroH2, l.husbandNumeroH, l.wifeNumeroH].includes(n);
      }
      const { default: ParentChildLink } = await import('./models/ParentChildLink.js');
      const l = await ParentChildLink.findByPk(id);
      return !!l && (l.parentNumeroH === n || l.childNumeroH === n);
    } catch {
      return false;
    }
  }

  io.on('connection', (socket) => {
    const { numeroH, prenom, nomFamille } = socket.user;
    onlineUsers.set(numeroH, socket.id);

    // Room personnelle
    socket.join(`user-${numeroH}`);

    // Informer les autres que l'utilisateur est en ligne
    socket.broadcast.emit('user-online', { numeroH, prenom, nomFamille });

    // Rejoindre la room familiale
    // Seulement SA famille (même nom de famille que la messagerie familiale)
    socket.on('join-family', (familyName) => {
      if (!familyName) return;
      const memeFamille = String(familyName).trim().toLowerCase() === String(nomFamille || '').trim().toLowerCase();
      if (memeFamille || estAdmin(socket.user)) socket.join(`family-${familyName}`);
    });

    // Salon privé (couple-<id>, friend-<id>, parent-child-<id>) : seulement si
    // l'utilisateur fait partie du lien. Jamais le salon personnel d'un autre.
    socket.on('join-room', async (room) => {
      if (await peutRejoindre(socket.user, room)) socket.join(room);
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
