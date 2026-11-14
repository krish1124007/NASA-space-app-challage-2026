import React, { useState, useEffect } from 'react';
import { ViewTab, Target, DetectedCandidate, ObservationMetadata } from './types';
import { ApiService } from './services/api';
import { TopNav } from './components/TopNav';
import { Overview } from './components/Overview';
import { SkyExplorer } from './components/SkyExplorer';
import { TimeMachine } from './components/TimeMachine';
import { SpectralAnalysis } from './components/SpectralAnalysis';
import { Discoveries } from './components/Discoveries';
import { AboutSPHEREx } from './components/AboutSPHEREx';
import { HeaderModal } from './components/HeaderModal';
import { CandidateModal } from './components/CandidateModal';
import { PreferencesModal } from './components/PreferencesModal';
import { DocumentationModal } from './components/DocumentationModal';
import { ImportDataModal } from './components/ImportDataModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('overview');
  const [targets, setTargets] = useState<Target[]>([]);
  const [currentTargetId, setCurrentTargetId] = useState<string>('wise_0855');
  const [activeCoords, setActiveCoords] = useState<{ ra: number; dec: number }>({
    ra: 133.79513,
    dec: -7.24515,
  });

  // Modals state
  const [headerModalData, setHeaderModalData] = useState<ObservationMetadata | null>(null);
  const [candidateModalData, setCandidateModalData] = useState<{ candidate: DetectedCandidate; field: string } | null>(null);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [showDocumentation, setShowDocumentation] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Preferences
  const [coordFormat, setCoordFormat] = useState<'sexagesimal' | 'decimal'>('sexagesimal');
  const [fluxUnits, setFluxUnits] = useState<'mjy_sr' | 'dn'>('mjy_sr');

  // Load target list and check URL query params
  useEffect(() => {
    const init = async () => {
      try {
        const targetList = await ApiService.getTargets();
        setTargets(targetList);

        // Check URL parameters for shareable deep links
        const params = new URLSearchParams(window.location.search);
        const urlTarget = params.get('target');
        const urlRa = params.get('ra');
        const urlDec = params.get('dec');
        const urlTab = params.get('tab') as ViewTab | null;

        if (urlTarget && targetList.some((t) => t.id === urlTarget)) {
          setCurrentTargetId(urlTarget);
          const t = targetList.find((x) => x.id === urlTarget)!;
          setActiveCoords({ ra: t.coordinates.ra_deg, dec: t.coordinates.dec_deg });
        } else if (urlRa && urlDec) {
          const r = parseFloat(urlRa);
          const d = parseFloat(urlDec);
          if (!isNaN(r) && !isNaN(d)) {
            setActiveCoords({ ra: r, dec: d });
          }
        }

        if (urlTab && ['overview', 'explorer', 'time-machine', 'spectral', 'discoveries', 'about'].includes(urlTab)) {
          setCurrentTab(urlTab);
        }
      } catch (err) {
        console.error('Failed to initialize target catalog:', err);
      }
    };

    init();
  }, []);

  const handleSelectTarget = (targetId: string, openTab: ViewTab = 'explorer') => {
    setCurrentTargetId(targetId);
    const t = targets.find((x) => x.id === targetId);
    if (t) {
      setActiveCoords({ ra: t.coordinates.ra_deg, dec: t.coordinates.dec_deg });
    }
    setCurrentTab(openTab);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('target', targetId);
    url.searchParams.set('tab', openTab);
    window.history.pushState({}, '', url.toString());
  };

  const handleSearch = async (query: string) => {
    try {
      const res = await ApiService.searchCoordinates({ query });
      if (res.matched_target) {
        handleSelectTarget(res.matched_target.id, 'explorer');
      } else {
        setActiveCoords({ ra: res.ra_deg, dec: res.dec_deg });
        setCurrentTargetId('');
        setCurrentTab('explorer');
      }
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    }
  };

  const activeTargetName = targets.find((t) => t.id === currentTargetId)?.name;

  return (
    <div className="min-h-screen flex flex-col bg-[#05080D] text-[#C9D1D9]">
      {/* Top Application Bar */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          const url = new URL(window.location.href);
          url.searchParams.set('tab', tab);
          window.history.pushState({}, '', url.toString());
        }}
        onOpenDoc={() => setShowDocumentation(true)}
        onOpenPreferences={() => setShowPreferences(true)}
        onOpenImport={() => setShowImportModal(true)}
        activeTargetName={activeTargetName}
        activeCoords={activeCoords}
      />

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col">
        {currentTab === 'overview' && (
          <Overview
            targets={targets}
            onSelectTarget={handleSelectTarget}
            onSearch={handleSearch}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'explorer' && (
          <SkyExplorer
            targets={targets}
            currentTargetId={currentTargetId}
            onSelectTarget={(id) => handleSelectTarget(id, 'explorer')}
            onNavigateTab={setCurrentTab}
            onOpenHeaderModal={(meta) => setHeaderModalData(meta)}
            onOpenCandidateModal={(cand, field) => setCandidateModalData({ candidate: cand, field })}
            activeCoords={activeCoords}
            setActiveCoords={setActiveCoords}
          />
        )}

        {currentTab === 'time-machine' && (
          <TimeMachine
            targets={targets}
            currentTargetId={currentTargetId}
            onSelectTarget={(id) => handleSelectTarget(id, 'time-machine')}
            onOpenCandidateModal={(cand, field) => setCandidateModalData({ candidate: cand, field })}
            activeCoords={activeCoords}
          />
        )}

        {currentTab === 'spectral' && (
          <SpectralAnalysis
            targets={targets}
            currentTargetId={currentTargetId}
            onSelectTarget={(id) => handleSelectTarget(id, 'spectral')}
            activeCoords={activeCoords}
          />
        )}

        {currentTab === 'discoveries' && (
          <Discoveries
            onNavigateTarget={handleSelectTarget}
            onOpenCandidateModal={(cand, field) => setCandidateModalData({ candidate: cand, field })}
          />
        )}

        {currentTab === 'about' && <AboutSPHEREx />}
      </main>

      {/* Modals */}
      {headerModalData && (
        <HeaderModal
          metadata={headerModalData}
          onClose={() => setHeaderModalData(null)}
        />
      )}

      {candidateModalData && (
        <CandidateModal
          candidate={candidateModalData.candidate}
          targetField={candidateModalData.field}
          onClose={() => setCandidateModalData(null)}
          onSaved={() => {
            // refresh
          }}
        />
      )}

      {showPreferences && (
        <PreferencesModal
          onClose={() => setShowPreferences(false)}
          coordFormat={coordFormat}
          setCoordFormat={setCoordFormat}
          units={fluxUnits}
          setUnits={setFluxUnits}
        />
      )}

      {showDocumentation && (
        <DocumentationModal
          onClose={() => setShowDocumentation(false)}
        />
      )}

      {showImportModal && (
        <ImportDataModal
          onClose={() => setShowImportModal(false)}
          activeCoords={activeCoords}
          onLoadCustomFits={(custom) => {
            setActiveCoords({ ra: custom.ra, dec: custom.dec });
            setCurrentTargetId('');
            setCurrentTab('explorer');
          }}
        />
      )}
    </div>
  );
};

export default App;

