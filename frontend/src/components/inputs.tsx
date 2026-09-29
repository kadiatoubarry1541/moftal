import React, { type ReactNode } from 'react'

export function Field({ label, help, error, children }: { label: string, help?: string, error?: string, children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {help && <small>{help}</small>}
      {error && <span className="error">{error}</span>}
    </div>
  )
}

type SelectOption = string | { value: string; label: string }
export function Select({ value, onChange, options, placeholder }: { value?: string, onChange: (v: string)=>void, options: SelectOption[], placeholder?: string }) {
  const items = options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
  return (
    <select value={value || ''} onChange={(e)=>onChange(e.target.value)}>
      <option value="">{placeholder ?? ''}</option>
      {items.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  )
}

export function SelectCode({ value, onChange, options, placeholder }: { value?: string, onChange: (v: string)=>void, options: {label:string,code:string}[], placeholder?: string }) {
  return (
    <select value={value || ''} onChange={(e)=>onChange(e.target.value)}>
      <option value="">{placeholder || 'Sélectionner'}</option>
      {options.map(opt => <option key={opt.code} value={opt.code}>{opt.label}</option>)}
    </select>
  )
}

export function CheckboxGroup({ options, values, onChange }: { options: string[], values: string[], onChange: (next: string[])=>void }) {
  const toggle = (opt: string) => {
    const exists = values.includes(opt)
    const next = exists ? values.filter(v=>v!==opt) : [...values, opt]
    onChange(next)
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 w-fit cursor-pointer">
          <input type="checkbox" checked={values.includes(opt)} onChange={()=>toggle(opt)} className="shrink-0 w-4 h-4" />
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </div>
  )
}

export function FilePicker({ accept, onFile }: { accept?: string, onFile: (file: File)=>void }) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFile(file);
      
      // Créer un aperçu
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }
    }
  };

  const handleCaptureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFile(file);
      
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }
    }
  };

  const removePhoto = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    onFile(null as any); // Notifier qu'aucun fichier n'est sélectionné
  };

  return (
    <div className="photo-upload-container" style={{ width: '100%' }}>
      {/* Inputs cachés */}
      <input
        type="file"
        id="file-picker-gallery"
        accept={accept || "image/*,video/*,audio/*"}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        id="file-picker-capture"
        capture="environment"
        accept={accept || "image/*,video/*,audio/*"}
        onChange={handleCaptureChange}
        style={{ display: 'none' }}
      />

      {preview && selectedFile ? (
        <div className="photo-preview" style={{ 
          position: 'relative', 
          width: '100%', 
          marginBottom: '1rem',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <img 
            src={preview} 
            alt="Aperçu" 
            style={{ 
              width: '100%', 
              height: '200px', 
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #3b82f6'
            }} 
          />
          <button
            type="button"
            onClick={removePhoto}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
            title="Supprimer la photo"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col xs:flex-row gap-2 w-full">
            <label
              htmlFor="file-picker-capture"
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              📷 Prendre une photo
            </label>
            <label
              htmlFor="file-picker-gallery"
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              🖼️ Choisir depuis galerie
            </label>
          </div>
          <small className="text-gray-500 text-xs text-center">
            Toutes les photos sont acceptées
          </small>
        </div>
      )}
    </div>
  );
}


