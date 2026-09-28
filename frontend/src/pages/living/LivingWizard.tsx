import { Route, Routes } from 'react-router-dom'
import { QuickSignup } from './QuickSignup'
import { VideoRegistration } from './VideoRegistration'
import { WrittenRegistration } from './WrittenRegistration'

export function LivingWizard() {
  return (
    <Routes>
      {/* Inscription rapide : téléphone + mot de passe ; le reste à la mise à jour du profil */}
      <Route path="/" element={<QuickSignup />} />
      <Route path="/video" element={<VideoRegistration />} />
      <Route path="/formulaire" element={<WrittenRegistration />} />
      {/* Mise à jour du profil (compte créé par inscription rapide) */}
      <Route path="/completer" element={<WrittenRegistration mode="complete" />} />
    </Routes>
  )
}
