import React, { useEffect, useState } from 'react';
import { CloudUpload, Loader2, Upload, X } from 'lucide-react';
import { useDirectCertificateUpload, useProviders, useTracks } from '../../hooks/usePortfolio';

interface UploadCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const inputClass =
  'w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors';
const labelClass = 'block text-xs font-semibold text-slate-400 mb-1';

export const UploadCertificateModal: React.FC<UploadCertificateModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const { data: providers = [] } = useProviders();
  const { data: tracks = [] } = useTracks();
  const directUploadMutation = useDirectCertificateUpload();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [providerId, setProviderId] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
  const [credentialId, setCredentialId] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ESC schließt das Modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Fallback-Titel aus Dateiname vorschlagen, falls leer
      if (!title) {
        const guessed = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(guessed);
      }
    }
  };

  const toggleTrack = (id: number) => {
    setSelectedTrackIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Bitte wähle eine Zertifikatsdatei (PDF, PNG, JPG) aus.');
      return;
    }
    if (!title.trim()) {
      setError('Bitte gib einen Titel für das Zertifikat an.');
      return;
    }
    if (!providerId) {
      setError('Bitte wähle einen Zertifikatsanbieter aus.');
      return;
    }

    try {
      setUploadStep('Übertrage Datei direkt zu Cloud-Storage (Supabase S3)...');
      await directUploadMutation.mutateAsync({
        file: selectedFile,
        payload: {
          title: title.trim(),
          provider: Number(providerId),
          tracks: selectedTrackIds,
          credential_id: credentialId.trim() || undefined,
          issued_date: issuedDate || null,
        },
      });

      onNotify({
        type: 'success',
        text: `Zertifikat "${title}" erfolgreich direkt in Cloud-Storage hochgeladen!`,
      });
      // Formular zurücksetzen & schließen
      setSelectedFile(null);
      setTitle('');
      setProviderId('');
      setSelectedTrackIds([]);
      setCredentialId('');
      setIssuedDate('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
      setError(`Upload fehlgeschlagen: ${msg}`);
      onNotify({
        type: 'error',
        text: 'Fehler beim direkten Cloud-Upload des Zertifikats.',
      });
    } finally {
      setUploadStep(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-indigo-400" />
            <h2 id="upload-modal-title" className="text-base font-bold text-white">
              Neues Zertifikat hochladen (Direct-to-Storage)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Formular */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Dateiauswahl */}
          <div>
            <label htmlFor="certificate-file" className={labelClass}>
              Zertifikatsdatei (PDF, PNG, JPG) *
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 transition-colors rounded-xl p-4 text-center cursor-pointer relative bg-slate-950/40">
              <input
                id="certificate-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={directUploadMutation.isPending}
              />
              <Upload className="w-6 h-6 mx-auto mb-1 text-slate-500" />
              {selectedFile ? (
                <div className="text-xs">
                  <span className="font-semibold text-indigo-300">{selectedFile.name}</span>
                  <span className="text-slate-500 block text-[11px]">
                    ({(selectedFile.size / 1024).toFixed(1)} KB) - Klicke zum Ändern
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  <span className="font-medium text-indigo-400">Datei auswählen</span> oder per
                  Drag & Drop hierher ziehen
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Wird direkt über eine signierte URL nach Supabase S3 übertragen
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Titel */}
          <div>
            <label htmlFor="certificate-title" className={labelClass}>
              Titel des Zertifikats *
            </label>
            <input
              id="certificate-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Certified Kubernetes Administrator (CKA)"
              className={inputClass}
              required
              disabled={directUploadMutation.isPending}
            />
          </div>

          {/* Anbieter */}
          <div>
            <label htmlFor="certificate-provider" className={labelClass}>
              Aussteller / Anbieter *
            </label>
            <select
              id="certificate-provider"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className={inputClass}
              required
              disabled={directUploadMutation.isPending}
            >
              <option value="">-- Anbieter auswählen --</option>
              {providers.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.provider}
                </option>
              ))}
            </select>
          </div>

          {/* Tracks */}
          <div>
            <span className={labelClass}>Tracks zuordnen</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tracks.map((t) => {
                const active = selectedTrackIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTrack(t.id)}
                    disabled={directUploadMutation.isPending}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optionale Metadaten: Credential ID & Datum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="certificate-credential" className={labelClass}>
                Credential-ID (optional)
              </label>
              <input
                id="certificate-credential"
                type="text"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="z. B. AWS-PSA-12345"
                className={inputClass}
                disabled={directUploadMutation.isPending}
              />
            </div>
            <div>
              <label htmlFor="certificate-issued-date" className={labelClass}>
                Ausstellungsdatum (optional)
              </label>
              <input
                id="certificate-issued-date"
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className={inputClass}
                disabled={directUploadMutation.isPending}
              />
            </div>
          </div>

          {/* Footer & Aktionen */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
            <div className="text-xs text-slate-400">
              {uploadStep && (
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadStep}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={directUploadMutation.isPending}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={directUploadMutation.isPending}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {directUploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Lädt hoch...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Direct-Upload starten</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
