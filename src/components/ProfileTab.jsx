import React, { useState } from 'react';
import { User, Trophy, Settings, Dumbbell, RefreshCw } from 'lucide-react';
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
  onSyncFromCloud, lastSyncedAt, syncing, onRegenerateProgram,
}) {
  const [regenConfirm, setRegenConfirm] = useState(false);

  function handleRegenClick() {
    if (!regenConfirm) { setRegenConfirm(true); return; }
    setRegenConfirm(false);
    onRegenerateProgram?.();
  }

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
          {onRegenerateProgram && (
            <button
              onClick={handleRegenClick}
              onBlur={() => setRegenConfirm(false)}
              style={{
                marginTop: 12,
                width: '100%', padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: regenConfirm
                  ? '1px solid rgba(255,160,0,0.5)'
                  : '1px solid rgba(0,229,255,0.2)',
                background: regenConfirm
                  ? 'rgba(255,160,0,0.08)'
                  : 'rgba(0,229,255,0.06)',
                color: regenConfirm ? '#ffa000' : 'var(--color-action)',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={13} />
              {regenConfirm ? 'TAP AGAIN TO CONFIRM' : 'REGENERATE PROGRAM'}
            </button>
          )}
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
            onSyncFromCloud={onSyncFromCloud}
            lastSyncedAt={lastSyncedAt}
            syncing={syncing}
          />
        </div>
      </div>
    </div>
  );
}
