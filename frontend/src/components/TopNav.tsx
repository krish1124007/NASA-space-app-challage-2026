import React from 'react';
import { ViewTab } from '../types';
import { 
  Telescope, 
  Clock, 
  Activity, 
  Award, 
  Info, 
  Compass, 
  Settings, 
  FileText, 
  Share2, 
  Check, 
  Radio
} from 'lucide-react';

interface TopNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenDoc: () => void;
  onOpenPreferences: () => void;
  activeTargetName?: string;
  activeCoords?: { ra: number; dec: number };
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenDoc,
  onOpenPreferences,
  activeTargetName,
  activeCoords,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    if (activeCoords) {
      url.searchParams.set('ra', activeCoords.ra.toFixed(4));
      url.searchParams.set('dec', activeCoords.dec.toFixed(4));
    }
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Compass className="w-4 h-4" /> },
    { id: 'explorer', label: 'Sky Explorer', icon: <Telescope className="w-4 h-4" /> },
    { id: 'time-machine', label: 'Time Machine', icon: <Clock className="w-4 h-4" /> },
    { id: 'spectral', label: 'Spectral Analysis', icon: <Activity className="w-4 h-4" /> },
    { id: 'discoveries', label: 'Discoveries', icon: <Award className="w-4 h-4" /> },
    { id: 'about', label: 'About SPHEREx', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B1016]/95 backdrop-blur border-b border-surface-border">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-6">
          <div 
            onClick={() => onSelectTab('overview')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded border border-primary/40 bg-surface-elevated flex items-center justify-center text-primary group-hover:border-primary transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-wider uppercase text-text-main">
                  SPHEREx <span className="text-primary font-normal">Explorer</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border border-surface-border bg-surface text-secondary">
                  DR1
                </span>
              </div>
              <span className="text-[10px] text-text-muted tracking-tight">
                NASA IRSA Spectro-Photometric Sky Survey
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 border-l border-surface-border pl-6">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    active
                      ? 'bg-surface-elevated text-primary border border-surface-border'
                      : 'text-text-muted hover:text-text-main hover:bg-surface/60'
                  }`}
                >
                  <span className={active ? 'text-primary' : 'text-text-muted'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Status & Tools */}
        <div className="flex items-center space-x-3">
          {/* Active Target Pill */}
          {activeTargetName && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded border border-surface-border bg-surface text-xs font-mono text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-scientific-cyan animate-pulse" />
              <span className="text-text-muted">Target:</span>
              <span className="text-text-main font-medium">{activeTargetName}</span>
            </div>
          )}

          {/* IRSA Archive Status */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded border border-surface-border bg-surface text-xs font-mono">
            <Radio className="w-3 h-3 text-scientific-success animate-pulse" />
            <span className="text-text-muted">NASA IRSA:</span>
            <span className="text-scientific-success">ONLINE</span>
          </div>

          {/* Share / Copy URL */}
          <button
            onClick={handleCopyLink}
            title="Copy coordinate query URL to clipboard"
            className="flex items-center space-x-1 px-2.5 py-1 rounded border border-surface-border bg-surface text-xs text-text-muted hover:text-text-main hover:border-primary/50 transition-colors font-mono"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-scientific-success" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>

          {/* Documentation Modal */}
          <button
            onClick={onOpenDoc}
            title="Instrument Documentation and Guide"
            className="p-1.5 rounded border border-surface-border bg-surface text-text-muted hover:text-text-main hover:border-primary/50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Preferences Modal */}
          <button
            onClick={onOpenPreferences}
            title="Viewer Preferences"
            className="p-1.5 rounded border border-surface-border bg-surface text-text-muted hover:text-text-main hover:border-primary/50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Subnav */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-surface-border space-x-2 bg-surface">
        {navItems.map((item) => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                active
                  ? 'bg-surface-elevated text-primary border border-surface-border font-medium'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

