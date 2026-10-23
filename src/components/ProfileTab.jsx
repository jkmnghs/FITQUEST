import React from 'react';
import { User, Trophy, Settings, Dumbbell } from 'lucide-react';
import RankTab from './RankTab';
import { AchievementsTab, SettingsTab } from './OtherTabs';
import ProgramEditorTab from './ProgramEditorTab';

function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 var(--space-4)',
      marginBottom: 'var(--space-3)',
    }}>
      <span className="fq-hex" aria-hidden="true" style={{
        width: 26, height: 29, flexShrink: 0,
        background: 'rgba(0,229,255,0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} color="var(--color-action)" strokeWidth={2.4} />
      </span>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900,
        color: '#fff', letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>{title}</h2>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,229,255,0.35), transparent)' }} />
    </div>
  );
}

export default function ProfileTab({
  state, onUpdate, onReset, onResetToday, onBackfillWeek,
  notifStatus, onRequestNotif, onImport, userEmail, onSignOut, onShowCycleComplete,
  onSyncFromCloud, lastSyncedAt, syncing,
  onChangePassword, authError, onClearAuthError,
  userId, onRestoreSnapshot, onToast,
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
            onSyncFromCloud={onSyncFromCloud}
            userId={userId}
            onRestoreSnapshot={onRestoreSnapshot}
            onToast={onToast}
            lastSyncedAt={lastSyncedAt}
            syncing={syncing}
            onChangePassword={onChangePassword}
            authError={authError}
            onClearAuthError={onClearAuthError}
          />
        </div>
      </div>
    </div>
  );
}
