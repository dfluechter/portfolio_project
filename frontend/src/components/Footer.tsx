import React from 'react';
import { Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 bg-slate-950 border-t border-slate-900 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-400 font-medium">Dominik Flüchter — Full-Stack Portfolio</span>
        </div>

        <div className="flex items-center gap-6">
          <span>Gebaut mit Django 5.2 & React 19 / Vite</span>
          <Link to="/login" className="text-slate-400 hover:text-indigo-400 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};
