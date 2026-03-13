import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Animated Star Field Canvas ──────────────────────────────────────────────
const StarField = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.6 + 0.2,
      speed: Math.random() * 0.00015 + 0.00005,
      opacity: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;
      stars.forEach(s => {
        s.twinklePhase += s.twinkleSpeed;
        const tw = 0.5 + 0.5 * Math.sin(s.twinklePhase);
        const op = s.opacity * (0.4 + 0.6 * tw);
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${op})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

// ── Orbital Satellite System Canvas ─────────────────────────────────────────
const OrbitalSystem = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const orbits = [
      { a: 210, b: 80, speed: 0.0006, tilt: -0.3, color: '#3B82F6', size: 6, trail: 30 },
      { a: 160, b: 160, speed: 0.0009, tilt: 0.5, color: '#10B981', size: 5, trail: 25 },
      { a: 290, b: 110, speed: 0.00045, tilt: 1.1, color: '#6366F1', size: 7, trail: 35 },
      { a: 120, b: 240, speed: 0.0012, tilt: -0.8, color: '#F59E0B', size: 4, trail: 20 },
      { a: 340, b: 140, speed: 0.00035, tilt: 0.2, color: '#EC4899', size: 5, trail: 28 },
    ].map(o => ({ ...o, angle: Math.random() * Math.PI * 2, positions: [] }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = () => canvas.width * 0.5;
    const cy = () => canvas.height * 0.5;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now() * 0.001;

      orbits.forEach(o => {
        o.angle += o.speed;
        const cos = Math.cos(o.tilt), sin = Math.sin(o.tilt);
        const rawX = Math.cos(o.angle) * o.a;
        const rawY = Math.sin(o.angle) * o.b;
        const sx = cx() + rawX * cos - rawY * sin;
        const sy = cy() + rawX * sin + rawY * cos;

        o.positions.push({ x: sx, y: sy });
        if (o.positions.length > o.trail) o.positions.shift();

        // Draw orbit ellipse (faint)
        ctx.save();
        ctx.translate(cx(), cy());
        ctx.rotate(o.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, o.a, o.b, 0, 0, Math.PI * 2);
        ctx.strokeStyle = o.color + '18';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Draw trail
        if (o.positions.length > 1) {
          for (let i = 1; i < o.positions.length; i++) {
            const alpha = (i / o.positions.length) * 0.7;
            ctx.beginPath();
            ctx.moveTo(o.positions[i - 1].x, o.positions[i - 1].y);
            ctx.lineTo(o.positions[i].x, o.positions[i].y);
            ctx.strokeStyle = o.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = (i / o.positions.length) * 2;
            ctx.stroke();
          }
        }

        // Draw satellite body
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(o.angle);

        // Glow
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, o.size * 3);
        grd.addColorStop(0, o.color + 'cc');
        grd.addColorStop(1, o.color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, o.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-o.size * 0.4, -o.size * 0.6, o.size * 0.8, o.size * 1.2);

        // Solar panels
        ctx.fillStyle = o.color;
        ctx.fillRect(-o.size * 1.8, -o.size * 0.25, o.size * 1.2, o.size * 0.5);
        ctx.fillRect(o.size * 0.6, -o.size * 0.25, o.size * 1.2, o.size * 0.5);

        // Panel lines
        ctx.strokeStyle = '#00000040';
        ctx.lineWidth = 0.5;
        for (let p = 1; p < 3; p++) {
          ctx.beginPath();
          ctx.moveTo(-o.size * 1.8 + p * o.size * 0.4, -o.size * 0.25);
          ctx.lineTo(-o.size * 1.8 + p * o.size * 0.4, o.size * 0.25);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(o.size * 0.6 + p * o.size * 0.4, -o.size * 0.25);
          ctx.lineTo(o.size * 0.6 + p * o.size * 0.4, o.size * 0.25);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Central Earth/signal emitter
      const pulse = 0.5 + 0.5 * Math.sin(now * 2);
      const earthGrd = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), 28 + pulse * 6);
      earthGrd.addColorStop(0, '#1E40AF');
      earthGrd.addColorStop(0.5, '#1D4ED8');
      earthGrd.addColorStop(1, '#3B82F6');
      ctx.beginPath();
      ctx.arc(cx(), cy(), 24, 0, Math.PI * 2);
      ctx.fillStyle = earthGrd;
      ctx.fill();
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Signal rings
      for (let r = 1; r <= 3; r++) {
        const rPulse = (now * 0.5 + r * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(cx(), cy(), 30 + rPulse * 80, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(96,165,250,${(1 - rPulse) * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />;
};

// ── Login Page ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data.token, data.user);
      else setError(data.error || 'Authentication failed');
    } catch {
      setError('Cannot reach backend. Start Flask server: python app.py');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <StarField />
      <OrbitalSystem />

      {/* Radial glow behind card */}
      <div style={S.glow} />

      {/* Card */}
      <div style={{ ...S.card, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(40px)' }}>
        {/* Scan line effect */}
        <div style={S.scanLine} />

        {/* Header */}
        <div style={S.cardHeader}>
          <div style={S.logoRing}>
            <div style={S.logoInner}>🛰️</div>
          </div>
          <div style={S.sysTitle}>GNSS SHIELD</div>
          <div style={S.sysSub}>SPOOFING & JAMMING DETECTION SYSTEM</div>
          <div style={S.statusRow}>
            <span style={S.blink} />
            <span style={S.statusText}>SECURE AUTHENTICATION REQUIRED</span>
            <span style={S.blink} />
          </div>
        </div>

        {/* Divider */}
        <div style={S.divLine} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>ACCESS ID</label>
            <div style={S.inputWrap}>
              <span style={S.inputPre}>ID</span>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter username" style={S.input}
                disabled={loading} autoComplete="username"
              />
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>CLEARANCE CODE</label>
            <div style={S.inputWrap}>
              <span style={S.inputPre}>PW</span>
              <input
                type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" style={{ ...S.input, paddingRight: '3rem' }}
                disabled={loading} autoComplete="current-password"
              />
              <button type="button" style={S.eyeBtn} onClick={() => setShowPw(v => !v)}>
                {showPw ? '◉' : '◎'}
              </button>
            </div>
          </div>

          {error && (
            <div style={S.errBox}>
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" style={S.submitBtn(loading || !username || !password)} disabled={loading || !username || !password}>
            {loading ? (
              <><span style={S.spinner} /> AUTHENTICATING...</>
            ) : '⬡  AUTHORIZE ACCESS'}
          </button>
        </form>

        

        <div style={S.cardFoot}>GNSS SHIELD— FYP 2026</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#020817}
        input::placeholder{color:#334155}
        input:focus,button:focus{outline:none}
        @keyframes scanMove{0%{top:-4px}100%{top:100%}}
        @keyframes blinkAnim{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes spinAnim{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes glowPulse{0%,100%{opacity:0.6}50%{opacity:1}}
      `}</style>
    </div>
  );
};

const S = {
  page: {
    minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 50%, #0c1a3e 0%, #020817 65%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Exo 2', sans-serif", position: 'relative', overflow: 'hidden',
  },
  glow: {
    position: 'fixed', left: '50%', top: '50%',
    transform: 'translate(-50%,-50%)',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: 2, animation: 'glowPulse 3s ease infinite',
  },
  card: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 420, margin: '2rem',
    background: 'linear-gradient(135deg, rgba(10,20,50,0.95) 0%, rgba(5,15,40,0.98) 100%)',
    border: '1px solid rgba(59,130,246,0.35)',
    borderRadius: 4,
    boxShadow: '0 0 80px rgba(59,130,246,0.15), 0 0 1px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    padding: '2rem 2rem 1.5rem',
    transition: 'opacity 0.8s ease, transform 0.8s ease',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
    animation: 'scanMove 4s linear infinite',
    pointerEvents: 'none', zIndex: 20,
  },
  cardHeader: { textAlign: 'center', marginBottom: '1.5rem' },
  logoRing: {
    width: 70, height: 70, margin: '0 auto 1rem',
    borderRadius: '50%',
    background: 'conic-gradient(from 0deg, #3B82F6, #10B981, #6366F1, #3B82F6)',
    padding: 3, boxShadow: '0 0 30px rgba(59,130,246,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoInner: {
    width: '100%', height: '100%', borderRadius: '50%',
    background: '#060e24', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32,
  },
  sysTitle: {
    fontFamily: "'Orbitron', monospace", fontSize: '1.75rem', fontWeight: 900,
    letterSpacing: '0.12em', color: '#fff',
    textShadow: '0 0 30px rgba(59,130,246,0.8)',
    marginBottom: '0.3rem',
  },
  sysSub: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: '0.62rem',
    color: '#475569', letterSpacing: '0.18em', marginBottom: '1rem',
  },
  statusRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
  },
  blink: {
    width: 7, height: 7, borderRadius: '50%', background: '#10B981',
    display: 'inline-block', animation: 'blinkAnim 1.4s ease infinite',
    boxShadow: '0 0 6px #10B981',
  },
  statusText: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: '0.65rem',
    color: '#10B981', letterSpacing: '0.14em',
  },
  divLine: {
    height: 1, marginBottom: '1.5rem',
    background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(16,185,129,0.4), transparent)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: '0.62rem',
    color: '#3B82F6', letterSpacing: '0.2em',
  },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputPre: {
    position: 'absolute', left: '0.9rem',
    fontFamily: "'Share Tech Mono', monospace", fontSize: '0.7rem',
    color: '#1D4ED8', letterSpacing: '0.05em', zIndex: 2, userSelect: 'none',
  },
  input: {
    width: '100%', padding: '0.85rem 1rem 0.85rem 3.2rem',
    background: 'rgba(2,8,23,0.8)',
    border: '1px solid rgba(59,130,246,0.25)', borderRadius: 3,
    color: '#E2E8F0', fontSize: '0.95rem',
    fontFamily: "'Exo 2', sans-serif", fontWeight: 600,
    letterSpacing: '0.04em',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute', right: '0.75rem', background: 'none', border: 'none',
    cursor: 'pointer', color: '#475569', fontSize: '1.1rem', padding: '0.2rem',
  },
  errBox: {
    padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 3, color: '#FCA5A5',
    fontFamily: "'Share Tech Mono', monospace", fontSize: '0.78rem',
  },
  submitBtn: (dis) => ({
    width: '100%', padding: '0.95rem',
    background: dis ? 'rgba(30,41,59,0.5)' : 'linear-gradient(135deg, #1D4ED8, #0891B2)',
    border: `1px solid ${dis ? 'rgba(100,116,139,0.2)' : 'rgba(59,130,246,0.5)'}`,
    borderRadius: 3, color: dis ? '#475569' : '#fff',
    fontFamily: "'Orbitron', monospace", fontSize: '0.8rem', fontWeight: 700,
    letterSpacing: '0.12em', cursor: dis ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
    transition: 'all 0.2s',
    boxShadow: dis ? 'none' : '0 4px 20px rgba(29,78,216,0.4), 0 0 1px rgba(59,130,246,0.5)',
  }),
  spinner: {
    width: 14, height: 14, display: 'inline-block',
    border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff',
    borderRadius: '50%', animation: 'spinAnim 0.7s linear infinite',
  },
  credPanel: {
    borderTop: '1px solid rgba(59,130,246,0.15)', paddingTop: '1rem', marginBottom: '1rem',
  },
  credLabel: {
    textAlign: 'center', fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.6rem', color: '#334155', letterSpacing: '0.18em', marginBottom: '0.75rem',
  },
  credRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' },
  credBtn: {
    padding: '0.6rem 0.7rem', background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(59,130,246,0.2)', borderRadius: 3,
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.15rem',
    textAlign: 'left',
  },
  credRole: {
    fontFamily: "'Orbitron', monospace", fontSize: '0.58rem',
    color: '#3B82F6', letterSpacing: '0.1em',
  },
  credInfo: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: '0.72rem', color: '#64748B',
  },
  cardFoot: {
    textAlign: 'center', fontFamily: "'Share Tech Mono', monospace",
    fontSize: '0.62rem', color: '#1E293B', letterSpacing: '0.1em',
  },
};

export default LoginPage;
