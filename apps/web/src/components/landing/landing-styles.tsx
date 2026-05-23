export function LandingStyles() {
  return (
    <style>{`
      @keyframes ps-float {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-10px); }
      }
      @keyframes ps-float-badge-1 {
        0%, 100% { transform: translateY(0) translateX(0); }
        50%       { transform: translateY(-12px) translateX(-4px); }
      }
      @keyframes ps-float-badge-2 {
        0%, 100% { transform: translateY(0) translateX(0); }
        50%       { transform: translateY(-14px) translateX(6px); }
      }
      @keyframes ps-pulse {
        0%   { transform: scale(0.6); opacity: 0.6; }
        100% { transform: scale(2.2); opacity: 0; }
      }

      .ps-nav-link {
        font-size: 14px; font-weight: 500;
        color: var(--ps-text-secondary); text-decoration: none;
        transition: color 200ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-nav-link:hover { color: var(--ps-text-primary); }

      .ps-btn-primary {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 11px 22px; border-radius: 8px;
        font-size: 14px; font-weight: 600; line-height: 1;
        text-decoration: none; border: none; cursor: pointer;
        background: var(--ps-cyan); color: var(--ps-bg-base);
        transition: background 220ms cubic-bezier(0.16,1,0.3,1),
                    transform 220ms cubic-bezier(0.16,1,0.3,1),
                    box-shadow 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-btn-primary:hover {
        background: var(--ps-cyan-hover);
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(77,184,255,0.35);
      }
      .ps-btn-ghost {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 11px 22px; border-radius: 8px;
        font-size: 14px; font-weight: 600; line-height: 1;
        text-decoration: none; cursor: pointer;
        background: transparent; color: var(--ps-text-primary);
        border: 1px solid var(--ps-border-default);
        transition: border-color 200ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-btn-ghost:hover { border-color: var(--ps-border-active); }

      .ps-sol-card {
        background: var(--ps-bg-surface);
        border: 1px solid var(--ps-border-subtle);
        border-radius: 16px; backdrop-filter: blur(20px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        padding: 28px; display: flex; flex-direction: column;
        transition: border-color 220ms cubic-bezier(0.16,1,0.3,1),
                    transform 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-sol-card:hover { border-color: var(--ps-border-strong); transform: translateY(-4px); }

      .ps-pr-card {
        position: relative;
        background: var(--ps-bg-surface);
        border: 1px solid var(--ps-border-subtle);
        border-radius: 18px; backdrop-filter: blur(20px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        padding: 32px 28px; display: flex; flex-direction: column;
        transition: border-color 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-pr-card:hover { border-color: var(--ps-border-medium); }
      .ps-pr-card-featured {
        background: var(--ps-bg-elevated);
        border-color: var(--ps-border-active) !important;
        box-shadow: 0 0 60px rgba(77,184,255,0.12), inset 0 1px 0 rgba(255,255,255,0.04);
        transform: translateY(-6px);
      }

      .ps-hw-step {
        position: relative;
        background: var(--ps-bg-surface);
        border: 1px solid var(--ps-border-subtle);
        border-radius: 16px; padding: 44px 28px 32px;
        transition: border-color 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-hw-step:hover { border-color: var(--ps-border-medium); }

      .ps-tm-card {
        background: var(--ps-bg-surface);
        border: 1px solid var(--ps-border-subtle);
        border-radius: 16px; backdrop-filter: blur(20px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        padding: 28px; display: flex; flex-direction: column;
        transition: border-color 220ms cubic-bezier(0.16,1,0.3,1),
                    transform 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .ps-tm-card:hover { border-color: var(--ps-border-medium); transform: translateY(-3px); }

      .ps-faq-item { border-bottom: 1px solid var(--ps-border-subtle); }
      .ps-faq-q {
        display: flex; align-items: center; justify-content: space-between;
        padding: 18px 0; cursor: pointer; list-style: none;
        font-size: 15.5px; font-weight: 600; color: var(--ps-text-primary); gap: 16px;
      }
      .ps-faq-q::-webkit-details-marker { display: none; }
      .ps-faq-toggle {
        flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
        background: rgba(77,184,255,0.08); border: 1px solid rgba(77,184,255,0.2);
        color: var(--ps-cyan);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 300; line-height: 1;
        transition: transform 200ms cubic-bezier(0.16,1,0.3,1), background 200ms;
      }
      .ps-faq-item[open] .ps-faq-toggle { transform: rotate(45deg); background: rgba(77,184,255,0.15); }
      .ps-faq-a {
        padding: 0 48px 20px 0;
        font-size: 14.5px; line-height: 1.7; color: var(--ps-text-secondary);
      }

      .ps-footer-link { color: var(--ps-text-secondary); font-size: 13px; text-decoration: none; transition: color 200ms cubic-bezier(0.16,1,0.3,1); }
      .ps-footer-link:hover { color: var(--ps-cyan); }
      .ps-footer-legal-link { color: var(--ps-text-disabled); font-size: 12px; text-decoration: none; transition: color 200ms; }
      .ps-footer-legal-link:hover { color: var(--ps-text-secondary); }
      .ps-footer-social-link {
        width: 32px; height: 32px; border-radius: 50%;
        border: 1px solid rgba(77,184,255,0.15);
        display: inline-flex; align-items: center; justify-content: center;
        color: var(--ps-text-secondary); text-decoration: none;
        transition: border-color 200ms cubic-bezier(0.16,1,0.3,1), color 200ms;
      }
      .ps-footer-social-link:hover { border-color: var(--ps-cyan); color: var(--ps-cyan); }

      @media (max-width: 1100px) {
        .ps-hero       { grid-template-columns: 1fr !important; gap: 60px !important; }
        .ps-hero-h1    { font-size: 44px !important; }
        .ps-nav-links  { display: none !important; }
        .ps-mockup-col { min-height: 400px !important; }
        .ps-float-badge { display: none !important; }
        .ps-ft-row     { grid-template-columns: 1fr !important; gap: 48px !important; }
        .ps-sol-grid   { grid-template-columns: 1fr !important; }
        .ps-ft-h2      { font-size: 36px !important; }
        .ps-ft-h3      { font-size: 26px !important; }
        .ps-ft-row.reverse .ps-ft-text { order: 1 !important; }
        .ps-ft-row.reverse .ps-ft-mock { order: 2 !important; }
        .ps-footer-grid { grid-template-columns: 1fr 1fr !important; }
      }
      @media (max-width: 700px) {
        .ps-hero-h1  { font-size: 32px !important; }
        .ps-cta-row  { flex-direction: column !important; align-items: stretch !important; }
        .ps-cta-row a { text-align: center; }
        .ps-pain-row { flex-direction: column !important; }
        .ps-pr-grid  { grid-template-columns: 1fr !important; max-width: 480px; margin-left: auto; margin-right: auto; }
        .ps-pr-card-featured { transform: none !important; }
        .ps-footer-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
