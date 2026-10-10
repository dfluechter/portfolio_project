import React, { useState } from 'react';
import { Award, CheckCircle2, ExternalLink, Layers, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCertificates, useTracks } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';
import { SectionEmptyState } from './SectionEmptyState';
import type { Certificate } from '../types';

export const CertificatesSection: React.FC = () => {
  const { data: certificates = [], isLoading } = useCertificates();
  const { data: tracks = [] } = useTracks();
  const { searchTerm, setSearchTerm, clearSearch } = usePortfolioSearch();
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('all');

  const getIssuerName = (cert: Certificate): string => {
    return cert.provider_details?.provider || 'Zertifikatsanbieter';
  };

  const issuers = ['all', ...Array.from(new Set(certificates.map(getIssuerName)))];

  const trackMap = new Map(tracks.map((t) => [t.id, t]));

  const getTrackCount = (trackId: number): number => {
    return certificates.filter((c) => c.tracks?.includes(trackId)).length;
  };

  const currentTrack = selectedTrackId !== 'all' ? trackMap.get(Number(selectedTrackId)) : null;

  const filteredCertificates = certificates.filter((cert) => {
    const issuerName = getIssuerName(cert);
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      !query ||
      cert.title.toLowerCase().includes(query) ||
      issuerName.toLowerCase().includes(query);
    const matchesIssuer = selectedIssuer === 'all' || issuerName === selectedIssuer;
    const matchesTrack = selectedTrackId === 'all' || cert.tracks?.includes(Number(selectedTrackId));

    return matchesSearch && matchesIssuer && matchesTrack;
  });

  return (
    <section id="certificates" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-3">
              <Award className="w-3.5 h-3.5" />
              Verifizierte Nachweise ({certificates.length}) {searchTerm && `• ${filteredCertificates.length} gefiltert`}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Zertifikate & Qualifikationen
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm">
            Offizielle Zertifizierungen aus den Bereichen Backend-Engineering, Cloud-Architektur und Full-Stack Development.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 mb-8 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Zertifikate filtern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shadow-sm ${
                    selectedIssuer === issuer
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {issuer === 'all' ? `Alle Aussteller (${certificates.length})` : issuer}
                </button>
              ))}
            </div>
          </div>

          {/* Track Filter Pills */}
          {tracks.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap mr-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-violet-500" />
                Lernpfade:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTrackId('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  selectedTrackId === 'all'
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Alle Tracks ({certificates.length})
              </button>
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrackId(String(t.id))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    selectedTrackId === String(t.id)
                      ? 'bg-violet-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {t.name} ({getTrackCount(t.id)})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Track Banner */}
        {currentTrack && (
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/20 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lernpfad: {currentTrack.name}
                </h3>
                <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                  {getTrackCount(currentTrack.id)} Zertifikat(e)
                </span>
              </div>
              {currentTrack.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {currentTrack.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <SectionEmptyState
            sectionName="Zertifikate"
            query={searchTerm || selectedIssuer}
            onReset={() => {
              clearSearch();
              setSelectedIssuer('all');
              setSelectedTrackId('all');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCertificates.map((cert) => {
                const issuerName = getIssuerName(cert);
                return (
                  <motion.div
                    key={cert.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="group rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 hover:border-violet-500/50 hover:shadow-lg dark:hover:bg-slate-900/70 transition-all duration-300 flex flex-col justify-between shadow-sm hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 text-[11px] font-semibold">
                          {issuerName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {new Date(cert.uploaded_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors line-clamp-2">
                        {cert.title}
                      </h3>

                      {/* Zugeordnete Track-Badges */}
                      {cert.tracks && cert.tracks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {cert.tracks.map((trackId) => {
                            const trackObj = trackMap.get(trackId);
                            if (!trackObj) return null;
                            const isSelected = selectedTrackId === String(trackId);
                            return (
                              <button
                                key={trackId}
                                type="button"
                                onClick={() =>
                                  setSelectedTrackId(isSelected ? 'all' : String(trackId))
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-600 dark:hover:text-violet-400'
                                }`}
                                title={`Nach Track "${trackObj.name}" filtern`}
                              >
                                {trackObj.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verifiziert
                      </div>

                      {cert.pdf_file ? (
                        <a
                          href={cert.pdf_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                        >
                          Dokument ansehen
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Im Admin hinterlegt</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};
