// Deal detail view with timeline

function Deal({ onBack }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, cursor: 'pointer' }} onClick={onBack}>
            <Icon name="arrow-left" size={12} />
            <span>Pipeline</span>
          </div>
          <h1 className="page-title">Acme Corp — Platform expansion</h1>
          <p className="page-subtitle" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <StagePill stage="negotiation" />
            <span>·</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$240K ARR</span>
            <span>·</span>
            <span>Close Sep 30</span>
            <span>·</span>
            <span className="text-error fw-600">14 days in stage</span>
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" icon="mail">Email champion</Button>
          <Button variant="primary" icon="zap">Move to Closed Won</Button>
        </div>
      </div>

      <div className="two-col">
        <div className="card card-padded">
          <h3 className="section-title" style={{ marginBottom: 18 }}><Icon name="activity" size={14} />Activity timeline</h3>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-when">Today · 10:24 AM</div>
              <div className="timeline-what"><strong>Marcus Lee</strong> opened your last email and clicked the proposal link 3×.</div>
            </div>
            <div className="timeline-item">
              <div className="timeline-when">Yesterday · 4:12 PM</div>
              <div className="timeline-what">Pricing page visited by 3 unique users from acme.com.</div>
            </div>
            <div className="timeline-item">
              <div className="timeline-when">Sep 18 · 2:00 PM</div>
              <div className="timeline-what"><strong>Sarah Chen</strong> sent the redlined MSA to <strong>David Wu</strong>.</div>
            </div>
            <div className="timeline-item muted">
              <div className="timeline-when">Sep 14</div>
              <div className="timeline-what">Stage moved to <strong>Negotiation</strong>.</div>
            </div>
            <div className="timeline-item muted">
              <div className="timeline-when">Sep 6</div>
              <div className="timeline-what">Demo delivered to 6 stakeholders. Recording shared.</div>
            </div>
            <div className="timeline-item muted">
              <div className="timeline-when">Aug 28</div>
              <div className="timeline-what">Discovery call with <strong>Marcus Lee</strong>. Notes synced from Gong.</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="section-header">
              <h3 className="section-title"><Icon name="target" size={14} />Deal scorecard</h3>
            </div>
            <div style={{ padding: '4px 20px 16px' }}>
              {[
                { label: 'Champion identified',  done: true,  who: 'Marcus Lee' },
                { label: 'Economic buyer',        done: true,  who: 'David Wu (CFO)' },
                { label: 'Decision criteria',     done: true,  who: 'Documented' },
                { label: 'Decision process',      done: false, who: 'Procurement TBD' },
                { label: 'Identified pain',       done: true,  who: 'Forecast accuracy' },
                { label: 'Mutual close plan',     done: false, who: 'Not shared' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: item.done ? 'var(--success)' : 'rgba(77,184,255,0.1)',
                    color: item.done ? 'var(--bg-base)' : 'var(--text-disabled)',
                    border: item.done ? 'none' : '1px solid var(--border-default)',
                  }}>
                    {item.done && <Icon name="check" size={11} style={{ strokeWidth: 3 }} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>{item.who}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-padded">
            <h3 className="section-title" style={{ marginBottom: 14 }}><Icon name="sparkles" size={14} style={{ color: 'var(--cyan)' }} />ProSell suggests</h3>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-primary)' }}>
              David Wu (CFO) hasn't engaged in 9 days. Champion <strong>Marcus Lee</strong> just opened your proposal — propose a joint review call this week.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button variant="primary" size="sm" icon="mail">Draft email</Button>
              <Button variant="ghost" size="sm">Dismiss</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Deal });
