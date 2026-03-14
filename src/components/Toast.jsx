import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', top: 70, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      background: 'linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,229,255,0.12))',
      border: '1px solid rgba(0,230,118,0.25)',
      borderRadius: 13,
      padding: '10px 22px',
      fontFamily: 'Orbitron, sans-serif',
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--green2)',
      backdropFilter: 'blur(20px)',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      animation: 'toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
      pointerEvents: 'none'
    }}>
      {message}
    </div>
  );
}
