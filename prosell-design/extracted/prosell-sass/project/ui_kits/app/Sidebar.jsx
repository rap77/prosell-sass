// Sidebar navigation

function Sidebar({ active, onNav, counts = {} }) {
  const Item = ({ id, icon, label, count }) => (
    <div
      className={`nav-item ${active === id ? "active" : ""}`}
      onClick={() => onNav(id)}
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
      {count != null && <span className="nav-count">{count}</span>}
    </div>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="../../assets/logo-mark.png" height="28" alt="" />
        <span
          style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          ProSell
        </span>
      </div>

      <div className="sidebar-workspace">
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "linear-gradient(135deg, #4DB8FF, #1E5FD4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 11,
            color: "#060D24",
          }}
        >
          NW
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Northwind Sales</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Workspace
          </div>
        </div>
        <Icon
          name="chevron-down"
          size={14}
          style={{ color: "var(--text-secondary)" }}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Workspace</div>
        <Item id="dashboard" icon="layout-dashboard" label="Dashboard" />
        <Item
          id="signals"
          icon="zap"
          label="Signal inbox"
          count={counts.signals || 12}
        />
        <Item id="pipeline" icon="briefcase" label="Pipeline" />
        <Item id="accounts" icon="building-2" label="Accounts" />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Intelligence</div>
        <Item id="prospects" icon="target" label="Prospects" />
        <Item id="reports" icon="bar-chart-3" label="Reports" />
        <Item id="forecasts" icon="trending-up" label="Forecasts" />
      </div>

      <div className="sidebar-footer">
        <Avatar name="Sarah Chen" size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-footer-name">Sarah Chen</div>
          <div className="sidebar-footer-email">VP, Revenue</div>
        </div>
        <Icon
          name="settings"
          size={15}
          style={{ color: "var(--text-secondary)" }}
        />
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
