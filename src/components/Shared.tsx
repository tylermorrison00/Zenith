import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronDown, CircleHelp, Command, Download, FileText, Folder, LayoutDashboard, LogOut, Palette, Search, Sparkles, Timer, UserRound, X, Zap } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { getCurrentAccount, getCurrentAccountSync, type Account } from '../lib/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import { nextTheme, themeLogo, type ThemeName } from '../lib/theme';
import type { Note, Project, Task } from '../data/seed';

export function Header({ onSignOut, theme = 'amber', onToggleTheme }: { onSignOut?: () => void; theme?: ThemeName; onToggleTheme?: () => void }) {
  const { startTimer, notify } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  // Profile comes from auth.ts so it shows the signed-in user in BOTH
  // Firebase mode and local mode (the old readAccount() call only ever saw
  // the local store, which Firebase sign-in never writes). Seeded
  // synchronously so a signed-in user never flashes the placeholder: local
  // mode reads localStorage directly, and Firebase mode reads the already
  // restored Firebase user when one is available. `undefined` means "still
  // loading" (Firebase mode, session not restored yet); `null` means nobody
  // is signed in.
  const [account, setAccount] = useState<Account | null | undefined>(() => {
    const sync = getCurrentAccountSync();
    if (sync) return sync;
    return isFirebaseConfigured() ? undefined : null;
  });
  useEffect(() => {
    let cancelled = false;
    getCurrentAccount().then((current) => {
      if (!cancelled) setAccount(current);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const profileName = account?.name ?? 'Mia Chen';
  const profileEmail = account?.email ?? 'Studio workspace';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'M';
  const active = location.pathname.startsWith('/focus') ? '/focus'
    : location.pathname.startsWith('/projects') ? '/projects'
      : location.pathname.startsWith('/review') ? '/review' : '/';

  const nav = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/focus', label: 'Focus', icon: Timer },
    { to: '/projects', label: 'Projects', icon: Folder },
    { to: '/review', label: 'Review', icon: Sparkles },
  ];

  return (
    <header className="topbar">
      <Link className="brand-lockup" to="/" aria-label="Zenith Studio workspace home">
        <img src={themeLogo(theme)} alt="" className="brand-mark" />
        <span className="brand-name">Zenith</span>
        <span className="brand-divider">/</span>
        <span className="workspace-name">Studio workspace</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={`nav-link ${active === to ? 'is-active' : ''}`}>
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="header-actions">
        <SearchBox />
        <button className="icon-button header-utility" aria-label="Notifications" onClick={() => notify('You’re all caught up')}>
          <Bell size={16} strokeWidth={1.8} /><span className="notification-dot" />
        </button>
        <button className="start-focus" onClick={() => { startTimer(); navigate('/focus'); }}>
          <span className="plus-small">+</span> Start focus
        </button>
        <div className="profile-wrap">
          <button className="avatar-button" aria-label="Open workspace profile" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
            <span className="avatar-initial">{profileInitial}</span>
            <ChevronDown size={12} />
          </button>
          {profileOpen && (
            <div className="profile-popover">
              <div className="profile-person"><span className="avatar-large">{profileInitial}</span><div><strong>{profileName}</strong><small>{profileEmail}</small></div></div>
              <div className="profile-streak"><Zap size={14} /><span>6 day focus streak</span><b>6</b></div>
              <button onClick={() => { setProfileOpen(false); navigate('/'); document.getElementById('habit-list')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><UserRound size={14} /> Open daily rituals</button>
              <button onClick={() => { setProfileOpen(false); onToggleTheme?.(); const next = nextTheme(theme); notify(`${next.charAt(0).toUpperCase()}${next.slice(1)} theme on`); }}><Palette size={14} /> Theme color</button>
              <button disabled={checkingUpdate} onClick={async () => {
                setCheckingUpdate(true);
                notify('Checking for updates…');
                try {
                  if (window.zenith) {
                    const result = await window.zenith.doUpdate();
                    notify(result.message || (result.updated ? 'Update installed — restarting…' : "You're on the latest version"));
                    if (result.updated) setProfileOpen(false);
                  } else {
                    // Browser / dev server: no desktop bridge, so there is
                    // nothing real to check — keep the old placeholder answer.
                    window.setTimeout(() => { notify("You're on the latest version"); }, 1600);
                    return;
                  }
                } catch {
                  notify('Could not check for updates — try again later');
                } finally {
                  setCheckingUpdate(false);
                }
              }}><Download size={14} /> {checkingUpdate ? 'Checking for updates…' : 'Update app'}</button>
              <button onClick={() => { setProfileOpen(false); notify('Workspace help is ready when you need it'); }}><CircleHelp size={14} /> Workspace help</button>
              {onSignOut && <button onClick={() => { setProfileOpen(false); onSignOut(); }}><LogOut size={14} /> Sign out</button>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const searchablePeople = [
  { name: 'Mia Chen', role: 'Design lead · Brand Refresh', href: '/projects/brand-refresh' },
  { name: 'Lena Park', role: 'Product partner · Zenith v2 spec', href: '/focus' },
];

function SearchBox() {
  const { tasks, notes, projects } = useDashboard();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    const found: { type: string; title: string; detail: string; href: string; icon: typeof FileText }[] = [];
    tasks.filter((task) => `${task.title} ${task.project}`.toLowerCase().includes(q)).slice(0, 4)
      .forEach((task: Task) => found.push({ type: 'Task', title: task.title, detail: task.project, href: '/focus', icon: Check }));
    notes.filter((note) => `${note.title} ${note.excerpt} ${note.project}`.toLowerCase().includes(q)).slice(0, 3)
      .forEach((note: Note) => found.push({ type: 'Note', title: note.title, detail: note.project, href: '/', icon: FileText }));
    projects.filter((project) => `${project.name} ${project.status}`.toLowerCase().includes(q)).slice(0, 3)
      .forEach((project: Project) => found.push({ type: 'Project', title: project.name, detail: project.status, href: project.id === 'brand-refresh' ? '/projects/brand-refresh' : '/projects', icon: Folder }));
    searchablePeople.filter((person) => `${person.name} ${person.role}`.toLowerCase().includes(q)).slice(0, 3)
      .forEach((person) => found.push({ type: 'Person', title: person.name, detail: person.role, href: person.href, icon: UserRound }));
    return found.slice(0, 7);
  }, [q, tasks, notes, projects]);

  function go(href: string) {
    navigate(href);
    setQuery('');
    setFocused(false);
  }

  return (
    <div className="search-wrap">
      <Search size={15} className="search-icon" />
      <input
        aria-label="Search tasks, notes, people"
        placeholder="Search tasks, notes, people"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 160)}
        onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) go(results[0].href); if (event.key === 'Escape') { setQuery(''); setFocused(false); } }}
      />
      {query ? <button className="search-clear" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={() => setQuery('')}><X size={13} /></button> : <span className="shortcut"><Command size={10} /> K</span>}
      {focused && q && (
        <div className="search-results">
          <div className="search-results-label">Search results</div>
          {results.length ? results.map(({ type, title, detail, href, icon: Icon }) => (
            <button key={`${type}-${title}`} className="search-result" onMouseDown={(event) => event.preventDefault()} onClick={() => go(href)}>
              <span className="search-result-icon"><Icon size={14} /></span><span className="search-result-copy"><strong>{title}</strong><small>{type} · {detail}</small></span>
            </button>
          )) : <div className="search-empty">No matches yet. Try a task, note, or project.</div>}
        </div>
      )}
    </div>
  );
}

export function PageEyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function PageTitle({ eyebrow, title, detail, side }: { eyebrow?: React.ReactNode; title: string; detail?: string; side?: React.ReactNode }) {
  return (
    <div className="page-title-row">
      <div>
        {eyebrow && <PageEyebrow>{eyebrow}</PageEyebrow>}
        <h1 className="display-title">{title}</h1>
        {detail && <p className="page-detail">{detail}</p>}
      </div>
      {side && <div className="page-title-side">{side}</div>}
    </div>
  );
}

export function CardHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="card-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

export function Panel({ children, className = '', as = 'section' }: { children: React.ReactNode; className?: string; as?: 'section' | 'div' }) {
  const Tag = as;
  return <Tag className={`panel ${className}`}>{children}</Tag>;
}

export function TinyPill({ children, icon, tone = 'neutral' }: { children: React.ReactNode; icon?: React.ReactNode; tone?: 'neutral' | 'amber' | 'teal' }) {
  return <span className={`tiny-pill tiny-pill--${tone}`}>{icon}{children}</span>;
}

export function StatTile({ label, value, change, icon, className = '' }: { label: string; value: string; change?: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={`stat-tile ${className}`}>
      <div className="stat-tile-head"><span>{label}</span>{icon && <span className="stat-icon">{icon}</span>}</div>
      <div className="stat-value">{value}</div>
      {change && <div className="stat-change">{change}</div>}
    </div>
  );
}

export function MiniBars({ values = [20, 31, 28, 46, 34, 52, 47, 65, 55, 72, 68, 92] }: { values?: number[] }) {
  return <div className="mini-bars" aria-hidden="true">{values.map((height, index) => <span key={index} className={index >= values.length - 2 ? 'is-amber' : ''} style={{ height: `${height}%` }} />)}</div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button className={`toggle ${checked ? 'is-on' : ''}`} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return <div className={`progress-track ${className}`} aria-label={`${value}% complete`}><span style={{ width: `${value}%` }} /></div>;
}

export function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(' ', '-');
  return <span className={`status-chip status-${normalized}`}><span className="status-dot" />{status}</span>;
}

export function FolderGlyph({ active = false }: { active?: boolean }) {
  return <span className={`folder-glyph ${active ? 'folder-glyph--active' : ''}`}><Folder size={17} strokeWidth={1.8} /></span>;
}

export function Toast() {
  const { toast } = useDashboard();
  if (!toast) return null;
  return <div className="toast" role="status"><span className="toast-check"><Check size={13} /></span>{toast}</div>;
}

export function InlineBackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link className="back-link" to={to}><span aria-hidden="true">←</span>{children}</Link>;
}
