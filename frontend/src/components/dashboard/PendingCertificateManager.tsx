import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Search,
  XCircle,
} from 'lucide-react';
import {
  useApprovePendingCertificate,
  usePendingCertificates,
  useProviders,
  useRejectPendingCertificate,
  useTracks,
} from '../../hooks/usePortfolio';
import type { PendingCertificate } from '../../types';

interface PendingCertificateManagerProps {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const PendingCertificateManager: React.FC<PendingCertificateManagerProps> = ({
  onNotify,
}) => {
  const { data: pendingList = [], isLoading } = usePendingCertificates();
  const { data: providers = [] } = useProviders();
  const { data: tracks = [] } = useTracks();

  const approveMutation = useApprovePendingCertificate();
  const rejectMutation = useRejectPendingCertificate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPending, setSelectedPending] = useState<PendingCertificate | null>(null);

  // Edit-State für Freigabe
  const [editTitle, setEditTitle] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editTrackIds, setEditTrackIds] = useState<number[]>([]);

  const handleStartReview = (item: PendingCertificate) => {
    setSelectedPending(item);
    setEditTitle(item.guessed_title || item.original_file_name.replace(/\.[^/.]+$/, ''));
    setEditProvider(item.guessed_provider || (providers[0]?.provider ?? ''));
    setEditTrackIds([]);
  };

  const handleCancelReview = () => {
    setSelectedPending(null);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPending) return;

    if (!editTitle.trim() || !editProvider.trim()) {
      onNotify({ type: 'error', text: 'Titel und Anbieter dürfen nicht leer sein.' });
      return;
    }

    try {
      await approveMutation.mutateAsync({
        id: selectedPending.id,
        payload: {
          title: editTitle.trim(),
          provider: editProvider.trim(),
          track_ids: editTrackIds,
        },
      });
      onNotify({
        type: 'success',
        text: `"${editTitle}" erfolgreich freigegeben und als Zertifikat übertragen.`,
      });
      setSelectedPending(null);
    } catch {
      onNotify({
        type: 'error',
        text: 'Fehler beim Freigeben des Zertifikats.',
      });
    }
  };

  const handleReject = async (item: PendingCertificate) => {
    if (!window.confirm(`Möchtest du "${item.original_file_name}" wirklich ablehnen?`)) {
      return;
    }

    try {
      await rejectMutation.mutateAsync(item.id);
      onNotify({
        type: 'success',
        text: `"${item.original_file_name}" wurde abgelehnt.`,
      });
      if (selectedPending?.id === item.id) {
        setSelectedPending(null);
      }
    } catch {
      onNotify({
        type: 'error',
        text: 'Fehler beim Ablehnen des Zertifikats.',
      });
    }
  };

  const pendingOnly = pendingList.filter((item) => item.status === 'pending');
  const filteredList = pendingOnly.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      item.original_file_name.toLowerCase().includes(q) ||
      item.guessed_title?.toLowerCase().includes(q) ||
      item.guessed_provider?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Inbox & Zertifikats-Review</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {pendingOnly.length} Ausstehend
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Überprüfe neu eingelesene Zertifikats-Kandidaten, passe Metadaten an und übertrage sie sicher in den Produktivbestand.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Kandidaten durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Review Modal / Editor */}
      {selectedPending && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Zertifikat freigeben: {selectedPending.original_file_name}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Eingelesen am: {new Date(selectedPending.created_at).toLocaleString('de-DE')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancelReview}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Abbrechen
            </button>
          </div>

          <form onSubmit={handleApprove} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="edit-title" className="block text-xs font-semibold text-slate-300">
                Titel des Zertifikats *
              </label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-provider" className="block text-xs font-semibold text-slate-300">
                Anbieter *
              </label>
              <input
                id="edit-provider"
                type="text"
                list="provider-suggestions"
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <datalist id="provider-suggestions">
                {providers.map((p) => (
                  <option key={p.id} value={p.provider} />
                ))}
              </datalist>
            </div>

            {/* Tracks Zuweisung */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300">
                Lernpfade / Tracks zuweisen
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {tracks.map((t) => {
                  const isChecked = editTrackIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setEditTrackIds(editTrackIds.filter((id) => id !== t.id));
                        } else {
                          setEditTrackIds([...editTrackIds, t.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isChecked
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancelReview}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {approveMutation.isPending ? 'Wird übertragen...' : 'Freigeben & Übertragen'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of Pending Items */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Lade ausstehende Zertifikate...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">Keine ausstehenden Zertifikate</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Keine Treffer für die aktuelle Suche.'
              : 'Aktuell liegen keine unbestätigten Zertifikate in der Inbox. Führe den Scanner aus, um neue Dateien einzulesen.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white break-all">
                    {item.guessed_title || item.original_file_name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Ausstehend
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span>Datei: <code className="text-slate-300">{item.original_file_name}</code></span>
                  {item.guessed_provider && (
                    <span>Anbieter: <span className="text-indigo-400">{item.guessed_provider}</span></span>
                  )}
                  <span>
                    Datum: {new Date(item.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartReview(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Prüfen & Freigeben
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(item)}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Ablehnen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
