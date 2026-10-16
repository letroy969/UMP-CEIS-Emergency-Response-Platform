import { useEffect, useRef, useState } from "react";
import { GREEN, NAVY, RED, REDL, SL, WHITE } from "../constants.js";
import { applyEmailVerificationCode } from "./firebaseAuth.js";

const ACCESS_REQUEST_ROLES = new Set(["staff", "responder", "admin"]);

function getAccessRequestRole() {
  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get("requestedRole");
  if (ACCESS_REQUEST_ROLES.has(requestedRole)) return requestedRole;
  const continueUrl = params.get("continueUrl");
  if (!continueUrl) return null;
  try {
    const role = new URL(continueUrl, window.location.origin).searchParams.get("requestedRole");
    return ACCESS_REQUEST_ROLES.has(role) ? role : null;
  } catch {
    return null;
  }
}

export default function VerifyEmail() {
  const [code] = useState(() => new URLSearchParams(window.location.search).get("oobCode") || "");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    if (!code) {
      setStatus("error");
      setMessage("This verification link is invalid or incomplete.");
      return;
    }
    applyEmailVerificationCode(code).then(() => {
      const requestedRole = getAccessRequestRole();
      if (requestedRole) {
        window.localStorage.setItem("ceis:requested-role-next", requestedRole);
      }
      setStatus("success");
      setMessage(requestedRole === "admin"
        ? "Your email address is verified. Sign in to submit your admin access request. A current administrator must approve it before admin access is granted."
        : requestedRole
          ? `Your email address is verified. Sign in to submit your ${requestedRole} access request. A current administrator must approve it before ${requestedRole} access is granted.`
          : "Your email address is verified. Sign in with the password you chose to access CEIS.");
    }).catch(error => {
      setStatus("error");
      setMessage(error.message || "Could not connect to the verification service.");
    });
  }, [code]);

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#0B1530,#172B58)",padding:20,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <section style={{width:"100%",maxWidth:480,background:WHITE,borderRadius:16,padding:32,boxShadow:"0 24px 80px rgba(0,0,0,.35)"}}>
        <div style={{fontSize:10,fontWeight:700,color:SL,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>UMP CEIS · Account verification</div>
        <h1 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:25,color:NAVY,marginBottom:10}}>Verify your email</h1>
        <p style={{fontSize:14,color:SL,lineHeight:1.7,marginBottom:20}}>Confirm that you control your email address to activate your account.</p>
        {status === "loading"&&<p role="status" style={{color:SL}}>Verifying email…</p>}
        {message&&<p role="status" style={{padding:12,borderRadius:7,background:status==="success"?`${GREEN}14`:REDL,color:status==="success"?GREEN:RED,fontSize:13,lineHeight:1.6}}>{message}</p>}
        {status === "success"&&<a href="/?access=system" style={{display:"block",marginTop:18,color:NAVY,fontWeight:700,fontSize:13}}>Continue to sign in</a>}
      </section>
    </main>
  );
}
