import { useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, ListChecks, Lock, Mail, Play, Sparkles, Target, Timer, UserRound } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../lib/auth';
import { useDashboard } from '../state/DashboardContext';
import { themeLogo, type ThemeName } from '../lib/theme';

type Step = 'welcome' | 'auth';
type Mode = 'create' | 'login';

function OrbitVisual({ theme = 'amber' }: { theme?: ThemeName }) {
  return (
    <div className="orbit-visual" aria-hidden="true">
      <svg className="orbit-curve" viewBox="0 0 380 300" fill="none" preserveAspectRatio="none">
        <path d="M-10 210 C 90 120, 150 250, 215 150 S 330 40, 395 70" stroke="var(--amber)" strokeOpacity="0.4" strokeWidth="1.6" />
        <path d="M-10 250 C 110 190, 210 285, 300 190 S 370 120, 395 130" stroke="var(--slate)" strokeOpacity="0.35" strokeWidth="1.2" />
      </svg>
      <span className="orbit-dot orbit-dot--a" />
      <span className="orbit-dot orbit-dot--b" />
      <span className="orbit-bubble orbit-bubble--tasks"><ListChecks size={24} strokeWidth={1.8} /></span>
      <span className="orbit-bubble orbit-bubble--timer"><Timer size={22} strokeWidth={1.8} /></span>
      <span className="orbit-bubble orbit-bubble--spark"><Sparkles size={19} strokeWidth={1.8} /></span>
      <span className="orbit-bubble orbit-bubble--target"><Target size={23} strokeWidth={1.8} /></span>
      <span className="orbit-center">
        <img src={themeLogo(theme)} alt="" />
      </span>
    </div>
  );
}

function SwipeToStart({ onSwipe }: { onSwipe: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; max: number; moved: boolean } | null>(null);
  const doneRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [maxOffset, setMaxOffset] = useState(0);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onSwipe();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (doneRef.current) return;
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;
    const max = Math.max(0, track.clientWidth - pill.offsetWidth - 14);
    setMaxOffset(max);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX - offset, max, moved: false };
    pill.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const next = Math.min(drag.max, Math.max(0, event.clientX - drag.startX));
    if (Math.abs(next - offset) > 2) drag.moved = true;
    setOffset(next);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      // A plain tap/click still works for mouse and assistive users.
      finish();
      return;
    }
    if (drag.max > 0 && offset >= drag.max * 0.65) {
      setOffset(drag.max);
      window.setTimeout(finish, 190);
    } else {
      setOffset(0);
    }
  }

  function handlePointerCancel() {
    dragRef.current = null;
    setDragging(false);
    setOffset(0);
  }

  const progress = maxOffset > 0 ? offset / maxOffset : 0;

  return (
    <div className="get-started" ref={trackRef}>
      <button
        type="button"
        className="get-started-pill"
        ref={pillRef}
        aria-label="Get Started — swipe to continue to create your account"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            finish();
          }
        }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform .28s cubic-bezier(.22,.9,.3,1.2)',
        }}
      >
        <span className="get-started-play"><Play size={15} /></span>
        <span className="get-started-label">Get Started</span>
      </button>
      <span className="get-started-chevrons" aria-hidden="true" style={{ opacity: 1 - progress * 0.85 }}>
        <ChevronRight size={19} /><ChevronRight size={19} /><ChevronRight size={19} />
      </span>
    </div>
  );
}

export function OnboardingPage({ onComplete, theme = 'amber' }: { onComplete: () => void; theme?: ThemeName }) {
  const { notify } = useDashboard();
  const [step, setStep] = useState<Step>('welcome');
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Enter a valid email address to continue.');
      return;
    }
    if (password.length < 6) {
      setError('Your password needs at least 6 characters.');
      return;
    }

    if (mode === 'create') {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        setError('Enter your name so your workspace feels like yours.');
        return;
      }
      try {
        const account = await signUpWithEmail(cleanName, cleanEmail, password);
        notify(`Welcome to Zenith, ${account.name.split(' ')[0]}`);
        onComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong with sign-in. Please try again.');
      }
      return;
    }

    try {
      const account = await signInWithEmail(cleanEmail, password);
      notify(`Welcome back, ${account.name.split(' ')[0]}`);
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong with sign-in. Please try again.';
      setError(message);
      if (message === 'No account on this device yet — create one first.') {
        setMode('create');
      }
    }
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-glow" aria-hidden="true" />
      <div className="onboarding-inner">
        {step === 'welcome' ? (
          <section className="onboarding-welcome" aria-label="Welcome to Zenith">
            <div className="onboarding-copy">
              <h1 className="onboarding-title">
                Begin at your <em>Zenith.</em>
              </h1>
              <p className="onboarding-sub">
                Tasks, daily habits, focus sessions and projects — one calm
                workspace for your whole day.
              </p>
              <SwipeToStart onSwipe={() => setStep('auth')} />
              <p className="onboarding-hint">Swipe Get Started to create your account or log in.</p>
              <div className="onboarding-dots" aria-hidden="true">
                <span className="is-active" /><span />
              </div>
            </div>
            <OrbitVisual theme={theme} />
          </section>
        ) : (
          <section className="onboarding-auth" aria-label={mode === 'create' ? 'Create your account' : 'Log in to Zenith'}>
            <div className="onboarding-copy onboarding-copy--auth">
              <button className="onboarding-back" onClick={() => { setStep('welcome'); setError(''); }}>
                <ChevronLeft size={14} /> Back
              </button>
              <h1 className="onboarding-title onboarding-title--auth">
                {mode === 'create' ? <>Create your <em>account.</em></> : <>Welcome <em>back.</em></>}
              </h1>
              <p className="onboarding-sub">
                {mode === 'create'
                  ? 'Set up your account on this device and step straight into your workspace.'
                  : 'Log in with the account you created on this device.'}
              </p>
              <div className="onboarding-dots" aria-hidden="true">
                <span /><span className="is-active" />
              </div>
            </div>

            <div className="auth-panel">
              <div className="auth-tabs" role="tablist" aria-label="Account options">
                <button role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'is-active' : ''} onClick={() => switchMode('create')}>Create account</button>
                <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Log in</button>
              </div>

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {mode === 'create' && (
                  <label className="auth-field">
                    <span>Your name</span>
                    <span className="auth-input-wrap">
                      <UserRound size={15} />
                      <input aria-label="Your name" autoComplete="name" placeholder="e.g. Alex" value={name} onChange={(event) => setName(event.target.value)} />
                    </span>
                  </label>
                )}
                <label className="auth-field">
                  <span>Email address</span>
                  <span className="auth-input-wrap">
                    <Mail size={15} />
                    <input aria-label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </span>
                </label>
                <label className="auth-field">
                  <span>Password</span>
                  <span className="auth-input-wrap">
                    <Lock size={15} />
                    <input aria-label="Password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
                  </span>
                </label>

                {error && <p className="auth-error" role="alert">{error}</p>}

                <button className="auth-submit" type="submit">
                  <Check size={15} />
                  {mode === 'create' ? 'Create account & enter' : 'Log in & enter'}
                </button>
              </form>

              <p className="onboarding-hint onboarding-hint--panel">
                {mode === 'create' ? (
                  <>Already set up? <button className="auth-switch" onClick={() => switchMode('login')}>Log in instead</button></>
                ) : (
                  <>New to Zenith? <button className="auth-switch" onClick={() => switchMode('create')}>Create an account</button></>
                )}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
