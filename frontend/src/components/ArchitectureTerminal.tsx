import React, { useState } from 'react';
import { Check, Cloud, Copy, Cpu, ShieldCheck, Terminal } from 'lucide-react';

type TerminalTab = 'runtime' | 'pipeline' | 'cloud';

interface OutputRow {
  label: string;
  value: string;
  status?: 'ok' | 'info';
}

interface TabConfig {
  id: TerminalTab;
  label: string;
  command: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  output: OutputRow[];
}

const TERMINAL_TABS: TabConfig[] = [
  {
    id: 'runtime',
    label: 'Runtime & Stack',
    command: 'sys.inspect --runtime',
    icon: Cpu,
    output: [
      { label: 'Python Engine', value: '3.13.2 (CPython / Strikte Typen)', status: 'ok' },
      { label: 'Backend API', value: 'Django 5.2 + REST Framework', status: 'ok' },
      { label: 'Reactive Client', value: 'React 19 + TypeScript + Vite 8', status: 'ok' },
      { label: 'Database Cluster', value: 'Neon PostgreSQL (Serverless Pooled)', status: 'ok' },
      { label: 'Object Storage', value: 'Supabase S3 Media Bucket', status: 'ok' },
      { label: 'Security & Auth', value: 'Djoser JWT + HttpOnly Rotation', status: 'ok' },
    ],
  },
  {
    id: 'pipeline',
    label: 'Quality & CI/CD',
    command: 'ci.verify --quality-gates',
    icon: ShieldCheck,
    output: [
      { label: 'Linter & Formatter', value: 'Ruff (0 Fehler / Strict Rules)', status: 'ok' },
      { label: 'Typensicherheit', value: 'Mypy (Strict Backend & Client)', status: 'ok' },
      { label: 'Backend Test-Suite', value: 'Pytest (≥96% Testabdeckung)', status: 'ok' },
      { label: 'Frontend Tests', value: 'Vitest + Testing Library', status: 'ok' },
      { label: 'Barrierefreiheit', value: 'WCAG 2.2 AA konform', status: 'ok' },
      { label: 'CI/CD Pipeline', value: 'GitHub Actions → Render Deploy', status: 'ok' },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud Infrastructure',
    command: 'cloud.status --live',
    icon: Cloud,
    output: [
      { label: 'Hosting & CDN', value: 'Render Cloud (Europe Central)', status: 'ok' },
      { label: 'Database Region', value: 'aws-eu-central-1 (Frankfurt)', status: 'ok' },
      { label: 'Storage Delivery', value: 'Direkte S3 Signed Streams', status: 'ok' },
      { label: 'Verfügbarkeit', value: '99.9% Uptime Monitoring', status: 'ok' },
      { label: 'TLS & Security', value: 'Automated Let’s Encrypt / HSTS', status: 'ok' },
      { label: 'Systemstatus', value: 'Alle Microservices betriebsbereit', status: 'ok' },
    ],
  },
];

export const ArchitectureTerminal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TerminalTab>('runtime');
  const [copied, setCopied] = useState<boolean>(false);

  const currentConfig = TERMINAL_TABS.find((t) => t.id === activeTab) || TERMINAL_TABS[0];

  const handleCopy = () => {
    const text = [
      `$ ${currentConfig.command}`,
      ...currentConfig.output.map((row) => `✓ ${row.label}: ${row.value}`),
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden text-slate-200 font-mono text-xs transition-colors duration-200">
      {/* Terminal Window Chrome / Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-[11px] text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            <span>sys.inspector</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span>OPERATIONAL</span>
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Terminal-Ausgabe kopieren"
            aria-label={copied ? 'Ausgabe kopiert' : 'Terminal-Ausgabe kopieren'}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Interaktive Tab-Auswahl (role="tablist") */}
      <div
        role="tablist"
        aria-label="System-Diagnose-Kategorien"
        className="flex items-center border-b border-slate-800/80 bg-slate-950/40 px-2 overflow-x-auto"
      >
        {TERMINAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`terminal-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`terminal-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Terminal Body / Output Panel */}
      <div
        role="tabpanel"
        id={`terminal-panel-${currentConfig.id}`}
        aria-labelledby={`terminal-tab-${currentConfig.id}`}
        className="p-5 space-y-3 bg-slate-900/90 min-h-[220px]"
      >
        {/* Command Prompt */}
        <div className="flex items-center gap-2 text-indigo-400 pb-2 border-b border-slate-800/60">
          <span className="text-slate-500">$</span>
          <span className="font-semibold text-slate-100">{currentConfig.command}</span>
          <span className="w-1.5 h-3.5 bg-indigo-500 animate-pulse ml-0.5" aria-hidden="true" />
        </div>

        {/* Output Rows */}
        <div className="space-y-2 pt-1">
          {currentConfig.output.map((row) => (
            <div
              key={row.label}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 px-2 rounded hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-slate-300 font-medium">{row.label}</span>
              </div>
              <span className="text-slate-100 font-mono text-[11px] pl-5 sm:pl-0 truncate">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Footer Metadaten */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
        <span>Latency: &lt;35ms</span>
        <span className="text-emerald-500 font-medium">Auto-Sync via Neon & Render</span>
      </div>
    </div>
  );
};
