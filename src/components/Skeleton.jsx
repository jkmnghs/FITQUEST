import React from 'react';

/**
 * Reusable skeleton loading component.
 * Props: width, height, borderRadius, variant ('text'|'card'|'circle'|'chart')
 */
export default function Skeleton({ width, height, borderRadius, variant, style = {} }) {
  const variantStyles = {
    text:   { height: 14, width: '80%', borderRadius: 'var(--radius-sm)' },
    card:   { height: 80, width: '100%', borderRadius: 'var(--radius-lg)' },
    circle: { height: 120, width: 120, borderRadius: '50%' },
    chart:  { height: 200, width: '100%', borderRadius: 'var(--radius-lg)' },
  };

  const base = variant ? variantStyles[variant] || {} : {};

  return (
    <div
      className="skeleton"
      style={{
        ...base,
        ...(width  != null && { width  }),
        ...(height != null && { height }),
        ...(borderRadius != null && { borderRadius }),
        ...style,
      }}
    />
  );
}

/* Pre-built skeleton layouts used in lazy Suspense fallbacks */

export function TrainTabSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)'
        }}>
          <Skeleton height={18} width="55%" />
          <Skeleton height={13} width="38%" />
        </div>
      ))}
    </div>
  );
}

export function FuelTabSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Skeleton height={12} width="60%" />
        <Skeleton height={12} width="45%" />
        <Skeleton height={12} width="52%" />
      </div>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}

export function ProgressTabSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
      <Skeleton variant="chart" />
    </div>
  );
}

export function ProfileTabSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center' }}>
      <Skeleton variant="circle" />
      <Skeleton height={12} width="70%" />
      <Skeleton height={12} width="55%" />
      <Skeleton height={12} width="65%" />
    </div>
  );
}
