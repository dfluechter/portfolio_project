import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ExternalLink, Search } from 'lucide-react';
import { portfolioService } from '../services/portfolioService';
import type { Certificate } from '../types';

export const CertificatesSection: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const data = await portfolioService.getCertificates();
        setCertificates(data);
      } catch (err) {
        console.warn('API-Fehler beim Laden der Zertifikate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const getIssuerName = (cert: Certificate): string => {
    return cert.provider_details?.provider || 'Zertifikatsanbieter';
  };

  const issuers = ['all', ...Array.from(new Set(certificates.map(getIssuerName)))];

  const filteredCertificates = certificates.filter((cert) => {
    const issuerName = getIssuerName(cert);
    const matchesSearch =
      cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issuerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIssuer = selectedIssuer === 'all' || issuerName === selectedIssuer;
    return matchesSearch && matchesIssuer;
  });

  return (
    <section id="certificates" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-3">
              <Award className="w-3.5 h-3.5" />
              Verifizierte Nachweise ({certificates.length})
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Zertifikat oder Aussteller suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
            />
          </div>

          {/* Issuer Badges */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {issuers.map((issuer) => (
              <button
                key={issuer}
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

        {/* Certificates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Award className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Keine passenden Zertifikate gefunden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((cert) => {
              const issuerName = getIssuerName(cert);
              return (
                <div
                  key={cert.id}
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

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors line-clamp-2">
                      {cert.title}
                    </h3>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
