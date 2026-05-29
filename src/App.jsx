import React, { useState, useEffect, useRef, Component, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Dumbbell, Utensils, TrendingUp, User, X, Zap } from 'lucide-react';
import BgFx from './components/BgFx';
import Toast from './components/Toast';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen';
import Onboarding from './components/Onboarding';
import { TrainTabSkeleton, FuelTabSkeleton, ProgressTabSkeleton, ProfileTabSkeleton } from './components/Skeleton';
import ProgramCompleteModal from './components/ProgramCompleteModal';
import { useAuth } from './hooks/useAuth';
import { useGameState } from './hooks/useGameState';
import { useAgentMessages } from './hooks/useAgentMessages';
import { registerSW, requestNotificationPermission } from './utils/notifications';
import { EXERCISES } from './data/gameData';
import { generateProgramFromAssessment } from './utils/programGenerator';

const TrainTab    = lazy(() => import('./components/TrainTab'));
const FuelTab     = lazy(() => import('./components/NutritionTab'));
const ProgressTab = lazy(() => import('./components/ProgressTab'));
const ProfileTab  = lazy(() => import('./components/ProfileTab'));

const NAV_TABS = [
  { id: 'train',    Icon: Dumbbell,   label: 'Train'    },
  { id: 'fuel',     Icon: Utensils,   label: 'Fuel'     },
  { id: 'progress', Icon: TrendingUp, label: 'Progress' },
  { id: 'profile',  Icon: User,       label: 'Profile'  },
];

function LazyTab({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <TrainTabSkeleton />}>
      {children}
    </Suspense>
  );
}

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, textAlign: 'center', background: 'var(--color-bg-primary)'
        }}>
          <Zap size={36} color="var(--color-destructive)" style={{ marginBottom: 16 }} />
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
            color: 'var(--color-destructive)', marginBottom: 8
          }}>SOMETHING WENT WRONG</div>
          <div style={{
            fontSize: 12, color: 'var(--color-text-tertiary)',
            marginBottom: 20, lineHeight: 1.6, maxWidth: 300
          }}>{this.state.error.message}</div>
          <button onClick={() => window.location.reload()} style={{
            padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none',
            background: 'var(--color-action)', color: 'var(--color-bg-primary)',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, cursor: 'pointer'
          }}>RELOAD APP</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function FullScreenLoader({ label = 'LOADING...' }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg-primary)', gap: 16,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
        color: 'var(--color-action)', letterSpacing: 2,
        animation: 'rankPulse 1.4s ease-in-out infinite',
      }}>{label}</div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, authError, signIn, signUp, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('train');
  const [modalOpen, setModalOpen] = useState(false);
  const [showCycleComplete, setShowCycleComplete] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const contentRef = useRef(null);

  const {
    state, cloudLoading, toast, showToast,
    completeExercise, finishSession,
    submitCheckin, updateSetting, setState,
    resetAll, resetToday, startSession, backfillWeek,
    addAIHistory, logMeal, deleteMeal, importData,
    completeAssessment, changeProgram, swapExercise, deleteExercise,
    syncFromCloud, lastSyncedAt, syncing,
  } = useGameState(user);

  const {
    unreadCount: unreadAgentCount,
    markAllRead: markAgentRead,
    fireOnboarding,
    pollMessages: pollAgentMessages,
    messages: agentMessages,
  } = useAgentMessages(user?.id, state, setState);

  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => { registerSW(); }, []);

  useEffect(() => {
    if (!localStorage.getItem('fitquest_onboarding_complete')) {
      setShowTour(true);
    }
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (authLoading)  return <><BgFx /><FullScreenLoader label="LOADING..." /></>;
  if (!user)        return <><BgFx /><LoginScreen authError={authError} onSignIn={signIn} onSignUp={signUp} /></>;
  if (cloudLoading) return <><BgFx /><FullScreenLoader label="SYNCING..." /></>;
  if (!state.assessment?.completed) return (
    <><BgFx /><OnboardingScreen onComplete={async (a) => {
      const templates = await generateProgramFromAssessment(a, user?.id);
      completeAssessment(a, fireOnboarding);
      if (templates) updateSetting('dayTemplates', templates);
    }} /></>
  );

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
    setScrollY(0);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_ABBR  = { sun: 'SUN', mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT' };
  const dayKey = DAY_ORDER[new Date().getDay()];
  const tdays  = state.trainingDays || ['mon', 'wed', 'fri'];

  const isTodayTrainingDay = tdays.includes(dayKey);

  // Today's template (only useful if it's a training day)
  const todayDayTemplate = state.dayTemplates?.[dayKey];

  // Next training day after today (for rest-day preview)
  const sortedTdays = [...tdays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const todayOrdinal = DAY_ORDER.indexOf(dayKey);
  const nextTrainingDayKey = sortedTdays.find(d => DAY_ORDER.indexOf(d) > todayOrdinal) || sortedTdays[0];
  const nextDayTemplate = state.dayTemplates?.[nextTrainingDayKey];

  // Fallback for users without dayTemplates: pick from activeTemplates by calendar day
  const todayTdIdx = tdays.indexOf(dayKey);
  const calendarFallback = (todayTdIdx >= 0 && state.activeTemplates?.length)
    ? state.activeTemplates[todayTdIdx % state.activeTemplates.length]
    : state.activeTemplates?.[state.currentDayIndex ?? 0];

  // What exercises to render
  const displayTemplate = isTodayTrainingDay
    ? (todayDayTemplate || calendarFallback)
    : nextDayTemplate;
  const displayExercises = displayTemplate?.exercises?.length > 0
    ? displayTemplate.exercises
    : (isTodayTrainingDay ? (state.activeExercises ?? EXERCISES) : EXERCISES);

  // Session label
  const currentDayName = isTodayTrainingDay
    ? (todayDayTemplate?.title ?? calendarFallback?.name ?? null)
    : (nextDayTemplate
        ? `NEXT SESSION — ${DAY_ABBR[nextTrainingDayKey]}`
        : `UPCOMING SESSION`);

  const sharedTrainProps = {
    state,
    exercises: displayExercises,
    currentDayName,
    isRestDay: !isTodayTrainingDay,
    nextTrainingDayKey,
    onCompleteExercise: completeExercise,
    onFinishSession: finishSession,
    onStartSession: startSession,
    onModalChange: setModalOpen,
    onChangeProgram: changeProgram,
    onSwapExercise: swapExercise,
    onDeleteExercise: deleteExercise,
    unreadAgentCount,
    onMarkAgentRead: markAgentRead,
    onOpenInbox: pollAgentMessages,
    agentMessages,
    onSaveHistory: addAIHistory,
    onSaveProgram: (updatedTemplates) => updateSetting('dayTemplates', updatedTemplates),
    userId: user?.id,
  };

  return (
    <ErrorBoundary>
      <BgFx />
      <Toast message={toast} />

      {/* Onboarding tour overlay */}
      {showTour && (
        <Onboarding onComplete={() => {
          localStorage.setItem('fitquest_onboarding_complete', 'true');
          setShowTour(false);
        }} />
      )}

      {/* PWA install banner */}
      {installPrompt && !installDismissed && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + var(--safe-area-bottom) + 10px)',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 9000, width: 'calc(100% - 40px)', maxWidth: 390,
          background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(179,136,255,0.12))',
          border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: 'var(--radius-lg)', padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <Zap size={20} color="var(--color-action)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              color: 'var(--color-action)', marginBottom: 2
            }}>ADD TO HOME SCREEN</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              Install FitQuest for faster access
            </div>
          </div>
          <button onClick={async () => {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') setInstallPrompt(null);
            else setInstallDismissed(true);
          }} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--color-action)', color: 'var(--color-bg-primary)',
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, cursor: 'pointer'
          }}>INSTALL</button>
          <button
            onClick={() => setInstallDismissed(true)}
            aria-label="Dismiss install banner"
            style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Desktop wrapper + phone frame */}
      <div className="desktop-wrapper">
        {/* Branding panel — visible on desktop only via CSS */}
        <div className="desktop-branding">
          <h1 className="desktop-logo">FITQUEST</h1>
          <p className="desktop-tagline">Your AI-Powered Training Companion</p>
          <p className="desktop-hint">Best experienced on mobile</p>
        </div>

        {/* Phone frame */}
        <div className="phone-frame" style={{ position: 'relative', background: 'var(--color-bg-primary)' }}>
          <div style={{
            position: 'relative', zIndex: 1,
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            paddingTop: 'var(--safe-area-top)',
          }}>
            {/* Header — hidden when workout modal is open */}
            {!modalOpen && (
              <Header state={state} scrollY={scrollY} />
            )}

            {/* Content area */}
            <div
              ref={contentRef}
              style={{
                flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                paddingBottom: 'calc(var(--nav-height) + var(--safe-area-bottom) + 16px)',
              }}
            >
              <div style={{ padding: '8px 0' }}>
                {activeTab === 'train' && (
                  <LazyTab fallback={<TrainTabSkeleton />}>
                    <TrainTab {...sharedTrainProps} />
                  </LazyTab>
                )}
                {activeTab === 'fuel' && (
                  <LazyTab fallback={<FuelTabSkeleton />}>
                    <FuelTab
                      state={state}
                      onLogMeal={logMeal}
                      onDeleteMeal={deleteMeal}
                      mealLogs={state.mealLogs || []}
                    />
                  </LazyTab>
                )}
                {activeTab === 'progress' && (
                  <LazyTab fallback={<ProgressTabSkeleton />}>
                    <ProgressTab state={state} onSubmitCheckin={submitCheckin} />
                  </LazyTab>
                )}
                {activeTab === 'profile' && (
                  <LazyTab fallback={<ProfileTabSkeleton />}>
                    <ProfileTab
                      state={state}
                      onUpdate={updateSetting}
                      onReset={resetAll}
                      onResetToday={resetToday}
                      onBackfillWeek={backfillWeek}
                      notifStatus={notifStatus}
                      onRequestNotif={handleRequestNotif}
                      onImport={importData}
                      userEmail={user?.email}
                      onSignOut={signOut}
                      onShowCycleComplete={() => setShowCycleComplete(true)}
                      onSyncFromCloud={syncFromCloud}
                      lastSyncedAt={lastSyncedAt}
                      syncing={syncing}
                    />
                  </LazyTab>
                )}
              </div>
            </div>

            {/* Cycle complete modal — triggered from Settings when user is at week 12 of a cycle */}
            {showCycleComplete && createPortal(
              <ProgramCompleteModal
                state={state}
                onClose={() => setShowCycleComplete(false)}
                onContinue={() => {
                  updateSetting('currentWeek', state.currentWeek + 1);
                  setShowCycleComplete(false);
                }}
                onChangeProgram={(id) => {
                  changeProgram(id);
                  updateSetting('currentWeek', state.currentWeek + 1);
                  setShowCycleComplete(false);
                }}
              />,
              document.body
            )}

            {/* Bottom tab bar — hidden when workout modal is open */}
            {!modalOpen && (
              <nav
                role="tablist"
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 'calc(var(--nav-height) + var(--safe-area-bottom))',
                  zIndex: 100,
                  background: 'var(--color-surface-2)',
                  borderTop: '1px solid var(--color-border-subtle)',
                  display: 'flex', alignItems: 'stretch',
                  paddingBottom: 'var(--safe-area-bottom)',
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
                }}
              >
                {NAV_TABS.map(({ id, Icon, label }) => {
                  const isActive = activeTab === id;
                  const showBadge = id === 'train' && unreadAgentCount > 0;
                  return (
                    <button
                      key={id}
                      role="tab"
                      aria-label={label}
                      aria-selected={isActive}
                      onClick={() => handleTabSelect(id)}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 3, padding: '8px 4px',
                        border: 'none', background: 'transparent',
                        cursor: 'pointer', position: 'relative',
                        WebkitTapHighlightColor: 'transparent',
                        minHeight: 44,
                      }}
                    >
                      {/* Top indicator bar */}
                      {isActive && (
                        <span style={{
                          position: 'absolute', top: 0, left: '50%',
                          transform: 'translateX(-50%)',
                          width: 24, height: 3, borderRadius: 2,
                          background: 'var(--color-action)',
                        }} />
                      )}
                      {/* Icon with optional unread badge */}
                      <span style={{ position: 'relative' }}>
                        <Icon
                          size={24}
                          strokeWidth={isActive ? 2.5 : 1.5}
                          color={isActive ? 'var(--color-action)' : 'var(--color-text-tertiary)'}
                          style={{
                            transition: 'color var(--transition-normal)',
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            display: 'block',
                          }}
                        />
                        {showBadge && (
                          <span style={{
                            position: 'absolute', top: -4, right: -6,
                            background: 'var(--color-destructive)', color: '#fff',
                            borderRadius: '50%', width: 14, height: 14,
                            fontSize: 8, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {unreadAgentCount > 9 ? '9+' : unreadAgentCount}
                          </span>
                        )}
                      </span>
                      {/* Label */}
                      <span style={{
                        fontFamily: 'var(--font-primary)',
                        fontSize: 11, fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--color-action)' : 'var(--color-text-tertiary)',
                        letterSpacing: '0.02em',
                        transition: 'color var(--transition-normal)',
                      }}>{label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
