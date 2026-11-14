import React, { useState } from 'react';
import { DetectedCandidate, DiscoveryItem } from '../types';
import { ApiService } from '../services/api';
import { X, BookmarkPlus, Check, AlertCircle } from 'lucide-react';

interface CandidateModalProps {
  candidate: DetectedCandidate | null;
  targetField: string;
  onClose: () => void;
  onSaved: () => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  candidate,
  targetField,
  onClose,
  onSaved,
}) => {
  if (!candidate) return null;

  const [name, setName] = useState<string>(`SPX-${candidate.candidate_id}`);
  const [classification, setClassification] = useState<string>(candidate.classification);
  const [category, setCategory] = useState<'moving_object' | 'variable_source' | 'unclassified'>(
    candidate.type === 'variable_source' ? 'variable_source' : 'moving_object'
  );
  const [notes, setNotes] = useState<string>(
    `Observed clear ${candidate.type === 'moving_object' ? 'proper motion displacement' : 'photometric amplitude variation'} of ${candidate.angular_displacement_arcsec} arcsec across survey epochs.`
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await ApiService.saveDiscovery({
        name,
        target_field: targetField,
        ra_deg: candidate.ra_deg,
        dec_deg: candidate.dec_deg,
        ra_sexagesimal: candidate.ra_sexagesimal,
        dec_sexagesimal: candidate.dec_sexagesimal,
        category,
        classification,
        angular_displacement_arcsec: candidate.angular_displacement_arcsec,
        proper_motion_arcsec_yr: candidate.angular_displacement_arcsec,
        brightness_mag_var: candidate.type === 'variable_source' ? 1.8 : 0.1,
        confidence_score: candidate.confidence_score,
        notes,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save candidate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-lg max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary">
            <BookmarkPlus className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-text-main">
              Log Candidate Discovery to Archive
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-text-muted text-[11px] block">Candidate Designation:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-surface-elevated border border-surface-border text-text-main focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-text-muted text-[11px] block">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded bg-surface-elevated border border-surface-border text-text-main"
              >
                <option value="moving_object">Moving Object</option>
                <option value="variable_source">Variable Source</option>
                <option value="unclassified">Unclassified</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-text-muted text-[11px] block">Classification:</label>
              <input
                type="text"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-surface-elevated border border-surface-border text-text-main"
              />
            </div>
          </div>

          {/* Astrometric Summary Card */}
          <div className="bg-surface-elevated p-3 rounded border border-surface-border space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-text-muted">Target Field:</span>
              <span className="text-text-main">{targetField}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Coordinates (ICRS):</span>
              <span className="text-secondary">{candidate.ra_sexagesimal}, {candidate.dec_sexagesimal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Displacement:</span>
              <span className="text-scientific-cyan font-semibold">{candidate.angular_displacement_arcsec}″</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Detection Confidence:</span>
              <span className="text-scientific-success font-semibold">{candidate.confidence_score}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-text-muted text-[11px] block">Astrometric & Observational Notes:</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-surface-elevated border border-surface-border text-text-main focus:border-primary focus:outline-none text-xs font-sans"
            />
          </div>

          {error && (
            <p className="text-scientific-danger text-xs flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </p>
          )}

          {success && (
            <p className="text-scientific-success text-xs flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Candidate recorded successfully in Discovery Registry!</span>
            </p>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-surface-elevated border border-surface-border text-text-muted hover:text-text-main text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-[#0B1016] font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {saving ? 'Logging...' : 'Submit to Registry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

