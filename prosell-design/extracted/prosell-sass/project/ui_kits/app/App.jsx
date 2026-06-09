// App shell — view router

function App() {
  const [view, setView] = React.useState("dashboard");

  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [view]);

  const breadcrumbs = {
    dashboard: ["Dashboard"],
    signals: ["Signal inbox"],
    pipeline: ["Pipeline"],
    accounts: ["Accounts", "Acme Corp"],
    deal: ["Pipeline", "Acme Corp — Platform expansion"],
  };

  let content;
  if (view === "dashboard")
    content = <Dashboard onOpenDeal={() => setView("deal")} />;
  else if (view === "pipeline")
    content = <PipelineTable onOpenDeal={() => setView("deal")} />;
  else if (view === "accounts")
    content = <Account onOpenDeal={() => setView("deal")} />;
  else if (view === "deal")
    content = <Deal onBack={() => setView("pipeline")} />;
  else if (view === "signals")
    content = <Dashboard onOpenDeal={() => setView("deal")} />;
  else
    content = (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        <Icon name="construction" size={32} />
        <div
          style={{
            marginTop: 14,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Coming soon
        </div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          This view isn't built out in the kit yet.
        </div>
      </div>
    );

  return (
    <div className="app-shell">
      <Sidebar active={view} onNav={setView} />
      <div className="app-main">
        <TopBar breadcrumb={breadcrumbs[view]} />
        <div
          className="app-content"
          data-screen-label={breadcrumbs[view].join(" / ")}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
