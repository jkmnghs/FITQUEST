import React, { useState } from 'react';
import { TrendingUp, ClipboardCheck, Calendar, Activity } from 'lucide-react';
import StatsTab from './StatsTab';
import CheckinTab from './CheckinTab';
import { SummaryTab } from './OtherTabs';

function bmiColor(category) {
  if (category === 'Normal')      return 'var(--color-success)';
  if (category === 'Underweight') return 'var(--color-action)';
  if (category === 'Overweight')  return '#FFA726';
  return 'var(--color-destructive)'; // Obese
}

function whrColor(ratio) {
  return ratio >= 0.5 ? '#FFA726' : 'var(--color-success)';
}

function MetricBox({ label, value, tag, color, note }) {
  return (
    <div style={{
      background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{
        fontFamily: 'var(--font-primary)', fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
        color, lineHeight: 1,
      }}>{value}</span>
      {tag && (
        <span style={{
          display: 'inline-block', alignSelf: 'flex-start',
          fontFamily: 'var(--font-primary)', fontSize: 10, fontWeight: 700,
          color, background: `${color}18`,
          padding: '2px 7px', borderRadius: 20,
        }}>{tag}</span>
      )}
      {note && (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{note}</span>
      )}
    </div>
  );
}

function BodyStatsCard({ state }) {
  const { bmi, bmiCategory, waistToHeightRatio, assessment } = state;
  if (!bmi || !assessment) return null;

  const latestCheckin = [...(state.weeklyCheckins || [])].sort((a, b) => b.week - a.week)[0];
  const currentWeight = latestCheckin?.weight ?? assessment.weightKg;
  const weightDelta = latestCheckin?.weight && assessment.weightKg
    ? (latestCheckin.weight - assessment.weightKg).toFixed(1)
    : null;

  return (
    <div style={{
      background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
    }}>
      {/* Headline stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: waistToHeightRatio ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginBottom: 'var(--space-3)' }}>
        <MetricBox
          label="BMI"
          value={bmi}
          tag={bmiCategory}
          color={bmiColor(bmiCategory)}
          note="Asian-adjusted cutoffs"
        />
        <MetricBox
          label="Weight"
          value={`${currentWeight} kg`}
          tag={weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : 'Starting'}
          color={weightDelta !== null && Number(weightDelta) !== 0 ? (
            assessment.goal === 'fat_loss' && Number(weightDelta) < 0 ? 'var(--color-success)' :
            assessment.goal === 'muscle'   && Number(weightDelta) > 0 ? 'var(--color-success)' :
            'var(--color-text-secondary)'
          ) : 'var(--color-text-secondary)'}
        />
        {waistToHeightRatio && (
          <MetricBox
            label="Waist/Ht"
            value={waistToHeightRatio}
            tag={waistToHeightRatio >= 0.5 ? 'Elevated' : 'Healthy'}
            color={whrColor(waistToHeightRatio)}
            note="< 0.5 = low risk"
          />
        )}
      </div>

      {/* Baseline row */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px 16px',
        padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border-subtle)',
      }}>
        {[
          { label: 'Height', val: `${assessment.heightCm} cm` },
          { label: 'Age',    val: `${assessment.age} yrs` },
          { label: 'Sex',    val: assessment.sex === 'male' ? 'Male' : 'Female' },
          { label: 'Goal',   val: { fat_loss: 'Fat Loss', muscle: 'Build Muscle', recomp: 'Recomp', strength: 'Strength' }[assessment.goal] ?? assessment.goal },
        ].map(({ label, val }) => (
          <span key={label} style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</span> {val}
          </span>
        ))}
      </div>

      {/* BMI scale bar — proportional to actual cutoffs within range 14–40 */}
      <div style={{ marginTop: 'var(--space-3)' }}>
        {/* Zone labels at proportional positions */}
        <div style={{ position: 'relative', height: 14, marginBottom: 2 }}>
          {[
            { label: 'UNDER', pct: 8.7 },
            { label: 'NORMAL', pct: 26 },
            { label: 'OVER', pct: 43.3 },
            { label: 'OBESE', pct: 76 },
          ].map(({ label, pct }) => (
            <span key={label} style={{
              position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
              fontSize: 8, fontWeight: 700, color: 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
            }}>{label}</span>
          ))}
        </div>

        {/* Bar with sharp stops at correct proportional cutoffs */}
        <div style={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'visible',
          background: `linear-gradient(to right,
            var(--color-action) 0%, var(--color-action) 17.3%,
            var(--color-success) 17.3%, var(--color-success) 34.6%,
            #FFA726 34.6%, #FFA726 51.9%,
            var(--color-destructive) 51.9%, var(--color-destructive) 100%)`,
          borderRadius: 3,
        }}>
          {/* Marker dot */}
          <div style={{
            position: 'absolute', top: -2, width: 10, height: 10,
            borderRadius: '50%', background: '#fff',
            border: `2px solid ${bmiColor(bmiCategory)}`,
            left: `calc(${Math.min(98, Math.max(2, ((bmi - 14) / 26) * 100))}% - 5px)`,
            transition: 'left 0.5s',
            zIndex: 1,
          }} />
        </div>

        {/* Cutoff labels at exact proportional positions */}
        <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
          {[
            { val: '18.5', pct: 17.3 },
            { val: '23',   pct: 34.6 },
            { val: '27.5', pct: 51.9 },
          ].map(({ val, pct }) => (
            <span key={val} style={{
              position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
              fontSize: 9, color: 'var(--color-text-tertiary)',
            }}>{val}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

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

function CheckinSection({ state, onSubmitCheckin }) {
  const dayIdx = new Date().getDay();
  const isSunday = dayIdx === 0;
  const daysUntilSunday = isSunday ? 0 : 7 - dayIdx;
  const thisWeekCheckin = state.weeklyCheckins?.find(c => c.week === state.currentWeek);

  const sectionStyle = {
    padding: '0 var(--space-4)',
    marginBottom: 'var(--space-6)',
  };

  if (!isSunday && !thisWeekCheckin) {
    // Not Sunday, no check-in yet
    return (
      <div style={sectionStyle}>
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        }}>
          <Calendar size={24} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Next check-in: Sunday
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {daysUntilSunday === 1 ? 'Tomorrow' : `In ${daysUntilSunday} days`} · Keep training!
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={sectionStyle}>
      <CheckinTab state={state} onSubmit={onSubmitCheckin} />
    </div>
  );
}

export default function ProgressTab({ state, onSubmitCheckin }) {
  return (
    <div className="tab-enter">
      {/* Weekly Summary */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={TrendingUp} title="Weekly Summary" />
        <div style={{ padding: '0 var(--space-4)' }}>
          <SummaryTab state={state} />
        </div>
      </div>

      {/* Body Stats */}
      {state.bmi && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SectionHeader icon={Activity} title="Body Metrics" />
          <div style={{ padding: '0 var(--space-4)' }}>
            <BodyStatsCard state={state} />
          </div>
        </div>
      )}

      {/* Check-in */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={ClipboardCheck} title="Weekly Check-in" />
        <CheckinSection state={state} onSubmitCheckin={onSubmitCheckin} />
      </div>

      {/* Charts + Stats */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SectionHeader icon={TrendingUp} title="Stats & Trends" />
        <div style={{ padding: '0 var(--space-4)' }}>
          <StatsTab state={state} />
        </div>
      </div>
    </div>
  );
}
