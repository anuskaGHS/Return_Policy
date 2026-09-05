import React from 'react';
import { Target, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ActionPlan({ plan, vulnerability, isLoading }) {
  const bullets = plan && plan.length > 0 ? plan : [
    {
      bullet_number: 1,
      title: "Analyzing Debt Prepayment Opportunities",
      action: "Evaluating optimal loan reduction strategies to save compound interest."
    },
    {
      bullet_number: 2,
      title: "Modeling SIP Step-Up Trajectory",
      action: "Projecting compounding wealth gains under calibrated annual contribution raises."
    },
    {
      bullet_number: 3,
      title: "Calibrating Liquid Safety Reserve",
      action: "Determining monthly fixed liability safety cushions for uninterrupted compounding."
    }
  ];

  return (
    <section className={`glass-panel action-plan-panel ${isLoading ? 'loading-pulse' : ''}`} aria-label="3-Bullet Priority Action Plan">
      <div className="action-plan-header">
        <h3 className="panel-title">
          <Target size={20} className="text-primary" />
          Personal Policy Action Plan
        </h3>
        <span className="badge" style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
          <ShieldCheck size={13} /> 3 Tailored Rules
        </span>
      </div>

      <div className="action-bullets-list">
        {bullets.map((item, index) => (
          <div key={item.bullet_number || index} className="action-bullet-item">
            <div className="bullet-number-badge">
              #{item.bullet_number || index + 1}
            </div>
            <div className="bullet-content">
              <h4 className="bullet-title">{item.title}</h4>
              <p className="bullet-desc">{item.action}</p>
            </div>
          </div>
        ))}
      </div>

      {vulnerability && (
        <div className="vulnerability-box">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#fecdd3' }}>Key Vulnerability / Drag: </strong>
            <span>{vulnerability}</span>
          </div>
        </div>
      )}
    </section>
  );
}
