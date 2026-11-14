import React, { useState, useEffect } from 'react';
import { DiscoveryItem, ViewTab } from '../types';
import { ApiService } from '../services/api';
import { 
  Award, 
  Search, 
  Download, 
  Filter, 
  ArrowUpDown, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  BookmarkPlus
} from 'lucide-react';

interface DiscoveriesProps {
  onNavigateTarget: (targetId: string, openTab?: ViewTab) => void;
  onOpenCandidateModal: (cand: any, field: string) => void;
}

export const Discoveries: React.FC<DiscoveriesProps> = ({
  onNavigateTarget,
  onOpenCandidateModal,
}) => {
  const [candidates, setCandidates] = useState<DiscoveryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('confidence_score');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<DiscoveryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadDiscoveries();
  }, [filterCategory, sortBy]);

  const loadDiscoveries = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getDiscoveries(filterCategory, sortBy);
      setCandidates(data);
      if (data.length > 0 && !selectedItem) {
        setSelectedItem(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.classification.toLowerCase().includes(q) ||
      c.target_field.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-primary mb-1">
            <Award className="w-3.5 h-3.5" />
            <span>NASA SPHEREx Citizen-Science Discovery Registry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-main tracking-tight">
            Scientific Discoveries & Astrometric Candidates
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Curated database of high proper motion candidates, fast-moving minor planets, and photometric variables flagged across survey epochs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <a
            href={ApiService.getExportUrl()}
            download="spherex_discoveries_export.csv"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-surface-elevated border border-surface-border hover:border-primary/50 text-xs font-mono text-text-main transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Registry (CSV)</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by designation, candidate ID, or field..."
              className="w-full pl-9 pr-3 py-1.5 rounded bg-surface-elevated border border-surface-border text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Category Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-text-muted text-[11px]">Class:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-surface-elevated border border-surface-border rounded px-2 py-1 text-xs text-text-main"
            >
              <option value="all">All Categories</option>
              <option value="moving_object">Moving Objects</option>
              <option value="variable_source">Variable Sources</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-text-muted text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-elevated border border-surface-border rounded px-2 py-1 text-xs text-text-main"
            >
              <option value="confidence_score">Detection Confidence</option>
              <option value="proper_motion">Angular Motion (″/yr)</option>
              <option value="brightness_var">Photometric Var (Δmag)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Discoveries Layout: Table + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TABLE (~66%) */}
        <div className="lg:col-span-2 rounded border border-surface-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-elevated border-b border-surface-border text-[11px] text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Candidate ID</th>
                  <th className="py-2.5 px-3">Designation / Field</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Motion (″/yr)</th>
                  <th className="py-2.5 px-3 text-right">Var (Δm)</th>
                  <th className="py-2.5 px-3 text-center">Confidence</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredCandidates.map((cand) => {
                  const isSelected = selectedItem?.id === cand.id;
                  const isMoving = cand.category === 'moving_object';
                  return (
                    <tr
                      key={cand.id}
                      onClick={() => setSelectedItem(cand)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface-elevated text-text-main'
                          : 'hover:bg-surface-card text-secondary'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {cand.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-text-main font-sans font-medium text-xs">
                          {cand.name}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {cand.target_field}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${
                          isMoving
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-scientific-warning/30 bg-scientific-warning/10 text-scientific-warning'
                        }`}>
                          {cand.classification}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-text-main">
                        {cand.proper_motion_arcsec_yr > 0 ? `${cand.proper_motion_arcsec_yr}″` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-scientific-cyan">
                        {cand.brightness_mag_var > 0 ? `${cand.brightness_mag_var}m` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-scientific-success">
                          {cand.confidence_score}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-secondary">
                          {cand.status.split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CANDIDATE DETAIL VIEW DRAWER (~33%) */}
        <div className="rounded border border-surface-border bg-surface p-5 space-y-4">
          {selectedItem ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted">{selectedItem.id}</span>
                  <span className="px-2 py-0.5 rounded bg-scientific-success/10 text-scientific-success border border-scientific-success/30 font-semibold">
                    {selectedItem.confidence_score}% Confidence
                  </span>
                </div>
                <h2 className="text-base font-semibold text-text-main mt-1">
                  {selectedItem.name}
                </h2>
                <p className="text-xs text-scientific-cyan font-mono mt-0.5">
                  {selectedItem.classification}
                </p>
              </div>

              {/* Coordinates Card */}
              <div className="bg-surface-elevated p-3 rounded border border-surface-border font-mono text-xs space-y-1.5">
                <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">
                  Astrometric Position (ICRS J2000)
                </span>
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">RA:</span>
                  <span className="text-text-main">{selectedItem.ra_sexagesimal} ({selectedItem.ra_deg.toFixed(4)}°)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">DEC:</span>
                  <span className="text-text-main">{selectedItem.dec_sexagesimal} ({selectedItem.dec_deg.toFixed(4)}°)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">Target Field:</span>
                  <span className="text-secondary">{selectedItem.target_field}</span>
                </div>
              </div>

              {/* Physical Kinematics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-surface-elevated p-2.5 rounded border border-surface-border">
                  <span className="text-text-muted text-[10px] block">Displacement:</span>
                  <span className="text-text-main font-semibold">{selectedItem.angular_displacement_arcsec}″</span>
                </div>
                <div className="bg-surface-elevated p-2.5 rounded border border-surface-border">
                  <span className="text-text-muted text-[10px] block">Proper Motion:</span>
                  <span className="text-primary font-semibold">{selectedItem.proper_motion_arcsec_yr}″ / yr</span>
                </div>
                <div className="bg-surface-elevated p-2.5 rounded border border-surface-border">
                  <span className="text-text-muted text-[10px] block">Magnitude Delta:</span>
                  <span className="text-scientific-cyan font-semibold">Δm = {selectedItem.brightness_mag_var}</span>
                </div>
                <div className="bg-surface-elevated p-2.5 rounded border border-surface-border">
                  <span className="text-text-muted text-[10px] block">Survey Epochs:</span>
                  <span className="text-secondary">{selectedItem.epochs_detected} detected</span>
                </div>
              </div>

              {/* Research Notes */}
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-text-muted uppercase tracking-wider text-[10px] block">
                  Astrometric Notes & Verification
                </span>
                <p className="text-text-muted leading-relaxed bg-surface-elevated p-3 rounded border border-surface-border text-xs">
                  {selectedItem.notes}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-surface-border">
                <span className="text-text-muted">Archive Status:</span>
                <span className="text-scientific-success font-semibold">{selectedItem.status}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted text-xs font-mono">
              Select a candidate from the table to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

