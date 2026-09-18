import React, { useState } from 'react';
import {
  Award,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  useCertificates,
  useCreateCertificate,
  useCreateProvider,
  useDeleteCertificate,
  useProviders,
} from '../../hooks/usePortfolio';
import { ConfirmModal } from './ConfirmModal';

interface CertificateManagerProps {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const CertificateManager: React.FC<CertificateManagerProps> = ({ onNotify }) => {
  const { data: certificates = [], isLoading: loadingCerts } = useCertificates();
  const { data: providers = [], isLoading: loadingProviders } = useProviders();

  const createCertMutation = useCreateCertificate();
  const deleteCertMutation = useDeleteCertificate();
  const createProviderMutation = useCreateProvider();

  // Form State
  const [certTitle, setCertTitle] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [newProviderName, setNewProviderName] = useState<string>('');
  const [certFile, setCertFile] = useState<File | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Confirm Modal State
  const [certToDelete, setCertToDelete] = useState<{ id: number; title: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!certFile) {
      onNotify({ type: 'error', text: 'Bitte wähle eine PDF-, PNG- oder JPG-Datei aus.' });
      return;
    }

    try {
      let providerIdToUse = selectedProviderId;

      if (!providerIdToUse && providers.length > 0) {
        providerIdToUse = String(providers[0].id);
      }

      if (selectedProviderId === 'new') {
        if (!newProviderName.trim()) {
          onNotify({ type: 'error', text: 'Bitte gib einen Namen für den neuen Anbieter ein.' });
          return;
        }
        const newProv = await createProviderMutation.mutateAsync(newProviderName.trim());
        providerIdToUse = String(newProv.id);
      }

      if (!providerIdToUse) {
        onNotify({ type: 'error', text: 'Bitte wähle einen Anbieter aus.' });
        return;
      }

      const formData = new FormData();
      formData.append('title', certTitle);
      formData.append('provider', providerIdToUse);
      formData.append('pdf_file', certFile);

      await createCertMutation.mutateAsync(formData);
      onNotify({ type: 'success', text: 'Zertifikat erfolgreich hochgeladen!' });

      setCertTitle('');
      setNewProviderName('');
      setCertFile(null);
      setSelectedProviderId(providers.length > 0 ? String(providers[0].id) : '');
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.pdf_file?.[0] ||
        err.response?.data?.provider?.[0] ||
        'Fehler beim Hochladen des Zertifikats.';
      onNotify({ type: 'error', text: msg });
    }
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

  const filteredCertificates = certificates.filter((c) => {
    const term = searchTerm.toLowerCase();
    const providerName = c.provider_details?.provider?.toLowerCase() || '';
    return c.title.toLowerCase().includes(term) || providerName.includes(term);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Upload Certificate Form */}
      <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-fit space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <Upload className="w-5 h-5 text-indigo-400" />
          Neues Zertifikat hochladen
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cert-title" className="block text-xs font-semibold text-slate-400 mb-1">
              Titel des Zertifikats
            </label>
            <input
              id="cert-title"
              type="text"
              required
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              placeholder="z. B. Meta Full-Stack Certificate"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="cert-provider" className="block text-xs font-semibold text-slate-400 mb-1">
              Zertifikatsanbieter
            </label>
            <select
              id="cert-provider"
              value={selectedProviderId || (providers[0] ? String(providers[0].id) : '')}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              disabled={loadingProviders}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.provider}
                </option>
              ))}
              <option value="new">+ Neuen Anbieter erstellen...</option>
            </select>
          </div>

          {selectedProviderId === 'new' && (
            <div className="animate-in fade-in duration-200">
              <label htmlFor="new-provider-name" className="block text-xs font-semibold text-indigo-400 mb-1">
                Name des neuen Anbieters
              </label>
              <input
                id="new-provider-name"
                type="text"
                required
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                placeholder="z. B. AWS, Coursera, IBM"
                className="w-full px-3.5 py-2 bg-slate-950 border border-indigo-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label htmlFor="cert-file" className="block text-xs font-semibold text-slate-400 mb-1">
              Datei (PDF, PNG, JPG ≤ 5 MB)
            </label>
            <input
              id="cert-file"
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setCertFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={createCertMutation.isPending || createProviderMutation.isPending}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createCertMutation.isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Wird hochgeladen...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Zertifikat hochladen</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Certificates List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-violet-400" />
            Vorhandene Zertifikate ({certificates.length})
          </h2>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loadingCerts ? (
          <div className="p-8 text-center text-slate-500 text-xs">Lade Zertifikate...</div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
            {searchTerm ? 'Keine Zertifikate für diesen Suchbegriff gefunden.' : 'Noch keine Zertifikate vorhanden.'}
          </div>
        ) : (
          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {filteredCertificates.map((cert) => {
              const providerName = cert.provider_details?.provider || 'Anbieter';
              return (
                <div
                  key={cert.id}
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                      {providerName}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{cert.title}</h3>
                    <p className="text-[11px] text-slate-500">
                      Hochgeladen am {new Date(cert.uploaded_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!certToDelete}
        title="Zertifikat löschen"
        message={`Möchtest du das Zertifikat "${certToDelete?.title}" wirklich unwiderruflich löschen?`}
        confirmText="Löschen"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCertToDelete(null)}
      />
    </div>
  );
};
