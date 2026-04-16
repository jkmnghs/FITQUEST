import React, { useState } from 'react';
import { TrendingUp, ClipboardCheck, Calendar } from 'lucide-react';
import StatsTab from './StatsTab';
import CheckinTab from './CheckinTab';
import { SummaryTab } from './OtherTabs';

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
