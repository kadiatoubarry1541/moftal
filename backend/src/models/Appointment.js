import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Appointment extends Model {
  static async getForProfessional(professionalAccountId) {
    return await this.findAll({
      where: { professionalAccountId, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getForPatient(patientNumeroH) {
    return await this.findAll({
      where: { patientNumeroH, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getPendingForProfessional(professionalAccountId) {
    return await this.findAll({
      where: { professionalAccountId, status: 'pending', isActive: true },
      order: [['appointmentDate', 'ASC']]
    });
  }
}

Appointment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  professionalAccountId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'professional_account_id',
    references: {
      model: 'professional_accounts',
      key: 'id'
    }
  },
  patientNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'patient_numero_h',
    comment: 'NumeroH du patient/utilisateur qui prend le rendez-vous'
  },
  patientName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'patient_name'
  },
  type: {
    type: DataTypes.ENUM('written', 'video'),
    allowNull: false,
    defaultValue: 'written'
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'appointment_date'
  },
  appointmentTime: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'appointment_time'
  },
  service: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Service demandé par le patient'
  },
  videoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'video_url',
    comment: 'Vidéo de 30 secondes du patient (base64 ou URL)'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  },
  responseMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'response_message'
  },
  responseVideoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'response_video_url',
    comment: 'Vidéo de réponse de 30 secondes du professionnel'
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'responded_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Appointment',
  tableName: 'appointments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['professional_account_id'] },
    { fields: ['patient_numero_h'] },
    { fields: ['status'] },
    { fields: ['appointment_date'] }
  ]
});

export default Appointment;
