// Account detail view

function Account({ onOpenDeal }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1
            className="page-title"
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "linear-gradient(135deg, #4DB8FF, #1E5FD4)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--bg-base)",
              }}
            >
              AC
            </span>
            Acme Corp
          </h1>
          <p className="page-subtitle" style={{ marginLeft: 58 }}>
            SaaS · Series C · 2,400 employees · acme.com
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" icon="external-link">
            Open in CRM
          </Button>
          <Button variant="primary" icon="plus">
            Add deal
          </Button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
        <div className="metric-row">
          <div className="metric-cell">
            <div className="metric-label">ICP fit</div>
            <div className="metric-val text-success">92 / 100</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Open ARR</div>
            <div className="metric-val">$240K</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Stage</div>
            <div
              className="metric-val"
              style={{ display: "flex", alignItems: "center", height: 22 }}
            >
              <StagePill stage="negotiation" />
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Last touch</div>
            <div className="metric-val">2 days ago</div>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Icon name="zap" size={14} style={{ color: "var(--cyan)" }} />
              Recent signals
            </h3>
            <a className="section-link" href="#">
              See all
            </a>
          </div>
          <SignalRow
            type="hire"
            account="Acme Corp"
            headline="hired Jane Doe as VP of Sales (ex-Salesforce, 8yr)."
            when="2h ago"
          />
          <SignalRow
            type="intent"
            account="Acme Corp"
            headline="visited /pricing 7× this week — 3 unique users."
            when="yesterday"
          />
          <SignalRow
            type="news"
            account="Acme Corp"
            headline="announced expansion into European markets."
            when="3 days ago"
          />
          <SignalRow
            type="funding"
            account="Acme Corp"
            headline="closed $120M Series C, led by Sequoia."
            when="2 weeks ago"
          />
        </div>

        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Icon name="users" size={14} />
              Buying committee
            </h3>
            <a className="section-link" href="#">
              View all 6
            </a>
          </div>
          <div style={{ padding: "4px 0" }}>
            {[
              {
                n: "Marcus Lee",
                role: "CRO",
                tag: "champion",
                tone: "success",
              },
              {
                n: "Priya Singh",
                role: "VP Engineering",
                tag: "champion",
                tone: "success",
              },
              { n: "David Wu", role: "CFO", tag: "blocker", tone: "error" },
              {
                n: "Hannah Müller",
                role: "Director, RevOps",
                tag: "neutral",
                tone: "neutral",
              },
            ].map((p) => (
              <div
                key={p.n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <Avatar name={p.n} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.n}</div>
                  <div
                    style={{ fontSize: 11.5, color: "var(--text-secondary)" }}
                  >
                    {p.role}
                  </div>
                </div>
                <Badge tone={p.tone}>{p.tag}</Badge>
                <Icon
                  name="linkedin"
                  size={14}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Account });
