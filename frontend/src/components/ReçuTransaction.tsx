import { useRef } from 'react';

interface ReçuProps {
  id: string;
  type: string;
  montant: number;
  date: string;
  acteurNom?: string;
  beneficiaireNom?: string;
  beneficiaireContact?: string;
  description?: string;
  nomFamille?: string;
  logoUrl?: string;
  proNom?: string;
  repartition?: Record<string, number>;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  depot: 'Dépôt familial',
  paiement_sante: 'Paiement Santé',
  paiement_nourriture: 'Paiement Alimentation',
  urgence: 'Urgence familiale',
  projet: 'Projet collectif',
  retrait_pro: 'Retrait Professionnel',
  reserve_deblocage: 'Déblocage Réserve',
};

export function ReçuTransaction({
  id, type, montant, date, acteurNom, beneficiaireNom,
  beneficiaireContact, description, nomFamille, logoUrl, proNom,
  repartition, onClose
}: ReçuProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Reçu Moftal Pay — ${nomFamille || proNom || ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; color: #111; }
        .recu { max-width: 400px; margin: auto; background: #fff; border: 2px solid #1e3a5f; border-radius: 14px; overflow: hidden; }
        .header { background: linear-gradient(135deg,#1e3a5f,#2563eb); padding: 24px; text-align: center; color: white; }
        .logo { width: 72px; height: 72px; object-fit: cover; border-radius: 50%; border: 3px solid rgba(255,255,255,0.5); margin-bottom: 10px; }
        .logo-placeholder { width: 56px; height: 56px; font-size: 36px; margin-bottom: 10px; }
        .title { font-size: 18px; font-weight: 900; }
        .subtitle { font-size: 11px; opacity: 0.8; margin-top: 2px; }
        .ref { font-size: 10px; opacity: 0.6; margin-top: 6px; letter-spacing: 1px; }
        .body { padding: 20px; }
        .amount { text-align: center; margin: 16px 0; padding: 16px; background: #f0f7ff; border-radius: 10px; }
        .amount-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
        .amount-value { font-size: 32px; font-weight: 900; color: #1e3a5f; }
        .type-badge { display: inline-block; background: #dbeafe; color: #1e3a5f; border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: bold; margin-top: 6px; }
        .rows { margin-top: 16px; border-top: 1px dashed #ccc; padding-top: 14px; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; font-size: 12px; }
        .row .lbl { color: #777; flex-shrink: 0; margin-right: 12px; }
        .row .val { font-weight: bold; text-align: right; }
        .repartition { background: #f0f9f4; border-radius: 8px; padding: 10px; margin-top: 12px; }
        .repartition-title { font-size: 10px; font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .repartition-row { display: flex; justify-content: space-between; font-size: 11px; color: #333; margin-bottom: 3px; }
        .footer { background: #f8fafc; padding: 14px; text-align: center; border-top: 1px dashed #ccc; }
        .footer p { font-size: 10px; color: #888; line-height: 1.6; }
        @media print { body { background: white; padding: 0; } }
      </style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const refCourt = id.slice(0, 8).toUpperCase();
  const dateFormatee = new Date(date).toLocaleString('fr-GN', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div ref={printRef}>
          <div className="recu">
            {/* Header */}
            <div className="header" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '24px', textAlign: 'center', color: 'white' }}>
              {logoUrl ? (
                <img src={logoUrl} alt={proNom} className="logo" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.5)', marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
              ) : (
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
              )}
              <div style={{ fontSize: 18, fontWeight: 900 }}>MOFTAL PAY</div>
              {proNom && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{proNom}</div>}
              {nomFamille && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Famille {nomFamille}</div>}
              <div style={{ fontSize: 10, opacity: 0.55, marginTop: 8, letterSpacing: 2 }}>RÉF. MF-{refCourt}</div>
            </div>

            {/* Montant */}
            <div style={{ padding: '0 20px' }}>
              <div style={{ textAlign: 'center', margin: '16px 0', padding: '16px', background: '#f0f7ff', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Montant</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1e3a5f' }}>{montant.toLocaleString()} GNF</div>
                <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e3a5f', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 'bold', marginTop: 6 }}>
                  {TYPE_LABELS[type] || type}
                </div>
              </div>

              {/* Détails */}
              <div style={{ borderTop: '1px dashed #ccc', paddingTop: 14, marginBottom: 4 }}>
                {[
                  { lbl: 'Date', val: dateFormatee },
                  acteurNom ? { lbl: 'Effectué par', val: acteurNom } : null,
                  beneficiaireNom ? { lbl: 'Bénéficiaire', val: beneficiaireNom } : null,
                  beneficiaireContact ? { lbl: 'Contact', val: beneficiaireContact } : null,
                  description ? { lbl: 'Motif', val: description } : null,
                ].filter(Boolean).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 12 }}>
                    <span style={{ color: '#777', flexShrink: 0, marginRight: 12 }}>{r!.lbl}</span>
                    <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{r!.val}</span>
                  </div>
                ))}
              </div>

              {/* Répartition dépôt */}
              {repartition && Object.keys(repartition).length > 0 && (
                <div style={{ background: '#f0f9f4', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Répartition automatique</div>
                  {Object.entries(repartition).map(([k, v]) => Number(v) > 0 && (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#333', marginBottom: 3 }}>
                      <span style={{ textTransform: 'capitalize' }}>{k}</span>
                      <span style={{ fontWeight: 'bold' }}>{Number(v).toLocaleString()} GNF</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ background: '#f8fafc', padding: 14, textAlign: 'center', borderTop: '1px dashed #ccc' }}>
              <div style={{ fontSize: 10, color: '#888', lineHeight: 1.6 }}>
                <div>Conservez ce reçu comme justificatif officiel</div>
                <div style={{ marginTop: 4 }}>Moftal Pay · Les Enfants d'Adam · {new Date().getFullYear()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons actions */}
        <div className="flex gap-3 p-4">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}
          >
            🖨️ Imprimer le reçu
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-700 bg-white"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
