// Dashboard view: KPI tiles + signal feed + at-risk pipeline

function KpiCard({ label, value, delta, deltaTone = "up", icon }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-label">
        <Icon name={icon} size={13} />
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-delta ${deltaTone}`}>
        <Icon
          name={deltaTone === "up" ? "trending-up" : "trending-down"}
          size={12}
        />
        {delta}
      </div>
    </div>
  );
}

const SIGNAL_TYPES = {
  hire: { icon: "user-plus", tone: "info" },
  funding: { icon: "dollar-sign", tone: "success" },
  intent: { icon: "zap", tone: "warning" },
  news: { icon: "newspaper", tone: "info" },
};

function SignalRow({ type, account, headline, when }) {
  const meta = SIGNAL_TYPES[type] || SIGNAL_TYPES.intent;
  const bgMap = {
    info: "rgba(77,184,255,0.12)",
    success: "rgba(34,211,160,0.12)",
    warning: "rgba(245,166,35,0.12)",
  };
  const colorMap = { info: "#4DB8FF", success: "#22D3A0", warning: "#F5A623" };
  return (
    <div className="signal-row">
      <div
        className="signal-icon"
        style={{ background: bgMap[meta.tone], color: colorMap[meta.tone] }}
      >
        <Icon name={meta.icon} size={16} />
      </div>
      <div className="signal-body">
        <div className="signal-title">
          <strong>{account}</strong> {headline}
        </div>
        <div className="signal-meta">
          <span>{when}</span>
          <span>·</span>
          <Badge tone={meta.tone}>{type}</Badge>
        </div>
      </div>
      <Icon
        name="chevron-right"
        size={14}
        style={{ color: "var(--text-disabled)", alignSelf: "center" }}
      />
    </div>
  );
}

function AtRiskRow({ name, owner, arr, daysInStage, stage, onClick }) {
  return (
    <div className="signal-row" style={{ cursor: "pointer" }} onClick={onClick}>
      <Avatar name={name} size="md" />
      <div className="signal-body">
        <div className="signal-title">
          <strong>{name}</strong>
        </div>
        <div className="signal-meta">
          <span>{owner}</span>
          <span>·</span>
          <span>{daysInStage} days in stage</span>
        </div>
      </div>
      <div style={{ textAlign: "right", alignSelf: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{arr}</div>
        <div style={{ marginTop: 4 }}>
          <StagePill stage={stage} />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onOpenDeal }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, Sarah</h1>
          <p className="page-subtitle">
            4 deals need attention. Pipeline is up{" "}
            <span className="text-success fw-600">12%</span> this week.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" icon="filter">
            This quarter
          </Button>
          <Button variant="primary" icon="plus">
            New deal
          </Button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Pipeline ARR"
          value="$4.82M"
          delta="↑ 12% WoW"
          deltaTone="up"
          icon="dollar-sign"
        />
        <KpiCard
          label="Closed Won (Q3)"
          value="$1.24M"
          delta="↑ 34% QoQ"
          deltaTone="up"
          icon="check-circle-2"
        />
        <KpiCard
          label="At risk"
          value="$680K"
          delta="↓ 8% WoW"
          deltaTone="down"
          icon="alert-triangle"
        />
        <KpiCard
          label="New signals"
          value="34"
          delta="↑ 22 today"
          deltaTone="up"
          icon="zap"
        />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Icon
                name="alert-triangle"
                size={14}
                style={{ color: "var(--warning)" }}
              />
              Pipeline at risk
            </h3>
            <a className="section-link" href="#">
              View all 8 →
            </a>
          </div>
          <AtRiskRow
            name="Acme Corp"
            owner="Sarah Chen"
            arr="$240K"
            daysInStage="14"
            stage="negotiation"
            onClick={() => onOpenDeal("acme")}
          />
          <AtRiskRow
            name="Northwind Inc"
            owner="Jordan Day"
            arr="$480K"
            daysInStage="21"
            stage="eval"
            onClick={() => onOpenDeal("acme")}
          />
          <AtRiskRow
            name="Globex"
            owner="Mira Khan"
            arr="$120K"
            daysInStage="9"
            stage="demo"
            onClick={() => onOpenDeal("acme")}
          />
          <AtRiskRow
            name="Initech"
            owner="Sarah Chen"
            arr="$95K"
            daysInStage="18"
            stage="discovery"
            onClick={() => onOpenDeal("acme")}
          />
        </div>

        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Icon name="zap" size={14} style={{ color: "var(--cyan)" }} />
              Signal inbox
            </h3>
            <a className="section-link" href="#">
              All signals →
            </a>
          </div>
          <SignalRow
            type="hire"
            account="Acme Corp"
            headline="hired a new VP of Sales (Jane Doe, ex-Salesforce)."
            when="2h ago"
          />
          <SignalRow
            type="funding"
            account="Northwind Inc"
            headline="raised $80M Series C from Sequoia."
            when="6h ago"
          />
          <SignalRow
            type="intent"
            account="Globex"
            headline="visited the pricing page 7 times this week."
            when="yesterday"
          />
          <SignalRow
            type="news"
            account="Initech"
            headline="announced a strategic partnership with Microsoft."
            when="2 days ago"
          />
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Dashboard, KpiCard, SignalRow });
