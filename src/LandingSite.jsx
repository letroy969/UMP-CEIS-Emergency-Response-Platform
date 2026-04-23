import { useState, useEffect, useRef } from "react";
import {
  LOGO, NAVY, NAVY2, NAVY3, NAVYL,
  RED, REDL, ORANGE, ORANGEL, GREEN, GREENL,
  GOLD, GOLDL, WHITE, PAPER, PAPER2, BD, NK, SL, MID,
  SYMPTOM_DATA, classifyRisk,
} from "./constants.js";

/* ── SCROLL REVEAL ───────────────────────────────────────────── */
function useReveal(t = 0.1) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: t });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}
function Reveal({ children, delay = 0, y = 20, style = {} }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity .65s ease ${delay}s, transform .65s ease ${delay}s`,
      ...style
    }}>{children}</div>
  );
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── ICONS ───────────────────────────────────────────────────── */
function IShield()    { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 1.5L2.5 4.5v5c0 4 2.8 7.7 6.5 8.8C12.7 17.2 15.5 13.5 15.5 9.5v-5L9 1.5Z" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round"/><path d="M6.5 9l2 2 3.5-3.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/></svg> }
function IBrain()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M6 2.5C4 2.5 2.5 4 2.5 6c0 .9.3 1.7.8 2.3-.5.6-.8 1.3-.8 2.2 0 2 1.5 3.5 3.5 3.5h5c2 0 3.5-1.5 3.5-3.5 0-.9-.3-1.6-.8-2.2C14.2 7.7 14.5 7 14.5 6c0-2-1.5-3.5-3.5-3.5-.6 0-1.1.15-1.5.4C9.1 2.65 8.5 2.5 6 2.5Z" stroke="currentColor" strokeWidth={1.3}/><path d="M9 6v4M9 12v.3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }
function ILocation()  { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 1.5C6.5 1.5 4.5 3.5 4.5 6c0 3.8 4.5 10.5 4.5 10.5s4.5-6.7 4.5-10.5c0-2.5-2-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth={1.3}/><circle cx={9} cy={6} r={1.8} stroke="currentColor" strokeWidth={1.2}/></svg> }
function IChart()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><rect x={1.5} y={9} width={3.5} height={7.5} rx={1} stroke="currentColor" strokeWidth={1.3}/><rect x={7} y={5.5} width={3.5} height={11} rx={1} stroke="currentColor" strokeWidth={1.3}/><rect x={12.5} y={1.5} width={3.5} height={15} rx={1} stroke="currentColor" strokeWidth={1.3}/></svg> }
function ISOS()       { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><circle cx={9} cy={9} r={7} stroke="currentColor" strokeWidth={1.4}/><path d="M9 6v4.5M9 12.5v.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"/></svg> }
function IAI()        { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><rect x={2} y={2} width={14} height={14} rx={2.5} stroke="currentColor" strokeWidth={1.3}/><path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/><circle cx={9} cy={9} r={1.8} stroke="currentColor" strokeWidth={1.1}/></svg> }
function IShare()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><circle cx={3.5} cy={9} r={1.8} stroke="currentColor" strokeWidth={1.3}/><circle cx={14.5} cy={3.5} r={1.8} stroke="currentColor" strokeWidth={1.3}/><circle cx={14.5} cy={14.5} r={1.8} stroke="currentColor" strokeWidth={1.3}/><path d="M5.2 8l7.5-3.8M5.2 10l7.5 3.8" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"/></svg> }
function IAlert()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 1.5L1.5 16.5h15L9 1.5Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round"/><path d="M9 7.5v4M9 13.5v.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }
function IAid()       { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><rect x={1.5} y={1.5} width={15} height={15} rx={2.5} stroke="currentColor" strokeWidth={1.3}/><path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"/></svg> }
function IAnalytics() { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M2.5 13.5l4-5 3.5 2.5 4-5.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round"/><circle cx={15} cy={5} r={1.5} fill="currentColor"/></svg> }
function IPhone()     { return <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><path d="M2 2h3l1.2 3-1.5.9c.75 1.7 2.1 3.05 3.8 3.8L9.4 8.5 12.5 10v2.5C6.5 12.5 2.5 8.5 2 2Z" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round"/></svg> }
function IMail()      { return <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><rect x={1} y={3} width={13} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.2}/><path d="M1 5l6.5 4.5L14 5" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round"/></svg> }
function IHotline()   { return <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx={7.5} cy={7.5} r={5.5} stroke="currentColor" strokeWidth={1.2}/><path d="M7.5 5v3.5M7.5 11v.3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }
function IBot()       { return <svg width={20} height={20} viewBox="0 0 20 20" fill="none"><rect x={2} y={7} width={16} height={10} rx={3} stroke="currentColor" strokeWidth={1.4}/><circle cx={7} cy={12} r={1.4} fill="currentColor"/><circle cx={13} cy={12} r={1.4} fill="currentColor"/><path d="M7 7V5M13 7V5M7 5h6" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/><path d="M6 17v2M14 17v2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }
function ISend()      { return <svg width={14} height={14} viewBox="0 0 14 14" fill="none"><path d="M12.5 1.5L1.5 6l4.5 2 2 4.5 4.5-11Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round"/></svg> }
function IClose()     { return <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"/></svg> }
function IArrowR()    { return <svg width={13} height={13} viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M8 3l3 3.5-3 3.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ICheck()     { return <svg width={8} height={8} viewBox="0 0 8 8" fill="none"><path d="M1 4l2.5 2.5L7 1" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/></svg> }

function IHospital()  { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><rect x={1.5} y={3} width={15} height={13.5} rx={1.5} stroke="currentColor" strokeWidth={1.3}/><path d="M9 6.5v5M6.5 9h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/><path d="M5.5 3V1.5M12.5 3V1.5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"/></svg> }
function IHeart()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 15S2 10.5 2 6c0-2.2 1.8-4 4-4 1.2 0 2.3.5 3 1.4C9.7 2.5 10.8 2 12 2c2.2 0 4 1.8 4 4 0 4.5-7 9-7 9Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round"/></svg> }
function IPulse()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M1.5 9h3l2-5.5 3 11 2.5-7 1.5 3 2 0h1.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/></svg> }
function IUser()      { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><circle cx={9} cy={6} r={3.5} stroke="currentColor" strokeWidth={1.3}/><path d="M2.5 16c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }
function IContacts()  { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><rect x={2.5} y={2} width={13} height={14} rx={2} stroke="currentColor" strokeWidth={1.3}/><path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"/><circle cx={9} cy={5} r={1.2} fill="currentColor"/></svg> }
function IFlame()     { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 2c0 0-5 4-5 8a5 5 0 0010 0c0-2-1-3.5-2.5-5C11 7 10 9 9 9c0 0 .5-4-0-7Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round"/></svg> }
function IDroplet()   { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 2L5 9a4 4 0 008 0L9 2Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round"/></svg> }
function ILung()      { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M9 2v7M6 9C4 9 2 10.5 2 13c0 2 1.5 3 3 3 2 0 4-1 4-4V9M12 9c2 0 4 1.5 4 4 0 2-1.5 3-3 3-2 0-4-1-4-4V9" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }
function IMap()       { return <svg width={18} height={18} viewBox="0 0 18 18" fill="none"><path d="M1.5 3.5l5 2 5-2 5 2v11l-5-2-5 2-5-2V3.5Z" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round"/><path d="M6.5 5.5v10M11.5 3.5v10" stroke="currentColor" strokeWidth={1.1}/></svg> }
function IClock()     { return <svg width={16} height={16} viewBox="0 0 16 16" fill="none"><circle cx={8} cy={8} r={6.5} stroke="currentColor" strokeWidth={1.2}/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"/></svg> }
function IStar()      { return <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor"><path d="M7 1l1.5 4H13l-3.5 2.5 1.3 4L7 9l-3.8 2.5 1.3-4L1 5h4.5L7 1Z"/></svg> }
function IWarning()   { return <svg width={16} height={16} viewBox="0 0 16 16" fill="none"><path d="M8 1L1 14h14L8 1Z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round"/><path d="M8 6.5v3.5M8 12v.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg> }

function IChev({ dir = "right" }) {
  const r = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ transform: `rotate(${r}deg)` }}><path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/* ── LABEL CHIP ──────────────────────────────────────────────── */
function Chip({ label, c = NAVY, bg, bd }) {
  return (
    <div style={{ display: "inline-block", background: bg || `${c}12`, border: `1px solid ${bd || c + "28"}`, borderRadius: 3, padding: "3px 11px", marginBottom: 16 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: c, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>{label}</span>
    </div>
  );
}

/* ── MODAL ───────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,12,32,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", animation: "fadeIn .15s ease", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 12, width: 580, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,0.3)", animation: "slideUp .22s ease", border: `1px solid ${BD}` }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: NAVY, borderRadius: "12px 12px 0 0" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif" }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 5, cursor: "pointer", padding: "4px 6px", color: WHITE, display: "flex" }}><IClose /></button>
        </div>
        <div style={{ padding: "24px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ── SECTION HEADER ──────────────────────────────────────────── */
function SectionHead({ chip, chipColor, title, titleHighlight, sub, center = true }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: 52 }}>
      {chip && <Chip label={chip} c={chipColor || NAVY} />}
      <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(22px,2.6vw,32px)", fontWeight: 700, color: NK, letterSpacing: -0.4, lineHeight: 1.25, marginBottom: 14 }}>
        {title}{titleHighlight && <><br /><span style={{ color: chipColor || NAVY }}>{titleHighlight}</span></>}
      </h2>
      {sub && <p style={{ fontSize: 14.5, color: SL, maxWidth: center ? 520 : "100%", margin: center ? "0 auto" : 0, lineHeight: 1.85, fontFamily: "'IBM Plex Sans',sans-serif" }}>{sub}</p>}
    </div>
  );
}

/* ── NAVBAR ──────────────────────────────────────────────────── */
function Navbar({ setPage }) {
  const [sc, setSc] = useState(false);
  useEffect(() => {
    const h = () => setSc(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: sc ? `rgba(20,32,90,0.97)` : "transparent", borderBottom: sc ? `1px solid rgba(255,255,255,0.08)` : "none", backdropFilter: sc ? "blur(16px)" : "none", transition: "all .3s ease" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 5%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo — lives naturally on navy at all scroll positions */}
        <button onClick={() => scrollTo("hero")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 0 }}>
          <img src={LOGO} alt="University of Mpumalanga" style={{ height: 44, objectFit: "contain", mixBlendMode: "lighten" }} />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: WHITE, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.1 }}>UMP-CEIS</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 0.8, fontFamily: "'IBM Plex Sans',sans-serif", marginTop: 2 }}>Emergency Intelligence System</div>
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[["Overview","hero"],["Features","features"],["How It Works","how-it-works"],["Contact","contact"]].map(([l, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.72)", fontWeight: 500, fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.3, transition: "color .2s", padding: "4px 0" }}
              onMouseEnter={e => e.currentTarget.style.color = WHITE}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.72)"}>
              {l}
            </button>
          ))}
          <button onClick={() => setPage("firstaid")} style={{ background: "none", border: `1px solid rgba(255,255,255,0.22)`, borderRadius: 4, cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.3, padding: "7px 14px", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}>
            First Aid
          </button>
          <button onClick={() => setPage("triage")} style={{ background: "none", border: `1px solid ${ORANGE}88`, borderRadius: 4, cursor: "pointer", fontSize: 12, color: ORANGE, fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.3, padding: "7px 14px", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = `${ORANGE}18`; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
            Symptom Triage
          <button
  onClick={onAccessSystem}
  style={{
    padding: "8px 20px",
    background: RED,
    color: WHITE,
    borderRadius: 4,
    fontSize: 12.5,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    letterSpacing: 0.5,
    fontFamily: "'IBM Plex Sans',sans-serif",
    transition: "background .2s",
    textTransform: "uppercase"
  }}
  onMouseEnter={e => e.currentTarget.style.background = "#A02810"}
  onMouseLeave={e => e.currentTarget.style.background = RED}
>
  Access System
</button>
        </div>
      </div>
    </nav>
  );
}

/* ── HERO ────────────────────────────────────────────────────── */
function Hero({ setPage }) {
  return (
    <section id="hero" style={{ background: `linear-gradient(160deg, ${NAVY3} 0%, ${NAVY} 45%, ${NAVYL} 100%)`, padding: "0 5%", position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", alignItems: "center" }}>

      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${RED} 0%, ${ORANGE} 60%, transparent 100%)` }} />

      {/* Gold accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: GOLD }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", padding: "100px 0 80px", position: "relative", zIndex: 1 }}>

        {/* Left column */}
        <div>
          <Reveal delay={0}>
            <img src={LOGO} alt="University of Mpumalanga" style={{ height: 62, objectFit: "contain", marginBottom: 28, mixBlendMode: "lighten" }} />
          </Reveal>
          <Reveal delay={0.1}>
            {/* Red accent rule — signals this is an emergency system */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 3, height: 28, background: RED, borderRadius: 2 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>Official Campus Emergency Platform</span>
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <h1 style={{ fontFamily: "'IBM Plex Serif',Georgia,serif", fontSize: "clamp(28px,3.8vw,50px)", fontWeight: 700, color: WHITE, lineHeight: 1.12, letterSpacing: -0.8, marginBottom: 10 }}>
              Campus Emergency<br />
              <span style={{ color: GOLD }}>Intelligence System</span>
            </h1>
          </Reveal>
          <Reveal delay={0.24}>
  {/* Orange accent — signals this is a safe, approachable system */}
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
    <div style={{ width: 22, height: 2, background: ORANGE, borderRadius: 1 }} />
    <p
      style={{
        fontSize: 13.5,
        color: "rgba(255,255,255,0.75)",
        fontFamily: "'IBM Plex Sans',sans-serif",
        letterSpacing: 0.2
      }}
    >
      Integrated Safety &amp; Emergency Response Platform
    </p>
  </div>
</Reveal>

<Reveal delay={0.3}>
  <p
    style={{
      fontSize: 14.5,
      color: "rgba(255,255,255,0.6)",
      lineHeight: 1.85,
      marginBottom: 36,
      maxWidth: 480,
      fontFamily: "'IBM Plex Sans',sans-serif"
    }}
  >
    A real-time emergency detection and response system built exclusively for UMP — integrating mobile reporting, automated incident triage, and a live command dashboard to protect every member of the university community.
  </p>
</Reveal>

<Reveal delay={0.36}>
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
    
    <button
      onClick={() => scrollTo("how-it-works")}
      style={{
        padding: "12px 24px",
        background: "transparent",
        color: WHITE,
        border: `1.5px solid rgba(255,255,255,0.35)`,
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "'IBM Plex Sans',sans-serif",
        letterSpacing: 0.3,
        transition: "all .2s"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = WHITE;
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      Learn How It Works
    </button>

    {/* Red CTA — emergency action colour signals urgency/authority */}
    <button
      onClick={onAccessSystem}
      style={{
        padding: "12px 24px",
        background: RED,
        color: WHITE,
        border: `1.5px solid ${RED}`,
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "'IBM Plex Sans',sans-serif",
        letterSpacing: 0.4,
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "background .2s",
        textTransform: "uppercase"
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#A02810")}
      onMouseLeave={e => (e.currentTarget.style.background = RED)}
    >
      Access System <IArrowR />
    </button>

  </div>
</Reveal>
          <Reveal delay={0.44}>
            <div style={{ display: "flex", gap: 0, marginTop: 40, paddingTop: 30, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
              {[["Real-Time","Emergency Detection"],["Instant","Alert Dispatch"],["24 / 7","Campus Coverage"]].map(([a, b], i) => (
                <div key={a} style={{ flex: 1, paddingRight: 18, borderRight: i < 2 ? `1px solid rgba(255,255,255,0.1)` : "none", paddingLeft: i > 0 ? 18 : 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: GOLD, fontFamily: "'IBM Plex Serif',serif", letterSpacing: -0.3 }}>{a}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.42)", marginTop: 3, fontFamily: "'IBM Plex Sans',sans-serif" }}>{b}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right — mock dashboard — navy header matches hero perfectly */}
        <Reveal delay={0.22} y={40}>
          <div style={{ position: "relative" }}>
            <div style={{ background: WHITE, borderRadius: 12, border: `1px solid rgba(255,255,255,0.1)`, boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.2)`, overflow: "hidden" }}>
              {/* Dashboard header — same navy as hero, logo looks identical */}
              <div style={{ background: NAVY3, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${RED}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={LOGO} alt="UMP" style={{ height: 24, objectFit: "contain", mixBlendMode: "lighten" }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>UMP-CEIS · Command Centre</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>14:32:07</span>
                </div>
              </div>
              {/* Red crisis strip — purposeful emergency red */}
              <div style={{ background: `${RED}12`, borderBottom: `1px solid ${RED}28`, padding: "6px 16px", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: RED }} />
                <span style={{ fontSize: 10, color: RED, fontWeight: 700, letterSpacing: 0.8, fontFamily: "'IBM Plex Sans',sans-serif" }}>3 ACTIVE INCIDENTS — RESPONDERS DEPLOYED</span>
              </div>
              <div style={{ padding: "14px 16px", background: PAPER }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
                  {[["Active Incidents","3",RED],["Responders","9",NAVY],["Response Time","4.2m",GREEN],["Alerts Sent","17",ORANGE]].map(([l, v, c]) => (
                    <div key={l} style={{ background: WHITE, borderRadius: 6, padding: "10px 12px", border: `1px solid ${BD}`, borderLeft: `3px solid ${c}` }}>
                      <div style={{ fontSize: 8.5, color: MID, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontFamily: "'IBM Plex Sans',sans-serif" }}>{l}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c, lineHeight: 1, fontFamily: "'IBM Plex Serif',serif" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {[["Medical Emergency","Hartley Hall","Active",RED],["Fire Alarm","Science Complex B","Escalated",ORANGE],["Panic Alert","Main Library","Active",RED]].map(([t, z, s, c]) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: WHITE, borderRadius: 5, marginBottom: 5, border: `1px solid ${BD}`, borderLeft: `2px solid ${c}` }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: NK, fontFamily: "'IBM Plex Sans',sans-serif" }}>{t}</div>
                      <div style={{ fontSize: 9.5, color: MID, fontFamily: "'IBM Plex Sans',sans-serif" }}>{z}</div>
                    </div>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: c, background: `${c}12`, border: `1px solid ${c}28`, borderRadius: 3, padding: "2px 7px", fontFamily: "'IBM Plex Sans',sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Trust badge — navy signals authority */}
            <div style={{ position: "absolute", top: -12, right: -12, background: NAVY3, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: WHITE, fontFamily: "'IBM Plex Sans',sans-serif" }}>System Operational</span>
            </div>
            {/* Coverage badge — gold accent from shield */}
            <div style={{ position: "absolute", bottom: -12, left: -12, background: NAVY, borderRadius: 8, padding: "9px 14px", boxShadow: `0 6px 24px rgba(26,39,102,0.4)`, border: `1px solid rgba(255,255,255,0.1)` }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, fontFamily: "'IBM Plex Sans',sans-serif" }}>Campus Coverage</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: GOLD, fontFamily: "'IBM Plex Serif',serif" }}>100%</div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Bottom fade into first section */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(transparent, ${PAPER})`, pointerEvents: "none" }} />
    </section>
  );
}

/* ── WHAT IS IT ──────────────────────────────────────────────── */
function WhatIsIt() {
  return (
    <section id="what-is-it" style={{ padding: "96px 5%", background: PAPER }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <Reveal>
          {/* Navy left accent bar — trust/authority */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{ width: 3, height: 60, background: `linear-gradient(${NAVY}, ${ORANGE})`, borderRadius: 2, flexShrink: 0, marginTop: 4 }} />
            <div>
              <Chip label="What Is UMP-CEIS?" />
              <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(22px,2.6vw,32px)", fontWeight: 700, color: NK, lineHeight: 1.25, letterSpacing: -0.4 }}>
                Intelligent Safety,<br /><span style={{ color: NAVY }}>Engineered for UMP</span>
              </h2>
            </div>
          </div>
          <p style={{ fontSize: 14.5, color: SL, lineHeight: 1.9, marginBottom: 18, fontFamily: "'IBM Plex Sans',sans-serif" }}>UMP-CEIS is an integrated emergency response and safety platform designed exclusively for the University of Mpumalanga. It delivers a comprehensive, technology-driven framework for detecting, classifying, and responding to campus emergencies in real time.</p>
          <p style={{ fontSize: 14.5, color: SL, lineHeight: 1.9, marginBottom: 28, fontFamily: "'IBM Plex Sans',sans-serif" }}>
            The system integrates a <strong style={{ color: NK }}>mobile reporting application</strong>, a <strong style={{ color: NK }}>live command dashboard</strong>, and an <strong style={{ color: NK }}>AI intelligence engine</strong> — all unified on a single platform.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["Mobile Reporting",NAVY],["AI Triage",GREEN],["Live Dashboard",RED],["Campus Alerts",ORANGE]].map(([t, c]) => (
              <span key={t} style={{ padding: "5px 12px", background: `${c}0e`, border: `1px solid ${c}25`, borderRadius: 3, fontSize: 12, fontWeight: 600, color: c, fontFamily: "'IBM Plex Sans',sans-serif" }}>{t}</span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.14}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: <IShield />, title: "Real-Time Detection", desc: "Emergencies classified the moment they are reported.", c: NAVY },
              { icon: <IBrain />, title: "Priority Triage", desc: "Severity-scored incident classification for immediate, prioritised dispatch.", c: GREEN },
              { icon: <ILocation />, title: "Location Intelligence", desc: "Precise GPS routing to affected campus zones.", c: ORANGE },
              { icon: <IChart />, title: "Safety Analytics", desc: "Data intelligence to continuously improve safety protocols.", c: GOLD },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.07}>
                <div style={{ background: WHITE, borderRadius: 8, padding: "18px 16px", border: `1px solid ${BD}`, borderTop: `3px solid ${card.c}`, cursor: "default", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 32px ${card.c}18`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ width: 36, height: 36, borderRadius: 7, background: `${card.c}10`, border: `1px solid ${card.c}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 11, color: card.c }}>{card.icon}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: NK, marginBottom: 5, fontFamily: "'IBM Plex Serif',serif" }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: MID, lineHeight: 1.65, fontFamily: "'IBM Plex Sans',sans-serif" }}>{card.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── FEATURES ────────────────────────────────────────────────── */
function Features() {
  const [modal, setModal] = useState(null);
  const features = [
    { Icon: ISOS, title: "Smart SOS Activation", tag: "Emergency Response", desc: "One-tap SOS automatically logs time, identity, and GPS coordinates and dispatches the nearest available officer.", more: "The SOS system uses a three-second hold to prevent accidental activation. Once triggered, it simultaneously notifies the command centre, dispatches the nearest available officer, and initiates incident classification. All alerts are timestamped to a permanent incident record.", c: RED },
    { Icon: IAI, title: "Intelligent Incident Triage", tag: "Response Prioritisation", desc: "Incidents are classified by severity within seconds, assigning priority codes that guide the appropriate response and deployment.", more: "The triage module applies a structured severity scale — P1 (immediate), P2 (urgent), P3 (non-urgent) — reducing cognitive load on dispatchers during high-volume events. All classifications are logged to a permanent incident record.", c: NAVY },
    { Icon: IShare, title: "Live Location Sharing", tag: "Geospatial", desc: "GPS coordinates transmitted in real time to the command dashboard — responders navigate directly to the incident.", more: "Location data updates every 5 seconds during an active incident. The command dashboard displays live maps with all active incidents, officer positions, and route overlays. Sharing continues until the incident is marked resolved.", c: NAVY },
    { Icon: IAlert, title: "Campus-Wide Alerts", tag: "Communications", desc: "Broadcast emergency notifications via SMS, push, and PA system to ensure all affected parties receive timely warnings.", more: "Alerts can be scoped to specific zones, buildings, or the full campus. Delivery receipts are tracked and logged for post-incident review and compliance reporting.", c: ORANGE },
    { Icon: IAid, title: "First-Aid Guidance", tag: "Medical Support", desc: "AI-guided first-aid instructions provide immediate step-by-step support while responders are in transit.", more: "Covers 18 emergency categories including cardiac events, anaphylaxis, burns, trauma, and seizures. All instructions reviewed by registered medical professionals and written to a Grade 8 literacy level.", c: GREEN },
    { Icon: IAnalytics, title: "Emergency Analytics", tag: "Command Intelligence", desc: "Live operations dashboard giving security leadership full visibility into incident trends and response performance.", more: "Real-time and historical views of incident volume, type distribution, response times, officer deployment, and alert delivery. Monthly reports auto-generated and exportable as PDF or XLSX.", c: GOLD },
  ];
  return (
    <section id="features" style={{ padding: "96px 5%", background: PAPER2, borderTop: `1px solid ${BD}`, borderBottom: `1px solid ${BD}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 52 }}>
          <SectionHead chip="System Capabilities" title="What Does UMP-CEIS Do?" sub="A fully integrated emergency management ecosystem — from the moment an incident is reported to full resolution, every step is intelligent and traceable." />
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div style={{ background: WHITE, borderRadius: 8, padding: "22px 18px", border: `1px solid ${BD}`, borderLeft: `3px solid ${f.c}`, height: "100%", display: "flex", flexDirection: "column", transition: "all .2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 10px 36px ${f.c}18`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: f.c, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", background: `${f.c}0e`, border: `1px solid ${f.c}20`, borderRadius: 3, padding: "2px 8px" }}>{f.tag}</span>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 7, background: `${f.c}0e`, border: `1px solid ${f.c}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: f.c }}><f.Icon /></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NK, marginBottom: 7, fontFamily: "'IBM Plex Serif',serif" }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: SL, lineHeight: 1.78, fontFamily: "'IBM Plex Sans',sans-serif", flex: 1, marginBottom: 14 }}>{f.desc}</div>
                <button onClick={() => setModal(f)} style={{ background: "none", border: `1px solid ${BD}`, borderRadius: 4, padding: "6px 14px", fontSize: 11.5, color: NAVY, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start" }}
                  onMouseEnter={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = WHITE; e.currentTarget.style.borderColor = NAVY; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = NAVY; e.currentTarget.style.borderColor = BD; }}>
                  Learn More <IChev />
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.title || ""}>
        {modal && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: modal.c, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", background: `${modal.c}0e`, border: `1px solid ${modal.c}20`, borderRadius: 3, padding: "2px 8px", display: "inline-block", marginBottom: 16 }}>{modal.tag}</span>
            <p style={{ fontSize: 14, color: SL, lineHeight: 1.88, fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 14 }}>{modal.desc}</p>
            <div style={{ height: 1, background: BD, marginBottom: 14 }} />
            <p style={{ fontSize: 14, color: SL, lineHeight: 1.88, fontFamily: "'IBM Plex Sans',sans-serif" }}>{modal.more}</p>
          </div>
        )}
      </Modal>
    </section>
  );
}

/* ── WHO IS IT FOR ───────────────────────────────────────────── */
function WhoFor() {
  const [modal, setModal] = useState(null);
  const cols = [
    { Icon: () => <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><circle cx={12} cy={8} r={3.5} stroke="currentColor" strokeWidth={1.4}/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"/></svg>, title: "Students & Staff", tag: "Primary Reporters", accent: NAVY, items: ["Report emergencies via one-tap SOS","Receive real-time campus safety alerts","Access guided first-aid instructions","Track responder arrival in real time"], detail: "All registered UMP students and staff members have access to the mobile application. Upon login with university credentials, users can immediately trigger SOS alerts, report symptoms, or access the first-aid guide. Push notifications deliver campus-wide alerts and safety advisories in real time." },
    { Icon: () => <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5.5v6c0 5.5 3.6 10.5 8 12 4.4-1.5 8-6.5 8-12v-6L12 2Z" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round"/><path d="M9 12l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Security & Medical", tag: "First Responders", accent: RED, items: ["Receive instant alerts with GPS location","Manage incidents from the command dashboard","Track and update incident status live","Communicate directly via the platform"], detail: "Campus security officers and medical staff access the full command dashboard on desktop and mobile. Upon alert, responders see incident type, GPS location, AI severity score, and reporter details. Incidents can be accepted, escalated, or resolved — all tracked in a live audit trail." },
    { Icon: () => <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><rect x={3} y={3} width={18} height={18} rx={2.5} stroke="currentColor" strokeWidth={1.4}/><path d="M7 9h10M7 12.5h6.5M7 16h4" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"/></svg>, title: "University Administration", tag: "Command & Control", accent: ORANGE, items: ["Monitor all incidents in real time","Access safety analytics and reporting","Configure alert protocols and channels","Review full audit trails and logs"], detail: "University administration and security leadership access a read-only command view and a full analytics dashboard. Administrators can configure alert broadcast rules, manage user permissions, review incident histories, and export compliance reports for institutional governance." },
  ];
  return (
    <section id="who-for" style={{ padding: "96px 5%", background: PAPER, borderBottom: `1px solid ${BD}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 52 }}>
          <SectionHead chip="Who Is It For?" title="Designed for Every Role" titleHighlight="on Campus" sub="Three distinct user groups, each with a purpose-built experience within UMP-CEIS." />
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {cols.map((col, i) => (
            <Reveal key={col.title} delay={i * 0.1}>
              <div style={{ background: WHITE, borderRadius: 10, border: `1px solid ${BD}`, overflow: "hidden", height: "100%", transition: "box-shadow .2s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 12px 40px ${col.accent}18`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                {/* Coloured header — navy=trust, red=security/urgency, orange=administration warmth */}
                <div style={{ background: col.accent, padding: "22px 22px 18px", position: "relative", overflow: "hidden" }}>
                  <svg style={{ position: "absolute", right: -20, top: -20, opacity: 0.08 }} width={120} height={120} viewBox="0 0 120 120">
                    <circle cx={60} cy={60} r={55} stroke={WHITE} strokeWidth={0.8} fill="none" />
                    <circle cx={60} cy={60} r={40} stroke={WHITE} strokeWidth={0.8} fill="none" />
                  </svg>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, color: WHITE }}><col.Icon /></div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.58)", letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5, fontFamily: "'IBM Plex Sans',sans-serif" }}>{col.tag}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif" }}>{col.title}</div>
                </div>
                <div style={{ padding: "18px 22px 20px" }}>
                  {col.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: j < col.items.length - 1 ? 10 : 0 }}>
                      <div style={{ width: 15, height: 15, borderRadius: "50%", background: `${col.accent}10`, border: `1px solid ${col.accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, color: col.accent }}><ICheck /></div>
                      <span style={{ fontSize: 12.5, color: SL, lineHeight: 1.65, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item}</span>
                    </div>
                  ))}
                  <button onClick={() => setModal(col)} style={{ marginTop: 16, background: "none", border: `1px solid ${BD}`, borderRadius: 4, padding: "7px 14px", fontSize: 11.5, color: col.accent, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 5 }}
                    onMouseEnter={e => { e.currentTarget.style.background = col.accent; e.currentTarget.style.color = WHITE; e.currentTarget.style.borderColor = col.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = col.accent; e.currentTarget.style.borderColor = BD; }}>
                    View Details <IChev />
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.title || ""}>
        {modal && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: modal.accent, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", background: `${modal.accent}0e`, border: `1px solid ${modal.accent}20`, borderRadius: 3, padding: "2px 8px", display: "inline-block", marginBottom: 16 }}>{modal.tag}</span>
            <p style={{ fontSize: 14, color: SL, lineHeight: 1.88, fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 16 }}>{modal.detail}</p>
            <div style={{ height: 1, background: BD, marginBottom: 16 }} />
            {modal.items.map((item, j) => (
              <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${modal.accent}10`, border: `1px solid ${modal.accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, color: modal.accent }}><ICheck /></div>
                <span style={{ fontSize: 13.5, color: SL, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
}

/* ── PURPOSE ─────────────────────────────────────────────────── */
function Purpose() {
  return (
    <section style={{ padding: "80px 5%", background: `linear-gradient(140deg, ${NAVY3} 0%, ${NAVY} 55%, ${NAVY2} 100%)`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: GOLD }} />
      <svg style={{ position: "absolute", right: 0, top: 0, opacity: 0.04 }} width={500} height={320}>
        {[200, 150, 100, 60].map((r, i) => <circle key={i} cx={460} cy={40} r={r} stroke={WHITE} strokeWidth={0.7} fill="none" />)}
      </svg>
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <Reveal>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <img src={LOGO} alt="UMP" style={{ height: 36, filter: "brightness(0) invert(1)", opacity: 0.85 }} />
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)" }} />
            <Chip label="Our Purpose" c="rgba(255,255,255,0.6)" bg="rgba(255,255,255,0.06)" bd="rgba(255,255,255,0.12)" />
          </div>
          <blockquote style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(15px,2.1vw,20px)", fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.82, fontStyle: "italic", margin: "0 auto 36px", maxWidth: 760 }}>
            "To enhance safety, reduce emergency response time, and deliver intelligent emergency management within the University of Mpumalanga campus — powered by artificial intelligence and real-time technology."
          </blockquote>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            {[["↓ 60%","Response Time","#22c55e"],["100%","Campus Coverage",GOLD],["24/7","Monitoring",ORANGE],["<30s","SOS to Dispatch",RED]].map(([v, l, c], i, arr) => (
              <div key={l} style={{ textAlign: "center", padding: "0 28px", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "'IBM Plex Serif',serif", letterSpacing: -0.5 }}>{v}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 4, letterSpacing: 0.7, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ────────────────────────────────────────────── */
function HowItWorks() {
  const [active, setActive] = useState(0);
  const steps = [
    { title: "Open the Application", tag: "Step 01", desc: "Students and staff launch the UMP-CEIS mobile application on their registered device, authenticated via UMP university credentials. Available on iOS and Android.", note: "Available on iOS & Android", c: NAVY },
    { title: "Trigger SOS or Report", tag: "Step 02", desc: "Press the SOS button for immediate dispatch, or use the symptom reporter for medical situations. The system logs timestamp, user identity, GPS coordinates, and initiates incident classification automatically.", note: "Single-tap emergency activation", c: RED },
    { title: "Incident Is Classified", tag: "Step 03", desc: "The system automatically classifies the incident, assigns a priority code (P1/P2/P3), and determines the appropriate response type. Medical emergencies trigger guided first-aid instructions simultaneously.", note: "Sub-10 second classification", c: ORANGE },
    { title: "Location Shared Automatically", tag: "Step 04", desc: "GPS coordinates transmitted in real time to the command dashboard. Responders receive a live map with the precise incident location — eliminating all search-and-locate delays.", note: "Precise GPS dispatch routing", c: GREEN },
    { title: "Responders Dispatched", tag: "Step 05", desc: "Campus security and medical personnel receive an instant alert on the command dashboard and their mobile devices. The incident is tracked to full resolution with a complete audit timeline.", note: "Full lifecycle incident tracking", c: NAVY },
  ];
  return (
    <section id="how-it-works" style={{ padding: "96px 5%", background: PAPER2, borderTop: `1px solid ${BD}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 56 }}>
          <SectionHead chip="How It Works" title="From Emergency" titleHighlight="to Resolution" sub="Five intelligent steps engineered to minimise delay and maximise safety outcomes for the entire UMP community." />
        </Reveal>
        {/* Step indicators */}
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 36, position: "relative", paddingTop: 4 }}>
            <div style={{ position: "absolute", top: 20, left: "8%", right: "8%", height: 1, background: BD, zIndex: 0 }} />
            {steps.map((s, i) => (
              <div key={i} onClick={() => setActive(i)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", position: "relative", zIndex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: i < active ? NAVY : i === active ? s.c : WHITE, border: `2px solid ${i <= active ? (i === active ? s.c : NAVY) : BD}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .28s", boxShadow: i === active ? `0 0 0 5px ${s.c}18` : "none" }}>
                  {i < active
                    ? <svg width={13} height={13} viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <span style={{ fontSize: 12, fontWeight: 800, color: i === active ? WHITE : MID, fontFamily: "'IBM Plex Serif',serif" }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: i === active ? s.c : MID, textAlign: "center", maxWidth: 82, lineHeight: 1.32, transition: "color .28s", fontFamily: "'IBM Plex Sans',sans-serif" }}>{s.title}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal>
          <div style={{ background: WHITE, borderRadius: 10, border: `1px solid ${BD}`, borderLeft: `4px solid ${steps[active].c}`, padding: "34px 40px", boxShadow: `0 4px 24px ${steps[active].c}10`, transition: "border-color .3s, box-shadow .3s" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: steps[active].c, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10, fontFamily: "'IBM Plex Sans',sans-serif" }}>{steps[active].tag} of {steps.length}</div>
            <h3 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(18px,2vw,23px)", fontWeight: 700, color: NK, letterSpacing: -0.3, marginBottom: 14 }}>{steps[active].title}</h3>
            <p style={{ fontSize: 14.5, color: SL, lineHeight: 1.88, marginBottom: 20, maxWidth: 680, fontFamily: "'IBM Plex Sans',sans-serif" }}>{steps[active].desc}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${steps[active].c}0e`, border: `1px solid ${steps[active].c}22`, borderRadius: 4, padding: "5px 12px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: steps[active].c }} />
              <span style={{ fontSize: 12, color: steps[active].c, fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif" }}>{steps[active].note}</span>
            </div>
          </div>
        </Reveal>
        <Reveal style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 18 }}>
          <button onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0} style={{ padding: "9px 22px", background: WHITE, border: `1px solid ${BD}`, borderRadius: 4, color: SL, fontSize: 13, fontWeight: 500, cursor: active === 0 ? "not-allowed" : "pointer", opacity: active === 0 ? 0.36 : 1, fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .2s" }}>← Previous</button>
          <button onClick={() => setActive(Math.min(steps.length - 1, active + 1))} disabled={active === steps.length - 1} style={{ padding: "9px 22px", background: active === steps.length - 1 ? WHITE : NAVY, border: `1px solid ${active === steps.length - 1 ? BD : NAVY}`, borderRadius: 4, color: active === steps.length - 1 ? SL : WHITE, fontSize: 13, fontWeight: 600, cursor: active === steps.length - 1 ? "not-allowed" : "pointer", opacity: active === steps.length - 1 ? 0.36 : 1, fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .2s" }}>Next Step →</button>
        </Reveal>
      </div>
    </section>
  );
}


/* ── CHATBOT ─────────────────────────────────────────────────── */
function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "bot", text: "Hello. I am the UMP-CEIS Assistant. How can I help you today?", ts: "Now" }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  function send() {
    const txt = input.trim();
    if (!txt) return;
    const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setMsgs(p => [...p, { from: "user", text: txt, ts }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(p => [...p, { from: "bot", text: "Thank you for your message. This assistant is currently in demonstration mode. For emergencies, call the UMP security hotline immediately: +27 13 002 0099.", ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }]);
    }, 1800);
  }

  return (
    <>
      {!open && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 900 }}>
          <button onClick={() => setOpen(true)} style={{ width: 56, height: 56, borderRadius: "50%", background: NAVY, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 32px rgba(26,39,102,0.42)`, transition: "transform .2s, box-shadow .2s", position: "relative", color: WHITE }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = `0 12px 42px rgba(26,39,102,0.55)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 8px 32px rgba(26,39,102,0.42)`; }}>
            <IBot />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${NAVY}`, animation: "botPulse 2.2s ease-out infinite", opacity: 0.5 }} />
            <span style={{ position: "absolute", top: 5, right: 5, width: 11, height: 11, borderRadius: "50%", background: ORANGE, border: "2px solid white" }} />
          </button>
        </div>
      )}

      {open && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 1000, width: 356, animation: "slideUp .25s ease" }}>
          <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BD}`, boxShadow: "0 24px 80px rgba(10,16,38,0.25), 0 4px 20px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ background: NAVY, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0, color: WHITE }}>
                <IBot />
                <span style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9, borderRadius: "50%", background: "#22c55e", border: `2px solid ${NAVY}` }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif" }}>UMP-CEIS Assistant</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  Online · Demonstration mode
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, cursor: "pointer", padding: "5px 7px", color: "rgba(255,255,255,0.6)", display: "flex", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
                <IClose />
              </button>
            </div>
            <div style={{ background: ORANGEL, borderBottom: `1px solid ${ORANGE}22`, padding: "7px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ORANGE, marginTop: 4, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: ORANGE, fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.5 }}>For life-threatening emergencies, call <strong>+27 13 002 0099</strong> immediately.</span>
            </div>
            <div style={{ overflowY: "auto", padding: "14px 12px", maxHeight: 300, minHeight: 190, background: PAPER }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: 10, animation: "fadeIn .3s ease" }}>
                  {m.from === "bot" && (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 7, marginTop: 2, color: WHITE }}>
                      <svg width={12} height={12} viewBox="0 0 20 20" fill="none"><rect x={2} y={7} width={16} height={10} rx={3} stroke={WHITE} strokeWidth={1.5}/><circle cx={7} cy={12} r={1.3} fill={WHITE}/><circle cx={13} cy={12} r={1.3} fill={WHITE}/><path d="M7 7V5M13 7V5M7 5h6" stroke={WHITE} strokeWidth={1.3} strokeLinecap="round"/></svg>
                    </div>
                  )}
                  <div>
                    <div style={{ maxWidth: 216, padding: "9px 13px", borderRadius: m.from === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.from === "user" ? NAVY : WHITE, color: m.from === "user" ? WHITE : NK, fontSize: 13, lineHeight: 1.65, fontFamily: "'IBM Plex Sans',sans-serif", border: m.from === "bot" ? `1px solid ${BD}` : "none", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {m.text}
                    </div>
                    <div style={{ fontSize: 9, color: MID, marginTop: 3, textAlign: m.from === "user" ? "right" : "left", fontFamily: "monospace" }}>{m.ts}</div>
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: WHITE }}>
                    <svg width={12} height={12} viewBox="0 0 20 20" fill="none"><rect x={2} y={7} width={16} height={10} rx={3} stroke={WHITE} strokeWidth={1.5}/><circle cx={7} cy={12} r={1.3} fill={WHITE}/><circle cx={13} cy={12} r={1.3} fill={WHITE}/><path d="M7 7V5M13 7V5M7 5h6" stroke={WHITE} strokeWidth={1.3} strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: "12px 12px 12px 2px", padding: "10px 13px", display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: MID, display: "inline-block", animation: `dotBounce 1.2s ease ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div style={{ padding: "8px 10px", background: WHITE, borderTop: `1px solid ${BD}`, display: "flex", gap: 6, overflowX: "auto" }}>
              {["What is UMP-CEIS?", "How do I report?", "Emergency contact"].map(s => (
                <button key={s} onClick={() => setInput(s)} style={{ padding: "4px 10px", borderRadius: 12, border: `1px solid ${BD}`, background: PAPER, color: NAVY, fontSize: 10.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .15s", flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = WHITE; e.currentTarget.style.borderColor = NAVY; }}
                  onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = NAVY; e.currentTarget.style.borderColor = BD; }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ padding: "10px 11px", background: WHITE, borderTop: `1px solid ${BD}`, display: "flex", gap: 7, alignItems: "flex-end" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type your message…" rows={1} style={{ flex: 1, border: `1px solid ${BD}`, borderRadius: 7, padding: "9px 11px", fontSize: 13, fontFamily: "'IBM Plex Sans',sans-serif", color: NK, background: PAPER, resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 76, overflowY: "auto", transition: "border-color .2s" }}
                onFocus={e => e.target.style.borderColor = NAVY}
                onBlur={e => e.target.style.borderColor = BD} />
              <button onClick={send} disabled={!input.trim()} style={{ width: 36, height: 36, borderRadius: 7, background: input.trim() ? NAVY : BD, border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s", flexShrink: 0, color: WHITE }}>
                <ISend />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── CONTACT ─────────────────────────────────────────────────── */
function Contact() {
  const members = [
    { name: "Mawelela, PC", num: "222486686" },
    { name: "Chaka, Loidy", num: "222035544" },
    { name: "Sihle, Dladla", num: "230021646" },
    { name: "Praise, Mgiba", num: "222203684" },
  ];
  return (
    <section id="contact" style={{ padding: "96px 5%", background: PAPER, borderTop: `1px solid ${BD}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
          {/* Contact */}
          <Reveal>
            <Chip label="Emergency Contacts" c={RED} bg={`${RED}0a`} bd={`${RED}22`} />
            <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(20px,2.5vw,30px)", fontWeight: 700, color: NK, letterSpacing: -0.4, marginBottom: 14 }}>Need Help?</h2>
            <p style={{ fontSize: 14, color: SL, lineHeight: 1.85, marginBottom: 26, fontFamily: "'IBM Plex Sans',sans-serif" }}>For immediate emergency assistance or technical support, use the contacts below. The UMP Security Operations Centre is staffed around the clock.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { Icon: IHotline, label: "Security Hotline", val: "+27 13 002 0099", note: "24 / 7 Emergency Line", c: RED, bg: `${RED}08`, bd: `${RED}20` },
                { Icon: IPhone, label: "Campus Security", val: "+27 13 002 0100", note: "Direct command centre", c: NAVY, bg: `${NAVY}07`, bd: `${NAVY}18` },
                { Icon: IMail, label: "Email Support", val: "ceis@ump.ac.za", note: "Response within 2 hours", c: ORANGE, bg: `${ORANGE}08`, bd: `${ORANGE}20` },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", background: item.bg, border: `1px solid ${item.bd}`, borderRadius: 8, borderLeft: `3px solid ${item.c}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 7, background: WHITE, border: `1px solid ${item.bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: item.c }}><item.Icon /></div>
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item.label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: item.c, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item.val}</div>
                      <div style={{ fontSize: 10.5, color: MID, marginTop: 1, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item.note}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          {/* Team */}
          <Reveal delay={0.14}>
            <Chip label="Created By" c={GOLD} bg={`${GOLD}0a`} bd={`${GOLD}22`} />
            <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(20px,2.5vw,30px)", fontWeight: 700, color: NK, letterSpacing: -0.4, marginBottom: 14 }}>Project Team</h2>
            <p style={{ fontSize: 14, color: SL, lineHeight: 1.85, marginBottom: 22, fontFamily: "'IBM Plex Sans',sans-serif" }}>UMP-CEIS was designed and developed by undergraduate students from the Department of Information &amp; Communications Technology at the University of Mpumalanga as a final-year capstone project.</p>
            <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, overflow: "hidden" }}>
              {/* Navy header — logo on its native background */}
              <div style={{ background: NAVY, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <img src={LOGO} alt="UMP" style={{ height: 36, objectFit: "contain", mixBlendMode: "lighten" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif" }}>ICT Capstone Project · 2026</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", marginTop: 2, fontFamily: "'IBM Plex Sans',sans-serif" }}>Department of Information &amp; Communications Technology</div>
                </div>
              </div>
              {/* Gold accent bar under header */}
              <div style={{ height: 2, background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }} />
              {members.map((m, i) => (
                <div key={m.num} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderBottom: i < members.length - 1 ? `1px solid ${BD}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${NAVY}10`, border: `1px solid ${NAVY}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: NAVY, fontFamily: "'IBM Plex Serif',serif" }}>
                      {m.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: NK, fontFamily: "'IBM Plex Sans',sans-serif" }}>{m.name}</span>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: MID, background: PAPER, border: `1px solid ${BD}`, borderRadius: 4, padding: "2px 9px" }}>{m.num}</span>
                </div>
              ))}
              <div style={{ background: PAPER, padding: "11px 20px", borderTop: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, fontFamily: "'IBM Plex Serif',serif" }}>University of Mpumalanga</span>
                <span style={{ fontSize: 11, color: MID, fontFamily: "'IBM Plex Sans',sans-serif" }}>Academic Year 2026</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ──────────────────────────────────────────────────── */
function Footer({ setPage }) {
  return (
    <footer style={{ background: NAVY3, borderTop: `3px solid ${NAVY}` }}>
      {/* Gold accent line at top — continuity with shield */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${GOLD}, ${ORANGE}, transparent)` }} />
      <div style={{ padding: "44px 5% 26px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 28 }}>
            <div style={{ maxWidth: 256 }}>
              {/* Logo on native navy */}
              <img src={LOGO} alt="University of Mpumalanga" style={{ height: 44, objectFit: "contain", marginBottom: 14, mixBlendMode: "lighten" }} />
              <p style={{ fontSize: 12.5, lineHeight: 1.75, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Sans',sans-serif" }}>An official integrated campus safety platform of the University of Mpumalanga.</p>
            </div>
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {[["System", [["Overview", "hero"], ["Features", "features"], ["How It Works", "how-it-works"], ["Access System", null]]], ["University", [["UMP Website", null], ["ICT Department", null], ["Campus Map", null], ["Staff Portal", null]]], ["Legal", [["Privacy Notice", null], ["Terms of Use", null], ["Data Policy", null], ["Accessibility", null]]]].map(([heading, links]) => (
                <div key={heading}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 14, fontFamily: "'IBM Plex Sans',sans-serif" }}>{heading}</div>
                  {links.map(([l, id]) => (
                    <a key={l} href="#" onClick={e => { e.preventDefault(); if (l === "Access System") goPage("system"); else if (id) scrollTo(id); }} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", marginBottom: 8, fontFamily: "'IBM Plex Sans',sans-serif", transition: "color .2s" }}
                      onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.75)"}
                      onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}>{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.24)", fontFamily: "'IBM Plex Sans',sans-serif" }}>© 2026 University of Mpumalanga · UMP-CEIS. All rights reserved.</span>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy Notice", "Terms of Use", "Data Policy"].map(l => (
                <a key={l} href="#" style={{ fontSize: 12, color: "rgba(255,255,255,0.24)", textDecoration: "none", fontFamily: "'IBM Plex Sans',sans-serif", transition: "color .2s" }}
                  onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.6)"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.24)"}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── SYSTEM PAGE ─────────────────────────────────────────────── */
function SystemPage({ setPage }) {
  return (
    <div style={{ minHeight: "100vh", background: PAPER, display: "flex", flexDirection: "column" }}>
      <div style={{ background: NAVY, padding: "0 5%", borderBottom: `2px solid ${RED}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={LOGO} alt="UMP" style={{ height: 40, objectFit: "contain", mixBlendMode: "lighten" }} />
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: WHITE, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.1 }}>UMP-CEIS</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 0.8, fontFamily: "'IBM Plex Sans',sans-serif", marginTop: 2 }}>Command Centre Access</div>
            </div>
          </div>
          <button onClick={() => setPage("landing")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)", borderRadius: 4, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}>
            ← Back to Home
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 5%" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", color: WHITE, boxShadow: `0 8px 32px ${NAVY}30` }}>
            <IShield />
          </div>
          <h1 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: 27, fontWeight: 700, color: NK, marginBottom: 10 }}>System Access</h1>
          <p style={{ fontSize: 14, color: SL, lineHeight: 1.85, marginBottom: 28, fontFamily: "'IBM Plex Sans',sans-serif" }}>Accessible to authorised UMP personnel only. Authenticate with your institutional credentials.</p>
          <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ background: NAVY, padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
              <img src={LOGO} alt="UMP" style={{ height: 26, objectFit: "contain", mixBlendMode: "lighten" }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.5 }}>Secure Authentication Portal</span>
            </div>
            <div style={{ padding: "22px 22px 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: NK, marginBottom: 6, fontFamily: "'IBM Plex Sans',sans-serif", textTransform: "uppercase", letterSpacing: 0.8 }}>Staff / Student Number</label>
                <input type="text" placeholder="Enter your UMP ID" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BD}`, borderRadius: 5, fontSize: 13.5, fontFamily: "'IBM Plex Sans',sans-serif", color: NK, background: PAPER, outline: "none", transition: "border-color .2s" }}
                  onFocus={e => e.target.style.borderColor = NAVY}
                  onBlur={e => e.target.style.borderColor = BD} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: NK, marginBottom: 6, fontFamily: "'IBM Plex Sans',sans-serif", textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
                <input type="password" placeholder="Enter your password" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BD}`, borderRadius: 5, fontSize: 13.5, fontFamily: "'IBM Plex Sans',sans-serif", color: NK, background: PAPER, outline: "none", transition: "border-color .2s" }}
                  onFocus={e => e.target.style.borderColor = NAVY}
                  onBlur={e => e.target.style.borderColor = BD} />
              </div>
              <button style={{ width: "100%", padding: "11px", background: NAVY, color: WHITE, border: "none", borderRadius: 5, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", transition: "background .2s", textTransform: "uppercase", letterSpacing: 0.5 }}
                onMouseEnter={e => e.currentTarget.style.background = NAVY2}
                onMouseLeave={e => e.currentTarget.style.background = NAVY}>
                Access Command Centre
              </button>
            </div>
          </div>
          {/* Red emergency notice */}
          <div style={{ background: `${RED}0a`, border: `1px solid ${RED}22`, borderRadius: 6, padding: "10px 14px" }}>
            <p style={{ fontSize: 11.5, color: RED, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.6, fontWeight: 500 }}>
              For emergencies — call <strong>+27 13 002 0099</strong> immediately.<br />
              <span style={{ color: MID, fontWeight: 400 }}>Do not wait for system access in a life-threatening situation.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── PHASES ROADMAP SECTION ──────────────────────────────────── */
function PhasesSection({ setPage }) {
  const [active, setActive] = useState(0);
  const phases = [
    {
      num: "01", label: "Phase 1", months: "Month 1–2", title: "Core Emergency Utility",
      color: NAVY, tagColor: NAVY,
      icon: <ISOS />,
      summary: "A working emergency assistance mobile app — functional, presentable, and deployable.",
      features: ["User registration & institutional login","Emergency contacts storage","Live GPS location sharing","One-tap SOS with SMS + push dispatch","Offline first aid library (CPR, choking, bleeding, burns)"],
      badge: "Foundation",
    },
    {
      num: "02", label: "Phase 2", months: "Month 3–4", title: "Intelligent Triage Engine",
      color: ORANGE, tagColor: ORANGE,
      icon: <IPulse />,
      summary: "ML-powered symptom assessment with risk scoring and emergency severity classification.",
      features: ["Symptom selection with adaptive follow-up questions","Risk score calculation engine","Severity classification: Low · Moderate · High · Critical","Logistic regression / decision tree classifier","Trained on public symptom-disease datasets"],
      badge: "Academic",
    },
    {
      num: "03", label: "Phase 3", months: "Month 5–6", title: "Explainable AI + Transparency",
      color: GREEN, tagColor: GREEN,
      icon: <IChart />,
      summary: "Research-grade explainability layer — probability scores, SHAP analysis, and session tracking.",
      features: ["Probability score with confidence interval","Contributing symptom weights (SHAP)","Risk factor breakdown display","Previous triage session history","Ethical safeguards & disclaimer logic"],
      badge: "Thesis-Level",
    },
    {
      num: "04", label: "Phase 4", months: "Month 7–8", title: "Real-Time Response Intelligence",
      color: RED, tagColor: RED,
      icon: <IHospital />,
      summary: "Expands system impact with hospital routing, live traffic, and optional IoT vitals ingestion.",
      features: ["Nearest hospital detection","Estimated travel time + live traffic","Hospital crowd prediction (simulated)","Offline fallback routing","Optional: Bluetooth heart rate / SpO₂ integration"],
      badge: "High Impact",
    },
  ];
  const p = phases[active];
  return (
    <section id="phases" style={{ padding: "96px 5%", background: PAPER, borderTop: `1px solid ${BD}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 52 }}>
          <SectionHead chip="System Roadmap" chipColor={NAVY} title="Four-Phase Development" titleHighlight="Architecture"
            sub="UMP-CEIS is built across four progressive phases — from core utility to research-grade explainable AI and real-time response intelligence." />
        </Reveal>
        {/* Phase tabs */}
        <Reveal>
          <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap", justifyContent: "center" }}>
            {phases.map((ph, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ padding: "10px 20px", borderRadius: 5, border: `1.5px solid ${i === active ? ph.color : BD}`, background: i === active ? `${ph.color}12` : WHITE, color: i === active ? ph.color : SL, fontSize: 12.5, fontWeight: i === active ? 700 : 500, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .2s", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, opacity: 0.6 }}>{ph.num}</span>
                {ph.label}: {ph.title.split(" ").slice(0,2).join(" ")}
              </button>
            ))}
          </div>
        </Reveal>
        {/* Active phase detail */}
        <Reveal key={active}>
          <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BD}`, borderTop: `4px solid ${p.color}`, overflow: "hidden", boxShadow: `0 8px 40px ${p.color}10` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {/* Left */}
              <div style={{ padding: "40px 38px", borderRight: `1px solid ${BD}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${p.color}12`, border: `1px solid ${p.color}28`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color }}>{p.icon}</div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: p.color, letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>{p.months} · {p.badge}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: NK, fontFamily: "'IBM Plex Serif',serif", marginTop: 2 }}>{p.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13.5, color: SL, lineHeight: 1.85, marginBottom: 26, fontFamily: "'IBM Plex Sans',sans-serif" }}>{p.summary}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${p.color}10`, border: `1px solid ${p.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, color: p.color }}><ICheck /></div>
                      <span style={{ fontSize: 13, color: SL, lineHeight: 1.65, fontFamily: "'IBM Plex Sans',sans-serif" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right — CTA tile */}
              <div style={{ padding: "40px 38px", background: `${p.color}06`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: `${p.color}14`, fontFamily: "'IBM Plex Serif',serif", lineHeight: 1, marginBottom: 16, letterSpacing: -4 }}>{p.num}</div>
                {active === 1 && (
                  <div>
                    <p style={{ fontSize: 13, color: SL, lineHeight: 1.8, marginBottom: 22, fontFamily: "'IBM Plex Sans',sans-serif" }}>Try the live symptom triage demo — enter your symptoms and receive an instant risk classification with full explainability.</p>
                    <button onClick={() => setPage("triage")} style={{ padding: "12px 26px", background: ORANGE, color: WHITE, border: "none", borderRadius: 5, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 8, transition: "background .2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#B86005"}
                      onMouseLeave={e => e.currentTarget.style.background = ORANGE}>
                      Open Triage Engine <IArrowR />
                    </button>
                  </div>
                )}
                {active === 0 && (
                  <div>
                    <p style={{ fontSize: 13, color: SL, lineHeight: 1.8, marginBottom: 22, fontFamily: "'IBM Plex Sans',sans-serif" }}>Access the interactive first aid library — offline-ready guides for CPR, choking, bleeding control, and burns.</p>
                    <button onClick={() => setPage("firstaid")} style={{ padding: "12px 26px", background: NAVY, color: WHITE, border: "none", borderRadius: 5, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 8, transition: "background .2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = NAVYL}
                      onMouseLeave={e => e.currentTarget.style.background = NAVY}>
                      Open First Aid Library <IArrowR />
                    </button>
                  </div>
                )}
                {active === 2 && (
                  <div>
                    <p style={{ fontSize: 13, color: SL, lineHeight: 1.8, marginBottom: 22, fontFamily: "'IBM Plex Sans',sans-serif" }}>The explainability layer shows probability scores, confidence intervals, and SHAP-style contributing factors for every triage decision.</p>
                    <button onClick={() => setPage("triage")} style={{ padding: "12px 26px", background: GREEN, color: WHITE, border: "none", borderRadius: 5, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      See Explainable Triage <IArrowR />
                    </button>
                  </div>
                )}
                {active === 3 && (
                  <div>
                    <p style={{ fontSize: 13, color: SL, lineHeight: 1.8, marginBottom: 22, fontFamily: "'IBM Plex Sans',sans-serif" }}>Phase 4 adds nearest hospital detection, live traffic routing, and optional IoT vitals ingestion — merging ML health intelligence with real-world logistics.</p>
                    <button onClick={() => setPage("hospitals")} style={{ padding: "12px 26px", background: RED, color: WHITE, border: "none", borderRadius: 5, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      View Hospital Finder <IArrowR />
                    </button>
                  </div>
                )}
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${BD}` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, fontFamily: "'IBM Plex Sans',sans-serif" }}>Deliverable</div>
                  <div style={{ fontSize: 13, color: NK, fontWeight: 600, fontFamily: "'IBM Plex Serif',serif", lineHeight: 1.5 }}>
                    {active === 0 && "A working emergency assistance mobile app. Presentable."}
                    {active === 1 && "An intelligent emergency triage assistant. Academic-grade."}
                    {active === 2 && "A transparent ML decision-support system. Thesis-level."}
                    {active === 3 && "A real-time response intelligence platform with IoT expansion."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── FIRST AID PAGE ──────────────────────────────────────────── */
/* ── FIRST AID SIMULATIONS (SVG) ─────────────────────────────── */
function SimCPR({ step, running }) {
  const [beat, setBeat] = useState(false);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState("compress"); // compress | breath
  useEffect(() => {
    if (!running) return;
    const interval = step === 4 ? 545 : step === 5 ? 1200 : null; // 110 BPM for compressions
    if (!interval) return;
    const t = setInterval(() => {
      setBeat(b => !b);
      if (step === 4) setCount(c => { const n = (c + 1) % 30; if (n === 0) setPhase("breath"); return n; });
      if (step === 5) setCount(c => { const n = (c + 1) % 2; if (n === 0) setPhase("compress"); return n; });
    }, interval);
    return () => clearInterval(t);
  }, [running, step]);

  // Person silhouette lying flat
  const bodyY = beat && running && step === 4 ? 118 : 120;
  const chestScale = beat && running && step === 4 ? 0.93 : 1;
  const handY = beat && running && step === 4 ? 112 : 108;

  return (
    <svg viewBox="0 0 340 200" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      {/* Ground */}
      <rect x={10} y={162} width={320} height={6} rx={3} fill="#E8EDF5"/>
      {/* Body outline - person lying */}
      <ellipse cx={170} cy={bodyY} rx={90} ry={30} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/>
      {/* Head */}
      <circle cx={82} cy={bodyY - 6} r={20} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>
      {/* Neck tilt line for step 2 */}
      {step === 2 && <line x1={98} y1={bodyY - 10} x2={105} y2={bodyY - 18} stroke={ORANGE} strokeWidth={2.5} strokeLinecap="round"/>}
      {/* Airway check arrows for step 3 */}
      {step === 2 && <>
        <path d="M108 130 Q130 115 150 125" stroke={ORANGE} strokeWidth={2} fill="none" strokeDasharray="4 3"/>
        <text x={152} y={122} fontSize={9} fill={ORANGE} fontFamily="monospace">look</text>
        <text x={152} y={134} fontSize={9} fill={ORANGE} fontFamily="monospace">listen</text>
        <text x={152} y={146} fontSize={9} fill={ORANGE} fontFamily="monospace">feel</text>
      </>}
      {/* Chest area */}
      <ellipse cx={170} cy={bodyY} rx={35} ry={18} fill="#BFDBFE" stroke="#60A5FA" strokeWidth={1} transform={`scale(1,${chestScale})`} style={{transformOrigin:"170px 120px"}}/>
      {/* Hands for compression step */}
      {(step === 4 || step === 5) && step === 4 && <>
        <ellipse cx={170} cy={handY} rx={18} ry={9} fill="#1A2766" opacity={0.85}/>
        <ellipse cx={170} cy={handY + 8} rx={14} ry={7} fill="#14205A" opacity={0.9}/>
        {running && <text x={196} y={handY - 2} fontSize={10} fill={RED} fontWeight="bold" fontFamily="monospace">{beat ? "↓ PUSH" : "↑ RELEASE"}</text>}
        {running && <text x={196} y={handY + 12} fontSize={9} fill={MID} fontFamily="monospace">{count + 1}/30</text>}
      </>}
      {/* Mouth for rescue breath */}
      {step === 5 && <>
        <ellipse cx={82} cy={bodyY - 2} rx={7} ry={4} fill={ORANGE} opacity={running && beat ? 0.9 : 0.4}/>
        {running && <text x={108} y={bodyY} fontSize={9} fill={ORANGE} fontFamily="monospace">{beat ? "BREATHE IN ↗" : "PAUSE..."}</text>}
        {running && <text x={108} y={bodyY + 12} fontSize={9} fill={MID} fontFamily="monospace">breath {count + 1}/2</text>}
      </>}
      {/* Ratio indicator */}
      {(step === 6) && (
        <g>
          <text x={60} y={50} fontSize={11} fill={NK} fontFamily="monospace" fontWeight="bold">30 compressions : 2 breaths</text>
          {[...Array(30)].map((_, i) => <rect key={i} x={60 + i * 6} y={58} width={5} height={12} rx={1} fill={RED} opacity={0.7}/>)}
          {[...Array(2)].map((_, i) => <rect key={i} x={60 + 30 * 6 + 4 + i * 9} y={58} width={7} height={12} rx={1} fill={ORANGE} opacity={0.85}/>)}
          <text x={60} y={84} fontSize={9} fill={MID} fontFamily="monospace">■ compressions   ■ rescue breaths</text>
        </g>
      )}
      {/* BPM indicator */}
      {step === 4 && running && (
        <g>
          <text x={20} y={30} fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">110 BPM</text>
          <text x={20} y={43} fontSize={9} fill={MID} fontFamily="monospace">5–6 cm depth</text>
          {[0,1,2,3,4].map(i => <rect key={i} x={20 + i * 12} y={48} width={9} height={beat && i === 2 ? 18 : 10} rx={2} fill={RED} opacity={0.6 + i * 0.06} style={{transition:"height 0.1s"}}/>)}
        </g>
      )}
      {/* Step label */}
      <text x={170} y={190} textAnchor="middle" fontSize={10} fill={MID} fontFamily="sans-serif">
        {["Check responsiveness","Position on back","Open airway","Check breathing — 10 sec","30 chest compressions","2 rescue breaths","Continue 30:2 cycles"][step]}
      </text>
    </svg>
  );
}

function SimChoking({ step, running }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setFrame(f => (f + 1) % 4), 600);
    return () => clearInterval(t);
  }, [running]);
  const showBack = step === 2;
  const showThrust = step === 3;
  const blowOpacity = running ? [1, 0.4, 0.7, 0.2][frame] : 0.5;

  return (
    <svg viewBox="0 0 340 200" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      {/* Ground */}
      <rect x={10} y={172} width={320} height={5} rx={2} fill="#E8EDF5"/>
      {/* Person standing - body */}
      <ellipse cx={170} cy={130} rx={22} ry={38} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/>
      {/* Head */}
      <circle cx={170} cy={80} r={18} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>
      {/* Throat highlight */}
      <rect x={163} y={96} width={14} height={16} rx={4} fill={step === 0 ? RED : "#DBEAFE"} opacity={0.6}/>
      {step === 0 && <text x={185} y={108} fontSize={9} fill={RED} fontFamily="monospace">obstruction!</text>}
      {/* Rescuer for back blows */}
      {showBack && <>
        <ellipse cx={228} cy={130} rx={18} ry={34} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1.5}/>
        <circle cx={228} cy={84} r={14} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>
        {/* Arm delivering blow */}
        <path d={`M218 120 Q${running ? 192 + frame * 2 : 196} 118 180 ${running ? 126 - frame : 128}`} stroke="#F59E0B" strokeWidth={8} strokeLinecap="round" fill="none"/>
        {running && <text x={100} y={60} fontSize={10} fill={ORANGE} fontFamily="monospace" fontWeight="bold">BACK BLOW {(frame % 5) + 1}/5</text>}
        {/* Impact wave */}
        {running && [0,1,2].map(i => <circle key={i} cx={180} cy={128} r={8 + i * 7} fill="none" stroke={ORANGE} strokeWidth={1} opacity={blowOpacity - i * 0.2}/>)}
      </>}
      {/* Rescuer for abdominal thrusts */}
      {showThrust && <>
        <ellipse cx={115} cy={130} rx={18} ry={34} fill="#FEF3C7" stroke="#D97706" strokeWidth={1.5}/>
        <circle cx={115} cy={84} r={14} fill="#FDE68A" stroke="#D97706" strokeWidth={1.5}/>
        {/* Fist at navel */}
        <ellipse cx={148} cy={130} rx={12} ry={8} fill="#D97706" opacity={running ? [0.9,0.5,0.8,0.4][frame] : 0.6}/>
        <path d="M148 130 L162 130" stroke="#D97706" strokeWidth={4} strokeLinecap="round"/>
        {running && <text x={80} y={60} fontSize={10} fill={ORANGE} fontFamily="monospace" fontWeight="bold">THRUST {(frame % 5) + 1}/5</text>}
        {running && <path d={`M148 ${130 + (frame % 2 === 0 ? -8 : 0)} L148 ${130 + (frame % 2 === 0 ? 0 : 8)}`} stroke={ORANGE} strokeWidth={3} strokeDasharray="3 2" opacity={0.7}/>}
      </>}
      {/* Hand on throat signal */}
      {step === 0 && <>
        <path d="M152 108 Q140 116 148 124" stroke={RED} strokeWidth={2} fill="none"/>
        <text x={100} y={58} fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">Cannot speak/breathe</text>
      </>}
      {step === 1 && <text x={105} y={58} fontSize={10} fill={GREEN} fontFamily="monospace" fontWeight="bold">Encourage coughing</text>}
      {step === 4 && <>
        <text x={50} y={50} fontSize={10} fill={NAVY} fontFamily="monospace" fontWeight="bold">Alternate:</text>
        <rect x={50} y={58} width={50} height={14} rx={3} fill={ORANGE} opacity={0.7}/>
        <text x={57} y={69} fontSize={8} fill={WHITE} fontFamily="monospace">5 back</text>
        <rect x={110} y={58} width={58} height={14} rx={3} fill={RED} opacity={0.7}/>
        <text x={116} y={69} fontSize={8} fill={WHITE} fontFamily="monospace">5 thrusts</text>
        <path d="M100 65 L110 65" stroke={NAVY} strokeWidth={2} markerEnd="url(#arr)"/>
      </>}
      <text x={170} y={192} textAnchor="middle" fontSize={10} fill={MID} fontFamily="sans-serif">
        {["Confirm choking","Encourage coughing","5 back blows","5 abdominal thrusts","Alternate and repeat","If unconscious — start CPR"][step]}
      </text>
    </svg>
  );
}

function SimBleeding({ step, running }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setFrame(f => (f + 1) % 8), 400);
    return () => clearInterval(t);
  }, [running]);

  const pressDepth = running && step === 2 ? Math.abs(Math.sin(frame * 0.8)) * 10 : 0;
  const bloodOpacity = step >= 2 ? Math.max(0, 0.9 - (step - 2) * 0.22) : (running ? 0.5 + Math.sin(frame) * 0.3 : 0.7);

  return (
    <svg viewBox="0 0 340 200" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      {/* Arm/leg surface */}
      <rect x={80} y={100} width={180} height={60} rx={28} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>
      {/* Wound */}
      <ellipse cx={170} cy={128} rx={18} ry={10} fill="#8B1A1A" opacity={bloodOpacity}/>
      {/* Blood drip animation */}
      {step <= 1 && running && [0,1,2].map(i => (
        <ellipse key={i} cx={170 + (i - 1) * 8} cy={138 + ((frame + i * 2) % 8) * 4} rx={3} ry={2 + i} fill="#8B1A1A" opacity={0.5 - i * 0.1}/>
      ))}
      {/* Gloves indicator */}
      {step === 0 && <>
        <rect x={40} y={90} width={28} height={50} rx={5} fill={GREEN} opacity={0.7}/>
        <text x={44} y={122} fontSize={8} fill={WHITE} fontFamily="monospace" fontWeight="bold">GLOVE</text>
        <path d="M68 115 L80 122" stroke={GREEN} strokeWidth={2} strokeDasharray="3 2"/>
        <text x={30} y={80} fontSize={10} fill={GREEN} fontFamily="monospace">Protect yourself first</text>
      </>}
      {/* Pressure pad */}
      {step >= 2 && <>
        <rect x={145} y={108 - pressDepth} width={50} height={28 + pressDepth} rx={6} fill="#DBEAFE" stroke="#1A2766" strokeWidth={2} opacity={0.9}/>
        <text x={155} y={126} fontSize={8} fill={NAVY} fontFamily="monospace" fontWeight="bold">PRESS</text>
        {running && step === 2 && <text x={205} y={118} fontSize={9} fill={NAVY} fontFamily="monospace">{pressDepth > 4 ? "↓ FIRM" : "HOLD"}</text>}
      </>}
      {/* Layer add animation for step 3 */}
      {step === 3 && <>
        <rect x={145} y={104} width={50} height={36} rx={6} fill="#BFDBFE" stroke={NAVY} strokeWidth={2} opacity={0.85}/>
        <rect x={145} y={96} width={50} height={14} rx={4} fill="#93C5FD" stroke={NAVY} strokeWidth={1.5} opacity={0.7}/>
        <text x={100} y={85} fontSize={9} fill={NAVY} fontFamily="monospace">Add layers — don't lift!</text>
      </>}
      {/* Elevation arrows */}
      {step === 4 && <>
        <path d="M170 95 L170 70 M160 78 L170 68 L180 78" stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x={185} y={82} fontSize={9} fill={GREEN} fontFamily="monospace">Elevate!</text>
        <text x={100} y={60} fontSize={10} fill={GREEN} fontFamily="monospace" fontWeight="bold">Above heart level</text>
      </>}
      {/* Shock position */}
      {step === 5 && <>
        <path d="M100 165 L240 155" stroke={NAVY} strokeWidth={2} strokeDasharray="4 3"/>
        <text x={100} y={150} fontSize={9} fill={NAVY} fontFamily="monospace">Feet elevated ~30 cm</text>
        <rect x={220} y={148} width={30} height={8} rx={3} fill={NAVY} opacity={0.5}/>
      </>}
      {/* Tourniquet */}
      {step === 6 && <>
        <rect x={80} y={96} width={20} height={68} rx={10} fill={RED} opacity={0.7}/>
        <text x={30} y={70} fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">Tourniquet: 5 cm</text>
        <text x={30} y={82} fontSize={9} fill={RED} fontFamily="monospace">above wound · LAST RESORT</text>
      </>}
      <text x={170} y={192} textAnchor="middle" fontSize={10} fill={MID} fontFamily="sans-serif">
        {["Protect yourself","Expose wound","Apply direct pressure","Add layers — don't lift","Elevate limb","Treat for shock","Call 10177 · Tourniquet last"][step]}
      </text>
    </svg>
  );
}

function SimBurns({ step, running }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setFrame(f => (f + 1) % 12), 200);
    return () => clearInterval(t);
  }, [running]);

  const waterY = 85 + (frame % 4) * 4;

  return (
    <svg viewBox="0 0 340 200" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      {/* Arm */}
      <rect x={90} y={110} width={160} height={55} rx={26} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>
      {/* Burn area */}
      <ellipse cx={170} cy={135} rx={36} ry={18} fill={step === 0 ? "#FF4500" : step === 1 ? "#FCA58A" : "#FDE68A"} opacity={step === 0 ? 0.9 : 0.7}/>
      {/* Flames for initial state */}
      {step === 0 && running && [0,1,2].map(i => (
        <path key={i} d={`M${155 + i * 12} 112 Q${151 + i * 12} ${102 - (frame % 4) * 2} ${158 + i * 12} ${95 - frame}`} stroke="#FF4500" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7 + i * 0.1}/>
      ))}
      {/* Running water for step 1 */}
      {step === 1 && <>
        <rect x={152} y={55} width={10} height={20} rx={4} fill="#60A5FA" opacity={0.7}/>
        {running && [0,1,2,3].map(i => (
          <ellipse key={i} cx={160 + (i - 1.5) * 6} cy={waterY + i * 6} rx={2} ry={4 + i} fill="#60A5FA" opacity={0.6 - i * 0.1}/>
        ))}
        <text x={100} y={58} fontSize={9} fill="#1D4ED8" fontFamily="monospace">Cool water — 20 min</text>
        <text x={100} y={70} fontSize={9} fill={RED} fontFamily="monospace">NOT ice / cold!</text>
        {/* Timer */}
        {running && <text x={230} y={90} fontSize={18} fill={NAVY} fontFamily="monospace" fontWeight="bold">20:00</text>}
      </>}
      {/* Removal arrows for step 2 */}
      {step === 2 && <>
        <path d="M110 125 L80 115 M80 115 L88 108 M80 115 L88 122" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M230 125 L260 115 M260 115 L252 108 M260 115 L252 122" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        <text x={100} y={95} fontSize={9} fill={ORANGE} fontFamily="monospace">Remove clothing</text>
        <text x={100} y={107} fontSize={9} fill={ORANGE} fontFamily="monospace">unless stuck to skin</text>
      </>}
      {/* Cling film cover */}
      {step === 3 && <>
        <rect x={126} y={112} width={88} height={46} rx={8} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5} opacity={0.7}/>
        <text x={100} y={95} fontSize={9} fill={NAVY} fontFamily="monospace">Loose cover only</text>
        <text x={100} y={107} fontSize={9} fill={RED} fontFamily="monospace">Do NOT wrap tight</text>
      </>}
      {/* Chemical icon */}
      {step === 4 && <>
        <rect x={240} y={80} width={24} height={40} rx={5} fill="#7C3AED" opacity={0.7}/>
        <text x={238} y={76} fontSize={8} fill="#7C3AED" fontFamily="monospace">CHEM</text>
        <path d="M240 100 L220 110" stroke="#7C3AED" strokeWidth={2} strokeDasharray="3 2"/>
        <text x={80} y={95} fontSize={9} fill="#7C3AED" fontFamily="monospace">Brush dry chemicals first</text>
        <text x={80} y={107} fontSize={9} fill="#1D4ED8" fontFamily="monospace">Then flush 20+ minutes</text>
      </>}
      {/* Electrical warning */}
      {step === 5 && <>
        <rect x={248} y={70} width={32} height={60} rx={4} fill="#FCD34D" stroke="#F59E0B" strokeWidth={1.5}/>
        <text x={252} y={108} fontSize={20} fontFamily="sans-serif">⚡</text>
        <path d="M248 100 L220 115" stroke={RED} strokeWidth={2.5} strokeDasharray="4 2"/>
        <text x={60} y={95} fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">DO NOT TOUCH!</text>
        <text x={60} y={108} fontSize={9} fill={RED} fontFamily="monospace">Ensure power is off first</text>
      </>}
      {step === 6 && <>
        <circle cx={170} cy={135} r={40} fill="none" stroke={RED} strokeWidth={2} strokeDasharray="6 3"/>
        <text x={115} y={90} fontSize={9} fill={RED} fontFamily="monospace">Face · Hands · Feet</text>
        <text x={115} y={102} fontSize={9} fill={RED} fontFamily="monospace">Genitals · &gt;3 cm · Children</text>
        <text x={115} y={114} fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">→ HOSPITAL NOW</text>
      </>}
      <text x={170} y={192} textAnchor="middle" fontSize={10} fill={MID} fontFamily="sans-serif">
        {["Remove from source","Cool with running water — 20 min","Remove clothing carefully","Cover loosely","Chemical burns — flush 20 min","Electrical burns — power off first","Seek medical attention"][step]}
      </text>
    </svg>
  );
}

/* ── VOICE HOOK ───────────────────────────────────────────────── */
function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const cancel = () => { if (supported) { window.speechSynthesis.cancel(); setSpeaking(false); } };
  const speak = (text, onEnd) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88; u.pitch = 1.02; u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
            || voices.find(v => v.lang.startsWith("en"))
            || voices[0];
    if (en) u.voice = en;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); if (onEnd) onEnd(); };
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  return { speak, cancel, speaking, supported };
}

/* ── FIRST AID PAGE ──────────────────────────────────────────── */
function FirstAidPage({ setPage }) {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState("guide"); // guide | simulate | voice
  const [simStep, setSimStep] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [voiceStep, setVoiceStep] = useState(0);
  const [voiceAuto, setVoiceAuto] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const { speak, cancel, speaking, supported } = useVoice();
  const stepRef = useRef(null);

  const guides = [
    {
      id: "cpr", title: "CPR", subtitle: "Cardiopulmonary Resuscitation", color: RED, icon: <IHeart />,
      when: "Person is unresponsive and not breathing normally.",
      warning: "Call for help or dial 10177 before starting CPR.",
      steps: [
        { n: "01", title: "Check responsiveness", body: "Tap shoulders firmly and shout: Are you okay? If no response, call for emergency help immediately — dial 10177." },
        { n: "02", title: "Position the person", body: "Lay them on a firm, flat surface on their back. Kneel beside their chest." },
        { n: "03", title: "Open the airway", body: "Tilt head back gently with one hand on forehead, two fingers lifting the chin. Look for visible obstructions." },
        { n: "04", title: "Check for breathing", body: "Look, listen and feel for breathing for no more than 10 seconds. Occasional gasps are not normal breathing." },
        { n: "05", title: "Begin chest compressions", body: "Place heel of hand on centre of chest. Lock fingers and compress hard and fast — 5 to 6 centimetres deep at 100 to 120 beats per minute. Allow full chest recoil after each compression." },
        { n: "06", title: "Give rescue breaths", body: "After 30 compressions, give 2 rescue breaths. Pinch nose, seal your mouth over theirs, breathe in for 1 second until chest rises. Repeat." },
        { n: "07", title: "Continue cycles", body: "Maintain the 30 to 2 ratio — 30 compressions then 2 breaths. Continue until the person breathes normally, an AED is available, or emergency services arrive." },
      ]
    },
    {
      id: "choking", title: "Choking", subtitle: "Airway Obstruction Response", color: ORANGE, icon: <ILung />,
      when: "Person cannot speak, cough effectively, or is turning blue.",
      warning: "If person can cough — encourage them to keep coughing. Do NOT interfere.",
      steps: [
        { n: "01", title: "Confirm choking", body: "Ask: Are you choking? If they cannot answer, cannot breathe, or are clutching their throat — act immediately. Call 10177." },
        { n: "02", title: "Encourage coughing", body: "If they can cough, encourage strong coughs. If coughing is ineffective or absent, proceed to back blows." },
        { n: "03", title: "Give 5 back blows", body: "Lean the person forward. Use the heel of your hand to deliver 5 firm blows between the shoulder blades. Check the mouth after each blow." },
        { n: "04", title: "Give 5 abdominal thrusts", body: "Stand behind them. Make a fist above the navel, cover with your other hand. Give 5 sharp inward and upward thrusts. Check the mouth after each." },
        { n: "05", title: "Alternate and repeat", body: "Alternate between 5 back blows and 5 abdominal thrusts until the object is expelled or the person loses consciousness." },
        { n: "06", title: "If unconscious", body: "Lower to floor. Begin CPR immediately. Each time you open the airway, look for the object before giving breaths — remove only if clearly visible." },
      ]
    },
    {
      id: "bleeding", title: "Bleeding", subtitle: "Haemorrhage Control", color: "#8B1A1A", icon: <IDroplet />,
      when: "Significant external bleeding from wound or laceration.",
      warning: "Wear gloves if available. Do NOT remove an embedded object.",
      steps: [
        { n: "01", title: "Protect yourself", body: "Put on gloves or use a clean plastic bag before touching blood. Your safety comes first." },
        { n: "02", title: "Expose the wound", body: "Cut away or remove clothing around the wound carefully to assess severity." },
        { n: "03", title: "Apply direct pressure", body: "Press firmly on the wound with a clean cloth, bandage, or clothing. Maintain continuous firm pressure." },
        { n: "04", title: "Do not remove the dressing", body: "If blood soaks through, add more material on top — do NOT lift and replace. Lifting disturbs clot formation." },
        { n: "05", title: "Elevate if possible", body: "Raise the bleeding limb above heart level if there is no suspected fracture. This reduces blood flow to the area." },
        { n: "06", title: "Treat for shock", body: "Lay person flat, elevate legs — unless there is a head or chest injury. Keep them warm. Do not give food or drink. Monitor consciousness." },
        { n: "07", title: "Call for emergency help", body: "Dial 10177 for severe or uncontrolled bleeding. Apply a tourniquet 5 centimetres above the wound only if bleeding is life-threatening and uncontrollable." },
      ]
    },
    {
      id: "burns", title: "Burns", subtitle: "Thermal Injury First Response", color: GOLD, icon: <IFlame />,
      when: "Thermal, chemical, or electrical burn to skin.",
      warning: "Do NOT apply ice, butter, toothpaste or any cream. Do NOT burst blisters.",
      steps: [
        { n: "01", title: "Remove from source", body: "Immediately remove the person from heat, flame, or chemical source. Ensure your own safety first." },
        { n: "02", title: "Cool the burn", body: "Run cool — not cold or iced — running water over the burn for 20 minutes. Start within 3 hours of the burn occurring." },
        { n: "03", title: "Remove clothing and jewellery", body: "Carefully remove clothing and jewellery around the burn — unless they are stuck to the skin." },
        { n: "04", title: "Cover loosely", body: "Cover the burn with a non-fluffy sterile dressing or clean cling film. Do NOT wrap tightly." },
        { n: "05", title: "Chemical burns", body: "Brush off dry chemicals first, then flush with large amounts of water for at least 20 minutes. Remove contaminated clothing." },
        { n: "06", title: "Electrical burns", body: "Do NOT touch the person until the power source is off. Electrical burns require immediate hospital care — always call 10177." },
        { n: "07", title: "Seek medical attention", body: "All burns larger than 3 centimetres, burns on face, hands, feet, or genitals, or burns in children require emergency medical care." },
      ]
    },
  ];

  const g = guides[active];
  const totalSteps = g.steps.length;

  // Reset on tab change
  useEffect(() => {
    setSimStep(0); setSimRunning(false);
    setVoiceStep(0); setVoiceAuto(false); setVoicePaused(false);
    cancel();
  }, [active, mode]);

  // Voice auto-advance
  useEffect(() => {
    if (!voiceAuto || voicePaused) return;
    const s = g.steps[voiceStep];
    speak(`Step ${voiceStep + 1}. ${s.title}. ${s.body}`, () => {
      if (voiceStep + 1 < totalSteps) {
        setTimeout(() => setVoiceStep(v => v + 1), 800);
      } else {
        setVoiceAuto(false);
        speak("All steps complete. Stay with the patient and await emergency services.");
      }
    });
    stepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [voiceStep, voiceAuto, voicePaused]);

  function startVoice() {
    setVoiceStep(0); setVoiceAuto(true); setVoicePaused(false);
  }
  function pauseVoice() {
    cancel(); setVoicePaused(true); setVoiceAuto(false);
  }
  function resumeVoice() {
    setVoicePaused(false); setVoiceAuto(true);
  }
  function stopVoice() {
    cancel(); setVoiceAuto(false); setVoicePaused(false); setVoiceStep(0);
  }
  function speakStep(i) {
    cancel(); setVoiceAuto(false); setVoicePaused(false); setVoiceStep(i);
    const s = g.steps[i];
    speak(`Step ${i + 1}. ${s.title}. ${s.body}`);
  }

  const SimComponent = [SimCPR, SimChoking, SimBleeding, SimBurns][active];

  return (
    <div style={{ minHeight: "100vh", background: PAPER, fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes voiceWave{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ background: NAVY, borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 5%", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={LOGO} alt="UMP" style={{ height: 40, objectFit: "contain", mixBlendMode: "lighten" }} />
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>UMP-CEIS</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Sans',sans-serif" }}>First Aid Library — Phase 1 · Voice + Simulation</div>
            </div>
          </div>
          <button onClick={() => { cancel(); setPage("landing"); }} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)", borderRadius: 4, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>← Back</button>
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "36px 5% 60px" }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MID, letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 6 }}>Phase 1 · Emergency Utility</div>
          <h1 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: NK, letterSpacing: -0.5, marginBottom: 5 }}>First Aid Library</h1>
          <p style={{ fontSize: 13.5, color: SL, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.7, maxWidth: 560 }}>Step-by-step guides with animated simulation and voice instructor. Not a substitute for professional medical care.</p>
        </div>

        {/* Guide tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 24, marginBottom: 0, borderBottom: `1px solid ${BD}` }}>
          {guides.map((gd, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ padding: "10px 18px", background: "none", border: "none", borderBottom: i === active ? `3px solid ${gd.color}` : "3px solid transparent", color: i === active ? gd.color : MID, fontSize: 13, fontWeight: i === active ? 700 : 500, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "color .2s", marginBottom: -1 }}>
              <span style={{ color: i === active ? gd.color : MID }}>{gd.icon}</span>{gd.title}
            </button>
          ))}
        </div>

        {/* Mode switcher */}
        <div style={{ display: "flex", gap: 0, margin: "18px 0 20px", background: WHITE, border: `1px solid ${BD}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
          {[["guide","📋","Read Guide"],["simulate","▶","Simulation"],["voice","🎙","Voice Mode"]].map(([m, ico, lbl]) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "9px 20px", background: mode === m ? g.color : "transparent", color: mode === m ? WHITE : SL, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: mode === m ? 700 : 500, fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "all .2s", borderRight: m !== "voice" ? `1px solid ${BD}` : "none" }}>
              <span style={{ fontSize: 14 }}>{ico}</span>{lbl}
            </button>
          ))}
        </div>

        {/* ── READ GUIDE MODE ── */}
        {mode === "guide" && (
          <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BD}`, borderTop: `4px solid ${g.color}`, overflow: "hidden", animation: "fadeIn .3s ease" }}>
            <div style={{ padding: "24px 32px 20px", borderBottom: `1px solid ${BD}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: g.color, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 5, fontFamily: "'IBM Plex Sans',sans-serif" }}>{g.subtitle}</div>
              <div style={{ fontSize: 13.5, color: SL, fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", gap: 6, marginBottom: 10, lineHeight: 1.6 }}>
                <strong style={{ color: NK, flexShrink: 0 }}>When:</strong> {g.when}
              </div>
              <div style={{ background: `${g.color}0d`, border: `1px solid ${g.color}2a`, borderRadius: 6, padding: "9px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: g.color, marginTop: 1, flexShrink: 0 }}><IWarning /></span>
                <span style={{ fontSize: 12.5, color: g.color === GOLD ? "#6B4800" : g.color, fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.55 }}>{g.warning}</span>
              </div>
            </div>
            <div style={{ padding: "22px 32px 30px" }}>
              {g.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 18, paddingBottom: i < totalSteps - 1 ? 22 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 36 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${g.color}12`, border: `2px solid ${g.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, fontWeight: 700, color: g.color }}>{s.n}</div>
                    {i < totalSteps - 1 && <div style={{ width: 2, flex: 1, background: `${g.color}20`, marginTop: 4 }} />}
                  </div>
                  <div style={{ paddingTop: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NK, marginBottom: 5, fontFamily: "'IBM Plex Serif',serif" }}>{s.title}</div>
                    <div style={{ fontSize: 13.5, color: SL, lineHeight: 1.82, fontFamily: "'IBM Plex Sans',sans-serif" }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SIMULATION MODE ── */}
        {mode === "simulate" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {/* Left: Animation panel */}
              <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BD}`, borderTop: `4px solid ${g.color}`, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: g.color, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>Simulation</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NK, fontFamily: "'IBM Plex Serif',serif", marginTop: 2 }}>{g.title} — Step {simStep + 1}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setSimRunning(r => !r)} style={{ padding: "6px 14px", background: simRunning ? RED : g.color, color: WHITE, border: "none", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                      {simRunning ? "⏸ Pause" : "▶ Animate"}
                    </button>
                  </div>
                </div>
                <div style={{ padding: "20px 16px 12px", background: PAPER, minHeight: 220 }}>
                  <SimComponent step={simStep} running={simRunning} />
                </div>
                {/* Step nav */}
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${BD}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <button disabled={simStep === 0} onClick={() => { setSimStep(s => s - 1); setSimRunning(false); }} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BD}`, background: simStep === 0 ? PAPER : WHITE, cursor: simStep === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: simStep === 0 ? MID : NK, fontSize: 14 }}>‹</button>
                  <div style={{ flex: 1, display: "flex", gap: 4 }}>
                    {g.steps.map((_, i) => (
                      <button key={i} onClick={() => { setSimStep(i); setSimRunning(false); }} style={{ flex: 1, height: 6, borderRadius: 3, background: i === simStep ? g.color : i < simStep ? `${g.color}44` : BD, border: "none", cursor: "pointer", transition: "background .2s" }} />
                    ))}
                  </div>
                  <button disabled={simStep === totalSteps - 1} onClick={() => { setSimStep(s => s + 1); setSimRunning(false); }} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BD}`, background: simStep === totalSteps - 1 ? PAPER : WHITE, cursor: simStep === totalSteps - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: simStep === totalSteps - 1 ? MID : NK, fontSize: 14 }}>›</button>
                </div>
              </div>

              {/* Right: Steps list with highlight */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ background: `${g.color}0d`, border: `1px solid ${g.color}22`, borderRadius: 8, padding: "10px 14px", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: g.color === GOLD ? "#6B4800" : g.color, fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif" }}>⚠ {g.warning}</span>
                </div>
                {g.steps.map((s, i) => (
                  <button key={i} onClick={() => { setSimStep(i); setSimRunning(false); }} style={{ padding: "11px 14px", background: i === simStep ? `${g.color}10` : WHITE, border: `1.5px solid ${i === simStep ? g.color : BD}`, borderRadius: 8, cursor: "pointer", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start", transition: "all .15s" }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === simStep ? g.color : `${g.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700, color: i === simStep ? WHITE : g.color }}>{s.n}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: i === simStep ? 700 : 600, color: i === simStep ? g.color : NK, fontFamily: "'IBM Plex Serif',serif" }}>{s.title}</div>
                      {i === simStep && <div style={{ fontSize: 11.5, color: SL, marginTop: 3, lineHeight: 1.6, fontFamily: "'IBM Plex Sans',sans-serif" }}>{s.body}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VOICE INSTRUCTOR MODE ── */}
        {mode === "voice" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {/* Voice control panel */}
            <div style={{ background: NAVY, borderRadius: 12, padding: "24px 28px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 50%, ${g.color}22, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  {/* Sound wave visualiser */}
                  <div style={{ display: "flex", gap: 3, alignItems: "center", width: 42, height: 36 }}>
                    {[0.4,0.7,1,0.6,0.9,0.5,0.8].map((h, i) => (
                      <div key={i} style={{ width: 4, borderRadius: 2, background: speaking ? g.color : "rgba(255,255,255,0.2)", height: speaking ? `${h * 32}px` : "8px", animation: speaking ? `voiceWave ${0.5 + i * 0.08}s ease-in-out infinite` : "none", animationDelay: `${i * 0.06}s`, transition: "height .3s" }} />
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>Voice Instructor</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif" }}>
                      {speaking ? `Speaking — Step ${voiceStep + 1} of ${totalSteps}` : voiceAuto ? "Preparing next step..." : voicePaused ? `Paused at Step ${voiceStep + 1}` : `${g.title} — ${g.subtitle}`}
                    </div>
                  </div>
                </div>
                {!supported && <div style={{ fontSize: 12, color: "#FCA5A5", fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 12 }}>Voice not supported in this browser. Use Chrome or Edge for best results.</div>}
                {/* Progress bar */}
                <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginBottom: 16 }}>
                  <div style={{ width: `${((voiceStep + (speaking ? 0.5 : 0)) / totalSteps) * 100}%`, height: "100%", background: g.color, borderRadius: 3, transition: "width .6s ease" }} />
                </div>
                {/* Controls */}
                <div style={{ display: "flex", gap: 9 }}>
                  {!voiceAuto && !voicePaused && (
                    <button onClick={startVoice} disabled={!supported} style={{ padding: "10px 24px", background: g.color, color: WHITE, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: supported ? "pointer" : "not-allowed", fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                      ▶ Start Voice Guide
                    </button>
                  )}
                  {(voiceAuto || speaking) && (
                    <button onClick={pauseVoice} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: WHITE, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                      ⏸ Pause
                    </button>
                  )}
                  {voicePaused && (
                    <button onClick={resumeVoice} style={{ padding: "10px 20px", background: g.color, color: WHITE, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                      ▶ Resume
                    </button>
                  )}
                  {(voiceAuto || voicePaused || speaking) && (
                    <button onClick={stopVoice} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                      ⏹ Stop
                    </button>
                  )}
                  {voiceAuto && voiceStep + 1 < totalSteps && (
                    <button onClick={() => { cancel(); setVoiceStep(s => s + 1); }} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                      ⏭ Skip
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Warning */}
            <div style={{ background: `${g.color}0d`, border: `1px solid ${g.color}28`, borderRadius: 8, padding: "10px 14px", marginBottom: 18, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: g.color, flexShrink: 0 }}><IWarning /></span>
              <span style={{ fontSize: 12.5, color: g.color === GOLD ? "#6B4800" : g.color, fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.55 }}>{g.warning}</span>
            </div>

            {/* Steps — voice-highlighted */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.steps.map((s, i) => {
                const isActive = i === voiceStep && (voiceAuto || speaking || voicePaused);
                const isDone = i < voiceStep && (voiceAuto || voicePaused || speaking);
                return (
                  <div key={i} ref={isActive ? stepRef : null} style={{ background: isActive ? `${g.color}0e` : isDone ? `${GREEN}06` : WHITE, border: `1.5px solid ${isActive ? g.color : isDone ? GREEN + "40" : BD}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start", transition: "all .35s", animation: isActive ? "fadeIn .4s ease" : "none", cursor: "pointer" }}
                    onClick={() => { cancel(); setVoiceAuto(false); setVoicePaused(false); speakStep(i); setVoiceStep(i); }}>
                    {/* Status icon */}
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: isActive ? g.color : isDone ? GREEN : `${g.color}10`, border: `2px solid ${isActive ? g.color : isDone ? GREEN : g.color + "30"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .3s" }}>
                      {isDone ? <span style={{ color: WHITE, fontSize: 14 }}>✓</span>
                        : isActive && speaking ? (
                          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                            {[0,1,2].map(j => <div key={j} style={{ width: 3, borderRadius: 1.5, background: WHITE, height: 10, animation: `voiceWave ${0.4 + j * 0.1}s ease-in-out infinite`, animationDelay: `${j * 0.1}s` }} />)}
                          </div>
                        ) : <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700, color: isActive ? WHITE : g.color }}>{s.n}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? g.color : isDone ? GREEN : NK, fontFamily: "'IBM Plex Serif',serif", marginBottom: isActive ? 6 : 0, transition: "color .3s" }}>{s.title}</div>
                      {isActive && <div style={{ fontSize: 13.5, color: SL, lineHeight: 1.82, fontFamily: "'IBM Plex Sans',sans-serif" }}>{s.body}</div>}
                      {isDone && <div style={{ fontSize: 11, color: GREEN, fontFamily: "'IBM Plex Sans',sans-serif", marginTop: 2 }}>Completed</div>}
                    </div>
                    <div style={{ fontSize: 10, color: MID, fontFamily: "'IBM Plex Mono',monospace", flexShrink: 0, marginTop: 8 }}>{i + 1}/{totalSteps}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: 22, background: REDL, border: `1px solid ${RED}22`, borderRadius: 7, padding: "11px 16px" }}>
          <p style={{ fontSize: 12, color: RED, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.65 }}>
            <strong>Disclaimer:</strong> This guide is for emergency reference only and does not constitute professional medical advice. Always call emergency services (10177) for life-threatening situations. Seek professional medical evaluation after any emergency.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── TRIAGE ENGINE PAGE ───────────────────────────────────────── */



/* ══════════════════════════════════════════════════════════════
   EMERGENCY AID ENGINE — Demo Mode
   Integrated Triage + First Aid + Voice + Simulation + Analytics
   ══════════════════════════════════════════════════════════════ */

/* ── FIRST AID INSTRUCTION DATABASE ─────────────────────────── */
const AID_DB = {
  chest_pain: {
    calm: "Stay calm everyone. Keep the patient still and seated. Do not let them walk. Focus and follow each step.",
    steps: [
      { text: "Sit the patient upright or in the most comfortable position. Do not let them walk or exert themselves in any way.", tools: ["Chair", "Wall to lean against"], alt: ["Floor with back against wall"], anim: "rest" },
      { text: "Loosen all tight clothing immediately — collar, tie, belt, or bra strap. This reduces pressure and helps breathing.", tools: [], alt: ["Loosen by hand gently"], anim: "loosen" },
      { text: "If the patient is conscious and NOT allergic to aspirin — give ONE 325mg aspirin tablet. Ask them to chew it slowly.", tools: ["Aspirin 325mg"], alt: ["If none available — skip and proceed to monitoring"], anim: "medicine" },
      { text: "Monitor breathing and pulse every 30 seconds. Stay close. If breathing stops — begin CPR immediately.", tools: ["Watch or phone timer"], alt: ["Count seconds aloud"], anim: "monitor" },
      { text: "Call 10177 immediately and keep the line open. Give your exact location. Do not leave the patient alone.", tools: ["Mobile phone"], alt: ["Ask a bystander to call while you stay"], anim: "call" },
    ]
  },
  unconscious: {
    calm: "Everyone move back — give the patient at least one metre of space. Designate one person to assist. We begin now.",
    steps: [
      { text: "Tap shoulders firmly and shout their name. If no response — call 10177 immediately before doing anything else.", tools: ["Mobile phone"], alt: ["Ask bystander to call while you stay"], anim: "tap" },
      { text: "Tilt head back, lift chin, look for chest rise, listen and feel for breath for 10 seconds. Occasional gasps are not breathing.", tools: [], alt: [], anim: "airway" },
      { text: "If breathing — place in the recovery position: roll onto their side, top knee forward, head tilted back to keep airway open.", tools: [], alt: ["Use a jacket under head for comfort"], anim: "recovery" },
      { text: "If NOT breathing — begin CPR: 30 hard chest compressions (5–6 cm deep) then 2 rescue breaths. Continue until help arrives.", tools: ["AED if available"], alt: ["Compression-only CPR if not trained in rescue breaths"], anim: "cpr" },
      { text: "Check breathing every 2 minutes. Keep them warm. Do not give food or water. Stay with them until services arrive.", tools: ["Jacket or blanket"], alt: ["Any available clothing or fabric"], anim: "monitor" },
    ]
  },
  severe_bleed: {
    calm: "The situation is manageable. Clear the area. Protect yourself first. Follow each instruction precisely.",
    steps: [
      { text: "Protect yourself first — put on latex gloves or place a plastic bag over your hands before touching blood.", tools: ["Latex gloves"], alt: ["Plastic bag", "Multiple layers of clean cloth as a barrier"], anim: "gloves" },
      { text: "Apply FIRM continuous pressure directly on the wound with the cleanest material available. Do not lift once applied.", tools: ["Sterile bandage", "Clean cloth"], alt: ["T-shirt", "Sanitary pad — highly absorbent", "Any clean fabric"], anim: "pressure" },
      { text: "If blood soaks through — do NOT lift the dressing. Add more material on top and press harder. Lifting disturbs clot formation.", tools: ["Additional cloth layers"], alt: ["Any clean absorbent material stacked on top"], anim: "layer" },
      { text: "Raise the bleeding limb above heart level if NO fracture is suspected. Use a bag or backpack to prop it up.", tools: ["Bag", "Backpack", "Rolled clothing"], alt: ["Any raised stable object the limb can rest on"], anim: "elevate" },
      { text: "If bleeding is life-threatening and uncontrolled on a limb — apply tourniquet 5 cm above wound. Note exact time applied. Last resort only.", tools: ["Commercial tourniquet", "Belt", "Necktie"], alt: ["Torn shirt strip twisted tight with a pen or stick"], anim: "tourniquet" },
    ]
  },
  choking: {
    calm: "Stay calm. If the patient can cough — stand back and let them cough. Only act if coughing stops. Follow now.",
    steps: [
      { text: "Ask: Are you choking? If they can cough effectively — step back and encourage them. Do not interfere with effective coughing.", tools: [], alt: [], anim: "cough" },
      { text: "If they cannot cough or breathe — lean them forward and deliver 5 firm back blows with the heel of your hand between shoulder blades. Check the mouth after each.", tools: [], alt: [], anim: "backblow" },
      { text: "If object not expelled — move to abdominal thrusts: stand behind, make a fist above the navel, cover with other hand, give 5 sharp inward-upward thrusts.", tools: [], alt: [], anim: "thrust" },
      { text: "Alternate: 5 back blows then 5 abdominal thrusts. Check inside the mouth after each set. Remove object ONLY if clearly visible.", tools: [], alt: [], anim: "alternate" },
      { text: "If the patient loses consciousness — lower them to the floor carefully and begin CPR immediately. Call 10177.", tools: ["Mobile phone"], alt: [], anim: "cpr" },
    ]
  },
  seizure: {
    calm: "Do not restrain the patient. Clear the space around them. Time the seizure from this moment. Stay close.",
    steps: [
      { text: "Clear all hard or sharp objects from around the patient immediately. Do NOT restrain them — this causes injury.", tools: [], alt: [], anim: "clear" },
      { text: "Protect the patient's head — place something soft underneath it. A folded jacket, bag, or clothing works perfectly.", tools: ["Jacket", "Sweater", "Bag"], alt: ["Your hands if nothing else is available"], anim: "head" },
      { text: "Time the seizure now. If it lasts more than 5 minutes — call 10177 immediately.", tools: ["Watch or phone timer"], alt: ["Count the seconds aloud"], anim: "timer" },
      { text: "When convulsions stop — gently roll onto their side into the recovery position to prevent choking on saliva.", tools: [], alt: [], anim: "recovery" },
      { text: "Stay with them as they regain consciousness. Speak calmly. Do NOT give food, water, or any medication until fully alert.", tools: [], alt: [], anim: "comfort" },
    ]
  },
  allergic: {
    calm: "This may be anaphylaxis. Act immediately and calmly. Every second matters. Follow now.",
    steps: [
      { text: "Ask immediately: Do you have an EpiPen? If yes — retrieve it and inject into the outer thigh, through clothing if needed. Press and hold 10 seconds.", tools: ["EpiPen / Epinephrine auto-injector"], alt: ["If no EpiPen — call 10177 immediately and proceed to step 3"], anim: "epipen" },
      { text: "Call 10177 immediately even after EpiPen use. The patient MUST go to hospital.", tools: ["Mobile phone"], alt: [], anim: "call" },
      { text: "Lay the patient flat and raise their legs — unless they are having difficulty breathing, in which case keep them seated upright.", tools: [], alt: ["Use a bag or backpack to prop legs"], anim: "flat" },
      { text: "Monitor breathing constantly. If breathing stops — begin CPR immediately.", tools: [], alt: [], anim: "monitor" },
      { text: "If symptoms return after 15 minutes and a second EpiPen is available — administer it. Do NOT substitute antihistamines.", tools: ["Second EpiPen if available"], alt: [], anim: "medicine" },
    ]
  },
  burns: {
    calm: "The immediate danger is past. We treat the burn correctly now. The order of these steps matters.",
    steps: [
      { text: "Run COOL — not cold or iced — running water over the burn for a full 20 minutes. Start this immediately.", tools: ["Running tap", "Water bottle"], alt: ["Any clean cool water source"], anim: "water" },
      { text: "While cooling — do NOT apply ice, butter, toothpaste, oil, or any cream. Do NOT burst any blisters.", tools: [], alt: [], anim: "noice" },
      { text: "Remove clothing and jewellery from around the burn carefully — ONLY if not stuck to the skin.", tools: ["Scissors"], alt: ["Loosen by hand — stop if stuck"], anim: "remove" },
      { text: "After 20 minutes — cover the burn loosely with a non-fluffy sterile dressing or cling film. Do NOT wrap tightly.", tools: ["Sterile dressing", "Cling film"], alt: ["Clean plastic bag", "Non-fluffy cloth"], anim: "cover" },
      { text: "Seek emergency care for any burn larger than 3 cm, burns on face, hands, feet, genitals, or burns in children.", tools: ["Mobile phone — call 10177"], alt: [], anim: "call" },
    ]
  },
  high_fever: {
    calm: "Stay calm. The patient needs to cool down and rest. Move to a cool space now.",
    steps: [
      { text: "Move the patient to a cool, shaded, ventilated area. Remove excess clothing to help the body release heat.", tools: [], alt: ["Fan with paper if no ventilation"], anim: "cool" },
      { text: "Give cool water to drink slowly if conscious and able to swallow — 250ml every 15 minutes.", tools: ["Water bottle or cup"], alt: ["Ice chips if available"], anim: "hydrate" },
      { text: "Place a cool damp cloth on the forehead, neck, wrists, and armpits. Replace frequently as it warms.", tools: ["Cloth or paper towel", "Cool water"], alt: ["Wet shirt fabric", "Ice pack wrapped in cloth"], anim: "cloth" },
      { text: "Give paracetamol or ibuprofen at the correct dose if available and not allergic.", tools: ["Paracetamol 500mg–1g", "Ibuprofen 400mg"], alt: ["Aspirin for adults only — NOT for children under 16"], anim: "medicine" },
      { text: "Call 10177 if temperature stays above 39°C after 30 minutes, patient is a child, or there is neck stiffness or a rash.", tools: ["Thermometer", "Phone"], alt: ["Hot forehead with sweating signals over 38°C"], anim: "call" },
    ]
  },
  limb_injury: {
    calm: "Keep the patient still. Do not attempt to straighten the limb. Stabilise exactly as found.",
    steps: [
      { text: "Do NOT attempt to straighten, realign, or move the injured limb. Immobilise it exactly in the position it was found.", tools: [], alt: [], anim: "still" },
      { text: "Build an improvised splint — pad the limb with soft material, place rigid supports on both sides, and secure loosely.", tools: ["Rolled newspaper", "Cardboard", "Umbrella"], alt: ["Stiff board or stick", "Rolled clothing as padding"], anim: "splint" },
      { text: "Apply a cold pack wrapped in cloth to reduce swelling — 20 minutes on, then 20 minutes off.", tools: ["Ice pack"], alt: ["Frozen food bag wrapped in cloth", "Cold water bottle"], anim: "ice" },
      { text: "Elevate the limb gently above heart level where possible to reduce swelling.", tools: ["Bag", "Pillow", "Rolled clothing"], alt: [], anim: "elevate" },
      { text: "Watch for danger signs: extreme pain on movement, pale or blue skin below the injury, numbness. If present — call 10177 immediately.", tools: ["Mobile phone"], alt: [], anim: "monitor" },
    ]
  },
  breath: {
    calm: "Everyone give the patient space and fresh air. No crowding. Calm voice only. Follow now.",
    steps: [
      { text: "Help the patient into an upright sitting position — leaning slightly forward with hands on knees is best for breathing. Never lay flat.", tools: ["Chair", "Surface to lean on"], alt: ["Sitting on floor leaning against wall"], anim: "upright" },
      { text: "Loosen all tight clothing around the neck and chest — collar, tie, bra strap, belt.", tools: [], alt: ["Loosen by hand gently"], anim: "loosen" },
      { text: "If they have a prescribed blue reliever inhaler — retrieve it now. 2 puffs, wait 1 minute, then 2 more puffs if no improvement.", tools: ["Blue reliever inhaler"], alt: ["Fan gently with paper if no inhaler"], anim: "inhaler" },
      { text: "Guide the patient to breathe slowly — in through the nose for 4 counts, out for 6 counts. Breathe visibly with them to help them regulate.", tools: [], alt: [], anim: "breathe" },
      { text: "If no improvement in 5 minutes or patient turns blue — call 10177 immediately and continue monitoring.", tools: ["Mobile phone"], alt: [], anim: "call" },
    ]
  },
};

/* ── STEP ANIMATION COMPONENT ─────────────────────────────────── */
function StepAnim({ type, color, running }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!running) { setF(0); return; }
    const t = setInterval(() => setF(n => (n + 1) % 16), 300);
    return () => clearInterval(t);
  }, [running]);
  const p = f % 2 === 0;
  const W = 260, H = 150;

  const scenes = {
    rest: <><rect x={30} y={100} width={200} height={35} rx={9} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={62} cy={92} r={18} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={140} cy={112} rx={65} ry={19} fill="#BFDBFE" stroke="#60A5FA" strokeWidth={1}/><path d="M82 80 Q96 68 108 74" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">SIT UPRIGHT · DO NOT WALK</text>{running&&<circle cx={220} cy={28} r={p?8:5} fill={color} opacity={0.5}/>}</>,
    loosen: <><circle cx={110} cy={44} r={22} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={110} cy={95} rx={32} ry={42} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><line x1={94} y1={64} x2={126} y2={64} stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={running?(p?"none":"5 4"):"none"}/><path d="M126 64 L138 54" stroke={color} strokeWidth={2} strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">LOOSEN CLOTHING</text></>,
    pressure: <><ellipse cx={130} cy={108} rx={72} ry={28} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={130} cy={100} rx={22} ry={13} fill="#8B1A1A" opacity={0.55}/><ellipse cx={130} cy={running?94-(p?5:0):94} rx={26} ry={12} fill={color} opacity={0.85}/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">FIRM DIRECT PRESSURE</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">t-shirt · cloth · bandage · sanitary pad</text>{running&&<text x={162} y={92} fontSize={9} fill={color} fontFamily="monospace">{p?"↓ PRESS":"HOLD"}</text>}</>,
    layer: <><ellipse cx={130} cy={110} rx={72} ry={26} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>{[0,1,2].map(i=><rect key={i} x={88} y={88-i*11} width={84} height={22} rx={4} fill={`rgba(30,64,175,${0.28+i*0.22})`} stroke="#3B82F6" strokeWidth={1}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">ADD LAYERS — DON'T LIFT</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">stack on top · press harder</text>{running&&<text x={178} y={86} fontSize={9} fill={NAVY} fontFamily="monospace">{p?"ADD ↓":"HOLD"}</text>}</>,
    elevate: <><rect x={70} y={90} width={120} height={36} rx={11} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><path d={`M130 ${running?82-(p?6:0):84} L130 ${running?50-(p?3:0):55}`} stroke={color} strokeWidth={3} strokeLinecap="round"/><path d="M118 60 L130 46 L142 60" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/><rect x={96} y={126} width={68} height={14} rx={4} fill="#6B7280" opacity={0.45}/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">ELEVATE ABOVE HEART</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">bag · backpack · rolled clothing</text></>,
    tourniquet: <><rect x={78} y={74} width={104} height={60} rx={16} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><rect x={72} y={76} width={20} height={56} rx={5} fill={RED} opacity={0.75}/><text x={82} y={86} textAnchor="middle" fontSize={7} fill={WHITE} fontFamily="monospace" fontWeight="bold">5cm</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">TOURNIQUET — LAST RESORT</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">belt · tie · note the exact time</text>{running&&<text x={98} y={68} fontSize={9} fill={RED} fontFamily="monospace">{p?"TIGHTEN ↗":"NOTE TIME"}</text>}</>,
    call: <><rect x={95} y={38} width={70} height={90} rx={10} fill="#1A2766" stroke={color} strokeWidth={2}/><rect x={101} y={48} width={58} height={42} rx={4} fill="#60A5FA" opacity={0.7}/><circle cx={130} cy={108} r={6} fill="rgba(255,255,255,0.3)"/><text x={130} y={72} textAnchor="middle" fontSize={16} fontFamily="sans-serif">📞</text><text x={130} y={24} textAnchor="middle" fontSize={12} fill={RED} fontFamily="monospace" fontWeight="bold">CALL 10177</text>{running&&[1,2,3].map(i=><circle key={i} cx={130} cy={80} r={i*9+(p?4:0)} fill="none" stroke={color} strokeWidth={1} opacity={0.4-i*0.1}/>)}<text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">keep line open · give location</text></>,
    monitor: <><rect x={44} y={50} width={172} height={62} rx={8} fill="#0F172A" stroke={color} strokeWidth={1.5}/><path d={`M54 80 L80 80 L92 ${p&&running?55:80} L104 ${p&&running?105:80} L116 80 L128 80 L140 ${running?(f%3===0?58:82):80} L185 80 L196 80`} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">MONITOR VITAL SIGNS</text><text x={130} y={128} textAnchor="middle" fontSize={9} fill={color} fontFamily="monospace">check every 30 seconds</text></>,
    recovery: <><ellipse cx={130} cy={106} rx={88} ry={26} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={56} cy={94} r={18} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><path d="M74 100 Q106 82 152 88 Q174 90 188 98" stroke="#93C5FD" strokeWidth={3.5} strokeLinecap="round"/><path d="M130 80 L130 58 Q136 50 148 54" stroke="#60A5FA" strokeWidth={2.5} fill="none" strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">RECOVERY POSITION</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">side · knee forward · head tilted</text></>,
    cpr: <><ellipse cx={130} cy={106} rx={88} ry={24} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={52} cy={96} r={17} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={130} cy={98} rx={36} ry={17} fill="#BFDBFE" stroke="#60A5FA"/><ellipse cx={130} cy={running?(p?88:96):92} rx={19} ry={10} fill={NAVY} opacity={0.88}/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">{running?(p?"↓ COMPRESS":"↑ RELEASE"):"30:2 CPR"}</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">100–120 BPM · 5–6 cm deep</text></>,
    medicine: <><rect x={102} y={38} width={56} height={76} rx={10} fill="#EDE9FE" stroke="#7C3AED" strokeWidth={1.5}/><rect x={102} y={38} width={56} height={38} rx={10} fill="#7C3AED" opacity={0.6}/><text x={130} y={64} textAnchor="middle" fontSize={18} fontFamily="sans-serif">💊</text><text x={130} y={100} textAnchor="middle" fontSize={9} fill="#4C1D95" fontFamily="monospace">CHEW SLOWLY</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">ADMINISTER MEDICATION</text><text x={130} y={130} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">aspirin · paracetamol · epipen</text>{running&&<circle cx={130} cy={34} r={p?7:4} fill="#7C3AED" opacity={0.45}/>}</>,
    tap: <><circle cx={130} cy={64} r={25} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={130} cy={110} rx={34} ry={28} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><path d={`M102 ${running&&p?77:82} L96 ${running&&p?68:74} M158 ${running&&p?77:82} L164 ${running&&p?68:74}`} stroke={ORANGE} strokeWidth={3.5} strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">CHECK RESPONSIVENESS</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">tap · shout · 10 sec</text>{running&&<text x={88} y={56} fontSize={11} textAnchor="middle" fontFamily="sans-serif">{p?"TAP!":"..."}</text>}</>,
    airway: <><circle cx={130} cy={64} r={32} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><path d="M114 78 Q130 70 146 78" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round"/><path d={`M130 96 Q130 ${running?(p?108:116):110} 130 ${running?(p?120:132):122}`} stroke="#60A5FA" strokeWidth={3.5} strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">OPEN AIRWAY</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">tilt · chin lift · look listen feel</text>{running&&<text x={168} y={112} fontSize={9} fill={color} fontFamily="monospace">{p?"LOOK ▸":"FEEL ▸"}</text>}</>,
    gloves: <>{[64,148].map((x,i)=><g key={i}><path d={`M${x} 64 L${x} 98 Q${x} 115 ${x+22} 115 L${x+22} 64 Q${x+22} 47 ${x+11} 45 Q${x} 47 ${x} 64`} fill="#BBF7D0" stroke={GREEN} strokeWidth={1.5}/><path d={`M${x+4} 64 L${x+4} 52 M${x+10} 62 L${x+10} 49 M${x+16} 62 L${x+16} 49 M${x+21} 64 L${x+21} 52`} stroke={GREEN} strokeWidth={2} strokeLinecap="round"/></g>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">PROTECT YOURSELF FIRST</text><text x={130} y={128} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">gloves · plastic bag · cloth barrier</text></>,
    cough: <><circle cx={100} cy={64} r={24} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={100} cy={108} rx={30} ry={36} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/>{running&&[1,2,3].map(i=><path key={i} d={`M128 66 Q${136+i*14} ${58+(p?0:6)} ${150+i*17} 64`} stroke={ORANGE} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8-i*0.22}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">ENCOURAGE COUGHING</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">stand back · let them cough</text></>,
    backblow: <><ellipse cx={96} cy={102} rx={30} ry={38} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={96} cy={58} r={20} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={170} cy={102} rx={24} ry={32} fill="#FEF3C7" stroke="#D97706" strokeWidth={1.5}/><circle cx={170} cy={64} r={16} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><path d={`M160 87 Q${running?130-(p?6:0):134} 87 120 92`} stroke={ORANGE} strokeWidth={9} strokeLinecap="round" fill="none"/>{running&&[0,1,2].map(i=><circle key={i} cx={122} cy={92} r={7+i*6} fill="none" stroke={ORANGE} strokeWidth={1} opacity={p?0.45-i*0.12:0.15}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">5 BACK BLOWS</text></>,
    thrust: <><ellipse cx={130} cy={102} rx={30} ry={38} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={130} cy={56} r={20} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={82} cy={102} rx={20} ry={30} fill="#FEF3C7" stroke="#D97706" strokeWidth={1.5}/><ellipse cx={running?(108-(p?6:0)):108} cy={100} rx={12} ry={8} fill={ORANGE} opacity={0.88}/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">ABDOMINAL THRUSTS</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">inward and upward</text></>,
    alternate: <><rect x={22} y={58} width={96} height={34} rx={7} fill={`${ORANGE}28`} stroke={ORANGE} strokeWidth={1.5}/><text x={70} y={79} textAnchor="middle" fontSize={10} fill={ORANGE} fontFamily="monospace" fontWeight="bold">5 BACK BLOWS</text><rect x={142} y={58} width={96} height={34} rx={7} fill={`${RED}20`} stroke={RED} strokeWidth={1.5}/><text x={190} y={79} textAnchor="middle" fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">5 THRUSTS</text><path d="M118 75 L142 75" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">ALTERNATE UNTIL CLEAR</text>{running&&<circle cx={p?70:190} cy={110} r={7} fill={p?ORANGE:RED} opacity={0.8}/>}<text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">check mouth after each set</text></>,
    epipen: <><rect x={116} y={22} width={24} height={80} rx={6} fill="#EF4444" opacity={0.88}/><rect x={122} y={100} width={12} height={18} rx={3} fill="#DC2626"/><ellipse cx={175} cy={106} rx={40} ry={20} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><path d={`M128 ${running?(p?100:105):104} L175 106`} stroke={RED} strokeWidth={2.5} strokeLinecap="round"/><text x={130} y={14} textAnchor="middle" fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">EpiPen — OUTER THIGH</text><text x={130} y={130} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">through clothing · hold 10 sec</text></>,
    flat: <><rect x={22} y={96} width={216} height={30} rx={7} fill="#E8EDF5" stroke={BD} strokeWidth={1}/><circle cx={56} cy={94} r={18} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={148} cy={100} rx={72} ry={18} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1}/><path d={`M174 ${running?(p?76:80):78} L174 96 M160 86 L174 ${running?(p?76:80):78} L188 86`} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">LAY FLAT · ELEVATE LEGS</text></>,
    water: <><path d="M110 18 Q116 6 130 12 Q144 6 150 18 L156 72 Q156 96 130 96 Q104 96 104 72 Z" fill="#60A5FA" opacity={0.55} stroke="#3B82F6" strokeWidth={1.5}/>{running&&[0,1,2,3].map(i=><ellipse key={i} cx={102+i*12} cy={108+(f+i*3)%7*5} rx={2.5} ry={4+i} fill="#60A5FA" opacity={0.5}/>)}<rect x={80} y={102} width={100} height={30} rx={7} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1}/><text x={130} y={140} textAnchor="middle" fontSize={9} fill="#1D4ED8" fontFamily="monospace" fontWeight="bold">COOL WATER · 20 MIN</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace">NOT ice · NOT cold</text></>,
    noice: <>{["❌ Ice","❌ Butter","❌ Cream","❌ Toothpaste"].map((t,i)=><g key={i}><rect x={24+(i%2)*122} y={34+Math.floor(i/2)*52} width={110} height={38} rx={7} fill={REDL} stroke={RED} strokeWidth={1.2}/><text x={79+(i%2)*122} y={58+Math.floor(i/2)*52} textAnchor="middle" fontSize={11} fill={RED} fontFamily="monospace" fontWeight="bold">{t}</text></g>)}<text x={130} y={14} textAnchor="middle" fontSize={10} fill={RED} fontFamily="monospace" fontWeight="bold">COOL RUNNING WATER ONLY</text></>,
    remove: <><rect x={76} y={84} width={108} height={50} rx={16} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><rect x={76} y={84} width={42} height={50} rx={16} fill="#4B5563" opacity={0.45}/><path d={`M76 110 L${running?(p?46:52):50} ${running?(p?96:100):98}`} stroke={ORANGE} strokeWidth={2.5} strokeLinecap="round"/><path d="M50 98 L38 86 M50 98 L42 108" stroke={ORANGE} strokeWidth={2} strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">REMOVE — IF NOT STUCK</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={RED} fontFamily="monospace">stop immediately if stuck to skin</text></>,
    cover: <><rect x={76} y={96} width={108} height={40} rx={16} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><rect x={72} y={86} width={116} height={22} rx={7} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5} opacity={0.88}/><text x={130} y={100} textAnchor="middle" fontSize={9} fill={NAVY} fontFamily="monospace">loose cover only</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">COVER LOOSELY</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">cling film · sterile dressing</text></>,
    clear: <><ellipse cx={130} cy={108} rx={60} ry={24} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/>{[46,104,180,200].map((x,i)=><rect key={i} x={x} y={[88,96,84,92][i]} width={16} height={22} rx={3} fill={BD} opacity={0.55}/>)}{running&&[46,180,200].map((x,i)=><path key={i} d={`M${x+8} ${[88,84,92][i]} L${[24,200,218][i]} 62`} stroke={color} strokeWidth={2} strokeDasharray="3 2" opacity={0.65}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">CLEAR THE AREA</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">remove all hard and sharp objects</text></>,
    head: <><ellipse cx={130} cy={108} rx={84} ry={22} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={60} cy={96} r={19} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={60} cy={114} rx={20} ry={12} fill="#6B7280" opacity={0.5}/><text x={60} y={118} textAnchor="middle" fontSize={8} fill={WHITE} fontFamily="monospace">jacket</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">PROTECT THE HEAD</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">jacket · bag · sweater underneath</text></>,
    timer: <><circle cx={130} cy={82} r={48} fill={WHITE} stroke={color} strokeWidth={2}/><circle cx={130} cy={82} r={3} fill={NAVY}/><path d="M130 82 L130 46" stroke={NAVY} strokeWidth={3} strokeLinecap="round"/><path d={`M130 82 L${130+36*Math.sin((f*22.5)*Math.PI/180)} ${82-36*Math.cos((f*22.5)*Math.PI/180)}`} stroke={color} strokeWidth={2.5} strokeLinecap="round"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">TIME THE SEIZURE</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={RED} fontFamily="monospace">5 min = call 10177</text></>,
    comfort: <><circle cx={130} cy={68} r={28} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><path d="M118 76 Q130 88 142 76" stroke="#F59E0B" strokeWidth={2} fill="none" strokeLinecap="round"/>{running&&[0,1,2].map(i=><circle key={i} cx={94+i*22} cy={36} r={p?6+i:4+i} fill={color} opacity={0.28+i*0.1}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">REASSURE THE PATIENT</text><text x={130} y={110} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">speak calmly · stay present</text></>,
    still: <><rect x={72} y={88} width={116} height={40} rx={11} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><line x1={60} y1={72} x2={200} y2={72} stroke={RED} strokeWidth={3.5} strokeDasharray="10 5" strokeLinecap="round"/><text x={130} y={66} textAnchor="middle" fontSize={9} fill={RED} fontFamily="monospace">DO NOT MOVE</text>{running&&<text x={130} y={42} textAnchor="middle" fontSize={12} fill={RED} fontFamily="monospace" fontWeight="bold">{p?"⛔ STOP":"⛔ STILL"}</text>}<text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">hold in exact position found</text></>,
    splint: <><rect x={62} y={78} width={136} height={40} rx={14} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><rect x={54} y={75} width={14} height={47} rx={3} fill="#92400E" opacity={0.7}/><rect x={192} y={75} width={14} height={47} rx={3} fill="#92400E" opacity={0.7}/><line x1={62} y1={88} x2={198} y2={88} stroke={color} strokeWidth={2} strokeDasharray="7 4"/><line x1={62} y1={108} x2={198} y2={108} stroke={color} strokeWidth={2} strokeDasharray="7 4"/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">IMPROVISED SPLINT</text><text x={130} y={138} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">newspaper · cardboard · umbrella</text></>,
    ice: <><rect x={82} y={40} width={96} height={66} rx={12} fill="#DBEAFE" stroke="#3B82F6" strokeWidth={2}/><text x={130} y={82} textAnchor="middle" fontSize={24} fontFamily="sans-serif">🧊</text><rect x={76} y={106} width={108} height={32} rx={9} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.2}/><text x={130} y={140} textAnchor="middle" fontSize={9} fill="#1D4ED8" fontFamily="monospace">20 min ON · 20 min OFF</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace">wrap in cloth first!</text></>,
    cool: <><ellipse cx={130} cy={108} rx={38} ry={26} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><circle cx={130} cy={94} r={20} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/>{running&&[0,1,2,3,4].map(i=><path key={i} d={`M${32+i*44} 46 Q${54+i*44} ${36+(p?6:0)} ${76+i*44} 46`} stroke="#60A5FA" strokeWidth={1.5} fill="none" opacity={0.5+i*0.06}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">COOL ENVIRONMENT</text><text x={130} y={140} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">shade · airflow · remove clothing</text></>,
    hydrate: <><rect x={104} y={46} width={52} height={78} rx={9} fill="#DBEAFE" stroke="#3B82F6" strokeWidth={1.5}/><rect x={104} y={46+(running?78-f*4.9:28)} width={52} height={running?f*4.9:28} rx={4} fill="#60A5FA" opacity={0.6}/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">HYDRATE SLOWLY</text><text x={130} y={136} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">250ml every 15 minutes</text></>,
    cloth: <><circle cx={130} cy={64} r={26} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><rect x={96} y={44} width={68} height={18} rx={5} fill="#DBEAFE" stroke="#60A5FA" strokeWidth={1.5} opacity={running?(p?0.95:0.45):0.7}/><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">COOL CLOTH</text><text x={130} y={102} textAnchor="middle" fontSize={9} fill="#1D4ED8" fontFamily="monospace">forehead · neck · wrists · armpits</text><text x={130} y={114} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">replace as it warms up</text></>,
    upright: <><circle cx={130} cy={48} r={20} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1.5}/><ellipse cx={130} cy={100} rx={32} ry={44} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5}/><path d="M98 100 L110 126 M162 100 L150 126" stroke="#93C5FD" strokeWidth={4.5} strokeLinecap="round"/>{running&&[0,1,2].map(i=><path key={i} d={`M${112+i*14} 72 L${112+i*14} ${66-(p?4:0)}`} stroke="#60A5FA" strokeWidth={1.5} opacity={0.6}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">SIT UPRIGHT · LEAN FORWARD</text></>,
    inhaler: <><rect x={106} y={34} width={32} height={64} rx={9} fill="#60A5FA" stroke="#2563EB" strokeWidth={1.5}/><rect x={112} y={98} width={20} height={26} rx={5} fill="#3B82F6"/>{running&&p&&[0,1].map(i=><ellipse key={i} cx={118+i*22} cy={88+i*9} rx={5+i*3} ry={2.5} fill="#60A5FA" opacity={0.5}/>)}<text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">RELIEVER INHALER</text><text x={130} y={132} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">2 puffs · wait 1 min · 2 more</text></>,
    breathe: <><circle cx={130} cy={64} r={running?(p?36:24):28} fill="#DBEAFE" opacity={0.45} style={{transition:"r .5s"}}/><circle cx={130} cy={64} r={24} fill="#DBEAFE" stroke="#60A5FA" strokeWidth={running?3:1.5} style={{transition:"stroke-width .3s"}}/><text x={130} y={70} textAnchor="middle" fontSize={12} fill={NAVY} fontFamily="monospace" fontWeight="bold">{running?(p?"IN  4":"OUT 6"):"BREATHE"}</text><text x={130} y={24} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" fontWeight="bold">CONTROLLED BREATHING</text><text x={130} y={106} textAnchor="middle" fontSize={9} fill={MID} fontFamily="monospace">in 4 counts · out 6 counts</text><text x={130} y={118} textAnchor="middle" fontSize={9} fill={color} fontFamily="monospace">breathe visibly WITH the patient</text></>,
  };
  const scene = scenes[type] || scenes.monitor;
  return (
    <div style={{background:PAPER,borderRadius:10,padding:"10px 8px 6px",border:`1px solid ${BD}`}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxWidth:W,display:"block",margin:"0 auto"}}>{scene}</svg>
    </div>
  );
}

/* ── DEMO ANALYTICS STORE ─────────────────────────────────────── */
const DEMO_LOG = [
  { id: 1748200000001, ts: new Date(Date.now()-86400000).toISOString(), symptoms:["chest_pain"],  risk:"High",     location:"Library Block",    responseTime:4.2 },
  { id: 1748200000002, ts: new Date(Date.now()-43200000).toISOString(), symptoms:["seizure"],     risk:"Critical", location:"Sports Field",      responseTime:2.8 },
  { id: 1748200000003, ts: new Date(Date.now()-21600000).toISOString(), symptoms:["limb_injury"], risk:"Moderate", location:"Parking Lot B",     responseTime:7.1 },
  { id: 1748200000004, ts: new Date(Date.now()-7200000).toISOString(),  symptoms:["high_fever"],  risk:"Moderate", location:"Lecture Hall 3",    responseTime:5.6 },
  { id: 1748200000005, ts: new Date(Date.now()-3600000).toISOString(),  symptoms:["breath"],      risk:"High",     location:"Res Block C",       responseTime:3.3 },
];
const SESSION_LOG = [];
function logSession(inc) { SESSION_LOG.unshift(inc); }

/* ── EMERGENCY ALERT OVERLAY ─────────────────────────────────── */
function EmergencyAlert({ risk, onDismiss }) {
  const [dispatched, setDispatched] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setDispatched(true), 2200);
    const t2 = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, []);
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const personnel = [
    { name:"Campus Security", num:"Ext 10 / +27 13 002 0010", icon:"🛡️" },
    { name:"Campus Clinic / Nurse", num:"+27 13 002 0200", icon:"🏥" },
    { name:"National EMS — 10177", num:"National Emergency Line", icon:"🚑" },
  ];
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn .3s ease"}}>
      <div style={{background:WHITE,borderRadius:16,maxWidth:480,width:"100%",overflow:"hidden",boxShadow:`0 0 0 4px ${RED},0 28px 90px rgba(0,0,0,0.55)`}}>
        <div style={{background:RED,padding:"16px 22px",display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:30,animation:"alertPulse 1s infinite"}}>🚨</div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:2,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif"}}>Automatic Emergency Alert — Demo</div>
            <div style={{fontSize:19,fontWeight:800,color:WHITE,fontFamily:"'IBM Plex Serif',serif",marginTop:2}}>{risk.level} Risk Detected — {risk.code}</div>
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:700,color:WHITE}}>{fmt(elapsed)}</div>
        </div>
        <div style={{padding:"20px 22px"}}>
          <p style={{fontSize:12.5,color:MID,fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:14}}>The following personnel have been notified automatically:</p>
          {personnel.map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:dispatched?GREENL:"#FFF7ED",borderRadius:7,marginBottom:8,border:`1px solid ${dispatched?GREEN+"28":ORANGE+"28"}`,transition:"background .4s"}}>
              <span style={{fontSize:22}}>{p.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:NK,fontFamily:"'IBM Plex Sans',sans-serif"}}>{p.name}</div>
                <div style={{fontSize:11.5,color:MID,fontFamily:"'IBM Plex Sans',sans-serif"}}>{p.num}</div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:dispatched?GREEN:ORANGE,fontFamily:"'IBM Plex Sans',sans-serif",display:"flex",alignItems:"center",gap:5}}>
                {dispatched?<>✓ Notified</>:<><span style={{display:"inline-block",width:9,height:9,borderRadius:"50%",border:`2px solid ${ORANGE}`,borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/> Sending…</>}
              </div>
            </div>
          ))}
          <div style={{background:`${NAVY}0d`,border:`1px solid ${NAVY}20`,borderRadius:8,padding:"10px 14px",marginTop:14,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>📍</span>
            <div>
              <div style={{fontSize:11.5,fontWeight:700,color:NAVY,fontFamily:"'IBM Plex Sans',sans-serif"}}>Live Location Shared</div>
              <div style={{fontSize:12,color:SL,fontFamily:"'IBM Plex Sans',sans-serif"}}>UMP Main Campus, Mbombela — GPS coordinates transmitted to all responders</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            {[["Response Target","≤ 5 min"],["Status",dispatched?"Alert Sent":"Dispatching"],["Mode","Demo"]].map(([l,v])=>(
              <div key={l} style={{flex:1,background:PAPER,borderRadius:7,padding:"9px 10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:MID,textTransform:"uppercase",letterSpacing:1,fontFamily:"'IBM Plex Sans',sans-serif"}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:NK,fontFamily:"'IBM Plex Mono',monospace",marginTop:3}}>{v}</div>
              </div>
            ))}
          </div>
          <button onClick={onDismiss} style={{width:"100%",padding:"13px",background:NAVY,color:WHITE,border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
            Continue First Aid Instructions →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ANALYTICS PAGE ───────────────────────────────────────────── */
function AnalyticsPage({ setPage }) {
  const all = [...SESSION_LOG, ...DEMO_LOG];
  const byRisk = all.reduce((a,i)=>{ a[i.risk]=(a[i.risk]||0)+1; return a; },{});
  const withRT = all.filter(i=>i.responseTime);
  const avgRT = withRT.length ? (withRT.reduce((a,i)=>a+i.responseTime,0)/withRT.length).toFixed(1) : "—";
  const hotspots = all.reduce((a,i)=>{ a[i.location]=(a[i.location]||0)+1; return a; },{});
  const topSpots = Object.entries(hotspots).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const RC = { Critical:RED, High:"#B85000", Moderate:"#7A6000", Low:GREEN };

  return (
    <div style={{minHeight:"100vh",background:PAPER,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes alertPulse{0%,100%{box-shadow:0 0 0 0 rgba(184,48,24,0.5)}70%{box-shadow:0 0 0 14px rgba(184,48,24,0)}}`}</style>
      <div style={{background:NAVY,borderBottom:`3px solid ${GOLD}`}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 5%",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src={LOGO} alt="UMP" style={{height:38,objectFit:"contain",mixBlendMode:"lighten"}}/>
            <div style={{borderLeft:"1px solid rgba(255,255,255,0.15)",paddingLeft:12}}>
              <div style={{fontSize:10,fontWeight:700,color:WHITE,letterSpacing:1.8,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif"}}>UMP-CEIS</div>
              <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",fontFamily:"'IBM Plex Sans',sans-serif"}}>Response Analytics — Demo Mode</div>
            </div>
          </div>
          <button onClick={()=>setPage("landing")} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",color:"rgba(255,255,255,0.7)",borderRadius:4,padding:"7px 16px",fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>← Back</button>
        </div>
      </div>
      <div style={{maxWidth:1060,margin:"0 auto",padding:"36px 5% 60px",animation:"fadeIn .4s ease"}}>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:10.5,fontWeight:700,color:MID,letterSpacing:1.8,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:6}}>Phase 4 · Real-Time Intelligence</div>
          <h1 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:"clamp(22px,3vw,30px)",fontWeight:700,color:NK,letterSpacing:-0.5,marginBottom:6}}>Incident Analytics Dashboard</h1>
          <p style={{fontSize:12.5,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>GET /analytics/incident-trends · GET /analytics/response-times · GET /analytics/location-hotspots</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:26}}>
          {[[`${all.length}`,"Total Incidents","all time",NAVY],[`${avgRT} min`,"Avg Response","from alert to arrival",GREEN],[`${byRisk.Critical||0}`,"Critical Alerts","P1 — ambulance dispatched",RED],[`${all.filter(i=>["Critical","High"].includes(i.risk)).length}`,"Auto-Dispatched","auto-alert triggered",ORANGE]].map(([v,l,s,c])=>(
            <div key={l} style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:10,borderTop:`3px solid ${c}`,padding:"16px 18px"}}>
              <div style={{fontSize:9.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:6}}>{l}</div>
              <div style={{fontSize:30,fontWeight:800,color:c,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1}}>{v}</div>
              <div style={{fontSize:10.5,color:MID,fontFamily:"'IBM Plex Sans',sans-serif",marginTop:5}}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:22}}>
          <div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${BD}`}}>
              <div style={{fontSize:9.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'IBM Plex Sans',sans-serif"}}>Incident Trends — /analytics/incident-trends</div>
              <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>Risk Level Distribution</div>
            </div>
            <div style={{padding:"18px"}}>
              {["Critical","High","Moderate","Low"].map(r=>{
                const c=byRisk[r]||0, pct=all.length?Math.round(c/all.length*100):0;
                return <div key={r} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12.5,fontWeight:600,color:RC[r],fontFamily:"'IBM Plex Sans',sans-serif"}}>{r}</span><span style={{fontSize:12,fontFamily:"'IBM Plex Mono',monospace",color:MID}}>{c} ({pct}%)</span></div><div style={{height:8,background:PAPER,borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:RC[r],borderRadius:4}}/></div></div>;
              })}
            </div>
          </div>
          <div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${BD}`}}>
              <div style={{fontSize:9.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'IBM Plex Sans',sans-serif"}}>Response Times — /analytics/response-times</div>
              <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>Minutes from Alert to Arrival</div>
            </div>
            <div style={{padding:"18px"}}>
              {all.filter(i=>i.responseTime).slice(0,6).map((inc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:RC[inc.risk]||MID,flexShrink:0}}/>
                  <div style={{flex:1,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:SL,fontFamily:"'IBM Plex Sans',sans-serif"}}>{inc.location}</span>
                    <span style={{fontSize:12,fontWeight:700,color:inc.responseTime<=5?GREEN:RED,fontFamily:"'IBM Plex Mono',monospace"}}>{inc.responseTime} min</span>
                  </div>
                </div>
              ))}
              <div style={{marginTop:12,padding:"8px 12px",background:GREENL,borderRadius:6,border:`1px solid ${GREEN}28`}}>
                <span style={{fontSize:11.5,color:"#1D5C24",fontWeight:600,fontFamily:"'IBM Plex Sans',sans-serif"}}>Target: ≤ 5 min · Current avg: {avgRT} min</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:10,overflow:"hidden",marginBottom:18}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${BD}`}}>
            <div style={{fontSize:9.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'IBM Plex Sans',sans-serif"}}>Location Hotspots — /analytics/location-hotspots</div>
            <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>Incident Frequency by Campus Zone</div>
          </div>
          <div style={{padding:"18px",display:"grid",gridTemplateColumns:`repeat(${Math.min(topSpots.length,5)},1fr)`,gap:10}}>
            {topSpots.map(([loc,cnt],i)=>{
              const heat=["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6"][i];
              return <div key={i} style={{textAlign:"center",padding:"14px 10px",background:`${heat}10`,border:`1px solid ${heat}30`,borderRadius:8}}><div style={{fontSize:24,fontWeight:800,color:heat,fontFamily:"'IBM Plex Mono',monospace"}}>{cnt}</div><div style={{fontSize:10.5,color:SL,fontFamily:"'IBM Plex Sans',sans-serif",marginTop:4,lineHeight:1.4}}>{loc}</div><div style={{width:"100%",height:4,background:`${heat}20`,borderRadius:2,marginTop:8}}><div style={{width:`${Math.min(100,cnt*20)}%`,height:"100%",background:heat,borderRadius:2}}/></div></div>;
            })}
          </div>
        </div>
        <div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${BD}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif"}}>Recent Incident Log</div>
            <div style={{fontSize:10.5,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>Live — updates on each triage session</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,fontFamily:"'IBM Plex Sans',sans-serif"}}>
              <thead><tr style={{borderBottom:`1px solid ${BD}`}}>{["Incident ID","Timestamp","Symptoms","Risk","Location","Response"].map(h=><th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1}}>{h}</th>)}</tr></thead>
              <tbody>{all.slice(0,8).map((inc,i)=><tr key={i} style={{borderBottom:`1px solid ${BD}`,background:i%2===0?WHITE:PAPER}}><td style={{padding:"10px 16px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:MID}}>#{String(inc.id).slice(-6)}</td><td style={{padding:"10px 16px",color:SL}}>{new Date(inc.ts).toLocaleString()}</td><td style={{padding:"10px 16px",color:NK}}>{(inc.symptoms||[]).slice(0,2).join(", ")}</td><td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",background:`${RC[inc.risk]||MID}16`,color:RC[inc.risk]||MID,borderRadius:3,fontSize:11,fontWeight:700}}>{inc.risk||"—"}</span></td><td style={{padding:"10px 16px",color:SL}}>{inc.location||"—"}</td><td style={{padding:"10px 16px",fontFamily:"'IBM Plex Mono',monospace",color:inc.responseTime&&inc.responseTime<=5?GREEN:inc.responseTime?RED:MID}}>{inc.responseTime?`${inc.responseTime} min`:"—"}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN EMERGENCY AID ENGINE — DEMO MODE
   ══════════════════════════════════════════════════════════════ */
function TriagePage({ setPage }) {
  const [phase, setPhase]           = useState(0);   // 0=select 1=details 2=aid 3=done
  const [selected, setSelected]     = useState([]);
  const [customText, setCustomText]  = useState("");
  const [useCustom, setUseCustom]    = useState(false);
  const [details, setDetails]        = useState({});
  const [detailIdx, setDetailIdx]    = useState(0);
  const [aidSteps, setAidSteps]      = useState([]);
  const [aidStep, setAidStep]        = useState(-1);  // -1 = calming phase
  const [simRunning, setSimRunning]  = useState(false);
  const [riskResult, setRiskResult]  = useState(null);
  const [showAlert, setShowAlert]    = useState(false);
  const [calmDone, setCalmDone]      = useState(false);
  const [loading, setLoading]        = useState(false);
  const { speak, cancel, speaking, supported } = useVoice();
  const topRef = useRef(null);

  const CALM = "Attention everyone — stay calm. Clear the area around the patient. Take a breath. Help is here. We will guide you through every step right now.";

  function scoreRisk(syms, custom) {
    if (custom) {
      const t = custom.toLowerCase();
      if (/unconscious|not breathing|no pulse|cardiac arrest/i.test(t)) return classifyRisk(92);
      if (/bleed|blood|stab|wound/i.test(t)) return classifyRisk(74);
      if (/chest|heart/i.test(t)) return classifyRisk(66);
      if (/breath|chok/i.test(t)) return classifyRisk(70);
      if (/seizure|convuls/i.test(t)) return classifyRisk(72);
      if (/allerg|anaphylax/i.test(t)) return classifyRisk(78);
      if (/burn/i.test(t)) return classifyRisk(55);
      if (/fever|temperature/i.test(t)) return classifyRisk(32);
      if (/diz|faint|fall/i.test(t)) return classifyRisk(38);
      return classifyRisk(28);
    }
    const base = syms.reduce((a,id)=>a+(SYMPTOM_DATA.find(s=>s.id===id)?.weight||0),0);
    return classifyRisk(Math.min(base,100));
  }

  function getSteps(syms, custom) {
    if (custom) {
      // Smart match from custom text
      const t = custom.toLowerCase();
      if (/unconscious|not breathing|no pulse/i.test(t)) return { ...AID_DB.unconscious };
      if (/bleed|blood|stab/i.test(t)) return { ...AID_DB.severe_bleed };
      if (/chest|heart/i.test(t)) return { ...AID_DB.chest_pain };
      if (/chok/i.test(t)) return { ...AID_DB.choking };
      if (/breath/i.test(t)) return { ...AID_DB.breath };
      if (/seizure|convuls/i.test(t)) return { ...AID_DB.seizure };
      if (/allerg/i.test(t)) return { ...AID_DB.allergic };
      if (/burn/i.test(t)) return { ...AID_DB.burns };
      if (/fever/i.test(t)) return { ...AID_DB.high_fever };
      if (/limb|leg|arm|fracture|bone/i.test(t)) return { ...AID_DB.limb_injury };
      // Generic fallback
      return {
        calm: "Stay calm and focused. Clear the area. We will guide you now.",
        steps: [
          { text:"Keep the patient calm and still. Do not leave them alone.", tools:[], alt:[], anim:"comfort" },
          { text:"Check responsiveness — tap shoulders and call their name. If no response, call 10177 immediately.", tools:["Phone"], alt:[], anim:"tap" },
          { text:"Check breathing — look, listen, feel. If not breathing, begin CPR immediately.", tools:[], alt:[], anim:"airway" },
          { text:"Control any visible bleeding with firm direct pressure using the cleanest material available.", tools:["Clean cloth"], alt:["T-shirt","jacket"], anim:"pressure" },
          { text:"Keep the patient warm and comfortable. Monitor continuously until emergency services arrive.", tools:["Jacket or blanket"], alt:["Any available fabric"], anim:"monitor" },
        ]
      };
    }
    const key = syms[0];
    return AID_DB[key] || AID_DB.unconscious;
  }

  function launch() {
    setLoading(true);
    const risk = scoreRisk(selected, useCustom ? customText : null);
    setRiskResult(risk);
    const inc = { id: Date.now(), ts: new Date().toISOString(), symptoms: useCustom?["custom"]:selected, custom: useCustom?customText:"", risk: risk.level, location: "UMP Campus — Active Session", responseTime: null };
    logSession(inc);
    const db = getSteps(selected, useCustom ? customText : null);
    setTimeout(() => {
      setAidSteps(db.steps);
      setLoading(false);
      setPhase(2);
      setAidStep(-1);
      setCalmDone(false);
      setTimeout(() => {
        speak(db.calm || CALM, () => {
          setCalmDone(true);
          setAidStep(0);
          setSimRunning(true);
          const s = db.steps[0];
          speak(`Step 1. ${s.text}${s.tools?.length?` Use: ${s.tools.join(" or ")}.`:""}${s.alt?.length?` Alternative: ${s.alt[0]}.`:""}`);
        });
      }, 500);
      if (["Critical","High"].includes(risk.level)) setTimeout(()=>setShowAlert(true), 2000);
    }, 1400);
  }

  function nextStep() {
    const next = aidStep + 1;
    if (next >= aidSteps.length) { cancel(); setPhase(3); return; }
    cancel();
    setAidStep(next);
    setSimRunning(false);
    const s = aidSteps[next];
    setTimeout(() => {
      setSimRunning(true);
      speak(`Step ${next+1}. ${s.text}${s.tools?.length?` Use: ${s.tools.join(" or ")}.`:""}${s.alt?.length?` Alternative: ${s.alt[0]}.`:""}`);
    }, 300);
    topRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function prevStep() {
    if (aidStep <= 0) return;
    cancel(); setSimRunning(false); setAidStep(aidStep - 1);
  }

  function reset() {
    cancel();
    setPhase(0); setSelected([]); setCustomText(""); setUseCustom(false);
    setDetails({}); setDetailIdx(0); setAidSteps([]); setAidStep(-1);
    setSimRunning(false); setRiskResult(null); setShowAlert(false);
    setCalmDone(false); setLoading(false);
  }

  const detailItems = useCustom ? [] : selected;
  const curDetailId = detailItems[detailIdx];

  return (
    <div style={{minHeight:"100vh",background:PAPER,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes voiceWave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes alertPulse{0%,100%{box-shadow:0 0 0 0 rgba(184,48,24,.5)}70%{box-shadow:0 0 0 14px rgba(184,48,24,0)}}`}</style>

      {showAlert && riskResult && <EmergencyAlert risk={riskResult} onDismiss={()=>setShowAlert(false)}/>}

      {/* HEADER */}
      <div style={{background:NAVY,borderBottom:`3px solid ${ORANGE}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 5%",height:62,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src={LOGO} alt="UMP" style={{height:38,objectFit:"contain",mixBlendMode:"lighten"}}/>
            <div style={{borderLeft:"1px solid rgba(255,255,255,0.15)",paddingLeft:12}}>
              <div style={{fontSize:10,fontWeight:700,color:WHITE,letterSpacing:1.8,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif"}}>UMP-CEIS</div>
              <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",fontFamily:"'IBM Plex Sans',sans-serif"}}>Emergency Aid Engine — Demo Mode</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {phase>=2&&riskResult&&<div style={{padding:"5px 12px",background:`${riskResult.color}22`,border:`1px solid ${riskResult.color}44`,borderRadius:4,fontSize:11.5,fontWeight:700,color:riskResult.color,fontFamily:"'IBM Plex Sans',sans-serif"}}>{riskResult.icon} {riskResult.level} Risk</div>}
            <button onClick={()=>setPage("analytics")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.7)",borderRadius:4,padding:"6px 12px",fontSize:11.5,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>📊 Analytics</button>
            <button onClick={()=>{cancel();setPage("landing");}} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",color:"rgba(255,255,255,0.7)",borderRadius:4,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>← Back</button>
          </div>
        </div>
      </div>

      {/* PHASE 0 — SYMPTOM SELECTION */}
      {phase===0&&(
        <div style={{maxWidth:880,margin:"0 auto",padding:"36px 5% 60px",animation:"fadeIn .35s ease"}}>
          <div style={{marginBottom:26}}>
            <div style={{fontSize:10.5,fontWeight:700,color:MID,letterSpacing:1.8,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:6}}>Emergency Aid Engine · Demo Mode</div>
            <h1 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:"clamp(24px,3.5vw,36px)",fontWeight:700,color:NK,letterSpacing:-0.5,marginBottom:8}}>What is happening?</h1>
            <p style={{fontSize:14,color:SL,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.7,maxWidth:560}}>Select the patient's symptoms or describe the situation. The system will immediately guide you through first aid with voice instructions and live simulation.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:18}}>
            {SYMPTOM_DATA.map(sym=>{
              const on=selected.includes(sym.id)&&!useCustom;
              return <button key={sym.id} onClick={()=>{setUseCustom(false);setSelected(p=>p.includes(sym.id)?p.filter(x=>x!==sym.id):[...p,sym.id]);}} style={{padding:"11px 15px",background:on?`${ORANGE}0e`:WHITE,border:`1.5px solid ${on?ORANGE:BD}`,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"flex-start",gap:11,textAlign:"left",transition:"all .15s"}}>
                <div style={{width:20,height:20,borderRadius:5,background:on?ORANGE:"transparent",border:`2px solid ${on?ORANGE:BD}`,flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                  {on&&<svg width={11} height={11} viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l2.8 2.8 5.2-5.2" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div><div style={{fontSize:13.5,fontWeight:on?700:500,color:on?NK:SL,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.3}}>{sym.label}</div><div style={{fontSize:10.5,color:MID,fontFamily:"'IBM Plex Sans',sans-serif",marginTop:2}}>{sym.category}</div></div>
              </button>;
            })}
          </div>
          {/* Custom */}
          <div style={{background:WHITE,border:`1.5px solid ${useCustom?NAVY:BD}`,borderRadius:10,padding:"16px 18px",marginBottom:22,transition:"border-color .2s"}}>
            <button onClick={()=>{setUseCustom(true);setSelected([]);}} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,marginBottom:useCustom?12:0,width:"100%",textAlign:"left"}}>
              <div style={{width:20,height:20,borderRadius:5,background:useCustom?NAVY:"transparent",border:`2px solid ${useCustom?NAVY:BD}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                {useCustom&&<svg width={11} height={11} viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l2.8 2.8 5.2-5.2" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{fontSize:14,fontWeight:useCustom?700:500,color:useCustom?NAVY:SL,fontFamily:"'IBM Plex Sans',sans-serif"}}>Other / Custom situation — describe exactly what is happening</span>
            </button>
            {useCustom&&<textarea value={customText} onChange={e=>setCustomText(e.target.value)} placeholder="e.g. Student fell from stairs, cannot move right leg, conscious but in severe pain, no visible bleeding..." style={{width:"100%",minHeight:90,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:13.5,fontFamily:"'IBM Plex Sans',sans-serif",color:NK,background:PAPER,resize:"vertical",outline:"none",lineHeight:1.65}}/>}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
            <span style={{fontSize:13,color:MID,fontFamily:"'IBM Plex Sans',sans-serif"}}>{useCustom?(customText.trim()?"Custom situation ready — AI will analyse":"Describe the situation above"):`${selected.length} symptom${selected.length!==1?"s":""} selected`}</span>
            <button disabled={(!useCustom&&selected.length===0)||(useCustom&&!customText.trim())} onClick={()=>{if(useCustom){launch();}else{setDetailIdx(0);setPhase(1);}}} style={{padding:"13px 30px",background:(!useCustom&&selected.length===0)||(useCustom&&!customText.trim())?BD:ORANGE,color:WHITE,border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",display:"flex",alignItems:"center",gap:9,transition:"background .2s"}}>
              Get Emergency Support →
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1 — DETAILS */}
      {phase===1&&curDetailId&&(
        <div style={{maxWidth:660,margin:"0 auto",padding:"48px 5% 60px",animation:"fadeIn .3s ease"}}>
          <div style={{marginBottom:28}}>
            <div style={{fontSize:10,fontWeight:700,color:ORANGE,letterSpacing:1.8,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:6}}>Additional Details — {detailIdx+1} of {detailItems.length}</div>
            <div style={{width:"100%",height:5,background:BD,borderRadius:3,marginBottom:20}}><div style={{width:`${((detailIdx+1)/detailItems.length)*100}%`,height:"100%",background:ORANGE,borderRadius:3,transition:"width .4s"}}/></div>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:"clamp(18px,2.5vw,26px)",fontWeight:700,color:NK,letterSpacing:-0.3,marginBottom:8}}>{SYMPTOM_DATA.find(s=>s.id===curDetailId)?.label}</h2>
            <p style={{fontSize:14,color:SL,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.7}}>Add any details about this symptom so the first aid instructions can be precisely tailored to the situation.</p>
          </div>
          <textarea value={details[curDetailId]||""} onChange={e=>setDetails(d=>({...d,[curDetailId]:e.target.value}))} placeholder={`Describe: severity, duration, any known history, what you can see...`} style={{width:"100%",minHeight:100,padding:"12px 16px",border:`1.5px solid ${BD}`,borderRadius:9,fontSize:14,fontFamily:"'IBM Plex Sans',sans-serif",color:NK,background:WHITE,resize:"vertical",outline:"none",lineHeight:1.65,marginBottom:20}}/>
          <div style={{display:"flex",gap:10}}>
            {detailIdx>0&&<button onClick={()=>setDetailIdx(i=>i-1)} style={{padding:"12px 22px",background:WHITE,border:`1.5px solid ${BD}`,borderRadius:6,fontSize:14,fontWeight:600,color:NK,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>← Back</button>}
            <button onClick={()=>{ if(detailIdx+1<detailItems.length){setDetailIdx(i=>i+1);}else{launch();}}} style={{flex:1,padding:"13px",background:RED,color:WHITE,border:"none",borderRadius:7,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:9,animation:"pulse 1.8s ease-in-out infinite"}}>
              {detailIdx+1<detailItems.length?"Continue →":"🚨 START FIRST AID NOW"}
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading&&(
        <div style={{maxWidth:500,margin:"80px auto",textAlign:"center",padding:"0 5%",animation:"fadeIn .3s ease"}}>
          <div style={{width:56,height:56,borderRadius:"50%",border:`4px solid ${BD}`,borderTop:`4px solid ${ORANGE}`,animation:"spin 1s linear infinite",margin:"0 auto 24px"}}/>
          <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:22,color:NK,marginBottom:10}}>Preparing emergency protocol…</h2>
          <p style={{fontSize:14,color:MID,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.7}}>Risk assessment running in background. First aid instructions loading. Emergency alert preparing if required.</p>
        </div>
      )}

      {/* PHASE 2 — ACTIVE AID */}
      {phase===2&&!loading&&(
        <div ref={topRef} style={{maxWidth:1060,margin:"0 auto",padding:"22px 5% 60px",animation:"fadeIn .3s ease"}}>

          {/* Calm banner */}
          {!calmDone&&(
            <div style={{background:NAVY,borderRadius:10,padding:"16px 22px",marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
              <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}}>
                {[0.5,0.9,1,0.7,0.85,0.5,0.9].map((h,i)=><div key={i} style={{width:4,borderRadius:2,background:ORANGE,height:`${h*28}px`,animation:speaking?`voiceWave ${0.4+i*0.07}s ease-in-out infinite`:"none",animationDelay:`${i*0.06}s`}}/>)}
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.5,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif"}}>Voice Instructor · Calming the situation</div>
                <div style={{fontSize:15,color:WHITE,fontFamily:"'IBM Plex Serif',serif",marginTop:2,lineHeight:1.5}}>{CALM}</div>
              </div>
            </div>
          )}

          {/* Active step */}
          {calmDone&&aidStep>=0&&aidStep<aidSteps.length&&(()=>{
            const s=aidSteps[aidStep];
            return (
              <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:18,alignItems:"start"}}>
                {/* Instruction card */}
                <div style={{background:WHITE,borderRadius:12,border:`2px solid ${ORANGE}`,borderTop:`5px solid ${ORANGE}`,padding:"24px 28px",animation:"fadeIn .4s ease"}}>
                  {/* Voice bar */}
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,padding:"10px 14px",background:NAVY,borderRadius:8}}>
                    <div style={{display:"flex",gap:2,alignItems:"center"}}>
                      {[0.6,1,0.7,0.9,0.5,0.8,0.6].map((h,i)=><div key={i} style={{width:3,borderRadius:1.5,background:ORANGE,height:`${h*22}px`,animation:speaking?`voiceWave ${0.38+i*0.07}s ease-in-out infinite`:"none",animationDelay:`${i*0.06}s`}}/>)}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:1.4,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif",flex:1}}>
                      {speaking?`Speaking — Step ${aidStep+1} of ${aidSteps.length}`:`Step ${aidStep+1} of ${aidSteps.length}`}
                    </span>
                    {riskResult&&<span style={{padding:"3px 10px",background:`${riskResult.color}22`,border:`1px solid ${riskResult.color}44`,borderRadius:3,fontSize:10.5,fontWeight:700,color:riskResult.color,fontFamily:"'IBM Plex Sans',sans-serif"}}>{riskResult.icon} {riskResult.level}</span>}
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:ORANGE,letterSpacing:1.8,textTransform:"uppercase",fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:9}}>Step {String(aidStep+1).padStart(2,"0")}</div>
                  <p style={{fontSize:18,color:NK,lineHeight:1.75,fontFamily:"'IBM Plex Serif',serif",fontWeight:600,marginBottom:22}}>{s.text}</p>
                  {s.tools?.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14,alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,fontFamily:"'IBM Plex Sans',sans-serif"}}>Use:</span>
                      {s.tools.map((t,i)=><span key={i} style={{padding:"4px 12px",background:`${GREEN}12`,border:`1px solid ${GREEN}28`,borderRadius:4,fontSize:13,fontWeight:600,color:GREEN,fontFamily:"'IBM Plex Sans',sans-serif"}}>{t}</span>)}
                    </div>
                  )}
                  {s.alt?.length>0&&(
                    <div style={{background:GOLDL,border:`1px solid ${GOLD}30`,borderRadius:7,padding:"10px 14px",marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#6B4800",textTransform:"uppercase",letterSpacing:1,fontFamily:"'IBM Plex Sans',sans-serif"}}>Alternative: </span>
                      <span style={{fontSize:13,color:"#6B4800",fontFamily:"'IBM Plex Sans',sans-serif"}}>{s.alt.join(" · ")}</span>
                    </div>
                  )}
                  <div style={{display:"flex",gap:9,marginTop:22}}>
                    {aidStep>0&&<button onClick={prevStep} style={{padding:"10px 18px",background:WHITE,border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,fontWeight:600,color:NK,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>‹ Prev</button>}
                    <button onClick={()=>{cancel();setSimRunning(false);setTimeout(()=>{setSimRunning(true);speak(`Step ${aidStep+1}. ${s.text}${s.tools?.length?` Use: ${s.tools.join(" or ")}.`:""}${s.alt?.length?` Alternative: ${s.alt[0]}.`:""}`);},200);}} style={{padding:"10px 18px",background:WHITE,border:`1.5px solid ${ORANGE}`,borderRadius:6,fontSize:13,fontWeight:600,color:ORANGE,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                      🔊 Repeat
                    </button>
                    <button onClick={nextStep} style={{flex:1,padding:"12px",background:aidStep===aidSteps.length-1?GREEN:RED,color:WHITE,border:"none",borderRadius:6,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",animation:"pulse 2s ease-in-out infinite"}}>
                      {aidStep===aidSteps.length-1?"✓ Complete — Aid Done":"Next Step →"}
                    </button>
                  </div>
                </div>

                {/* Simulation panel */}
                <div>
                  <div style={{background:WHITE,borderRadius:12,border:`1px solid ${BD}`,overflow:"hidden",marginBottom:10}}>
                    <div style={{padding:"10px 14px",background:PAPER,borderBottom:`1px solid ${BD}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'IBM Plex Sans',sans-serif"}}>Live Simulation</span>
                      <button onClick={()=>setSimRunning(r=>!r)} style={{padding:"4px 11px",background:simRunning?REDL:GREENL,border:`1px solid ${simRunning?RED:GREEN}28`,borderRadius:4,fontSize:11,fontWeight:700,color:simRunning?RED:GREEN,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                        {simRunning?"⏸ Pause":"▶ Animate"}
                      </button>
                    </div>
                    <div style={{padding:"14px 12px",background:PAPER}}>
                      <StepAnim type={s.anim||"monitor"} color={ORANGE} running={simRunning}/>
                    </div>
                  </div>
                  {/* Step progress pills */}
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {aidSteps.map((st,i)=>(
                      <button key={i} onClick={()=>{cancel();setAidStep(i);setSimRunning(false);}} style={{padding:"7px 12px",background:i===aidStep?`${ORANGE}10`:i<aidStep?GREENL:WHITE,border:`1.5px solid ${i===aidStep?ORANGE:i<aidStep?GREEN+"40":BD}`,borderRadius:7,cursor:"pointer",textAlign:"left",display:"flex",gap:9,alignItems:"center",transition:"all .15s"}}>
                        <span style={{width:20,height:20,borderRadius:"50%",background:i===aidStep?ORANGE:i<aidStep?GREEN:`${ORANGE}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,color:i===aidStep||i<aidStep?WHITE:ORANGE}}>{i<aidStep?"✓":i+1}</span>
                        <span style={{fontSize:11.5,fontWeight:i===aidStep?700:500,color:i===aidStep?ORANGE:i<aidStep?GREEN:SL,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.35}}>{st.text.slice(0,52)}{st.text.length>52?"…":""}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* PHASE 3 — COMPLETE */}
      {phase===3&&(
        <div style={{maxWidth:640,margin:"80px auto",textAlign:"center",padding:"0 5% 60px",animation:"fadeIn .4s ease"}}>
          <div style={{fontSize:52,marginBottom:20}}>✅</div>
          <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:28,fontWeight:700,color:NK,marginBottom:10}}>First Aid Complete</h2>
          <p style={{fontSize:15,color:SL,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:1.75,marginBottom:28}}>All steps have been delivered. Stay with the patient, keep them calm, and continue monitoring until emergency services arrive.</p>
          {riskResult&&(
            <div style={{background:`${riskResult.color}0d`,border:`1.5px solid ${riskResult.color}30`,borderRadius:10,padding:"16px 20px",marginBottom:24}}>
              <div style={{fontSize:24,marginBottom:6}}>{riskResult.icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:riskResult.color,fontFamily:"'IBM Plex Serif',serif"}}>{riskResult.level} Risk — {riskResult.action}</div>
            </div>
          )}
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={reset} style={{padding:"13px 28px",background:NAVY,color:WHITE,border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>New Triage</button>
            <button onClick={()=>setPage("analytics")} style={{padding:"13px 28px",background:WHITE,border:`1.5px solid ${BD}`,color:NK,borderRadius:7,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>📊 View Analytics</button>
            <button onClick={()=>setPage("landing")} style={{padding:"13px 28px",background:WHITE,border:`1.5px solid ${BD}`,color:NK,borderRadius:7,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>← Home</button>
          </div>
        </div>
      )}
    </div>
  );
}



/* ── HOSPITAL FINDER PAGE ─────────────────────────────────────── */
function HospitalPage({ setPage }) {
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState(false);
  const hospitals = [
    { name: "Rob Ferreira Regional Hospital", dist: "3.2 km", time: "6 min", type: "Public · Level 2", beds: "Available", phone: "013 741 6000", dir: "Mbombela, on Government Boulevard", c: GREEN },
    { name: "Mediclinic Nelspruit", dist: "5.8 km", time: "11 min", type: "Private · 24h Emergency", beds: "Available", phone: "013 753 1190", dir: "Nelspruit CBD, Bester Street", c: NAVY },
    { name: "Life Cosmos Hospital", dist: "7.4 km", time: "14 min", type: "Private · 24h Emergency", beds: "Limited", phone: "013 750 8200", dir: "Mbombela, Madiba Drive", c: ORANGE },
    { name: "UMP Campus Clinic", dist: "0.4 km", time: "1 min", type: "University Clinic · Hours: 08:00–17:00", beds: "Walk-in", phone: "+27 13 002 0200", dir: "Main campus, Building C", c: GOLD },
  ];
  function simulate() {
    setSearching(true);
    setTimeout(() => { setSearching(false); setFound(true); }, 1800);
  }
  return (
    <div style={{ minHeight: "100vh", background: PAPER, fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ background: NAVY, borderBottom: `3px solid ${RED}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 5%", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={LOGO} alt="UMP" style={{ height: 40, objectFit: "contain", mixBlendMode: "lighten" }} />
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif" }}>UMP-CEIS</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Sans',sans-serif" }}>Hospital Finder — Phase 4</div>
            </div>
          </div>
          <button onClick={() => setPage("landing")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)", borderRadius: 4, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>← Back</button>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 5% 60px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MID, letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 6 }}>Phase 4 · Real-Time Response Intelligence</div>
          <h1 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: NK, letterSpacing: -0.5, marginBottom: 8 }}>Nearest Hospital Detection</h1>
          <p style={{ fontSize: 13.5, color: SL, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.7, maxWidth: 580 }}>Phase 4 adds GPS-based hospital detection with estimated travel time, live traffic integration, and crowd prediction for facilities near UMP campus.</p>
        </div>
        {!found ? (
          <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 12, padding: "44px 36px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${RED}10`, border: `2px solid ${RED}28`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: RED }}>
              <IMap />
            </div>
            <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: 22, fontWeight: 700, color: NK, marginBottom: 10 }}>Locate Nearest Hospitals</h2>
            <p style={{ fontSize: 13.5, color: SL, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.75, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>Uses device GPS to identify the closest emergency facilities — sorted by distance and estimated drive time. Includes live traffic routing and bed availability indicators.</p>
            <button onClick={simulate} disabled={searching} style={{ padding: "13px 34px", background: searching ? BD : RED, color: WHITE, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: searching ? "not-allowed" : "pointer", fontFamily: "'IBM Plex Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 10, transition: "background .2s" }}>
              {searching ? (
                <><span style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid rgba(255,255,255,0.3)`, borderTop: `2.5px solid ${WHITE}`, display: "inline-block", animation: "spin 0.8s linear infinite" }} />Locating...</>
              ) : <><ILocation />Detect My Location</>}
            </button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div>
            <div style={{ background: GREENL, border: `1px solid ${GREEN}28`, borderRadius: 8, padding: "11px 16px", marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: GREEN }}><ILocation /></span>
              <span style={{ fontSize: 13, color: "#1D5C24", fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif" }}>Location detected: UMP Main Campus, Mbombela. Showing 4 nearest facilities.</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hospitals.map((h, i) => (
                <div key={i} style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, overflow: "hidden", borderLeft: `4px solid ${h.c}` }}>
                  <div style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 9, background: `${h.c}10`, border: `1px solid ${h.c}24`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: h.c }}><IHospital /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: NK, fontFamily: "'IBM Plex Serif',serif", marginBottom: 3 }}>{h.name}</div>
                          <div style={{ fontSize: 11.5, color: MID, fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 5 }}>{h.type} · {h.dir}</div>
                          <div style={{ fontSize: 13, color: SL, fontFamily: "'IBM Plex Sans',sans-serif" }}>📞 {h.phone}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <div style={{ textAlign: "center", padding: "8px 14px", background: PAPER, borderRadius: 6, border: `1px solid ${BD}` }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: h.c, fontFamily: "'IBM Plex Mono',monospace" }}>{h.dist}</div>
                            <div style={{ fontSize: 9.5, color: MID, fontFamily: "'IBM Plex Sans',sans-serif" }}>DISTANCE</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "8px 14px", background: PAPER, borderRadius: 6, border: `1px solid ${BD}` }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: h.c, fontFamily: "'IBM Plex Mono',monospace" }}>{h.time}</div>
                            <div style={{ fontSize: 9.5, color: MID, fontFamily: "'IBM Plex Sans',sans-serif" }}>DRIVE TIME</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "8px 14px", background: h.beds === "Available" ? GREENL : GOLDL, borderRadius: 6, border: `1px solid ${h.beds === "Available" ? GREEN : GOLD}28` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: h.beds === "Available" ? GREEN : "#8B6800", fontFamily: "'IBM Plex Sans',sans-serif" }}>{h.beds}</div>
                            <div style={{ fontSize: 9.5, color: MID, fontFamily: "'IBM Plex Sans',sans-serif" }}>CAPACITY</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {i === 0 && (
                    <div style={{ background: `${GREEN}09`, borderTop: `1px solid ${GREEN}22`, padding: "7px 20px", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: GREEN, fontSize: 11 }}>✓</span>
                      <span style={{ fontSize: 11.5, color: "#1D5C24", fontWeight: 600, fontFamily: "'IBM Plex Sans',sans-serif" }}>Nearest facility — recommended for emergency routing</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, background: WHITE, border: `1px solid ${BD}`, borderRadius: 7, padding: "12px 16px" }}>
              <p style={{ fontSize: 12, color: MID, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1.6 }}>
                <strong style={{ color: NK }}>Phase 4 note:</strong> Drive times use live Google Traffic API data. Bed availability is refreshed every 10 minutes from hospital EMS integrations. Offline routing fallback activates when data signal drops below EDGE.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── APP ─────────────────────────────────────────────────────── */
export default function LandingSite({ onAccessSystem }) {
  const [page, setPage] = useState("landing");

  // "system" page now delegates to the real Command Centre login
  function goPage(p) {
    if (p === "system") { onAccessSystem(); return; }
    setPage(p);
  }

  if (page === "triage")    return <TriagePage setPage={goPage} />;
  if (page === "analytics") return <AnalyticsPage setPage={goPage} />;
  if (page === "firstaid")  return <FirstAidPage setPage={goPage} />;
  if (page === "hospitals") return <HospitalPage setPage={goPage} />;
  return (
    <div style={{ fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif", background: PAPER, color: NK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,400;0,600;0,700;1,600&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        ::selection{background:rgba(26,39,102,0.13);}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes botPulse{0%{transform:scale(1);opacity:0.55}100%{transform:scale(1.75);opacity:0}}
        @keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${BD};border-radius:3px}
      `}</style>
      <Navbar setPage={goPage} />
      <Hero setPage={goPage} />
      <WhatIsIt />
      <Features />
      <WhoFor />
      <Purpose />
      <PhasesSection setPage={goPage} />
      <HowItWorks />
      <Contact />
      <Footer setPage={goPage} />
      <ChatBot />
    </div>
  );
}
