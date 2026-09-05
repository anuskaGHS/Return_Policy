import React from 'react';
import { Info, AlertCircle } from 'lucide-react';

export default function ErrorBanner({ message, type = "info", onClose }) {
  if (!message) return null;

  const isWarning = type === "warning" || type === "error";

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem',
        background: isWarning ? 'rgba(244, 63, 94, 0.12)' : 'rgba(99, 102, 241, 0.12)',
        border: `1px solid ${isWarning ? 'rgba(244, 63, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
        color: isWarning ? '#fca5a5' : '#c7d2fe'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isWarning ? <AlertCircle size={16} /> : <Info size={16} />}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0 0.25rem'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
