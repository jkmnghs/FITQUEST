import React, { useState, useEffect } from 'react';
import BgFx from './components/BgFx';
import Toast from './components/Toast';
import Header from './components/Header';
import WorkoutTab from './components/WorkoutTab';
import StatsTab from './components/StatsTab';
import RankTab from './components/RankTab';
import CheckinTab from './components/CheckinTab';
import AICoachTab from './components/AICoachTab';
import { AchievementsTab, LogTab, SummaryTab, SettingsTab } from './components/OtherTabs';
import { useGameState } from './hooks/useGameState';
import { registerSW, requestNotificationPermission } from './utils/notifications';

const TABS = [
  { id: 'workout',  icon: '⚔️',  label: 'Workout'  },
  { id: 'coach',    icon: '🤖',  label: 'Coach'    },
  { id: 'stats',    icon: '📊',  label: 'Stats'    },
  { id: 'rank',     icon: '⭐',  label: 'Rank'     },
  { id: 'checkin',  icon: '📋',  label: 'Check-in' },
  { id: 'summary',  icon: '📝',  label: 'Summary'  },
  { id: 'ach',      icon: '🏆',  label: 'Awards'   },
  { id: 'log',      icon: '📜',  label: 'Log'      },
  { id: 'settings', icon: '⚙️',  label: 'Settings' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('workout');
  const [modalOpen, setModalOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const {
    state, toast, showToast,
    completeExercise, finishSession,
    submitCheckin, updateSetting,
    resetAll, resetToday, startSession, backfillWeek, addAIHistory, importData
  } = useGameState();

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Register service worker on mount
  useEffect(() => {
    registerSW();
  }, []);

  async function handleRequestNotif() {
    const result = await requestNotificationPermission();
    setNotifStatus(result);
    if (result === 'granted') {
      updateSetting('notificationsEnabled', true);
      showToast('Notifications enabled! ✓');
    }
  }

  return (
    <>
      <BgFx />
      <Toast message={toast} />

      {/* PWA install banner */}
      {installPrompt && !installDismissed && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9000, width: 'calc(100% - 40px)', maxWidth: 390,
          background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(179,136,255,0.12))',
          border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 2 }}>
              ADD TO HOME SCREEN
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Install FitQuest for faster access</div>
          </div>
          <button onClick={async () => {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') setInstallPrompt(null);
            else setInstallDismissed(true);
          }} style={{
            padding: '6px 12px', borderRadius: 8, border: 'none',
            background: 'var(--cyan)', color: 'var(--bg)',
            fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, cursor: 'pointer'
          }}>INSTALL</button>
          <button onClick={() => setInstallDismissed(true)} style={{
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'rgba(255,255,255,0.08)', color: 'var(--text3)',
            fontSize: 13, cursor: 'pointer', flexShrink: 0
          }}>✕</button>
        </div>
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 430, margin: '0 auto',
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        paddingTop: 'var(--safe-top)'
      }}>
        {/* Header — hidden when modal is open */}
        <div style={{ display: modalOpen ? 'none' : 'block' }}>
          <Header state={state} />
        </div>

        {/* Tab bar — hidden when modal is open */}
        <div style={{
          display: modalOpen ? 'none' : 'flex', gap: 4, padding: '8px 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(10,14,26,0.96)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,229,255,0.06)'
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0, padding: '9px 13px', borderRadius: 11,
                border: `1px solid ${activeTab === tab.id ? 'rgba(0,229,255,0.22)' : 'transparent'}`,
                background: activeTab === tab.id ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: activeTab === tab.id ? 'var(--cyan)' : 'var(--text3)',
                fontFamily: 'Rajdhani', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 5,
                letterSpacing: 0.3,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content — WorkoutTab stays mounted to preserve in-progress modal state */}
        <div style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '10px 20px 40px'
        }}>
          <div style={{ display: activeTab === 'workout' ? 'block' : 'none' }}>
            <WorkoutTab
              state={state}
              onCompleteExercise={completeExercise}
              onFinishSession={finishSession}
              onStartSession={startSession}
              onModalChange={setModalOpen}
            />
          </div>
          <div style={{ display: activeTab === 'coach' ? 'block' : 'none' }}>
            <AICoachTab
              state={state}
              onSaveHistory={addAIHistory}
            />
          </div>
          {activeTab === 'stats' && <StatsTab state={state} />}
          {activeTab === 'rank' && <RankTab state={state} />}
          {activeTab === 'checkin' && (
            <CheckinTab state={state} onSubmit={submitCheckin} />
          )}
          {activeTab === 'summary' && <SummaryTab state={state} />}
          {activeTab === 'ach' && <AchievementsTab state={state} />}
          {activeTab === 'log' && <LogTab state={state} />}
          {activeTab === 'settings' && (
            <SettingsTab
              state={state}
              onUpdate={updateSetting}
              onReset={resetAll}
              onResetToday={resetToday}
              onBackfillWeek={backfillWeek}
              notifStatus={notifStatus}
              onRequestNotif={handleRequestNotif}
              onImport={importData}
            />
          )}
        </div>
      </div>
    </>
  );
}
