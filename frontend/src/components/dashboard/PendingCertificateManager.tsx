import React, { useState } from 'react';
import {
  CheckCircle,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Search,
  Square,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  useApprovePendingCertificate,
  useBulkApprovePendingCertificates,
  useBulkRejectPendingCertificates,
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
  const bulkApproveMutation = useBulkApprovePendingCertificates();
  const bulkRejectMutation = useBulkRejectPendingCertificates();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPending, setSelectedPending] = useState<PendingCertificate | null>(null);

  // Multi-Select & Bulk State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkTrackIds, setBulkTrackIds] = useState<number[]>([]);
  const [showBulkTrackPicker, setShowBulkTrackPicker] = useState(false);

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
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } catch {
      onNotify({
        type: 'error',
        text: 'Fehler beim Ablehnen des Zertifikats.',
      });
    }
  };

  // Multi-Select Handler
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (visibleItems: PendingCertificate[]) => {
    const visibleIds = visibleItems.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      const res = await bulkApproveMutation.mutateAsync({
        ids: selectedIds,
        track_ids: bulkTrackIds.length > 0 ? bulkTrackIds : undefined,
      });

      if (res.approved_count > 0 && res.failed_count === 0) {
        onNotify({
          type: 'success',
          text: `${res.approved_count} Zertifikat(e) erfolgreich freigegeben und übertragen.`,
        });
      } else if (res.approved_count > 0 && res.failed_count > 0) {
        onNotify({
          type: 'success',
          text: `${res.approved_count} erfolgreich freigegeben, ${res.failed_count} fehlgeschlagen.`,
        });
      } else {
        const errorDetails = res.errors.map((e) => e.error).join(', ');
        onNotify({
          type: 'error',
          text: `Keine Zertifikate freigegeben: ${errorDetails}`,
        });
      }

      setSelectedIds([]);
      setBulkTrackIds([]);
      setShowBulkTrackPicker(false);
    } catch {
      onNotify({
        type: 'error',
        text: 'Fehler bei der Massenfreigabe der Zertifikate.',
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Möchtest du die ${selectedIds.length} ausgewählten Zertifikate wirklich ablehnen?`
      )
    ) {
      return;
    }

    try {
      const res = await bulkRejectMutation.mutateAsync(selectedIds);
      onNotify({
        type: 'success',
        text: `${res.rejected_count} Zertifikat(e) abgelehnt.`,
      });
      setSelectedIds([]);
      setShowBulkTrackPicker(false);
    } catch {
      onNotify({
        type: 'error',
        text: 'Fehler bei der Massenablehnung der Zertifikate.',
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
            <div className="flex items-center gap-2">
              <a
                href={`/api/pending-certificates/${selectedPending.id}/file/`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
                title="Originaldatei im neuen Tab ansehen"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Show File ({selectedPending.original_file_name.split('.').pop()?.toUpperCase()})
              </a>
              <button
                type="button"
                onClick={handleCancelReview}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Abbrechen
              </button>
            </div>
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
                      className={`cursor-pointer px-3 py-1 rounded-lg text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
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
                className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={approveMutation.isPending}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
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
          <Clock className="w-8 h-8 text-slate-600 mx-auto" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-300">Keine ausstehenden Zertifikate</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Keine Treffer für die aktuelle Suche.'
              : 'Aktuell liegen keine unbestätigten Zertifikate in der Inbox. Führe den Scanner aus, um neue Dateien einzulesen.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selection Control Bar */}
          <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => handleSelectAll(filteredList)}
              className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              {filteredList.length > 0 &&
              filteredList.every((item) => selectedIds.includes(item.id)) ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" />
              )}
              <span>
                {filteredList.length > 0 &&
                filteredList.every((item) => selectedIds.includes(item.id))
                  ? 'Auswahl für alle aufheben'
                  : 'Alle sichtbaren auswählen'}
              </span>
            </button>
            {selectedIds.length > 0 && (
              <span className="text-indigo-400 font-medium">
                {selectedIds.length} von {filteredList.length} ausgewählt
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className={`bg-slate-900 border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  selectedIds.includes(item.id)
                    ? 'border-indigo-500/50 bg-indigo-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`Zertifikat ${item.guessed_title || item.original_file_name} auswählen`}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
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
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/pending-certificates/${item.id}/file/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    title="Originaldatei im neuen Tab ansehen"
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    Show File
                  </a>
                  <button
                    type="button"
                    onClick={() => handleStartReview(item)}
                    className="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    Prüfen & Freigeben
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item)}
                    disabled={rejectMutation.isPending}
                    className="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 px-5 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 text-xs animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {selectedIds.length}
            </span>
            <span className="text-white font-medium">ausgewählt</span>
          </div>

          {/* Bulk Track Selector Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBulkTrackPicker((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {bulkTrackIds.length > 0
                  ? `${bulkTrackIds.length} Track(s) gewählt`
                  : 'Tracks zuweisen (optional)'}
              </span>
            </button>

            {showBulkTrackPicker && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2 z-50">
                <div className="text-[11px] font-semibold text-slate-400">Gemeinsame Lernpfade</div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {tracks.map((t) => {
                    const isChecked = bulkTrackIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setBulkTrackIds((prev) =>
                            isChecked ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                          );
                        }}
                        className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
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
            )}
          </div>

          {/* Bulk Actions */}
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={bulkApproveMutation.isPending}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {bulkApproveMutation.isPending ? 'Wird übertragen...' : `Genehmigen (${selectedIds.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleBulkReject}
            disabled={bulkRejectMutation.isPending}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold border border-red-500/30 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {bulkRejectMutation.isPending ? 'Wird abgelehnt...' : `Ablehnen (${selectedIds.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              setBulkTrackIds([]);
              setShowBulkTrackPicker(false);
            }}
            className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Auswahl aufheben"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
