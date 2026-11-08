import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
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

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (typeof record.detail === 'string' && record.detail.trim()) {
        return record.detail;
      }
      if (typeof record.error === 'string' && record.error.trim()) {
        return record.error;
      }
      if (typeof record.message === 'string' && record.message.trim()) {
        return record.message;
      }
      const values = Object.values(record);
      if (values.length > 0) {
        const firstVal = values[0];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string' && firstVal[0].trim()) {
          return firstVal[0];
        }
        if (typeof firstVal === 'string' && firstVal.trim()) {
          return firstVal;
        }
      }
    }
  } else if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export const PendingCertificateManager: React.FC<PendingCertificateManagerProps> = ({
  onNotify,
}) => {
  const { t } = useTranslation();
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

  // Edit-State für Freigabe (Einzelreview)
  const [editTitle, setEditTitle] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editTrackIds, setEditTrackIds] = useState<number[]>([]);

  const handleStartReview = (item: PendingCertificate) => {
    setSelectedPending(item);
    setEditTitle(item.guessed_title || item.original_file_name.replace(/\.[^/.]+$/, ''));
    setEditProvider(item.guessed_provider || (providers[0]?.provider ?? ''));
    setEditTrackIds(item.suggested_tracks && item.suggested_tracks.length > 0 ? item.suggested_tracks : []);
  };

  const handleCancelReview = () => {
    setSelectedPending(null);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPending) return;

    if (!editTitle.trim() || !editProvider.trim()) {
      onNotify({ type: 'error', text: t('inbox.notifyTitleProviderRequired') });
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
        text: t('inbox.notifySingleApproveSuccess', { title: editTitle }),
      });
      setSelectedPending(null);
    } catch (err: unknown) {
      const detail = extractErrorMessage(err, t('inbox.notifySingleApproveError'));
      onNotify({
        type: 'error',
        text: detail,
      });
    }
  };

  const handleReject = async (item: PendingCertificate) => {
    if (!window.confirm(t('inbox.confirmRejectSingle', { fileName: item.original_file_name }))) {
      return;
    }

    try {
      await rejectMutation.mutateAsync(item.id);
      onNotify({
        type: 'success',
        text: t('inbox.notifySingleRejectSuccess', { fileName: item.original_file_name }),
      });
      if (selectedPending?.id === item.id) {
        setSelectedPending(null);
      }
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } catch (err: unknown) {
      const detail = extractErrorMessage(err, t('inbox.notifySingleRejectError'));
      onNotify({
        type: 'error',
        text: detail,
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
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
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

  // Track-Pflicht-Logik:
  // Jedes ausgewählte Zertifikat muss mindestens einen Track besitzen,
  // entweder via gemeinsame Bulk-Tracks ODER jedes Item hat eigene suggested_tracks.
  const selectedItems = pendingList.filter((item) => selectedIds.includes(item.id));
  const hasMissingTracks =
    selectedIds.length > 0 &&
    bulkTrackIds.length === 0 &&
    selectedItems.some((item) => !item.suggested_tracks || item.suggested_tracks.length === 0);

  const isBulkApproveDisabled =
    bulkApproveMutation.isPending || selectedIds.length === 0 || hasMissingTracks;

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0 || hasMissingTracks) return;

    try {
      const res = await bulkApproveMutation.mutateAsync({
        ids: selectedIds,
        track_ids: bulkTrackIds.length > 0 ? bulkTrackIds : undefined,
      });

      if (res.approved_count > 0 && res.failed_count === 0) {
        onNotify({
          type: 'success',
          text: t('inbox.notifyBulkApproveSuccess', { count: res.approved_count }),
        });
      } else if (res.approved_count > 0 && res.failed_count > 0) {
        onNotify({
          type: 'success',
          text: t('inbox.notifyBulkApprovePartial', {
            approved: res.approved_count,
            failed: res.failed_count,
          }),
        });
      } else {
        const errorDetails = res.errors.map((e) => e.error).join(', ');
        onNotify({
          type: 'error',
          text: t('inbox.notifyBulkApproveNone', { details: errorDetails }),
        });
      }

      setSelectedIds([]);
      setBulkTrackIds([]);
      setShowBulkTrackPicker(false);
    } catch (err: unknown) {
      const detail = extractErrorMessage(err, t('inbox.notifyBulkApproveError'));
      onNotify({
        type: 'error',
        text: detail,
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(t('inbox.confirmRejectBulk', { count: selectedIds.length }))) {
      return;
    }

    try {
      const res = await bulkRejectMutation.mutateAsync(selectedIds);
      onNotify({
        type: 'success',
        text: t('inbox.notifyBulkRejectSuccess', { count: res.rejected_count }),
      });
      setSelectedIds([]);
      setShowBulkTrackPicker(false);
    } catch (err: unknown) {
      const detail = extractErrorMessage(err, t('inbox.notifyBulkRejectError'));
      onNotify({
        type: 'error',
        text: detail,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Search Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/90 p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Inbox className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {t('inbox.title')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {t('inbox.pendingBadge', { count: pendingOnly.length })}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('inbox.description')}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search
            className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder={t('inbox.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Review Drawer / Editor */}
      {selectedPending && (
        <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                {t('inbox.reviewTitle', { fileName: selectedPending.original_file_name })}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {t('inbox.ingestedAt', {
                  date: new Date(selectedPending.created_at).toLocaleString(),
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/pending-certificates/${selectedPending.id}/file/`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors"
                title={t('inbox.showFileTitle')}
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                {t('inbox.showFileWithExt', {
                  ext: selectedPending.original_file_name.split('.').pop()?.toUpperCase() || 'FILE',
                })}
              </a>
              <button
                type="button"
                onClick={handleCancelReview}
                className="cursor-pointer text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {t('inbox.cancel')}
              </button>
            </div>
          </div>

          <form onSubmit={handleApprove} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-title" className="block text-xs font-semibold text-slate-300">
                {t('inbox.fieldTitle')}
              </label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-provider" className="block text-xs font-semibold text-slate-300">
                {t('inbox.fieldProvider')}
              </label>
              <input
                id="edit-provider"
                type="text"
                list="provider-suggestions"
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <datalist id="provider-suggestions">
                {providers.map((p) => (
                  <option key={p.id} value={p.provider} />
                ))}
              </datalist>
            </div>

            {/* Tracks Zuweisung */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300">
                {t('inbox.fieldTracks')}
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {tracks.map((tItem) => {
                  const isChecked = editTrackIds.includes(tItem.id);
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setEditTrackIds(editTrackIds.filter((id) => id !== tItem.id));
                        } else {
                          setEditTrackIds([...editTrackIds, tItem.id]);
                        }
                      }}
                      className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isChecked
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tItem.name}
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
                {t('inbox.cancel')}
              </button>
              <button
                type="submit"
                disabled={approveMutation.isPending}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {approveMutation.isPending ? t('inbox.submitting') : t('inbox.submitApprove')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of Pending Items */}
      {isLoading ? (
        <div className="p-10 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
          {t('inbox.loading')}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-slate-900/75 border border-slate-800/90 rounded-2xl p-10 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-300">
            {t('inbox.emptyTitle')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? t('inbox.emptySearch') : t('inbox.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selection Control Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => handleSelectAll(filteredList)}
              className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              {filteredList.length > 0 &&
              filteredList.every((item) => selectedIds.includes(item.id)) ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" aria-hidden="true" />
              )}
              <span>
                {filteredList.length > 0 &&
                filteredList.every((item) => selectedIds.includes(item.id))
                  ? t('inbox.deselectAll')
                  : t('inbox.selectAll')}
              </span>
            </button>
            {selectedIds.length > 0 && (
              <span className="text-indigo-400 font-semibold font-mono">
                {t('inbox.selectionCount', {
                  count: selectedIds.length,
                  total: filteredList.length,
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className={`bg-slate-900/75 border p-4 sm:px-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  selectedIds.includes(item.id)
                    ? 'border-indigo-500/50 bg-indigo-950/15'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={t('inbox.selectCertificateAria', {
                      name: item.guessed_title || item.original_file_name,
                    })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                      <span className="text-xs font-bold text-white break-all">
                        {item.guessed_title || item.original_file_name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {t('inbox.statusPending')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span>
                        {t('inbox.labelFile')}{' '}
                        <code className="text-slate-300 font-mono">{item.original_file_name}</code>
                      </span>
                      {item.guessed_provider && (
                        <span>
                          {t('inbox.labelProvider')}{' '}
                          <span className="text-indigo-400 font-semibold">{item.guessed_provider}</span>
                        </span>
                      )}
                      <span className="font-mono">
                        {t('inbox.labelDate')}{' '}
                        {new Date(item.created_at).toLocaleDateString()}
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
                    className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    title={t('inbox.showFileTitle')}
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('inbox.showFile')}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleStartReview(item)}
                    className="cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('inbox.reviewAndApprove')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item)}
                    disabled={rejectMutation.isPending}
                    className="cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('inbox.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 px-5 py-3 rounded-2xl shadow-2xl flex flex-col gap-2.5 max-w-2xl w-[calc(100%-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Hinweistext bei fehlenden Tracks */}
          {hasMissingTracks && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{t('inbox.bulkApproveTrackRequiredHint')}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {selectedIds.length}
              </span>
              <span className="text-white font-medium">{t('inbox.bulkSelected')}</span>
            </div>

            {/* Bulk Track Selector Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBulkTrackPicker((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                <span>
                  {bulkTrackIds.length > 0
                    ? t('inbox.bulkTracksSelected', { count: bulkTrackIds.length })
                    : t('inbox.bulkAssignTracks')}
                </span>
              </button>

              {showBulkTrackPicker && (
                <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2 z-50">
                  <div className="text-[11px] font-semibold text-slate-400">
                    {t('inbox.bulkSharedTracks')}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {tracks.map((tItem) => {
                      const isChecked = bulkTrackIds.includes(tItem.id);
                      return (
                        <button
                          key={tItem.id}
                          type="button"
                          onClick={() => {
                            setBulkTrackIds((prev) =>
                              isChecked ? prev.filter((id) => id !== tItem.id) : [...prev, tItem.id]
                            );
                          }}
                          className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                            isChecked
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {tItem.name}
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
              disabled={isBulkApproveDisabled}
              title={hasMissingTracks ? t('inbox.bulkApproveTrackRequiredHint') : undefined}
              className="cursor-pointer flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {bulkApproveMutation.isPending
                  ? t('inbox.bulkApproving')
                  : t('inbox.bulkApprove', { count: selectedIds.length })}
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
                {bulkRejectMutation.isPending
                  ? t('inbox.bulkRejecting')
                  : t('inbox.bulkReject', { count: selectedIds.length })}
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
              title={t('inbox.clearSelection')}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
