import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Appointment from '../models/Appointment.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendAppointmentAcceptedEmail, sendAppointmentRejectedEmail } from '../services/emailService.js';

const router = express.Router();

// POST /api/appointments/book - Prendre un rendez-vous (écrit ou vidéo)
router.post('/book', authenticate, async (req, res) => {
  try {
    const { professionalAccountId, type, appointmentDate, appointmentTime, service, videoUrl } = req.body;

    if (!professionalAccountId) {
      return res.status(400).json({ success: false, message: 'ID du professionnel requis' });
    }

    const proAccount = await ProfessionalAccount.findByPk(professionalAccountId);
    if (!proAccount || proAccount.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Professionnel non trouvé ou non approuvé' });
    }

    if (type === 'written' && (!appointmentDate || !appointmentTime || !service)) {
      return res.status(400).json({ success: false, message: 'Date, heure et service requis pour un rendez-vous écrit' });
    }

    if (type === 'video' && !videoUrl) {
      return res.status(400).json({ success: false, message: 'Vidéo requise pour un rendez-vous vidéo' });
    }

    const user = req.user;
    const appointment = await Appointment.create({
      professionalAccountId,
      patientNumeroH: req.userId,
      patientName: `${user.prenom || ''} ${user.nomFamille || ''}`.trim() || req.userId,
      type: type || 'written',
      appointmentDate: appointmentDate || null,
      appointmentTime: appointmentTime || null,
      service: service || null,
      videoUrl: videoUrl || null,
      status: 'pending'
    });

    // Notifier le professionnel
    await Notification.createNotification({
      recipientNumeroH: proAccount.ownerNumeroH,
      type: 'new_appointment',
      title: 'Nouveau rendez-vous',
      message: `${appointment.patientName} a demandé un rendez-vous ${type === 'video' ? '(vidéo)' : `le ${appointmentDate} à ${appointmentTime} - Service: ${service}`}`,
      relatedId: appointment.id
    });

    res.status(201).json({ success: true, message: 'Rendez-vous envoyé', appointment });
  } catch (error) {
    console.error('Erreur prise rendez-vous:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/appointments/my-appointments - Mes rendez-vous (patient)
router.get('/my-appointments', authenticate, async (req, res) => {
  try {
    const appointments = await Appointment.getForPatient(req.userId);

    // Enrichir avec les infos du professionnel
    const enriched = await Promise.all(appointments.map(async (apt) => {
      const pro = await ProfessionalAccount.findByPk(apt.professionalAccountId);
      return { ...apt.toJSON(), professional: pro ? { id: pro.id, name: pro.name, type: pro.type } : null };
    }));

    res.json({ success: true, appointments: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/appointments/professional/:proId - Rendez-vous pour un professionnel
router.get('/professional/:proId', authenticate, async (req, res) => {
  try {
    const proAccount = await ProfessionalAccount.findByPk(req.params.proId);
    if (!proAccount || proAccount.ownerNumeroH !== req.userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { status } = req.query;
    let appointments;
    if (status === 'pending') {
      appointments = await Appointment.getPendingForProfessional(req.params.proId);
    } else {
      appointments = await Appointment.getForProfessional(req.params.proId);
    }

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/appointments/accept/:id - Accepter un rendez-vous
router.post('/accept/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Rendez-vous non trouvé' });
    }

    const proAccount = await ProfessionalAccount.findByPk(appointment.professionalAccountId);
    if (!proAccount || proAccount.ownerNumeroH !== req.userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { responseMessage, responseVideoUrl, appointmentDate, appointmentTime } = req.body;

    await appointment.update({
      status: 'accepted',
      responseMessage: responseMessage || null,
      responseVideoUrl: responseVideoUrl || null,
      appointmentDate: appointmentDate || appointment.appointmentDate,
      appointmentTime: appointmentTime || appointment.appointmentTime,
      respondedAt: new Date()
    });

    // Notifier le patient
    const dateInfo = appointment.appointmentDate && appointment.appointmentTime
      ? ` le ${appointment.appointmentDate} à ${appointment.appointmentTime}`
      : '';

    await Notification.createNotification({
      recipientNumeroH: appointment.patientNumeroH,
      type: 'appointment_accepted',
      title: 'Rendez-vous accepté !',
      message: `${proAccount.name} a accepté votre rendez-vous${dateInfo}.${responseVideoUrl ? ' Une vidéo de réponse est disponible.' : ''}`,
      relatedId: appointment.id
    });

    // Email au patient
    const patient = await User.findByNumeroH(appointment.patientNumeroH);
    if (patient?.email) {
      sendAppointmentAcceptedEmail({
        to: patient.email,
        toName: appointment.patientName,
        proName: proAccount.name,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        service: appointment.service,
        responseMessage: responseMessage || null
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Rendez-vous accepté', appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/appointments/reject/:id - Rejeter un rendez-vous
router.post('/reject/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Rendez-vous non trouvé' });
    }

    const proAccount = await ProfessionalAccount.findByPk(appointment.professionalAccountId);
    if (!proAccount || proAccount.ownerNumeroH !== req.userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { responseMessage } = req.body;
    await appointment.update({
      status: 'rejected',
      responseMessage: responseMessage || 'Rendez-vous refusé',
      respondedAt: new Date()
    });

    await Notification.createNotification({
      recipientNumeroH: appointment.patientNumeroH,
      type: 'appointment_rejected',
      title: 'Rendez-vous refusé',
      message: `${proAccount.name} a refusé votre rendez-vous. ${responseMessage || ''}`,
      relatedId: appointment.id
    });

    // Email au patient
    const patient = await User.findByNumeroH(appointment.patientNumeroH);
    if (patient?.email) {
      sendAppointmentRejectedEmail({
        to: patient.email,
        toName: appointment.patientName,
        proName: proAccount.name,
        responseMessage: responseMessage || null
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Rendez-vous refusé', appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
