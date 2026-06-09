// Topbar

function TopBar({ breadcrumb }) {
  return (
    <div className="topbar">
      {breadcrumb && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <Icon name="chevron-right" size={12} style={{ opacity: 0.5 }} />
              )}
              <span
                style={{
                  color:
                    i === breadcrumb.length - 1
                      ? "var(--text-primary)"
                      : undefined,
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 500,
                }}
              >
                {b}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="topbar-spacer" />
      <div className="topbar-search">
        <Icon name="search" size={14} />
        <span>Search accounts, deals, contacts…</span>
        <kbd>⌘ K</kbd>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" title="What's new">
          <Icon name="sparkles" size={16} />
        </button>
        <button className="icon-btn" title="Notifications">
          <Icon name="bell" size={16} />
          <span className="dot-indicator"></span>
        </button>
        <Button variant="primary" size="sm" icon="plus">
          New deal
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { TopBar });
