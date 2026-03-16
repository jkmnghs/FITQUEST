import React, { useState, useEffect, Component } from 'react';
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

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, textAlign: 'center', background: 'var(--bg)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
            SOMETHING WENT WRONG
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6, maxWidth: 300 }}>
            {this.state.error.message}
          </div>
          <button onClick={() => window.location.reload()} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'var(--cyan)', color: 'var(--bg)',
            fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, cursor: 'pointer'
          }}>RELOAD APP</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PRIMARY_TABS = [
  { id: 'workout',  icon: '⚔️',  label: 'Workout'  },
  { id: 'coach',    icon: '🤖',  label: 'Coach'    },
  { id: 'stats',    icon: '📊',  label: 'Stats'    },
  { id: 'rank',     icon: '⭐',  label: 'Rank'     },
];

const MORE_TABS = [
  { id: 'checkin',  icon: '📋',  label: 'Check-in' },
  { id: 'summary',  icon: '📝',  label: 'Summary'  },
  { id: 'ach',      icon: '🏆',  label: 'Awards'   },
  { id: 'log',      icon: '📜',  label: 'Log'      },
  { id: 'settings', icon: '⚙️',  label: 'Settings' },
];

const ALL_TABS = [...PRIMARY_TABS, ...MORE_TABS];

export default function App() {
  const [activeTab, setActiveTab] = useState('workout');
  const [modalOpen, setModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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

  function handleTabSelect(id) {
    setActiveTab(id);
    setMoreOpen(false);
  }

  const isMoreTabActive = MORE_TABS.some(t => t.id === activeTab);

  return (
    <ErrorBoundary>
      <BgFx />
      <Toast message={toast} />

      {/* "More" sheet overlay */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: '100%', maxWidth: 430,
              background: 'linear-gradient(180deg, rgba(15,21,40,0.98) 0%, rgba(10,14,26,0.99) 100%)',
              border: '1px solid rgba(0,229,255,0.1)',
              borderBottom: 'none',
              borderRadius: '20px 20px 0 0',
              padding: '6px 0 calc(70px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.15)',
              margin: '8px auto 16px',
            }} />
            <div style={{
              fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
              color: 'var(--text3)', letterSpacing: 1.5,
              padding: '0 20px 10px',
            }}>MORE</div>
            {MORE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '14px 20px',
                  border: 'none', background: activeTab === tab.id
                    ? 'rgba(0,229,255,0.08)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--cyan)' : 'var(--text2)',
                  fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left',
                  borderLeft: activeTab === tab.id
                    ? '3px solid var(--cyan)' : '3px solid transparent',
                  transition: 'all 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11,
                    color: 'var(--cyan)', fontFamily: 'Orbitron',
                  }}>ACTIVE</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PWA install banner */}
      {installPrompt && !installDismissed && (
        <div style={{
          position: 'fixed', bottom: 'calc(70px + env(safe-area-inset-bottom, 0px) + 10px)',
          left: '50%', transform: 'translateX(-50%)',
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

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '10px 20px',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
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

        {/* Bottom navigation bar — hidden when modal is open */}
        {!modalOpen && (
          <nav style={{
            position: 'fixed', bottom: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430,
            zIndex: 100,
            background: 'rgba(10,14,26,0.97)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,229,255,0.08)',
            display: 'flex', alignItems: 'stretch',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          }}>
            {PRIMARY_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 3, padding: '10px 4px 10px',
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', position: 'relative',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: 0, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 28, height: 2, borderRadius: 1,
                      background: 'var(--cyan)',
                      boxShadow: '0 0 8px var(--cyan)',
                    }} />
                  )}
                  <span style={{
                    fontSize: 22,
                    filter: isActive ? 'drop-shadow(0 0 6px var(--cyan))' : 'none',
                    transition: 'filter 0.2s',
                    transform: isActive ? 'translateY(-1px)' : 'none',
                  }}>{tab.icon}</span>
                  <span style={{
                    fontFamily: 'Rajdhani', fontSize: 11, fontWeight: 600,
                    color: isActive ? 'var(--cyan)' : 'var(--text3)',
                    letterSpacing: 0.3,
                    transition: 'color 0.2s',
                  }}>{tab.label}</span>
                </button>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen(prev => !prev)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '10px 4px 10px',
                border: 'none', background: 'transparent',
                cursor: 'pointer', position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s',
              }}
            >
              {/* Active indicator for More tab */}
              {isMoreTabActive && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 28, height: 2, borderRadius: 1,
                  background: 'var(--cyan)',
                  boxShadow: '0 0 8px var(--cyan)',
                }} />
              )}
              <span style={{
                fontSize: 22,
                color: (isMoreTabActive || moreOpen) ? 'var(--cyan)' : 'var(--text3)',
                display: 'inline-block',
              }}>⋯</span>
              <span style={{
                fontFamily: 'Rajdhani', fontSize: 11, fontWeight: 600,
                color: (isMoreTabActive || moreOpen) ? 'var(--cyan)' : 'var(--text3)',
                letterSpacing: 0.3,
                transition: 'color 0.2s',
              }}>
                {isMoreTabActive
                  ? MORE_TABS.find(t => t.id === activeTab)?.label
                  : 'More'}
              </span>
            </button>
          </nav>
        )}
      </div>
    </ErrorBoundary>
  );
}
