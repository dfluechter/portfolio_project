import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  FolderGit2,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from '../../hooks/usePortfolio';
import { ConfirmModal } from './ConfirmModal';
import { resolveProjectImageUrl } from '../../utils/mediaUrl';
import type { Project } from '../../types';

interface ProjectManagerProps {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onNotify }) => {
  const { data: projects = [], isLoading } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit-Mode State
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectGithub, setProjectGithub] = useState('');
  const [projectLive, setProjectLive] = useState('');
  const [projectCreatedAt, setProjectCreatedAt] = useState('');
  const [projectImage, setProjectImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Confirm Modal State
  const [projectToDelete, setProjectToDelete] = useState<{ id: number; title: string } | null>(null);

  // Blob-URLs bei Änderung oder Unmount freigeben, um Browser-Speicherlecks zu vermeiden
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const resetForm = () => {
    setEditingProject(null);
    setProjectTitle('');
    setProjectDesc('');
    setProjectGithub('');
    setProjectLive('');
    setProjectCreatedAt('');
    setProjectImage(null);
    setImagePreview(null);
    setRemoveExistingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = (proj: Project) => {
    setEditingProject(proj);
    setProjectTitle(proj.title);
    setProjectDesc(proj.description);
    setProjectGithub(proj.github_url || '');
    setProjectLive(proj.live_url || '');
    setProjectCreatedAt(proj.created_at ? proj.created_at.split('T')[0] : '');
    setProjectImage(null);
    setImagePreview(proj.image ? resolveProjectImageUrl(proj.image) : null);
    setRemoveExistingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProjectImage(file);
      setRemoveExistingImage(false);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setProjectImage(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', projectTitle.trim());
    formData.append('description', projectDesc.trim());
    formData.append('github_url', projectGithub.trim());
    formData.append('live_url', projectLive.trim());

    if (projectCreatedAt) {
      formData.append('created_at', new Date(projectCreatedAt).toISOString());
    }

    if (projectImage) {
      formData.append('image', projectImage);
    } else if (removeExistingImage && editingProject) {
      formData.append('image', '');
    }

    try {
      if (editingProject) {
        await updateProjectMutation.mutateAsync({ id: editingProject.id, formData });
        onNotify({ type: 'success', text: `Projekt "${projectTitle.trim()}" erfolgreich aktualisiert!` });
      } else {
        await createProjectMutation.mutateAsync(formData);
        onNotify({ type: 'success', text: 'Projekt erfolgreich angelegt!' });
      }
      resetForm();
    } catch (err: unknown) {
      let msg = editingProject ? 'Fehler beim Aktualisieren des Projekts.' : 'Fehler beim Erstellen des Projekts.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response?.data : msg);
      } else if (err instanceof Error) {
        msg = err.message;
      }
      onNotify({ type: 'error', text: msg });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      onNotify({ type: 'success', text: `Projekt "${projectToDelete.title}" gelöscht.` });
      if (editingProject?.id === projectToDelete.id) {
        resetForm();
      }
    } catch {
      onNotify({ type: 'error', text: 'Fehler beim Löschen des Projekts.' });
    } finally {
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    return p.title.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
  });

  const isSaving = createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formular: Neues Projekt / Projekt bearbeiten */}
      <div ref={formRef} className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-fit space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            {editingProject ? (
              <>
                <Pencil className="w-5 h-5 text-amber-400" />
                <span>Projekt bearbeiten</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Neues Projekt hinzufügen</span>
              </>
            )}
          </div>

          {editingProject && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Abbrechen
            </button>
          )}
        </div>

        {editingProject && (
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            Bearbeite: <strong className="font-semibold">{editingProject.title}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-title" className="block text-xs font-semibold text-slate-400 mb-1">
              Titel <span className="text-red-400">*</span>
            </label>
            <input
              id="project-title"
              type="text"
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="z. B. Cloud Architecture Tool"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="project-desc" className="block text-xs font-semibold text-slate-400 mb-1">
              Beschreibung <span className="text-red-400">*</span>
            </label>
            <textarea
              id="project-desc"
              rows={4}
              required
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="Details zum Projekt, Technologien, etc."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors resize-y"
            />
          </div>

          <div>
            <label htmlFor="project-created-at" className="block text-xs font-semibold text-slate-400 mb-1">
              Erstell-Datum
            </label>
            <div className="relative">
              <input
                id="project-created-at"
                type="date"
                value={projectCreatedAt}
                onChange={(e) => setProjectCreatedAt(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Optional. Standard ist das aktuelle Datum.
            </p>
          </div>

          <div>
            <label htmlFor="project-image-file" className="block text-xs font-semibold text-slate-400 mb-1">
              Projekt-Bild (optional)
            </label>

            {imagePreview ? (
              <div className="relative mb-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Vorschau"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">
                    {projectImage ? projectImage.name : 'Aktuelles Projekt-Bild'}
                  </p>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 mt-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Bild entfernen
                  </button>
                </div>
              </div>
            ) : null}

            <input
              id="project-image-file"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="project-github" className="block text-xs font-semibold text-slate-400 mb-1">
              GitHub URL (optional)
            </label>
            <input
              id="project-github"
              type="url"
              value={projectGithub}
              onChange={(e) => setProjectGithub(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="project-live" className="block text-xs font-semibold text-slate-400 mb-1">
              Live URL (optional)
            </label>
            <input
              id="project-live"
              type="url"
              value={projectLive}
              onChange={(e) => setProjectLive(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Wird gespeichert...</span>
                </>
              ) : editingProject ? (
                <>
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Änderungen speichern</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Projekt anlegen</span>
                </>
              )}
            </button>

            {editingProject && (
              <button
                type="button"
                onClick={resetForm}
                className="cursor-pointer py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Projects List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            Vorhandene Projekte ({projects.length})
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

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Lade Projekte...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
            {searchTerm ? 'Keine Projekte für diesen Suchbegriff gefunden.' : 'Noch keine Projekte vorhanden.'}
          </div>
        ) : (
          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {filteredProjects.map((proj) => {
              const imageUrl = resolveProjectImageUrl(proj.image);
              const formattedDate = proj.created_at
                ? new Date(proj.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : null;

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
                    editingProject?.id === proj.id
                      ? 'bg-indigo-950/20 border-indigo-500/50 ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={proj.title}
                        className="w-14 h-14 object-cover rounded-lg border border-slate-800 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-sm truncate">{proj.title}</h3>
                        {formattedDate && (
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formattedDate}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>

                      <div className="flex items-center gap-3 pt-1">
                        {proj.github_url && (
                          <a
                            href={proj.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            GitHub
                          </a>
                        )}
                        {proj.live_url && (
                          <a
                            href={proj.live_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-violet-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Live Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(proj)}
                      className={`cursor-pointer p-2 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        editingProject?.id === proj.id
                          ? 'text-indigo-400 bg-indigo-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Projekt bearbeiten"
                      aria-label={`Projekt ${proj.title} bearbeiten`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setProjectToDelete({ id: proj.id, title: proj.title })}
                      className="cursor-pointer p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      title="Projekt löschen"
                      aria-label={`Projekt ${proj.title} löschen`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
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
        isOpen={!!projectToDelete}
        title="Projekt löschen"
        message={`Möchtest du das Projekt "${projectToDelete?.title}" wirklich unwiderruflich löschen?`}
        confirmText="Löschen"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
