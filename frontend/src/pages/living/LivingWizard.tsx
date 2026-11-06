import { Navigate, Route, Routes } from 'react-router-dom'
import { QuickSignup } from './QuickSignup'
import { WrittenRegistration } from './WrittenRegistration'
import { PAGE_MAJ_PROFIL } from '../../utils/profilPage'

export function LivingWizard() {
  return (
    <Routes>
      {/* Inscription rapide : téléphone + mot de passe ; le reste à la mise à jour du profil */}
      <Route path="/" element={<QuickSignup />} />
      {/* L'inscription par vidéo a été retirée : ancienne adresse → inscription rapide */}
      <Route path="/video" element={<Navigate to="/vivant" replace />} />
      <Route path="/formulaire" element={<WrittenRegistration />} />
      {/* Ancienne adresse de mise à jour du profil : tout est maintenant sur une seule page */}
      <Route path="/completer" element={<Navigate to={PAGE_MAJ_PROFIL} replace />} />
    </Routes>
  )
}
