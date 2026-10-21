import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  FileText,
  Globe,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useExtractCertificateMetadata,
  useProviders,
  useTracks,
  useUpdateCertificate,
} from '../../hooks/usePortfolio';
import { TrackIcon } from '../TrackIcon';
import type { Certificate, ExtractedCertificateMetadata, Provider } from '../../types';

export interface CertificateEditModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export type OcrField = 'title' | 'provider' | 'date' | 'credential' | 'tracks';

const ALL_OCR_FIELDS: readonly OcrField[] = ['title', 'provider', 'date', 'credential', 'tracks'] as const;

const inputClass =
  'w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors';
const labelClass = 'block text-xs font-semibold text-slate-400 mb-1';

/**
 * Formatiert Fehlermeldungen aus API-Aufrufen typsicher (unterstützt DRF-Validation-Dictionaries und Fallbacks).
 */
function formatCertificateApiError(err: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === 'object') {
      const entries = Object.entries(data as Record<string, unknown>).map(
        ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
      );
      if (entries.length > 0) {
        return entries.join(' | ');
      }
    }
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallbackMessage;
}

/**
 * Löst die Provider-ID aus extrahierten OCR-Metadaten via matched_provider oder Name-Lookup auf.
 */
function resolveOcrProviderId(
  extractedData: ExtractedCertificateMetadata,
  providers: Provider[]
): string | null {
  if (extractedData.matched_provider?.id) {
    return String(extractedData.matched_provider.id);
  }
  if (extractedData.guessed_provider) {
    const match = providers.find(
      (p) => p.provider.toLowerCase() === extractedData.guessed_provider.toLowerCase()
    );
    if (match) {
      return String(match.id);
    }
  }
  return null;
}

interface FormFieldUpdaters {
  setTitle: (title: string) => void;
  setProviderId: (id: string) => void;
  setIssuedDate: (date: string) => void;
  setCredentialId: (id: string) => void;
  setTrackIds: React.Dispatch<React.SetStateAction<number[]>>;
}

/**
 * Zentrale, deduplizierte Funktion zum Übernehmen einzelner oder aller OCR-Felder in den Formular-State.
 */
function applyOcrFieldUpdates(
  fields: readonly OcrField[],
  extractedData: ExtractedCertificateMetadata,
  providers: Provider[],
  updaters: FormFieldUpdaters
): void {
  for (const field of fields) {
    switch (field) {
      case 'title':
        if (extractedData.guessed_title) {
          updaters.setTitle(extractedData.guessed_title);
        }
        break;
      case 'provider': {
        const resolvedId = resolveOcrProviderId(extractedData, providers);
        if (resolvedId !== null) {
          updaters.setProviderId(resolvedId);
        }
        break;
      }
      case 'date':
        if (extractedData.issued_date) {
          updaters.setIssuedDate(extractedData.issued_date);
        }
        break;
      case 'credential':
        if (extractedData.credential_id) {
          updaters.setCredentialId(extractedData.credential_id);
        }
        break;
      case 'tracks':
        if (extractedData.matched_track_ids && extractedData.matched_track_ids.length > 0) {
          updaters.setTrackIds((prev) =>
            Array.from(new Set([...prev, ...extractedData.matched_track_ids]))
          );
        }
        break;
    }
  }
}

/**
 * Sub-Komponente: Dokumentenvorschau (PDF-Iframe, Bild oder Leermeldung)
 */
interface CertificatePreviewPaneProps {
  certificate: Certificate;
  isImageFile: boolean;
}

export const CertificatePreviewPane: React.FC<CertificatePreviewPaneProps> = ({
  certificate,
  isImageFile,
}) => {
  return (
    <div className="lg:col-span-5 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          Dokumentenvorschau
        </span>
        {certificate.pdf_file && (
          <a
            href={certificate.pdf_file}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            In neuem Tab öffnen
          </a>
        )}
      </div>

      <div className="flex-1 min-h-[380px] max-h-[580px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center relative">
        {certificate.pdf_file ? (
          isImageFile ? (
            <img
              src={certificate.pdf_file}
              alt={certificate.title}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <iframe
              src={certificate.pdf_file}
              className="w-full h-full min-h-[460px] border-0"
              title={`Vorschau für ${certificate.title}`}
            />
          )
        ) : (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-medium text-slate-400">Keine Datei hinterlegt</p>
            <p className="text-[11px]">Dieses Zertifikat besitzt keine PDF- oder Bilddatei.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Sub-Komponente: OCR-Aktionsleiste und Vorschlags-Banner
 */
interface CertificateOcrSuggestionsBannerProps {
  hasPdfFile: boolean;
  extractedData: ExtractedCertificateMetadata | null;
  isExtracting: boolean;
  onRunOcr: () => void;
  onApplyField: (field: OcrField) => void;
  onApplyAll: () => void;
}

export const CertificateOcrSuggestionsBanner: React.FC<CertificateOcrSuggestionsBannerProps> = ({
  hasPdfFile,
  extractedData,
  isExtracting,
  onRunOcr,
  onApplyField,
  onApplyAll,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            OCR & Metadaten-Extraktion
          </h3>
          <p className="text-[11px] text-slate-400">
            Liest Text layer & Fallback-Vision aus dem Dokument aus.
          </p>
        </div>
        <button
          type="button"
          onClick={onRunOcr}
          disabled={isExtracting || !hasPdfFile}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-colors shadow-sm shadow-indigo-600/30"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analysiere...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Metadaten per OCR analysieren</span>
            </>
          )}
        </button>
      </div>

      {/* OCR Vorschläge Box */}
      {extractedData && (
        <div className="pt-2 border-t border-indigo-800/30 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Erkannte Metadaten
            </span>
            <button
              type="button"
              onClick={onApplyAll}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
            >
              Alle Vorschläge übernehmen
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-indigo-900/30">
            {extractedData.guessed_title && (
              <div className="flex items-center justify-between gap-2 col-span-full">
                <span className="text-slate-400 truncate">
                  Titel: <strong className="text-white">{extractedData.guessed_title}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onApplyField('title')}
                  className="text-[10px] text-indigo-400 hover:underline shrink-0"
                >
                  Übernehmen
                </button>
              </div>
            )}
            {(extractedData.matched_provider?.provider || extractedData.guessed_provider) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 truncate">
                  Aussteller:{' '}
                  <strong className="text-white">
                    {extractedData.matched_provider?.provider || extractedData.guessed_provider}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => onApplyField('provider')}
                  className="text-[10px] text-indigo-400 hover:underline shrink-0"
                >
                  Übernehmen
                </button>
              </div>
            )}
            {extractedData.issued_date && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 truncate">
                  Datum: <strong className="text-white">{extractedData.issued_date}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onApplyField('date')}
                  className="text-[10px] text-indigo-400 hover:underline shrink-0"
                >
                  Übernehmen
                </button>
              </div>
            )}
            {extractedData.credential_id && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 truncate">
                  ID: <strong className="text-white">{extractedData.credential_id}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onApplyField('credential')}
                  className="text-[10px] text-indigo-400 hover:underline shrink-0"
                >
                  Übernehmen
                </button>
              </div>
            )}
            {extractedData.guessed_track_slugs && extractedData.guessed_track_slugs.length > 0 && (
              <div className="flex items-center justify-between gap-2 col-span-full">
                <span className="text-slate-400 truncate">
                  Tracks:{' '}
                  <strong className="text-white">
                    {extractedData.guessed_track_slugs.join(', ')}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => onApplyField('tracks')}
                  className="text-[10px] text-indigo-400 hover:underline shrink-0"
                >
                  Übernehmen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  certificate,
  onClose,
  onNotify,
}) => {
  const { data: providers = [] } = useProviders();
  const { data: tracks = [] } = useTracks();
  const updateMutation = useUpdateCertificate();
  const extractMutation = useExtractCertificateMetadata();

  // Formular-State direkt aus dem Zertifikat initialisieren
  const [title, setTitle] = useState(certificate?.title ?? '');
  const [providerId, setProviderId] = useState(String(certificate?.provider ?? ''));
  const [trackIds, setTrackIds] = useState<number[]>(certificate?.tracks ?? []);
  const [credentialId, setCredentialId] = useState(certificate?.credential_id ?? '');
  const [credentialUrl, setCredentialUrl] = useState(certificate?.credential_url ?? '');
  const [issuedDate, setIssuedDate] = useState(certificate?.issued_date ?? '');
  const [error, setError] = useState<string | null>(null);

  // OCR-Vorschläge
  const [extractedData, setExtractedData] = useState<ExtractedCertificateMetadata | null>(null);

  // ESC schließt das Modal
  useEffect(() => {
    if (!certificate) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [certificate, onClose]);

  if (!certificate) return null;

  const isImageFile = Boolean(
    certificate.pdf_file && /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(certificate.pdf_file)
  );

  const toggleTrack = (id: number) => {
    setTrackIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleRunOcr = async () => {
    setError(null);
    try {
      const data = await extractMutation.mutateAsync(certificate.id);
      setExtractedData(data);
      onNotify({
        type: 'success',
        text: 'Metadaten-Analyse abgeschlossen. Vorschläge sind verfügbar.',
      });
    } catch {
      setError('Fehler bei der OCR-Metadaten-Extraktion.');
      onNotify({
        type: 'error',
        text: 'OCR-Analyse fehlgeschlagen oder keine Datei vorhanden.',
      });
    }
  };

  const applyOcrField = (field: OcrField) => {
    if (!extractedData) return;
    applyOcrFieldUpdates([field], extractedData, providers, {
      setTitle,
      setProviderId,
      setIssuedDate,
      setCredentialId,
      setTrackIds,
    });
  };

  const applyAllOcrSuggestions = () => {
    if (!extractedData) return;
    applyOcrFieldUpdates(ALL_OCR_FIELDS, extractedData, providers, {
      setTitle,
      setProviderId,
      setIssuedDate,
      setCredentialId,
      setTrackIds,
    });
    onNotify({
      type: 'success',
      text: 'Alle OCR-Vorschläge wurden in das Formular übernommen.',
    });
  };

  const handleSave = async (shouldPublish?: boolean) => {
    setError(null);
    const publishTarget =
      typeof shouldPublish === 'boolean' ? shouldPublish : certificate.is_published;

    // Validierungs-Feedback: Mindestens ein Track bei Veröffentlichung erforderlich
    if (publishTarget && trackIds.length === 0) {
      const validationMsg =
        'Ein Zertifikat kann nur veröffentlicht werden, wenn mindestens ein Track zugewiesen ist.';
      setError(validationMsg);
      onNotify({
        type: 'error',
        text: validationMsg,
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: certificate.id,
        payload: {
          title: title.trim(),
          provider: Number(providerId),
          tracks: trackIds,
          credential_id: credentialId.trim(),
          credential_url: credentialUrl.trim() || '',
          issued_date: issuedDate || undefined,
          is_published: publishTarget,
        },
      });

      const msg = publishTarget
        ? `Zertifikat "${title.trim()}" gespeichert & veröffentlicht!`
        : `Zertifikat "${title.trim()}" als Entwurf gespeichert.`;

      onNotify({ type: 'success', text: msg });
      onClose();
    } catch (err) {
      setError(formatCertificateApiError(err, 'Speichern fehlgeschlagen.'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-review-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="cert-review-title"
                className="text-white font-bold text-sm sm:text-base flex items-center gap-2"
              >
                Zertifikat überprüfen & bearbeiten
              </h2>
              <p className="text-[11px] text-slate-400">
                Dokumentenvorschau, Metadaten-Nachschärfung und Veröffentlichung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {certificate.is_published ? (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Veröffentlicht (S3)
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> Entwurf
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: 2-Spalten-Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Linke Spalte: Dokumentenvorschau (5 Cols) */}
          <CertificatePreviewPane certificate={certificate} isImageFile={isImageFile} />

          {/* Rechte Spalte: OCR & Formular (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* OCR Bar */}
            <CertificateOcrSuggestionsBanner
              hasPdfFile={Boolean(certificate.pdf_file)}
              extractedData={extractedData}
              isExtracting={extractMutation.isPending}
              onRunOcr={handleRunOcr}
              onApplyField={applyOcrField}
              onApplyAll={applyAllOcrSuggestions}
            />

            {/* Formularfelder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-3.5"
            >
              <div>
                <label htmlFor="edit-cert-title" className={labelClass}>
                  Titel <span className="text-red-400">*</span>
                </label>
                <input
                  id="edit-cert-title"
                  type="text"
                  required
                  maxLength={255}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="edit-cert-provider" className={labelClass}>
                  Aussteller <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-cert-provider"
                  required
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Bitte wählen...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.provider}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-cert-date" className={labelClass}>
                    Ausstellungsdatum
                  </label>
                  <input
                    id="edit-cert-date"
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-cert-credential" className={labelClass}>
                    Credential-ID
                  </label>
                  <input
                    id="edit-cert-credential"
                    type="text"
                    maxLength={255}
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)}
                    className={inputClass}
                    placeholder="z. B. UC-12345 oder Hash"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-cert-url" className={labelClass}>
                  Online-Verifizierungs-URL
                </label>
                <input
                  id="edit-cert-url"
                  type="url"
                  maxLength={512}
                  placeholder="https://..."
                  value={credentialUrl}
                  onChange={(e) => setCredentialUrl(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={labelClass}>
                    Tracks zuweisen ({trackIds.length} ausgewählt)
                  </span>
                  {trackIds.length === 0 && (
                    <span className="text-[11px] text-amber-400 font-medium">
                      * Min. 1 Track für Veröffentlichung erforderlich
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tracks.map((t) => {
                    const isSelected = trackIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTrack(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-2 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <TrackIcon
                          track={t}
                          className={`w-6 h-6 ${
                            isSelected ? 'text-white' : 'text-indigo-400 dark:text-indigo-300'
                          }`}
                        />
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Abbrechen
          </button>

          <div className="flex items-center gap-2">
            {/* Speichern Button */}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Speichern
            </button>

            {/* Speichern & Veröffentlichen Button */}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={updateMutation.isPending || trackIds.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/30"
              title={
                trackIds.length === 0
                  ? 'Mindestens ein Track erforderlich für Veröffentlichung'
                  : 'Speichern & Veröffentlichen'
              }
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              Speichern & Veröffentlichen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
