import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, CheckCircle2, ExternalLink, Layers, RotateCcw, Search, X } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { usePublishedCertificates as useCertificates, useTracks } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';
import { SectionEmptyState } from './SectionEmptyState';
import { TrackIcon } from './TrackIcon';
import type { Certificate, Track } from '../types';

interface CertificateCardItemProps {
  cert: Certificate;
  issuerName: string;
  trackMap: Map<number, Track>;
  selectedTrackIds: number[];
  onToggleTrack: (id: number) => void;
}

const CertificateCardItem: React.FC<CertificateCardItemProps> = React.memo(
  ({ cert, issuerName, trackMap, selectedTrackIds, onToggleTrack }) => {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'de-DE';

    return (
      <div
        id={`cert-${cert.id}`}
        className="group rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-500/50 hover:shadow-lg dark:hover:bg-slate-900/70 transition-all duration-200 flex flex-col justify-between shadow-sm h-full"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-medium">
              {issuerName}
            </span>
            <span className="text-[11px] text-slate-500 font-medium font-mono">
              {cert.issued_date
                ? new Date(cert.issued_date).toLocaleDateString(dateLocale)
                : new Date(cert.uploaded_at).toLocaleDateString(dateLocale)}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2">
            {cert.title}
          </h3>

          {cert.credential_id && (
            <p className="text-[11px] text-slate-500 font-mono mb-3">
              ID: {cert.credential_id}
            </p>
          )}

          {/* Zugeordnete Track-Badges */}
          {cert.tracks && cert.tracks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {cert.tracks.map((trackId: number) => {
                const trackObj = trackMap.get(trackId);
                if (!trackObj) return null;
                const isSelected = selectedTrackIds.includes(trackId);
                return (
                  <button
                    key={trackId}
                    type="button"
                    onClick={() => onToggleTrack(trackId)}
                    aria-label={t('certificates.certTrackAria', {
                      name: trackObj.name,
                      defaultValue: `Zertifikat-Track: ${trackObj.name}`,
                    })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors duration-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    title={t('certificates.filterByTrackTitle', {
                      name: trackObj.name,
                      defaultValue: `Nach Track "${trackObj.name}" filtern`,
                    })}
                  >
                    <TrackIcon track={trackObj} className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    <span>{trackObj.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('certificates.verified', 'Verifiziert')}</span>
          </div>

          <div className="flex items-center gap-3">
            {cert.credential_url && (
              <a
                href={cert.credential_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                title={t('certificates.verifyOnlineTitle', 'Online verifizieren')}
              >
                <span>{t('certificates.verifyOnline', 'Online prüfen')}</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            {cert.pdf_file ? (
              <a
                href={cert.pdf_file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                <span>PDF</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                {t('certificates.storedInAdmin', 'Im Admin hinterlegt')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CertificateCardItem.displayName = 'CertificateCardItem';

export const CertificatesSection: React.FC = () => {
  const { t } = useTranslation();
  const { data: rawCertificates, isLoading } = useCertificates();
  const certificates = useMemo(
    () => (Array.isArray(rawCertificates) ? rawCertificates : []),
    [rawCertificates]
  );
  const { data: rawTracks = [] } = useTracks();
  const tracks = useMemo(
    () => (Array.isArray(rawTracks) ? rawTracks : []),
    [rawTracks]
  );

  const { searchTerm, setSearchTerm, clearSearch } = usePortfolioSearch();
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);

  const getIssuerName = (cert: Certificate): string => {
    return cert.provider_details?.provider || t('certificates.fallbackProvider', 'Zertifikatsanbieter');
  };

  const issuers = useMemo(
    () => ['all', ...Array.from(new Set(certificates.map((cert) => cert.provider_details?.provider || t('certificates.fallbackProvider', 'Zertifikatsanbieter'))))],
    [certificates, t]
  );
  const trackMap = useMemo(() => new Map(tracks.map((tr) => [tr.id, tr])), [tracks]);
  const getTrackCount = (trackId: number): number => {
    return certificates.filter((c) => c.tracks?.includes(trackId)).length;
  };

  function toggleTrack(trackId: number) {
    setSelectedTrackIds((prev) => prev.includes(trackId)
      ? prev.filter((id) => id !== trackId)
      : [...prev, trackId]
    );
  }

  const resetTracks = () => {
    setSelectedTrackIds([]);
  };

  const resetAllFilters = () => {
    clearSearch();
    setSelectedIssuer('all');
    setSelectedTrackIds([]);
  };

  const filteredCertificates = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return certificates.filter((cert) => {
      const issuerName = cert.provider_details?.provider || t('certificates.fallbackProvider', 'Zertifikatsanbieter');
      const matchesSearch =
        !query ||
        cert.title.toLowerCase().includes(query) ||
        issuerName.toLowerCase().includes(query);
      const matchesIssuer = selectedIssuer === 'all' || issuerName === selectedIssuer;
      const matchesTracks =
        selectedTrackIds.length === 0 ||
        (cert.tracks && cert.tracks.some((id) => selectedTrackIds.includes(id)));

      return matchesSearch && matchesIssuer && matchesTracks;
    });
  }, [certificates, searchTerm, selectedIssuer, selectedTrackIds, t]);

  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  });

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      const nextCols = width < 768 ? 1 : width < 1024 ? 2 : 3;
      setColumns((prev) => (prev !== nextCols ? nextCols : prev));
    };
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const rows = useMemo(() => {
    const chunks: Certificate[][] = [];
    for (let i = 0; i < filteredCertificates.length; i += columns) {
      chunks.push(filteredCertificates.slice(i, i + columns));
    }
    return chunks;
  }, [filteredCertificates, columns]);

  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 240,
    overscan: 2,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const isAnyFilterActive =
    Boolean(searchTerm) || selectedIssuer !== 'all' || selectedTrackIds.length > 0;

  // Aktive Track-Namen für das Banner ableiten
  const activeTrackNames = selectedTrackIds
    .map((id) => trackMap.get(id)?.name)
    .filter(Boolean) as string[];

  const singleActiveTrack =
    selectedTrackIds.length === 1 ? trackMap.get(selectedTrackIds[0]) : null;

  return (
    <section id="certificates" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header im Swiss/Architectural Style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              <span>{t('certificates.eyebrow', '03 // Credentials & Verification')}</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('certificates.label', 'Verifizierte Nachweise')} ({certificates.length})</span>
              </span>
              {isAnyFilterActive && (
                <span
                  role="status"
                  aria-atomic="true"
                  className="text-slate-500 dark:text-slate-400 font-sans font-normal"
                >
                  • {filteredCertificates.length} {t('certificates.filtered', 'gefiltert')}
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('certificates.heading', 'Zertifikate & Qualifikationen')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm leading-relaxed">
            {t('certificates.subheading', 'Offizielle Zertifizierungen aus den Bereichen Backend-Engineering, Cloud-Architektur und Full-Stack Development.')}
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3.5 mb-8 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              {/* Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('certificates.searchPlaceholder', 'Titel, Aussteller suchen...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label={t('certificates.resetSearchAria', 'Suche zurücksetzen')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-0.5"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Issuer Badges */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {issuers.map((issuer) => (
                <button
                  key={issuer}
                  type="button"
                  onClick={() => setSelectedIssuer(issuer)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selectedIssuer === issuer
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                >
                  {issuer === 'all' ? `${t('certificates.allIssuers', 'Alle Aussteller')} (${certificates.length})` : issuer}
                </button>
              ))}
            </div>
          </div>

          {/* Interaktive Many-to-Many Track-Filterchips */}
          {tracks.length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                  {t('certificates.tracksFilterLabel', 'Themenpfade / Tracks filtern:')}
                </span>
                {selectedTrackIds.length > 0 && (
                  <button
                    type="button"
                    onClick={resetTracks}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    {t('certificates.showAllTracks', 'Alle Tracks anzeigen')}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={resetTracks}
                  aria-label={`${t('certificates.allCertificatesAria', 'Alle Zertifikate')} (${certificates.length})`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selectedTrackIds.length === 0
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                >
                  {t('certificates.allTracks', 'Alle')} ({certificates.length})
                </button>
                {tracks.map((tr) => {
                  const count = getTrackCount(tr.id);
                  const isSelected = selectedTrackIds.includes(tr.id);
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => toggleTrack(tr.id)}
                      aria-label={t('certificates.trackFilterAria', {
                        name: tr.name,
                        count,
                        defaultValue: `Track-Filter: ${tr.name} (${count})`,
                      })}
                      aria-pressed={isSelected}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-200 flex items-center gap-2 shadow-sm border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                      <TrackIcon track={tr} className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                      <span>{tr.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSelected
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Active Track Banner im klaren Slate/Indigo-Architekturschema */}
        {selectedTrackIds.length > 0 && (
          <div className="mb-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-indigo-200/80 dark:border-indigo-900/60 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                {singleActiveTrack ? (
                  <TrackIcon track={singleActiveTrack} className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {singleActiveTrack
                      ? `${t('certificates.learningPath', 'Lernpfad:')} ${singleActiveTrack.name}`
                      : `${t('certificates.selectedPaths', 'Ausgewählte Lernpfade')} (${selectedTrackIds.length}): ${activeTrackNames.join(', ')}`}
                  </h3>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-0.5 rounded-full">
                    {t('certificates.certificatesCount', { count: filteredCertificates.length, defaultValue: `${filteredCertificates.length} Zertifikat(e)` })}
                  </span>
                </div>
                {singleActiveTrack?.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {singleActiveTrack.description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={resetTracks}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              title={t('certificates.resetTracksAria', 'Track-Filter zurücksetzen')}
              aria-label={t('certificates.resetTracksAria', 'Track-Filter zurücksetzen')}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <SectionEmptyState
            sectionName={t('nav.certificates', 'Zertifikate')}
            query={searchTerm || selectedIssuer || activeTrackNames.join(', ')}
            onReset={resetAllFilters}
          />
        ) : filteredCertificates.length <= 6 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((cert) => (
              <CertificateCardItem
                key={cert.id}
                cert={cert}
                issuerName={getIssuerName(cert)}
                trackMap={trackMap}
                selectedTrackIds={selectedTrackIds}
                onToggleTrack={toggleTrack}
              />
            ))}
          </div>
        ) : (
          <div ref={listRef} className="relative w-full">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const rowItems = rows[virtualRow.index] || [];
                return (
                  <div
                    key={virtualRow.index}
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start - (virtualizer.options.scrollMargin ?? 0)
                        }px)`,
                    }}
                    className="pb-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rowItems.map((cert) => (
                        <CertificateCardItem
                          key={cert.id}
                          cert={cert}
                          issuerName={getIssuerName(cert)}
                          trackMap={trackMap}
                          selectedTrackIds={selectedTrackIds}
                          onToggleTrack={toggleTrack}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
