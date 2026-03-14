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
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const {
    state, toast, showToast,
    completeExercise, finishSession,
    submitCheckin, updateSetting,
    resetAll, resetToday, startSession, addAIHistory
  } = useGameState();

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

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 430, margin: '0 auto',
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        paddingTop: 'var(--safe-top)'
      }}>
        {/* Header */}
        <Header state={state} />

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 12px',
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
            />
          </div>
          {activeTab === 'coach' && (
            <AICoachTab
              state={state}
              onSaveHistory={addAIHistory}
            />
          )}
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
              notifStatus={notifStatus}
              onRequestNotif={handleRequestNotif}
            />
          )}
        </div>
      </div>
    </>
  );
}
