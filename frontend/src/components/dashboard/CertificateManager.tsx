import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Globe,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useCertificatesPaginated,
  useDeleteCertificate,
  useProviders,
  usePublishCertificate,
  useTracks,
  useUnpublishCertificate,
} from '../../hooks/usePortfolio';
import { ConfirmModal } from './ConfirmModal';
import { CertificateEditModal } from './CertificateEditModal';
import { TrackIcon } from '../TrackIcon';
import type { Certificate } from '../../types';

interface CertificateManagerProps {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const RAW_FILENAME_TITLE_REGEX = /^(1[67][0-9]{10}|share[0-9]+|UC-[a-f0-9-]+|\.trashed-|cert_)/i;
const FILE_EXTENSION_TITLE_REGEX = /\.(pdf|jpg|png)$/i;

/**
 * Prüft synchron zur Backend-Filterung (`incomplete=true`), ob ein Zertifikat unvollständige Metadaten aufweist.
 */
function isIncompleteCertificate(cert: Certificate): boolean {
  return (
    !cert.issued_date ||
    RAW_FILENAME_TITLE_REGEX.test(cert.title) ||
    FILE_EXTENSION_TITLE_REGEX.test(cert.title) ||
    cert.title.includes('certificate')
  );
}

export const CertificateManager: React.FC<CertificateManagerProps> = ({ onNotify }) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished' | 'incomplete'>('all');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms Debounce für die serverseitige Suche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: providers = [], isLoading: loadingProviders } = useProviders({ has_certificates: true });
  const { data: tracks = [] } = useTracks();
  const trackMap = React.useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  // Query-Parameter für serverseitige Filter & Paginierung
  const queryParams = {
    page,
    page_size: pageSize,
    is_published:
      filterStatus === 'published'
        ? true
        : filterStatus === 'unpublished'
        ? false
        : undefined,
    incomplete: filterStatus === 'incomplete' ? true : undefined,
    provider: selectedIssuer !== 'all' ? selectedIssuer : undefined,
    search: debouncedSearch || undefined,
  };

  const {
    data: paginatedData,
    isLoading: loadingCerts,
    isPlaceholderData,
  } = useCertificatesPaginated(queryParams);

  const certificates = paginatedData?.results ?? [];
  const totalCount = paginatedData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const deleteCertMutation = useDeleteCertificate();
  const publishMutation = usePublishCertificate();
  const unpublishMutation = useUnpublishCertificate();

  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [certToEdit, setCertToEdit] = useState<Certificate | null>(null);
  const [certToDelete, setCertToDelete] = useState<{ id: number; title: string } | null>(null);

  const handleStatusFilterChange = (
    status: 'all' | 'published' | 'unpublished' | 'incomplete'
  ) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleIssuerChange = (issuer: string) => {
    setSelectedIssuer(issuer);
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!certToDelete) return;
    try {
      await deleteCertMutation.mutateAsync(certToDelete.id);
      onNotify({ type: 'success', text: `Zertifikat "${certToDelete.title}" gelöscht.` });
    } catch {
      onNotify({ type: 'error', text: 'Fehler beim Löschen des Zertifikats.' });
    } finally {
      setCertToDelete(null);
    }
  };

  const handleTogglePublish = async (cert: Certificate) => {
    if (!cert.is_published && (!cert.tracks || cert.tracks.length === 0)) {
      onNotify({
        type: 'error',
        text: 'Ein Zertifikat kann nur veröffentlicht werden, wenn mindestens ein Track zugewiesen ist.',
      });
      return;
    }
    setPendingActionId(cert.id);
    try {
      if (cert.is_published) {
        await unpublishMutation.mutateAsync(cert.id);
        onNotify({ type: 'success', text: `Zertifikat "${cert.title}" auf Entwurf gesetzt.` });
      } else {
        await publishMutation.mutateAsync(cert.id);
        onNotify({
          type: 'success',
          text: `Zertifikat "${cert.title}" erfolgreich veröffentlicht und im S3-Speicher abgelegt!`,
        });
      }
    } catch {
      onNotify({ type: 'error', text: 'Fehler beim Ändern des Veröffentlichungsstatus.' });
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Kopfbereich & Filter */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-400" />
              Zertifikate verwalten ({totalCount})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Prüfe und veröffentliche Zertifikate im Review-Drawer mit Dokumentenvorschau & KI-OCR.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Suchleiste */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Titel, Aussteller, ID suchen..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Filter-Leiste: Status-Tabs & Aussteller-Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterStatus === 'published'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Veröffentlicht
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('unpublished')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterStatus === 'unpublished'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                  : 'bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              Entwürfe
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('incomplete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterStatus === 'incomplete'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                  : 'bg-slate-900 text-rose-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Unvollständig (Prüfbedarf)
            </button>
          </div>

          {/* Aussteller Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <label htmlFor="issuer-filter" className="sr-only">
              Aussteller filtern
            </label>
            <select
              id="issuer-filter"
              value={selectedIssuer}
              onChange={(e) => handleIssuerChange(e.target.value)}
              disabled={loadingProviders && providers.length === 0}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer min-w-[200px]"
            >
              <option value="all">Alle Aussteller</option>
              {providers.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.provider}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zertifikatsliste */}
      <div className="space-y-3">
        {loadingCerts && !isPlaceholderData ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Lade Zertifikate...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs space-y-2">
            <Award className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">Keine Zertifikate gefunden</p>
            <p className="text-[11px]">
              {searchInput || selectedIssuer !== 'all' || filterStatus !== 'all'
                ? 'Versuche die Filter oder den Suchbegriff zurückzusetzen.'
                : 'Es sind aktuell keine Zertifikate vorhanden.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((cert) => {
              const providerName = cert.provider_details?.provider || 'Anbieter';
              const isActionPending = pendingActionId === cert.id;
              const isIncomplete = isIncompleteCertificate(cert);

              return (
                <div
                  key={cert.id}
                  onClick={() => setCertToEdit(cert)}
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                        {providerName}
                      </span>
                      {cert.is_published ? (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Veröffentlicht (S3)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Entwurf
                        </span>
                      )}
                      {isIncomplete && (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Unvollständig
                        </span>
                      )}
                      {/* Track-Badges mit Icons */}
                      {cert.tracks && cert.tracks.length > 0 && cert.tracks.map((trackId) => {
                        const trackObj = trackMap.get(trackId);
                        if (!trackObj) return null;
                        return (
                          <span
                            key={trackId}
                            className="text-xs font-medium text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60 inline-flex items-center gap-2"
                          >
                            <TrackIcon track={trackObj} className="w-6 h-6 text-violet-400 dark:text-violet-300" />
                            <span>{trackObj.name}</span>
                          </span>
                        );
                      })}
                    </div>
                    <h3 className="font-bold text-white text-sm mt-1 truncate group-hover:text-indigo-300 transition-colors" title={cert.title}>
                      {cert.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {cert.issued_date
                        ? `Ausgestellt am ${new Date(cert.issued_date).toLocaleDateString('de-DE')}`
                        : `Erfasst am ${new Date(cert.uploaded_at).toLocaleDateString('de-DE')}`}
                      {cert.credential_id && ` · ID: ${cert.credential_id}`}
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Veröffentlichen / Zurückziehen Button */}
                    {(() => {
                      const hasTracks = Boolean(cert.tracks && cert.tracks.length > 0);
                      const isPublishDisabled = isActionPending || (!cert.is_published && !hasTracks);
                      const buttonTitle =
                        !cert.is_published && !hasTracks
                          ? 'Mindestens ein Track erforderlich für Veröffentlichung'
                          : cert.is_published
                          ? 'Auf Entwurf zurücksetzen'
                          : 'Veröffentlichen (in S3 ablegen)';

                      return (
                        <button
                          type="button"
                          disabled={isPublishDisabled}
                          onClick={() => handleTogglePublish(cert)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            cert.is_published
                              ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300'
                              : !hasTracks
                              ? 'bg-slate-800/40 text-slate-500 border border-slate-800'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                          }`}
                          title={buttonTitle}
                        >
                          {isActionPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : cert.is_published ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Entwurf</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Veröffentlichen</span>
                            </>
                          )}
                        </button>
                      );
                    })()}

                    {cert.pdf_file && (
                      <a
                        href={cert.pdf_file}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Zertifikat ansehen"
                        aria-label={`Zertifikat ${cert.title} ansehen`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-slate-800 transition-colors"
                        title={`Online-Verifizierung öffnen (${cert.credential_url})`}
                        aria-label={`Online-Verifizierung für ${cert.title} öffnen`}
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setCertToEdit(cert)}
                      className="p-2 text-slate-400 hover:text-indigo-300 transition-colors rounded-lg hover:bg-slate-800"
                      title="Review-Modal öffnen"
                      aria-label={`Zertifikat ${cert.title} überprüfen`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCertToDelete({ id: cert.id, title: cert.title })}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                      title="Zertifikat löschen"
                      aria-label={`Zertifikat ${cert.title} löschen`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paginierungs-Footer */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
          <div>
            Zeige <span className="text-white font-semibold">{Math.min((page - 1) * pageSize + 1, totalCount)}</span> bis{' '}
            <span className="text-white font-semibold">{Math.min(page * pageSize, totalCount)}</span> von{' '}
            <span className="text-white font-semibold">{totalCount}</span> Zertifikaten
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loadingCerts}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Vorherige
            </button>
            <span className="px-2 text-slate-300 font-medium">
              Seite {page} von {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loadingCerts}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              Nächste
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!certToDelete}
        title="Zertifikat löschen"
        message={`Möchtest du das Zertifikat "${certToDelete?.title}" wirklich unwiderruflich löschen?`}
        confirmText="Löschen"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCertToDelete(null)}
      />

      {/* Review & Edit Modal */}
      <CertificateEditModal
        key={certToEdit?.id ?? 'none'}
        certificate={certToEdit}
        onClose={() => setCertToEdit(null)}
        onNotify={onNotify}
      />
    </div>
  );
};
