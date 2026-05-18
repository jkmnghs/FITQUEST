import React from 'react';
import { User, Trophy, Settings, Dumbbell } from 'lucide-react';
import RankTab from './RankTab';
import { AchievementsTab, SettingsTab } from './OtherTabs';
import ProgramEditorTab from './ProgramEditorTab';

function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 var(--space-4)',
      marginBottom: 'var(--space-3)',
    }}>
      <Icon size={16} color="var(--color-text-tertiary)" />
      <span style={{
        fontFamily: 'var(--font-primary)', fontSize: 'var(--text-xs)', fontWeight: 600,
        color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>{title}</span>
    </div>
  );
}

export default function ProfileTab({
  state, onUpdate, onReset, onResetToday, onBackfillWeek,
  notifStatus, onRequestNotif, onImport, userEmail, onSignOut, onShowCycleComplete,
}) {
  return (
    <div className="tab-enter">
      {/* Rank */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={User} title="Warrior Rank" />
        <div style={{ padding: '0 var(--space-4)' }}>
          <RankTab state={state} />
        </div>
      </div>

      {/* My Program */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={Dumbbell} title="My Program" />
        <div style={{ padding: '0 var(--space-4)' }}>
          <ProgramEditorTab state={state} updateSetting={onUpdate} />
        </div>
      </div>

      {/* Achievements */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={Trophy} title="Achievements" />
        <div style={{ padding: '0 var(--space-4)' }}>
          <AchievementsTab state={state} />
        </div>
      </div>

      {/* Settings */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={Settings} title="Settings" />
        <div style={{ padding: '0 var(--space-4)' }}>
          <SettingsTab
            state={state}
            onUpdate={onUpdate}
            onReset={onReset}
            onResetToday={onResetToday}
            onBackfillWeek={onBackfillWeek}
            notifStatus={notifStatus}
            onRequestNotif={onRequestNotif}
            onImport={onImport}
            userEmail={userEmail}
            onSignOut={onSignOut}
            onShowCycleComplete={onShowCycleComplete}
          />
        </div>
      </div>
    </div>
  );
}
