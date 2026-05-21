// Primitive components: Avatar, Badge, Button, Icon, StagePill

const initialsToGradient = (initials) => {
  // hash-derived gradient — keeps colors stable per name
  const seed = (initials || '??').charCodeAt(0) + (initials || '??').charCodeAt(1) || 0;
  const palettes = [
    ['#4DB8FF', '#1E5FD4'],
    ['#22D3A0', '#1E5FD4'],
    ['#4DB8FF', '#0D1B6E'],
    ['#7DCEFF', '#4DB8FF'],
    ['#F5A623', '#F04438'],
    ['#22D3A0', '#4DB8FF'],
  ];
  const [a, b] = palettes[seed % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

function Avatar({ name = '??', size = 'md', style = {} }) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: initialsToGradient(initials), ...style }}
    >{initials}</span>
  );
}

function Badge({ tone = 'info', dot = false, children }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" style={{ background: 'currentColor' }}></span>}
      {children}
    </span>
  );
}

function Button({ variant = 'primary', size, icon, children, onClick, style }) {
  const cls = `btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}`;
  return (
    <button className={cls} onClick={onClick} style={style}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

function Icon({ name, size = 16, style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      window.lucide.createIcons({ icons: window.lucide.icons, attrs: {}, nameAttr: 'data-lucide' });
    }
  }, [name]);
  return <i ref={ref} data-lucide={name} style={{ width: size, height: size, ...style }}></i>;
}

const STAGE_LABELS = {
  discovery: 'Discovery',
  demo: 'Demo',
  eval: 'Eval',
  negotiation: 'Negotiation',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
};
function StagePill({ stage }) {
  return <span className={`stage stage-${stage}`}>{STAGE_LABELS[stage] || stage}</span>;
}

Object.assign(window, { Avatar, Badge, Button, Icon, StagePill, initialsToGradient });
