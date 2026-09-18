import React, { useState } from 'react';
import {
  ExternalLink,
  FolderGit2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from '../../hooks/usePortfolio';
import { ConfirmModal } from './ConfirmModal';

interface ProjectManagerProps {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onNotify }) => {
  const { data: projects = [], isLoading } = useProjects();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();

  // Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectGithub, setProjectGithub] = useState('');
  const [projectLive, setProjectLive] = useState('');

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Confirm Modal State
  const [projectToDelete, setProjectToDelete] = useState<{ id: number; title: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', projectTitle);
    formData.append('description', projectDesc);
    if (projectGithub) formData.append('github_url', projectGithub);
    if (projectLive) formData.append('live_url', projectLive);

    try {
      await createProjectMutation.mutateAsync(formData);
      onNotify({ type: 'success', text: 'Projekt erfolgreich angelegt!' });
      setProjectTitle('');
      setProjectDesc('');
      setProjectGithub('');
      setProjectLive('');
    } catch (err: any) {
      onNotify({
        type: 'error',
        text: err.response?.data?.detail || 'Fehler beim Erstellen des Projekts.',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      onNotify({ type: 'success', text: `Projekt "${projectToDelete.title}" gelöscht.` });
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Project Form */}
      <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-fit space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <Plus className="w-5 h-5 text-indigo-400" />
          Neues Projekt hinzufügen
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-title" className="block text-xs font-semibold text-slate-400 mb-1">
              Titel
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
              Beschreibung
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

          <button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createProjectMutation.isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Wird gespeichert...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Projekt speichern</span>
              </>
            )}
          </button>
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
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm">{proj.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                  <div className="flex items-center gap-3 pt-2">
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

                <button
                  type="button"
                  onClick={() => setProjectToDelete({ id: proj.id, title: proj.title })}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                  title="Projekt löschen"
                  aria-label={`Projekt ${proj.title} löschen`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
