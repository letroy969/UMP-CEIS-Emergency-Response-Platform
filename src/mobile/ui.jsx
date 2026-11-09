import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

// Locks page scrolling while an overlay is open (iOS would otherwise scroll the page behind it).
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [active]);
}

function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = event => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

export function TopBar({ title, onMenu, onBack, backLabel = "Back", right = null }) {
  return (
    <header className="m-topbar m-glass">
      {onBack ? (
        <button type="button" className="m-icon-btn" onClick={onBack} aria-label={backLabel}><ChevronLeft size={26} aria-hidden="true" /></button>
      ) : onMenu ? (
        <button type="button" className="m-icon-btn" onClick={onMenu} aria-label="Open menu"><Menu size={22} aria-hidden="true" /></button>
      ) : <span style={{ width: 44 }} />}
      <div className="m-topbar-title">{title}</div>
      <div style={{ minWidth: 44, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </header>
  );
}

// The bottom bar from the design: a floating glass capsule of tabs, a round
// glass button for the main action beside it, and an optional floating button
// above that one for the current screen's action.
export function Dock({ tabs, active, onTab, orb, fab }) {
  return (
    <>
      {fab && (
        <button type="button" className="m-fab m-glass" onClick={fab.onClick} aria-label={fab.label} title={fab.label} style={fab.style}>
          {fab.icon}
        </button>
      )}
      <nav className="m-dock" aria-label="Main">
        <div className="m-capsule m-glass" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className="m-tab"
              aria-selected={active === tab.key}
              aria-current={active === tab.key ? "page" : undefined}
              onClick={() => onTab(tab.key)}
              style={{ position: "relative" }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge > 0 && <b className="m-tab-badge" aria-label={`${tab.badge} new`}>{tab.badge > 9 ? "9+" : tab.badge}</b>}
            </button>
          ))}
        </div>
        {orb && (
          <button type="button" className="m-orb m-glass" onClick={orb.onClick} aria-label={orb.label} aria-pressed={orb.pressed} title={orb.label} style={orb.style}>
            {orb.icon}
          </button>
        )}
      </nav>
    </>
  );
}

export function Drawer({ open, onClose, header, children }) {
  useScrollLock(open);
  useEscape(open, onClose);
  const panelRef = useRef(null);
  // Move focus into the menu (for VoiceOver and keyboards) without drawing a focus ring on a button.
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="m-scrim" onClick={onClose} aria-hidden="true" />
      <aside ref={panelRef} tabIndex={-1} className="m-drawer m-glass" role="dialog" aria-modal="true" aria-label="Menu" style={{ outline: "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "0 6px 10px 10px" }}>
          <div style={{ minWidth: 0 }}>{header}</div>
          <button type="button" className="m-icon-btn" onClick={onClose} aria-label="Close menu"><X size={22} aria-hidden="true" /></button>
        </div>
        {children}
      </aside>
    </>
  );
}

export function DrawerItem({ icon, color, label, onClick, current = false, danger = false }) {
  return (
    <button type="button" className="m-drawer-item" onClick={onClick} aria-current={current ? "page" : undefined} style={danger ? { color: "var(--m-red)" } : undefined}>
      <span className="m-row-icon" style={{ background: color || "var(--m-tint)" }}>{icon}</span>
      {label}
    </button>
  );
}

// Slide-up sheet. Drag the handle/header down to dismiss, like iOS.
export function Sheet({ open, onClose, title, children, full = false, left = null, right = null, dismissible = true }) {
  useScrollLock(open);
  useEscape(open && dismissible, onClose);
  const [dragY, setDragY] = useState(0);
  const drag = useRef(null);
  if (!open) return null;

  const onPointerDown = event => {
    if (!dismissible) return;
    drag.current = { startY: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = event => {
    if (!drag.current) return;
    setDragY(Math.max(0, event.clientY - drag.current.startY));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const shouldClose = dragY > 110;
    drag.current = null;
    setDragY(0);
    if (shouldClose) onClose();
  };

  return (
    <>
      <div className="m-scrim m-sheet-scrim" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
      <section className={`m-sheet${full ? " m-sheet--full" : ""}`} role="dialog" aria-modal="true" aria-label={title} style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}>
        <div className="m-sheet-head m-glass" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="m-grabber" aria-hidden="true" />
          <div className="m-sheet-title-row">
            <div style={{ minWidth: 64 }}>{left}</div>
            <div className="m-sheet-title">{title}</div>
            <div style={{ minWidth: 64, display: "flex", justifyContent: "flex-end" }}>
              {right ?? (dismissible && <button type="button" className="m-icon-btn" onClick={onClose} aria-label="Close"><X size={22} aria-hidden="true" /></button>)}
            </div>
          </div>
        </div>
        <div className="m-sheet-body">{children}</div>
      </section>
    </>
  );
}

// A screen pushed over the tabs (menu destinations, details). Swipe in from
// the left edge to go back, like iOS.
export function Page({ title, onBack, children, right = null, withDock = false }) {
  const swipe = useRef(null);
  const [dx, setDx] = useState(0);
  useEscape(true, onBack);

  const onTouchStart = event => {
    const touch = event.touches[0];
    if (touch.clientX <= 24) swipe.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchMove = event => {
    if (!swipe.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipe.current.x;
    if (Math.abs(touch.clientY - swipe.current.y) > Math.abs(deltaX) && deltaX < 20) { swipe.current = null; setDx(0); return; }
    setDx(Math.max(0, deltaX));
  };
  const onTouchEnd = () => {
    if (!swipe.current) return;
    swipe.current = null;
    if (dx > 90) onBack();
    setDx(0);
  };

  return (
    <div
      className={`m-page${withDock ? " m-page--with-dock" : ""}`}
      role="dialog"
      aria-label={title}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={dx ? { transform: `translateX(${dx}px)`, transition: "none" } : undefined}
    >
      <TopBar title={title} onBack={onBack} right={right} />
      <div className="m-screen">{children}</div>
    </div>
  );
}

export function Group({ title, footer, children }) {
  return (
    <section style={{ marginBottom: 6 }}>
      {title && <h2 className="m-section-title">{title}</h2>}
      <div className="m-group">{children}</div>
      {footer && <p className="m-muted" style={{ margin: "8px 16px 0" }}>{footer}</p>}
    </section>
  );
}

export function Row({ icon, color, label, detail, onClick, href, chevron = Boolean(onClick), trailing = null, danger = false }) {
  const content = (
    <>
      {icon && <span className="m-row-icon" style={{ background: color || "var(--m-tint)" }}>{icon}</span>}
      <span className="m-row-main">
        <span className="m-row-label" style={danger ? { color: "var(--m-red)" } : undefined}>{label}</span>
        {detail && <span className="m-row-detail" style={{ display: "block" }}>{detail}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRight size={18} className="m-row-chevron" aria-hidden="true" />}
    </>
  );
  if (href) return <a className="m-row" href={href}>{content}</a>;
  if (onClick) return <button type="button" className="m-row" onClick={onClick}>{content}</button>;
  return <div className="m-row" style={{ cursor: "default" }}>{content}</div>;
}

// Press and hold to confirm; releasing early cancels. Used for SOS so it cannot
// be triggered by an accidental tap.
export function HoldButton({ onComplete, duration = 1500, disabled = false, children, label }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef(null);
  const start = useRef(null);

  const stop = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    start.current = null;
    setProgress(0);
  };

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  const begin = event => {
    if (disabled) return;
    event.preventDefault();
    start.current = performance.now();
    const tick = now => {
      const value = Math.min(1, (now - start.current) / duration);
      setProgress(value);
      if (value >= 1) {
        frame.current = null;
        start.current = null;
        setProgress(0);
        onComplete();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const circumference = 2 * Math.PI * 118;
  return (
    <button
      type="button"
      className="m-hold"
      aria-label={label}
      disabled={disabled}
      data-holding={progress > 0}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={event => event.preventDefault()}
    >
      <span className="m-hold-pulse" aria-hidden="true" />
      <svg className="m-hold-ring" viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r="118" fill="none" stroke="rgba(217,45,32,.18)" strokeWidth="4" />
        <circle cx="120" cy="120" r="118" fill="none" stroke="#D92D20" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
      </svg>
      {children}
    </button>
  );
}

export function StatusSteps({ steps, labels, current }) {
  const index = steps.indexOf(current);
  const columns = { gridTemplateColumns: `repeat(${steps.length}, 1fr)` };
  return (
    <div className="m-steps" aria-label="Progress">
      <div className="m-steps-bars" style={columns}>
        {steps.map((step, i) => <span key={step} className="m-step-bar" data-done={i < index} data-current={i === index} />)}
      </div>
      <div className="m-steps-labels" style={columns}>
        {steps.map((step, i) => <span key={step} data-current={i === index}>{labels[step] || step}</span>)}
      </div>
    </div>
  );
}

export function Toasts({ items, onDismiss }) {
  if (!items.length) return null;
  return (
    <div className="m-toasts" aria-live="assertive">
      {items.map(item => (
        <div key={item.id} className="m-toast m-glass" role="alert">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: item.urgent ? "var(--m-red)" : "var(--m-text)" }}>{item.title}</div>
            <div style={{ fontSize: 14, color: "var(--m-text-2)", marginTop: 2 }}>{item.body}</div>
            {item.action && <button type="button" className="m-btn m-btn--small m-btn--tinted" style={{ marginTop: 8 }} onClick={() => { item.action.onClick(); onDismiss(item.id); }}>{item.action.label}</button>}
          </div>
          <button type="button" className="m-icon-btn" style={{ width: 32, height: 32 }} onClick={() => onDismiss(item.id)} aria-label="Dismiss"><X size={18} aria-hidden="true" /></button>
        </div>
      ))}
    </div>
  );
}
