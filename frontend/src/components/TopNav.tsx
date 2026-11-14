import React, { useState } from 'react';
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
  Radio,
  ChevronRight,
  Upload
} from 'lucide-react';

interface TopNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenDoc: () => void;
  onOpenPreferences: () => void;
  onOpenImport?: () => void;
  activeTargetName?: string;
  activeCoords?: { ra: number; dec: number };
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenDoc,
  onOpenPreferences,
  onOpenImport,
  activeTargetName,
  activeCoords,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    if (activeCoords) {
      url.searchParams.set('ra', activeCoords.ra.toFixed(4));
      url.searchParams.set('dec', activeCoords.dec.toFixed(4));
    }
    url.searchParams.set('tab', currentTab);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'explorer', label: 'Sky Explorer', icon: <Telescope className="w-3.5 h-3.5" /> },
    { id: 'time-machine', label: 'Time Machine', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'spectral', label: 'Spectral Analysis', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'discoveries', label: 'Discoveries', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'about', label: 'About SPHEREx', icon: <Info className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0B1016]/95 backdrop-blur-md border-b border-surface-border">
      {/* Main Navigation Bar */}
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        
        {/* LEFT ZONE: Brand & Mission Identity */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button 
            onClick={() => onSelectTab('overview')}
            className="flex items-center space-x-2.5 group text-left focus:outline-none"
            title="SPHEREx Explorer Overview"
          >
            {/* Mission Insignia Reticle */}
            <div className="w-8 h-8 rounded border border-primary/40 bg-surface-elevated flex items-center justify-center text-primary group-hover:border-primary group-hover:bg-primary/10 transition-all shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <circle cx="12" cy="12" r="3.5" className="text-scientific-cyan fill-scientific-cyan/20" />
              </svg>
            </div>

            {/* Brand Title & Subtitle */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-2 leading-none">
                <span className="font-semibold text-sm tracking-wider uppercase text-text-main group-hover:text-primary transition-colors">
                  SPHEREx <span className="text-primary font-normal">Explorer</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-surface-border bg-surface-elevated text-secondary font-medium tracking-tight">
                  DR1
                </span>
              </div>
              <span className="text-[10px] text-text-muted font-mono tracking-tight mt-1 hidden sm:block">
                NASA All-Sky Infrared Spectrophotometry
              </span>
            </div>
          </button>
        </div>

        {/* CENTER ZONE: Primary Tab Navigation */}
        <nav className="hidden xl:flex items-center space-x-1 bg-surface-card/80 p-1 rounded-md border border-surface-border/80 shadow-inner">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center space-x-1.5 px-3 h-7.5 rounded text-xs font-medium transition-all ${
                  active
                    ? 'bg-surface-elevated text-primary border border-surface-border shadow-sm'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-elevated/50'
                }`}
              >
                <span className={active ? 'text-primary' : 'text-text-muted'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute -bottom-1 left-2 right-2 h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(140,183,216,0.6)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Compact Nav for Tablet/Medium Screens */}
        <nav className="hidden md:flex xl:hidden items-center space-x-1">
          {navItems.slice(0, 4).map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 h-8 rounded text-xs font-medium transition-colors ${
                  active
                    ? 'bg-surface-elevated text-primary border border-surface-border font-semibold'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-elevated/50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT ZONE: Telemetry, Status & Instrument Tools */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
          
          {/* Active Target Readout Pill */}
          {activeTargetName && (
            <div 
              onClick={() => onSelectTab('explorer')}
              className="hidden lg:flex items-center space-x-1.5 h-8 px-2.5 rounded border border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-primary/40 cursor-pointer transition-colors text-xs font-mono text-secondary"
              title="Click to view in Sky Explorer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-scientific-cyan animate-pulse" />
              <span className="text-text-muted text-[11px]">Target:</span>
              <span className="text-text-main font-semibold max-w-[120px] truncate">{activeTargetName}</span>
            </div>
          )}

          {/* NASA IRSA Data Connection Pill */}
          <div className="hidden sm:flex items-center space-x-1.5 h-8 px-2.5 rounded border border-surface-border bg-surface-card text-xs font-mono">
            <Radio className="w-3 h-3 text-scientific-success animate-pulse" />
            <span className="text-text-muted text-[11px]">NASA IRSA:</span>
            <span className="text-scientific-success font-semibold tracking-wide">ONLINE</span>
          </div>

          {/* Vertical Separator */}
          <div className="hidden sm:block w-[1px] h-5 bg-surface-border/80" />

          {/* Action: Import NASA Data / FITS */}
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              title="Import data from NASA IRSA or upload custom FITS file"
              className="flex items-center space-x-1.5 h-8 px-2.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-xs font-mono text-primary transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Import Data</span>
            </button>
          )}

          {/* Action: Share / Deep Link */}
          <button
            onClick={handleCopyLink}
            title="Copy coordinate query URL with active parameters"
            className="flex items-center justify-center space-x-1 h-8 px-2.5 rounded border border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-primary/50 text-xs text-text-muted hover:text-text-main transition-colors font-mono"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-scientific-success" />
                <span className="text-scientific-success text-[11px] font-medium hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-secondary" />
                <span className="hidden sm:inline text-[11px]">Share</span>
              </>
            )}
          </button>

          {/* Action: User Guide / Documentation */}
          <button
            onClick={onOpenDoc}
            title="SPHEREx Instrument Documentation & Science Guide"
            className="flex items-center justify-center w-8 h-8 rounded border border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-primary/50 text-secondary hover:text-text-main transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Action: Preferences */}
          <button
            onClick={onOpenPreferences}
            title="Viewer Preferences (Coordinates & Photometry Units)"
            className="flex items-center justify-center w-8 h-8 rounded border border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-primary/50 text-secondary hover:text-text-main transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Responsive Secondary Horizontal Nav Bar (for Tablet & Mobile) */}
      <div className="xl:hidden flex items-center overflow-x-auto px-4 py-1.5 border-t border-surface-border/70 space-x-1.5 bg-surface scrollbar-none">
        {navItems.map((item) => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center space-x-1.5 px-3 h-7 rounded text-xs whitespace-nowrap transition-colors ${
                active
                  ? 'bg-surface-elevated text-primary border border-surface-border font-semibold shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-card'
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
