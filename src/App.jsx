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
import { generateProgramFromAssessment } from './utils/programGenerator';
import { resolveSession } from './utils/session';
import { haptic } from './utils/haptics';
import AIBuilderScreen from './components/AIBuilderScreen';
import SyncIndicator from './components/SyncIndicator';

const TrainTab    = lazy(() => import('./components/TrainTab'));
const FuelTab     = lazy(() => import('./components/NutritionTab'));
const ProgressTab = lazy(() => import('./components/ProgressTab'));
const ProfileTab  = lazy(() => import('./components/ProfileTab'));

const NAV_TABS = [
  { id: 'train',    Icon: Dumbbell,   label: 'Train',    hint: "Today's session" },
  { id: 'fuel',     Icon: Utensils,   label: 'Fuel',     hint: 'Meals & macros'  },
  { id: 'progress', Icon: TrendingUp, label: 'Progress', hint: 'Stats & check-in'},
  { id: 'profile',  Icon: User,       label: 'Profile',  hint: 'Rank & settings' },
];

/** Deep-link target from the PWA manifest shortcuts (/?tab=fuel). */
function initialTabFromUrl() {
  if (typeof window === 'undefined') return 'train';
  const requested = new URLSearchParams(window.location.search).get('tab');
  return NAV_TABS.some(t => t.id === requested) ? requested : 'train';
}

/** Small red count bubble shared by the tab bar and the desktop rail. */
function UnreadBadge({ count, offset = -4 }) {
  if (!count) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute', top: offset, right: offset,
        background: 'var(--color-destructive)', color: '#fff',
        borderRadius: 'var(--radius-full)', minWidth: 15, height: 15, padding: '0 3px',
        fontSize: 11, fontWeight: 700, lineHeight: '15px', textAlign: 'center',
      }}
    >{count > 9 ? '9+' : count}</span>
  );
}

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


function SetPasswordScreen({ authError, onUpdate, onCancel }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const displayError = localError || authError;

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setLocalError('Passwords do not match.'); return; }
    setLoading(true);
    const ok = await onUpdate(password);
    if (!ok) setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      padding: 'calc(var(--safe-area-top) + 24px) 20px calc(var(--safe-area-bottom) + 24px)',
      fontFamily: 'var(--font-primary)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--cyan)', letterSpacing: 2, textShadow: '0 0 20px rgba(0,229,255,0.4)', marginBottom: 4 }}>FITQUEST</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: 1.5 }}>SET NEW PASSWORD</div>
      </div>
      <div style={{ width: '100%', maxWidth: 360, background: 'var(--card)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: 20, padding: '28px 24px', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6 }}>NEW PASSWORD</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" autoComplete="new-password"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-primary)', outline: 'none', boxSizing: 'border-box' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6 }}>CONFIRM PASSWORD</div>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" autoComplete="new-password"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-primary)', outline: 'none', boxSizing: 'border-box' }} />
          </label>
          {displayError && (
            <div style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)', lineHeight: 1.4 }}>{displayError}</div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? 'rgba(0,229,255,0.3)' : 'var(--cyan)', color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 0 20px rgba(0,229,255,0.25)' }}>
            {loading ? 'UPDATING...' : 'SET PASSWORD'}
          </button>
          {/* Escape hatch — a user who lands here from a recovery link and
              changes their mind was previously stuck on this screen. */}
          <button type="button" onClick={onCancel}
            style={{ width: '100%', marginTop: 12, padding: '10px', border: 'none', background: 'transparent', color: 'var(--text3)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>
            CANCEL — SIGN OUT
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, authError, signIn, signUp, signOut, resetPassword, updatePassword, changePassword, resendConfirmation, clearAuthError, passwordRecovery } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTabFromUrl);
  const [modalOpen, setModalOpen] = useState(false);
  const [showCycleComplete, setShowCycleComplete] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [generatingProgram, setGeneratingProgram] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [pendingAssessment, setPendingAssessment] = useState(null);
  const [generationFailed, setGenerationFailed] = useState(false);
  const contentRef = useRef(null);

  const {
    state, cloudLoading, continueOffline, toast, showToast,
    completeExercise, finishSession,
    submitCheckin, updateSetting, setState,
    resetAll, resetToday, startSession, backfillWeek,
    addAIHistory, logMeal, deleteMeal, importData, markDaySkipped, clearDayProgress,
    completeAssessment, changeProgram, swapExercise, deleteExercise,
    syncFromCloud, lastSyncedAt, syncing, incrementQuestMessages,
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

  if (authLoading)  return <SyncIndicator label="LOADING..." />;
  if (!user)        return <><BgFx /><LoginScreen authError={authError} onSignIn={signIn} onSignUp={signUp} onResetPassword={resetPassword} onClearAuthError={clearAuthError} onResendConfirmation={resendConfirmation} /></>;
  if (user && passwordRecovery) return <><BgFx /><SetPasswordScreen authError={authError} onUpdate={updatePassword} onCancel={signOut} /></>;
  if (cloudLoading) return <SyncIndicator label="SYNCING..." onContinueOffline={continueOffline} />;
  if (generatingProgram) return (
    <AIBuilderScreen
      assessment={pendingAssessment}
      apiReady={apiReady}
      generationFailed={generationFailed}
      onRetry={() => runProgramGeneration(pendingAssessment, { assessmentAlreadySaved: true })}
      onDismiss={() => { setGeneratingProgram(false); setApiReady(false); setGenerationFailed(false); setPendingAssessment(null); }}
    />
  );
  if (!state.assessment?.completed) return (
    <><BgFx /><OnboardingScreen onComplete={(a) => runProgramGeneration(a)} /></>
  );

  /**
   * Builds the personalised split, then commits the assessment.
   *
   * A null result means the AI build failed — the user still gets the program
   * selectProgram picked, but AIBuilderScreen now says so and offers a retry
   * instead of silently handing a PPL-preferring user a full-body plan.
   */
  async function runProgramGeneration(assessment, { assessmentAlreadySaved = false } = {}) {
    if (!assessment) return;
    setPendingAssessment(assessment);
    setApiReady(false);
    setGenerationFailed(false);
    setGeneratingProgram(true);

    const templates = await generateProgramFromAssessment(assessment).catch(() => null);
    if (!assessmentAlreadySaved) completeAssessment(assessment, fireOnboarding);

    if (templates) {
      updateSetting('dayTemplates', templates);
      setApiReady(true); // signals AIBuilderScreen it can transition to reveal
    } else {
      setGenerationFailed(true);
    }
  }

  async function handleRequestNotif() {
    const result = await requestNotificationPermission();
    setNotifStatus(result);
    if (result === 'granted') {
      updateSetting('notificationsEnabled', true);
      showToast('Notifications enabled! ✓');
    }
  }

  function handleTabSelect(id) {
    if (id !== activeTab) haptic('tap');
    setActiveTab(id);
    setScrollY(0);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  // One resolution of "what workout is on screen", shared by the display and
  // every mutation. Each used to derive it independently, which is why swap and
  // delete silently no-op'd on a rest-day override.
  const session = resolveSession(state);

  const sharedTrainProps = {
    state,
    exercises: session.exercises,
    currentDayName: session.title ?? (session.isRestDay ? 'UPCOMING SESSION' : null),
    isRestDay: session.isRestDay,
    nextTrainingDayKey: session.nextTrainingDayKey,
    sessionDayKey: session.dayKey,
    onCompleteExercise: completeExercise,
    onFinishSession: finishSession,
    onStartSession: startSession,
    onModalChange: setModalOpen,
    onChangeProgram: changeProgram,
    onSwapExercise: swapExercise,
    onDeleteExercise: deleteExercise,
    onBackfillWeek: backfillWeek,
    onMarkDaySkipped: markDaySkipped,
    onClearDayProgress: clearDayProgress,
    unreadAgentCount,
    onMarkAgentRead: markAgentRead,
    onOpenInbox: pollAgentMessages,
    agentMessages,
    onSaveHistory: addAIHistory,
    onSaveProgram: (updatedTemplates) => updateSetting('dayTemplates', updatedTemplates),
    onQuestMessageSent: incrementQuestMessages,
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

      {/* Adaptive shell: rail on desktop, bottom tab bar on phones/tablets */}
      <div className="fq-shell">
        {/* Desktop navigation rail — CSS decides whether this is visible, so
            there is no breakpoint state in JS to get out of sync on resize. */}
        <div className="fq-rail">
          <div style={{ padding: '0 var(--space-3) var(--space-5)' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900,
              color: 'var(--color-action)', letterSpacing: '0.08em',
            }}>FITQUEST</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              Week {state.currentWeek} · Lvl {state.level}
            </div>
          </div>

          <nav aria-label="Primary" role="tablist" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_TABS.map(({ id, Icon, label, hint }) => {
              const isActive = activeTab === id;
              const showBadge = id === 'train' && unreadAgentCount > 0;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  className="fq-rail__btn"
                  onClick={() => handleTabSelect(id)}
                >
                  <span style={{ position: 'relative', display: 'flex' }}>
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 1.7} />
                    <UnreadBadge count={showBadge ? unreadAgentCount : 0} offset={-6} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span>{label}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div style={{
            marginTop: 'auto', padding: 'var(--space-4) var(--space-3) 0',
            fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.5,
            borderTop: '1px solid var(--color-border-subtle)',
          }}>
            Signed in as<br />
            <span style={{ color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>{user?.email}</span>
          </div>
        </div>

        {/* App column */}
        <div className="fq-app">
          {/* Header — hidden when workout modal is open */}
          {!modalOpen && (
            <Header state={state} scrollY={scrollY} />
          )}

          {/* Content area */}
          <div ref={contentRef} className="fq-content">
            <div className="fq-column" style={{ padding: '8px 0 24px' }}>
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
                      onChangePassword={changePassword}
                      authError={authError}
                      onClearAuthError={clearAuthError}
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

          {/* Bottom tab bar — hidden when workout modal is open.
              This is a flex sibling of the scroll area rather than an absolutely
              positioned child: with `position: absolute; bottom: 0` inside a
              100vh box, iOS Safari parked the bar underneath its own address
              bar and the fourth tab was unreachable. */}
          {!modalOpen && (
            <nav role="tablist" aria-label="Primary" className="fq-tabbar">
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
                    className="fq-tabbar__btn"
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
                    <span style={{ position: 'relative', display: 'flex' }}>
                      <Icon
                        size={23}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        color={isActive ? 'var(--color-action)' : 'var(--color-text-tertiary)'}
                        style={{
                          transition: 'color var(--transition-normal)',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          display: 'block',
                        }}
                      />
                      <UnreadBadge count={showBadge ? unreadAgentCount : 0} offset={-6} />
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
    </ErrorBoundary>
  );
}
