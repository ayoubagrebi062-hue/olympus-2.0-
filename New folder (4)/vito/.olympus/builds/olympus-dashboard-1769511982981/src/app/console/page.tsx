'use client';

import BuildList from './components/BuildList';
import PhaseProgression from './components/PhaseProgression';
import AgentRoster from './components/AgentRoster';
import ConstitutionalStatus from './components/ConstitutionalStatus';
import UnderstandingPanel from './components/UnderstandingPanel';
import ContextualChat from './components/ContextualChat';

export default function ConsolePage() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <BuildList />
      <PhaseProgression />
      <AgentRoster />
      <ConstitutionalStatus />
      <UnderstandingPanel />
      <ContextualChat />
    </div>
  );
}