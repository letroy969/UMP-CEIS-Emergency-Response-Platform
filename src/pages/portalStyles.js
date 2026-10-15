import { BD } from "../constants.js";

export const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${BD};border-radius:3px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.06)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
  @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.2);opacity:0}}
  .student-portal-shell{position:relative;isolation:isolate;background:#F0F3F8;}
  .student-portal-background{position:fixed;z-index:-1;inset:0;overflow:hidden;pointer-events:none;}
  .student-portal-background img{position:absolute;inset:-12px;width:calc(100% + 24px);height:calc(100% + 24px);object-fit:cover;filter:blur(7px) brightness(.78);transform:scale(1.02);}
  .student-portal-background>div{position:absolute;inset:0;background:rgba(239,243,249,.79);}
  @media(prefers-reduced-motion:reduce){.student-portal-background img{transform:none;}}
  .ceis-icon-action{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
  .ceis-icon-action:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(15,35,70,.12)}
  .ceis-icon-action svg{transition:transform .18s ease}
  .ceis-icon-action:hover svg{transform:scale(1.08)}
  .ceis-icon-action:focus-visible{outline:3px solid ${BD};outline-offset:3px}
`;