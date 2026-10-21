import React from 'react';
import { Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PORTFOLIO_OWNER_NAME } from '../constants';

export const Footer: React.FC = () => {
  return (
    <footer className="py-10 bg-white dark:bg-slate-950 border-t border-slate-200/90 dark:border-slate-800/90 text-slate-500 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">
            {PORTFOLIO_OWNER_NAME}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-slate-500 dark:text-slate-400">
            Full-Stack Software Engineering
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span>Django 5.2, PostgreSQL & React 19</span>
          <Link
            to="/login"
            className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};
