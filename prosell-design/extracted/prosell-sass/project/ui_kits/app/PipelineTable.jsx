// Pipeline table view

const DEALS = [
  { id: 'acme',     name: 'Acme Corp — Platform expansion',  owner: 'Sarah Chen',  arr: 240000, stage: 'negotiation', days: 14, close: 'Sep 30', icp: 92 },
  { id: 'nw',       name: 'Northwind — Enterprise rollout',   owner: 'Jordan Day',  arr: 480000, stage: 'eval',        days: 21, close: 'Oct 15', icp: 88 },
  { id: 'globex',   name: 'Globex — Pilot to prod',           owner: 'Mira Khan',   arr: 120000, stage: 'demo',        days: 9,  close: 'Oct 22', icp: 76 },
  { id: 'init',     name: 'Initech — New territory',          owner: 'Sarah Chen',  arr: 95000,  stage: 'discovery',   days: 18, close: 'Nov 02', icp: 64 },
  { id: 'sterling', name: 'Sterling Cooper — Renewal',        owner: 'Ravi Patel',  arr: 320000, stage: 'closed-won',  days: 0,  close: 'Sep 18', icp: 95 },
  { id: 'wonka',    name: 'Wonka — Self-serve upgrade',       owner: 'Mira Khan',   arr: 60000,  stage: 'discovery',   days: 5,  close: 'Nov 10', icp: 71 },
  { id: 'cyberd',   name: 'Cyberdyne — AI add-on',            owner: 'Jordan Day',  arr: 180000, stage: 'demo',        days: 12, close: 'Oct 28', icp: 83 },
  { id: 'tyrell',   name: 'Tyrell Corp — Multi-region',        owner: 'Ravi Patel',  arr: 540000, stage: 'negotiation', days: 6,  close: 'Sep 27', icp: 90 },
];

const fmt = (n) => '$' + (n >= 1000 ? (n/1000).toFixed(0) + 'K' : n);

function PipelineTable({ onOpenDeal }) {
  const total = DEALS.reduce((a, d) => a + d.arr, 0);
  const max = Math.max(...DEALS.map(d => d.arr));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">{DEALS.length} active deals · <span className="text-primary fw-600">{fmt(total)} total ARR</span></p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" icon="filter">All stages</Button>
          <Button variant="ghost" icon="users">All owners</Button>
          <Button variant="primary" icon="plus">New deal</Button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Deal</th>
              <th>Stage</th>
              <th>ARR</th>
              <th>Owner</th>
              <th>Days in stage</th>
              <th>Close date</th>
              <th>ICP fit</th>
            </tr>
          </thead>
          <tbody>
            {DEALS.map(d => (
              <tr key={d.id} onClick={() => onOpenDeal(d.id)}>
                <td>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                </td>
                <td><StagePill stage={d.stage} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(d.arr)}</span>
                    <div style={{ width: 60, height: 4, background: 'rgba(77,184,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.arr/max)*100}%`, height: '100%', background: 'linear-gradient(90deg, #4DB8FF, #1E5FD4)' }}></div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={d.owner} size="sm" />
                    <span>{d.owner}</span>
                  </div>
                </td>
                <td>
                  <span className={d.days > 14 ? 'text-error fw-600' : ''}>{d.days}</span>
                </td>
                <td className="mono fs-sm text-secondary">{d.close}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 36, height: 4, background: 'rgba(77,184,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${d.icp}%`, height: '100%', background: d.icp >= 80 ? 'var(--success)' : d.icp >= 70 ? 'var(--cyan)' : 'var(--warning)' }}></div>
                    </div>
                    <span className="mono fs-xs">{d.icp}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

Object.assign(window, { PipelineTable, DEALS });
