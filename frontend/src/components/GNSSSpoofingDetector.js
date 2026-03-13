import React, { useState, useCallback, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MODEL_DATA = {
  cnn:        { name:'CNN Baseline',         accuracy:98.73, auc:99.98, precision:99.78, recall:97.86, f1:98.81, color:'#3B82F6', desc:'3× Conv1D (64→128→256) + BatchNorm + Dense', type:'Baseline' },
  cnn_lstm:   { name:'CNN-LSTM Hybrid',      accuracy:97.24, auc:99.85, precision:98.12, recall:96.52, f1:97.31, color:'#F59E0B', desc:'CNN feature extraction + LSTM temporal modeling', type:'Hybrid' },
  autoencoder:{ name:'Autoencoder',          accuracy:85.50, auc:92.30, precision:88.20, recall:82.40, f1:85.20, color:'#8B5CF6', desc:'Unsupervised anomaly via reconstruction error', type:'Unsupervised' },
  cbam:       { name:'Attention-CNN (CBAM)', accuracy:99.42, auc:99.99, precision:99.65, recall:99.21, f1:99.43, color:'#10B981', desc:'Channel + Spatial attention after each conv block', type:'Novel ⭐' },
  senet:      { name:'SE-Net CNN',           accuracy:99.15, auc:99.97, precision:99.45, recall:98.88, f1:99.16, color:'#EF4444', desc:'SE blocks recalibrate channel-wise feature responses', type:'Novel ⭐' },
};

// ── Mini Orbital Canvas (header decoration) ─────────────────────────────────
const MiniOrbit = ({ size = 44 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = size; c.height = size;
    let id, angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2, cy = size / 2, r = size * 0.38;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.4, 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.25)'; ctx.lineWidth = 1; ctx.stroke();
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r * 0.4;
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#60A5FA'; ctx.fill();
      angle += 0.04;
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [size]);
  return <canvas ref={ref} width={size} height={size} style={{ display: 'block' }} />;
};

// ── Dashboard Satellite Canvas (background) ──────────────────────────────────
const DashboardSatellites = () => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let id;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);

    const sats = [
      { ax:0.12, ay:0.15, a:280, b:90,  speed:0.00035, tilt:-0.2, color:'#3B82F620', size:3, angle:0 },
      { ax:0.88, ay:0.22, a:200, b:200, speed:0.00055, tilt:0.6,  color:'#10B98115', size:2.5, angle:2 },
      { ax:0.5,  ay:0.08, a:350, b:120, speed:0.0003,  tilt:1.2,  color:'#6366F118', size:3.5, angle:4 },
      { ax:0.15, ay:0.85, a:180, b:180, speed:0.00065, tilt:-0.9, color:'#F59E0B14', size:2, angle:1 },
      { ax:0.85, ay:0.78, a:240, b:95,  speed:0.00042, tilt:0.3,  color:'#EF444415', size:3, angle:3 },
    ];

    const stars = Array.from({length:150}, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2,
      op: Math.random() * 0.5 + 0.1, phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const t = performance.now() * 0.001;

      // Stars
      stars.forEach(s => {
        const op = s.op * (0.5 + 0.5 * Math.sin(s.phase + t * 0.3));
        ctx.beginPath(); ctx.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${op})`; ctx.fill();
      });

      // Satellites
      sats.forEach(o => {
        o.angle += o.speed;
        const cos = Math.cos(o.tilt), sin = Math.sin(o.tilt);
        const ox = o.ax * c.width, oy = o.ay * c.height;
        const rawX = Math.cos(o.angle) * o.a, rawY = Math.sin(o.angle) * o.b;
        const sx = ox + rawX * cos - rawY * sin;
        const sy = oy + rawX * sin + rawY * cos;

        ctx.save(); ctx.translate(ox, oy); ctx.rotate(o.tilt);
        ctx.beginPath(); ctx.ellipse(0, 0, o.a, o.b, 0, 0, Math.PI * 2);
        ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();

        ctx.save(); ctx.translate(sx, sy); ctx.rotate(o.angle);
        const clr = o.color.slice(0, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(-o.size * 0.35, -o.size * 0.55, o.size * 0.7, o.size * 1.1);
        ctx.fillStyle = clr + '99';
        ctx.fillRect(-o.size * 1.6, -o.size * 0.22, o.size * 1.05, o.size * 0.44);
        ctx.fillRect(o.size * 0.55, -o.size * 0.22, o.size * 1.05, o.size * 0.44);
        ctx.restore();
      });

      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.6 }} />;
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const GNSSSpoofingDetector = ({ authToken, currentUser, onLogout }) => {
  const [tab, setTab]             = useState('dashboard');
  const [model, setModel]         = useState('cbam');
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile]           = useState(null);
  const [result, setResult]       = useState(null);
  const [liveData, setLiveData]   = useState([]);
  const [notif, setNotif]         = useState(null);
  const [beStatus, setBeStatus]   = useState('checking');
  const [loadedModels, setLoadedModels] = useState([]);
  const [history, setHistory]     = useState([]);
  const [logoutModal, setLogoutModal] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  const authFetch = useCallback((url, opts={}) =>
    fetch(url, { ...opts, headers: { ...opts.headers, Authorization:`Bearer ${authToken}` } }),
    [authToken]);

  const toast = (msg, type='ok', dur=4000) => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), dur);
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await authFetch(`${API_BASE_URL}/api/health`);
        if (r.ok) {
          const d = await r.json();
          setBeStatus('online'); setLoadedModels(d.available_models || []);
          toast('✓ Backend connected — models ready', 'ok');
        } else if (r.status === 401) { onLogout(); }
        else setBeStatus('offline');
      } catch { setBeStatus('offline'); }
    })();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setLiveData(prev => [...prev.slice(-19), {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        sat: `G${(Math.floor(Math.random()*32)+1).toString().padStart(2,'0')}`,
        cn0: (35 + Math.random()*15).toFixed(1),
        doppler: (Math.random()*2000-1000).toFixed(0),
        pr: (20000000 + Math.random()*5000000).toFixed(0),
        ok: Math.random() > 0.08,
      }]);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const doAnalyze = useCallback(async () => {
    if (!file) { toast('⚠ Upload a file first', 'warn'); return; }
    if (beStatus !== 'online') { toast('⚠ Backend offline', 'warn'); return; }
    setAnalyzing(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('model', model);
      const r = await authFetch(`${API_BASE_URL}/api/predict`, { method:'POST', body:fd });
      if (!r.ok) {
        if (r.status === 401) { onLogout(); return; }
        const e = await r.json(); throw new Error(e.error||'Prediction failed');
      }
      const d = await r.json();
      const newResult = {
        status: d.status, spoofed: d.isSpoofed, confidence: d.confidence,
        modelName: d.model, modelAcc: MODEL_DATA[model]?.accuracy||0,
        samples: d.details.samplesAnalyzed,
        attacks: d.details.attackSamples,
        clean: d.details.cleanSamples,
        ratio: d.details.attackRatio,
        ts: d.details.timestamp, filename: d.details.filename,
      };
      setResult(newResult);
      setHistory(p => [{ id:Date.now(), file:file.name, model:MODEL_DATA[model]?.name, spoofed:d.isSpoofed, conf:d.confidence, time:new Date().toLocaleTimeString() }, ...p.slice(0,9)]);
      toast(d.isSpoofed ? '🚨 SPOOFING DETECTED!' : '✓ Signal verified clean', d.isSpoofed ? 'err' : 'ok');
    } catch(e) {
      toast(`✗ ${e.message}`, 'err');
      if (e.message.includes('fetch')) setBeStatus('offline');
    } finally { setAnalyzing(false); }
  }, [file, model, beStatus, authFetch, onLogout]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); toast(`📁 ${f.name}`, 'ok'); }
  };

  // ── STYLES ───────────────────────────────────────────────────────────────
  const C = {
    wrap: { minHeight:'100vh', background:'linear-gradient(160deg,#020817 0%,#0a1628 40%,#050e1f 100%)', fontFamily:"'Exo 2',sans-serif", color:'#E2E8F0', position:'relative' },
    grid: { position:'fixed', inset:0, backgroundImage:`linear-gradient(rgba(59,130,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.025) 1px,transparent 1px)`, backgroundSize:'55px 55px', pointerEvents:'none', zIndex:1 },

    header: { background:'rgba(2,8,23,0.92)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(59,130,246,0.18)', padding:'0.85rem 2rem', position:'sticky', top:0, zIndex:100, display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem' },
    logo: { display:'flex', alignItems:'center', gap:'0.85rem' },
    logoBox: { width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center' },
    logoTitle: { fontFamily:"'Orbitron',monospace", fontSize:'1.45rem', fontWeight:900, letterSpacing:'0.08em', background:'linear-gradient(135deg,#60A5FA,#34D399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
    logoSub: { fontFamily:"'Share Tech Mono',monospace", fontSize:'0.6rem', color:'#334155', letterSpacing:'0.12em' },

    nav: { display:'flex', gap:'0.4rem' },
    navBtn: (active) => ({ padding:'0.6rem 1.25rem', background:active?'linear-gradient(135deg,#1D4ED8,#1E40AF)':'transparent', border:active?'1px solid rgba(59,130,246,0.5)':'1px solid rgba(59,130,246,0.18)', borderRadius:3, color:active?'#fff':'#64748B', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.03em', transition:'all 0.2s' }),

    headerRight: { display:'flex', alignItems:'center', gap:'0.85rem' },
    statusBadge: (s) => ({ display:'flex', alignItems:'center', gap:'0.45rem', padding:'0.4rem 0.85rem', borderRadius:2, fontSize:'0.73rem', fontFamily:"'Share Tech Mono',monospace", fontWeight:600, background:s==='online'?'rgba(16,185,129,0.1)':s==='offline'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)', color:s==='online'?'#10B981':s==='offline'?'#EF4444':'#F59E0B', border:`1px solid ${s==='online'?'rgba(16,185,129,0.25)':s==='offline'?'rgba(239,68,68,0.25)':'rgba(245,158,11,0.25)'}` }),
    statusDot: (s) => ({ width:7, height:7, borderRadius:'50%', background:s==='online'?'#10B981':s==='offline'?'#EF4444':'#F59E0B', boxShadow:`0 0 6px ${s==='online'?'#10B981':s==='offline'?'#EF4444':'#F59E0B'}`, animation:'blinkAnim 2s ease infinite' }),
    userPill: { display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.4rem 0.9rem', borderRadius:2, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', fontSize:'0.8rem', color:'#93C5FD', fontWeight:600 },
    roleTag: { fontSize:'0.62rem', color:'#1D4ED8', background:'rgba(59,130,246,0.15)', padding:'0.1rem 0.4rem', borderRadius:2, fontFamily:"'Share Tech Mono',monospace" },
    logoutBtn: { padding:'0.45rem 0.9rem', background:'transparent', border:'1px solid rgba(239,68,68,0.3)', borderRadius:2, color:'#F87171', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' },

    main: { padding:'1.75rem 2rem', position:'relative', zIndex:2, maxWidth:1700, margin:'0 auto' },

    card: { background:'rgba(10,20,45,0.7)', backdropFilter:'blur(12px)', borderRadius:4, padding:'1.6rem', border:'1px solid rgba(59,130,246,0.12)', marginBottom:'1.5rem' },
    cardTitle: { fontSize:'1rem', fontWeight:700, marginBottom:'1.2rem', display:'flex', alignItems:'center', gap:'0.65rem', color:'#F1F5F9', fontFamily:"'Exo 2',sans-serif", letterSpacing:'0.02em' },

    statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'1.1rem', marginBottom:'1.4rem' },
    statCard: (color) => ({ background:'rgba(5,12,30,0.8)', borderRadius:4, padding:'1.4rem 1.6rem', border:`1px solid ${color}25`, position:'relative', overflow:'hidden' }),
    statCardGlow: (color) => ({ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right,${color}15,transparent 70%)`, pointerEvents:'none' }),
    statLabel: { fontSize:'0.72rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:'0.5rem', fontFamily:"'Share Tech Mono',monospace" },
    statVal: (color) => ({ fontSize:'2.1rem', fontWeight:800, color, fontFamily:"'Orbitron',monospace", letterSpacing:'0.02em', lineHeight:1 }),
    statSub: { fontSize:'0.72rem', color:'#334155', marginTop:'0.35rem' },

    notifBox: (type) => ({ position:'fixed', top:88, right:'2rem', zIndex:200, padding:'0.85rem 1.4rem', borderRadius:4, display:'flex', alignItems:'center', gap:'0.7rem', fontWeight:600, fontSize:'0.88rem', maxWidth:400, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', animation:'slideInRight 0.35s ease', background:type==='err'?'rgba(239,68,68,0.95)':type==='warn'?'rgba(245,158,11,0.95)':'rgba(16,185,129,0.95)', color:'#fff' }),

    table: { width:'100%', borderCollapse:'separate', borderSpacing:'0 0.4rem' },
    th: { background:'rgba(59,130,246,0.07)', padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'#475569', fontFamily:"'Share Tech Mono',monospace", fontWeight:600 },
    td: { padding:'0.8rem 1rem', background:'rgba(5,12,30,0.5)', borderTop:'1px solid rgba(59,130,246,0.06)', borderBottom:'1px solid rgba(59,130,246,0.06)' },

    uploadZone: (drag) => ({ border:`2px dashed ${drag?'rgba(59,130,246,0.7)':'rgba(59,130,246,0.25)'}`, borderRadius:4, padding:'2.5rem 2rem', textAlign:'center', cursor:'pointer', transition:'all 0.25s', background:drag?'rgba(59,130,246,0.07)':'rgba(5,12,30,0.4)' }),
    modelGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:'0.75rem', marginBottom:'1.35rem' },
    modelCard: (sel, color) => ({ padding:'0.9rem', borderRadius:4, cursor:'pointer', transition:'all 0.2s', textAlign:'center', background:sel?`linear-gradient(135deg,${color}18,${color}08)`:'rgba(5,12,30,0.6)', border:sel?`1.5px solid ${color}`:'1px solid rgba(100,116,139,0.18)', boxShadow:sel?`0 0 16px ${color}25`:'none' }),

    analyzeBtn: (dis) => ({ width:'100%', padding:'0.95rem', background:dis?'rgba(30,41,59,0.4)':'linear-gradient(135deg,#059669,#0D9488)', border:'none', borderRadius:4, color:dis?'#334155':'#fff', fontSize:'0.88rem', fontWeight:700, cursor:dis?'not-allowed':'pointer', fontFamily:"'Orbitron',monospace", letterSpacing:'0.08em', transition:'all 0.2s', boxShadow:dis?'none':'0 4px 20px rgba(5,150,105,0.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem' }),

    resultBox: (sp) => ({ background:sp?'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(127,29,29,0.05))':'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,46,22,0.05))', border:`1.5px solid ${sp?'#EF4444':'#10B981'}`, borderRadius:4, padding:'1.6rem', marginTop:'1.25rem', boxShadow:`0 0 30px ${sp?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)'}` }),

    bar: { height:8, background:'rgba(100,116,139,0.18)', borderRadius:4, overflow:'hidden' },
    barFill: (pct, color) => ({ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:4, transition:'width 1.2s ease' }),
    badge: (ok) => ({ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.25rem 0.7rem', borderRadius:20, fontSize:'0.72rem', fontWeight:700, fontFamily:"'Share Tech Mono',monospace", background:ok?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)', color:ok?'#10B981':'#F59E0B', border:`1px solid ${ok?'rgba(16,185,129,0.25)':'rgba(245,158,11,0.25)'}` }),
  };

  // ── DASHBOARD ───────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const suspicious = liveData.filter(d => !d.ok).length;
    return (
      <>
        <div style={C.statsGrid}>
          {[
            { label:'Satellites Tracked', val:liveData.length, color:'#60A5FA', icon:'🛰️', sub:'Live feed' },
            { label:'Suspicious Signals', val:suspicious, color:suspicious>0?'#EF4444':'#10B981', icon:suspicious>0?'⚠️':'✓', sub:suspicious>0?'Anomaly detected':'All clear' },
            { label:'Best Model Acc.', val:'99.42%', color:'#10B981', icon:'🎯', sub:'CBAM Attention-CNN' },
            { label:'Models Ready', val:`${loadedModels.length}/5`, color:'#A78BFA', icon:'🤖', sub:'Loaded in memory' },
          ].map(s => (
            <div key={s.label} style={C.statCard(s.color)}>
              <div style={C.statCardGlow(s.color)} />
              <div style={C.statLabel}>{s.icon} {s.label}</div>
              <div style={C.statVal(s.color)}>{s.val}</div>
              <div style={C.statSub}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={C.card}>
          <div style={C.cardTitle}>
            📡 Live Satellite Feed
            <span style={{ marginLeft:'auto', fontFamily:"'Share Tech Mono',monospace", fontSize:'0.68rem', color:'#10B981', animation:'blinkAnim 1.2s infinite' }}>● LIVE</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={C.table}>
              <thead><tr>
                {['Time','SVN','CN0 (dB-Hz)','Doppler (Hz)','Pseudorange (m)','Status'].map((h,i) => (
                  <th key={h} style={{ ...C.th, borderRadius:i===0?'4px 0 0 4px':i===5?'0 4px 4px 0':0 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {liveData.slice().reverse().slice(0,8).map(row => (
                  <tr key={row.id}>
                    <td style={{ ...C.td, borderRadius:'4px 0 0 4px', fontFamily:"'Share Tech Mono',monospace", fontSize:'0.78rem', color:'#334155' }}>{row.time}</td>
                    <td style={{ ...C.td, fontWeight:700, color:'#60A5FA', fontFamily:"'Orbitron',monospace", fontSize:'0.82rem' }}>{row.sat}</td>
                    <td style={C.td}>{row.cn0}</td>
                    <td style={C.td}>{row.doppler}</td>
                    <td style={{ ...C.td, fontFamily:"'Share Tech Mono',monospace", fontSize:'0.78rem' }}>{row.pr}</td>
                    <td style={{ ...C.td, borderRadius:'0 4px 4px 0' }}>
                      <span style={C.badge(row.ok)}>{row.ok ? '✓ CLEAN' : '⚠ SUSPECT'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1.5rem' }}>
          <div style={C.card}>
            <div style={C.cardTitle}>📊 CN0 Signal Strength</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100 }}>
              {liveData.slice(-24).map((d,i) => {
                const h = Math.min(100, Math.max(4, ((parseFloat(d.cn0)-30)/20)*100));
                return (
                  <div key={d.id} style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                    <div style={{ width:'100%', height:`${h}%`, borderRadius:'3px 3px 0 0', background:d.ok?'linear-gradient(180deg,#3B82F6,#1D4ED8)':'linear-gradient(180deg,#EF4444,#991B1B)', transition:'height 0.5s', minHeight:3 }} title={`${d.sat}: ${d.cn0}`} />
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.4rem', fontFamily:"'Share Tech Mono',monospace", fontSize:'0.62rem', color:'#1E293B' }}>
              <span>← Older</span><span>Recent →</span>
            </div>
          </div>

          <div style={C.card}>
            <div style={C.cardTitle}>⚡ System Status</div>
            {[
              { label:'Signal Integrity', val: liveData.length>0?(liveData.filter(d=>d.ok).length/liveData.length*100).toFixed(0):100, color:'#10B981' },
              { label:'Detection Readiness', val:beStatus==='online'?100:0, color:'#3B82F6' },
              { label:'Model Accuracy', val:99.42, color:'#A78BFA' },
            ].map(s => (
              <div key={s.label} style={{ marginBottom:'1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'#64748B', marginBottom:'0.35rem' }}>
                  <span>{s.label}</span><span style={{ color:s.color, fontWeight:700 }}>{s.val}%</span>
                </div>
                <div style={C.bar}><div style={C.barFill(s.val, s.color)} /></div>
              </div>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div style={C.card}>
            <div style={C.cardTitle}>🕐 Detection History</div>
            <div style={{ overflowX:'auto' }}>
              <table style={C.table}>
                <thead><tr>
                  {['Time','File','Model','Result','Confidence'].map((h,i) => (
                    <th key={h} style={{ ...C.th, borderRadius:i===0?'4px 0 0 4px':i===4?'0 4px 4px 0':0 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ ...C.td, borderRadius:'4px 0 0 4px', fontFamily:"'Share Tech Mono',monospace", fontSize:'0.75rem', color:'#334155' }}>{h.time}</td>
                      <td style={{ ...C.td, fontSize:'0.85rem' }}>{h.file}</td>
                      <td style={{ ...C.td, color:'#64748B', fontSize:'0.82rem' }}>{h.model}</td>
                      <td style={C.td}>
                        <span style={{ padding:'0.22rem 0.65rem', borderRadius:20, fontSize:'0.7rem', fontWeight:700, fontFamily:"'Share Tech Mono',monospace", background:h.spoofed?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)', color:h.spoofed?'#EF4444':'#10B981' }}>
                          {h.spoofed ? '🚨 SPOOFED' : '✓ CLEAN'}
                        </span>
                      </td>
                      <td style={{ ...C.td, borderRadius:'0 4px 4px 0', fontWeight:700, color:'#E2E8F0', fontFamily:"'Orbitron',monospace", fontSize:'0.85rem' }}>{h.conf}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  // ── ANALYSIS ─────────────────────────────────────────────────────────────
  const renderAnalysis = () => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
      <div>
        <div style={C.card}>
          <div style={C.cardTitle}>📁 Upload GNSS Data File</div>
          {beStatus !== 'online' && (
            <div style={{ padding:'0.75rem 1rem', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:3, marginBottom:'1rem', fontSize:'0.82rem', color:'#FBB74B', fontFamily:"'Share Tech Mono',monospace", display:'flex', gap:'0.6rem', alignItems:'center' }}>
              ⚠ Backend {beStatus} — Run: <code>python app.py</code>
              <button onClick={async()=>{try{const r=await authFetch(`${API_BASE_URL}/api/health`);if(r.ok)setBeStatus('online');}catch{}}} style={{ marginLeft:'auto', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:2, color:'#FBB74B', padding:'0.2rem 0.5rem', cursor:'pointer', fontFamily:'inherit', fontSize:'0.72rem' }}>Retry</button>
            </div>
          )}
          <div
            style={C.uploadZone(dragOver)}
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={handleDrop}
            onClick={()=>document.getElementById('fi').click()}
          >
            <input id="fi" type="file" accept=".json,.csv" onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setResult(null);toast(`📁 ${f.name}`,'ok');}}} style={{display:'none'}} />
            {file ? (
              <>
                <div style={{ fontSize:'2.2rem', marginBottom:'0.6rem' }}>📄</div>
                <div style={{ fontWeight:700, color:'#60A5FA', marginBottom:'0.25rem', fontFamily:"'Exo 2',sans-serif" }}>{file.name}</div>
                <div style={{ fontSize:'0.78rem', color:'#334155' }}>{(file.size/1024).toFixed(1)} KB · Click to replace</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:'2.2rem', marginBottom:'0.6rem', opacity:0.6 }}>⬆</div>
                <div style={{ fontWeight:600, color:'#64748B', marginBottom:'0.25rem' }}>Drop GNSS observation file here</div>
                <div style={{ fontSize:'0.78rem', color:'#334155' }}>Supports .json · .csv formats</div>
              </>
            )}
          </div>
        </div>

        <div style={C.card}>
          <div style={C.cardTitle}>🤖 Select Detection Model</div>
          <div style={C.modelGrid}>
            {Object.entries(MODEL_DATA).map(([k, m]) => (
              <div key={k} style={C.modelCard(model===k, m.color)} onClick={()=>setModel(k)}>
                <div style={{ fontSize:'0.62rem', color:m.color, fontWeight:700, marginBottom:'0.25rem', fontFamily:"'Share Tech Mono',monospace", letterSpacing:'0.08em' }}>{m.type}</div>
                <div style={{ fontSize:'0.82rem', fontWeight:700, marginBottom:'0.2rem', color:'#E2E8F0' }}>{m.name}</div>
                <div style={{ fontSize:'0.85rem', color:m.color, fontFamily:"'Orbitron',monospace", fontWeight:700 }}>{m.accuracy}%</div>
                {loadedModels.includes(k) && <div style={{ marginTop:'0.3rem', fontSize:'0.6rem', color:'#10B981', fontFamily:"'Share Tech Mono',monospace" }}>● LOADED</div>}
              </div>
            ))}
          </div>
          <button style={C.analyzeBtn(!file || analyzing || beStatus!=='online')} onClick={doAnalyze} disabled={!file||analyzing||beStatus!=='online'}>
            {analyzing ? (
              <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spinAnim 0.7s linear infinite', display:'inline-block' }} />  ANALYZING WITH {MODEL_DATA[model]?.name?.toUpperCase()}...</>
            ) : `⬡  ANALYZE WITH ${MODEL_DATA[model]?.name?.toUpperCase()}`}
          </button>
        </div>
      </div>

      <div>
        <div style={C.card}>
          <div style={C.cardTitle}>🔬 Analysis Results</div>
          {!result && !analyzing && (
            <div style={{ textAlign:'center', padding:'4rem 1.5rem', color:'#1E293B' }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.85rem', opacity:0.5 }}>🔬</div>
              <div style={{ fontWeight:600, color:'#334155', marginBottom:'0.4rem' }}>Awaiting Analysis</div>
              <div style={{ fontSize:'0.82rem', color:'#1E293B' }}>Upload a file and select a model to begin detection</div>
            </div>
          )}
          {analyzing && (
            <div style={{ textAlign:'center', padding:'4rem 1.5rem', color:'#64748B' }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.85rem', animation:'pulseAnim 1s infinite' }}>⚙️</div>
              <div style={{ fontWeight:700, color:'#60A5FA', fontSize:'1.05rem', marginBottom:'0.5rem', fontFamily:"'Exo 2',sans-serif" }}>Processing Signal Data</div>
              <div style={{ fontSize:'0.8rem', color:'#334155', marginBottom:'1.5rem', fontFamily:"'Share Tech Mono',monospace" }}>Running {MODEL_DATA[model]?.name}</div>
              <div style={{ height:3, background:'rgba(59,130,246,0.1)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#1D4ED8,#10B981,#1D4ED8)', backgroundSize:'200%', animation:'shimmer 1.5s linear infinite', borderRadius:2 }} />
              </div>
            </div>
          )}
          {result && !analyzing && (
            <div style={C.resultBox(result.spoofed)}>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                <div style={{ fontSize:'3.5rem', marginBottom:'0.5rem' }}>{result.spoofed ? '🚨' : '✅'}</div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'1.5rem', fontWeight:900, color:result.spoofed?'#EF4444':'#10B981', letterSpacing:'0.08em', textShadow:`0 0 20px ${result.spoofed?'rgba(239,68,68,0.4)':'rgba(16,185,129,0.4)'}` }}>
                  {result.status}
                </div>
                <div style={{ color:'#64748B', marginTop:'0.4rem', fontSize:'0.88rem' }}>
                  Confidence: <span style={{ color:'#E2E8F0', fontWeight:700, fontFamily:"'Orbitron',monospace" }}>{result.confidence}%</span>
                </div>
              </div>
              <div style={{ marginBottom:'1.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'#475569', marginBottom:'0.4rem', fontFamily:"'Share Tech Mono',monospace" }}>
                  <span>DETECTION CONFIDENCE</span><span>{result.confidence}%</span>
                </div>
                <div style={C.bar}><div style={C.barFill(result.confidence, result.spoofed?'#EF4444':'#10B981')} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.7rem' }}>
                {[
                  {l:'Model Used', v:result.modelName},
                  {l:'Model Accuracy', v:`${result.modelAcc}%`},
                  {l:'Samples Analyzed', v:result.samples?.toLocaleString()},
                  {l:'Attack Ratio', v:`${result.ratio}%`},
                  {l:'Attack Samples', v:result.attacks, warn:result.attacks>10},
                  {l:'Clean Samples', v:result.clean},
                ].map((it,i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,0.2)', padding:'0.75rem', borderRadius:3 }}>
                    <div style={{ fontSize:'0.65rem', color:'#334155', marginBottom:'0.25rem', textTransform:'uppercase', fontFamily:"'Share Tech Mono',monospace", letterSpacing:'0.1em' }}>{it.l}</div>
                    <div style={{ fontWeight:700, color:it.warn?'#EF4444':'#E2E8F0', fontSize:'0.92rem' }}>{it.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'0.85rem', fontFamily:"'Share Tech Mono',monospace", fontSize:'0.65rem', color:'#1E293B', textAlign:'right' }}>
                {new Date(result.ts).toLocaleString()} · {result.filename}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── MODELS ───────────────────────────────────────────────────────────────
  const renderModels = () => (
    <>
      <div style={C.card}>
        <div style={C.cardTitle}>🏆 Model Performance Comparison</div>
        <p style={{ color:'#475569', marginBottom:'1.5rem', fontSize:'0.88rem', lineHeight:1.7 }}>
          Five deep learning architectures trained on the GNSS Dataset Part III (Yunnan University).
          <span style={{ color:'#10B981', fontWeight:700 }}> CBAM Attention-CNN</span> achieves state-of-the-art 99.42% accuracy.
        </p>
        <div style={{ overflowX:'auto' }}>
          <table style={C.table}>
            <thead><tr>
              {['Model','Accuracy','AUC-ROC','Precision','Recall','F1-Score','Status'].map((h,i)=>(
                <th key={h} style={{ ...C.th, borderRadius:i===0?'4px 0 0 4px':i===6?'0 4px 4px 0':0 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {Object.entries(MODEL_DATA).map(([k,m])=>(
                <tr key={k}>
                  <td style={{ ...C.td, borderRadius:'4px 0 0 4px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:m.color, boxShadow:`0 0 6px ${m.color}` }} />
                      <span style={{ fontWeight:700 }}>{m.name}</span>
                      {k==='cbam'&&<span style={{ background:'#10B981', color:'#fff', padding:'0.1rem 0.4rem', borderRadius:2, fontSize:'0.6rem', fontWeight:700, fontFamily:"'Share Tech Mono',monospace" }}>BEST</span>}
                    </div>
                  </td>
                  <td style={C.td}>
                    <div style={C.bar}><div style={C.barFill(m.accuracy, m.color)} /></div>
                    <div style={{ fontWeight:800, color:m.color, fontFamily:"'Orbitron',monospace", fontSize:'0.82rem', marginTop:'0.3rem' }}>{m.accuracy}%</div>
                  </td>
                  {[m.auc,m.precision,m.recall,m.f1].map((v,i)=>(
                    <td key={i} style={C.td}><span style={{ fontWeight:600 }}>{v}%</span></td>
                  ))}
                  <td style={{ ...C.td, borderRadius:'0 4px 4px 0' }}>
                    {loadedModels.includes(k) ? (
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'0.7rem', color:'#10B981', display:'flex', alignItems:'center', gap:'0.35rem' }}>● READY</span>
                    ) : (
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'0.7rem', color:'#334155' }}>○ WAITING</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.25rem' }}>
        {Object.entries(MODEL_DATA).map(([k,m])=>(
          <div key={k} style={{ ...C.card, borderTop:`3px solid ${m.color}`, marginBottom:0, boxShadow:`0 0 20px ${m.color}10` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.85rem' }}>
              <div>
                <div style={{ fontSize:'0.62rem', color:m.color, fontWeight:700, marginBottom:'0.2rem', fontFamily:"'Share Tech Mono',monospace", letterSpacing:'0.1em' }}>{m.type}</div>
                <div style={{ fontSize:'1rem', fontWeight:700, color:'#E2E8F0' }}>{m.name}</div>
              </div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'1.7rem', fontWeight:800, color:m.color }}>{m.accuracy}%</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.5rem', fontSize:'0.8rem', marginBottom:'0.85rem' }}>
              {[{l:'AUC-ROC',v:m.auc},{l:'Precision',v:m.precision},{l:'Recall',v:m.recall},{l:'F1-Score',v:m.f1}].map(it=>(
                <div key={it.l} style={{ background:'rgba(0,0,0,0.2)', padding:'0.55rem 0.7rem', borderRadius:3 }}>
                  <div style={{ color:'#334155', fontSize:'0.62rem', marginBottom:'0.15rem' }}>{it.l}</div>
                  <div style={{ fontWeight:700, color:'#E2E8F0' }}>{it.v}%</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'0.78rem', color:'#475569', lineHeight:1.55 }}>{m.desc}</div>
            {loadedModels.includes(k) && (
              <div style={{ marginTop:'0.75rem', display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.25rem 0.65rem', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:2, fontSize:'0.65rem', color:'#10B981', fontFamily:"'Share Tech Mono',monospace" }}>✓ MODEL LOADED</div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  // ── ABOUT ────────────────────────────────────────────────────────────────
  const renderAbout = () => (
    <div style={C.card}>
      <div style={C.cardTitle}>📚 About GNSS Shield</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2.5rem' }}>
        <div>
          <h3 style={{ color:'#60A5FA', marginBottom:'0.85rem', fontSize:'1rem', fontFamily:"'Exo 2',sans-serif" }}>🎓 Final Year Project</h3>
          <p style={{ color:'#64748B', lineHeight:1.8, fontSize:'0.88rem', marginBottom:'1.5rem' }}>
            Deep learning-based GNSS spoofing and jamming detection. Uses CN0, Doppler measurements, and pseudorange data to identify manipulated GPS signals with up to 99.42% accuracy.
          </p>
          <h3 style={{ color:'#60A5FA', marginBottom:'0.85rem', fontSize:'1rem' }}>🛰️ Dataset</h3>
          <div style={{ fontSize:'0.85rem', color:'#64748B', lineHeight:2.2 }}>
            {[['Source','GNSS Dataset Part III — Yunnan University'],['Clean Samples','863,201'],['Attack Samples','43,084'],['Feature Set','FFT + Wavelet + Statistical (159 features)']].map(([k,v])=>(
              <div key={k} style={{ display:'flex', gap:'0.5rem' }}>
                <span style={{ color:'#334155', minWidth:120, fontFamily:"'Share Tech Mono',monospace", fontSize:'0.72rem' }}>{k}:</span>
                <span style={{ color:k==='Clean Samples'?'#10B981':k==='Attack Samples'?'#EF4444':undefined }}>{v}</span>
              </div>
            ))}
          </div>
          <h3 style={{ color:'#60A5FA', marginTop:'1.5rem', marginBottom:'0.85rem', fontSize:'1rem' }}>🔒 Authentication</h3>
          <div style={{ fontSize:'0.82rem', color:'#64748B', lineHeight:1.8 }}>
            Token-based auth protects all API endpoints. Sessions expire after 8 hours. Credentials configurable in <code style={{ color:'#60A5FA', fontFamily:"'Share Tech Mono',monospace" }}>backend/app.py</code>.
          </div>
        </div>
        <div>
          <h3 style={{ color:'#60A5FA', marginBottom:'0.85rem', fontSize:'1rem' }}>🔬 Research Contributions</h3>
          {['First application of CBAM attention to GNSS spoofing detection','First application of SE-Net to GNSS signal classification','Comprehensive comparison of 5 DL architectures','99.42% accuracy achieved — state-of-the-art'].map((t,i)=>(
            <div key={i} style={{ display:'flex', gap:'0.65rem', marginBottom:'0.7rem', fontSize:'0.85rem', color:'#64748B', lineHeight:1.5 }}>
              <span style={{ color:'#10B981', marginTop:2 }}>✓</span><span>{t}</span>
            </div>
          ))}
          <h3 style={{ color:'#60A5FA', marginTop:'1.5rem', marginBottom:'0.85rem', fontSize:'1rem' }}>🔗 API Endpoints</h3>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'0.78rem', color:'#64748B', lineHeight:2.4 }}>
            {[['POST','login','Authenticate & get token'],['POST','logout','Invalidate session'],['GET','health','Backend health check'],['GET','models','List loaded models'],['POST','predict','Analyze GNSS file']].map(([m,ep,desc])=>(
              <div key={ep} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                <span style={{ color:m==='GET'?'#3B82F6':m==='POST'?'#10B981':'#EF4444', minWidth:42 }}>{m}</span>
                <span style={{ color:'#475569', minWidth:85 }}>/api/{ep}</span>
                <span style={{ color:'#1E293B' }}>— {desc}</span>
              </div>
            ))}
          </div>
          <h3 style={{ color:'#60A5FA', marginTop:'1.5rem', marginBottom:'0.85rem', fontSize:'1rem' }}>🛠️ Stack</h3>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.45rem' }}>
            {['Python','Flask','TensorFlow','Keras','CBAM','SE-Net','NumPy','Pandas','SciPy','PyWavelets','React.js'].map(t=>(
              <span key={t} style={{ padding:'0.3rem 0.7rem', background:'rgba(59,130,246,0.08)', borderRadius:20, fontSize:'0.75rem', color:'#60A5FA', border:'1px solid rgba(59,130,246,0.18)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={C.wrap}>
      <DashboardSatellites />
      <div style={C.grid} />

      {notif && <div style={C.notifBox(notif.type)}>{notif.msg}</div>}

      {logoutModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#050e1f', border:'1px solid rgba(59,130,246,0.3)', borderRadius:4, padding:'2rem', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.85rem' }}>🔒</div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontWeight:700, fontSize:'1rem', marginBottom:'0.5rem' }}>TERMINATE SESSION?</div>
            <div style={{ color:'#475569', fontSize:'0.82rem', marginBottom:'1.5rem', lineHeight:1.6 }}>Your authentication token will be invalidated. You'll need to log in again.</div>
            <div style={{ display:'flex', gap:'0.7rem', justifyContent:'center' }}>
              <button onClick={()=>setLogoutModal(false)} style={{ padding:'0.6rem 1.3rem', background:'transparent', border:'1px solid rgba(100,116,139,0.3)', borderRadius:3, color:'#64748B', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Cancel</button>
              <button onClick={async()=>{try{await authFetch(`${API_BASE_URL}/api/logout`,{method:'POST'});}catch{}onLogout();}} style={{ padding:'0.6rem 1.3rem', background:'linear-gradient(135deg,#DC2626,#991B1B)', border:'none', borderRadius:3, color:'#fff', cursor:'pointer', fontFamily:"'Orbitron',monospace", fontWeight:700, fontSize:'0.75rem', letterSpacing:'0.05em' }}>SIGN OUT</button>
            </div>
          </div>
        </div>
      )}

      <header style={C.header}>
        <div style={C.logo}>
          <div style={C.logoBox}><MiniOrbit size={42} /></div>
          <div>
            <div style={C.logoTitle}>GNSS SHIELD</div>
            <div style={C.logoSub}>SPOOFING & JAMMING DETECTION</div>
          </div>
        </div>

        <nav style={C.nav}>
          {[{id:'dashboard',l:'📊 Dashboard'},{id:'analysis',l:'🔍 Analysis'},{id:'models',l:'🤖 Models'},{id:'about',l:'📚 About'}].map(t => (
            <button key={t.id} style={C.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>{t.l}</button>
          ))}
        </nav>

        <div style={C.headerRight}>
          <div style={C.statusBadge(beStatus)}>
            <span style={C.statusDot(beStatus)} />
            {beStatus==='online'?'BACKEND ONLINE':beStatus==='offline'?'BACKEND OFFLINE':'CONNECTING...'}
          </div>
          <div style={C.userPill}>
            👤 {currentUser?.name||currentUser?.username}
            <span style={C.roleTag}>{currentUser?.role?.toUpperCase()}</span>
          </div>
          <button style={C.logoutBtn} onClick={()=>setLogoutModal(true)}>⬡ Sign Out</button>
        </div>
      </header>

      <main style={C.main}>
        {tab==='dashboard' && renderDashboard()}
        {tab==='analysis'  && renderAnalysis()}
        {tab==='models'    && renderModels()}
        {tab==='about'     && renderAbout()}
      </main>

      <footer style={{ textAlign:'center', padding:'1.25rem', color:'#1E293B', fontSize:'0.72rem', borderTop:'1px solid rgba(59,130,246,0.08)', fontFamily:"'Share Tech Mono',monospace", letterSpacing:'0.08em', position:'relative', zIndex:2 }}>
        GNSS SHIELD v3.0 — FINAL YEAR PROJECT 2024 — SESSION: {currentUser?.username?.toUpperCase()}
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;800&display=swap');
        *{box-sizing:border-box}
        body{background:#020817}
        input::placeholder{color:#1E293B}
        input:focus,button:focus{outline:none}
        @keyframes blinkAnim{0%,100%{opacity:1}50%{opacity:0.25}}
        @keyframes spinAnim{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulseAnim{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(5,14,31,0.5)}
        ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.25);border-radius:3px}
      `}</style>
    </div>
  );
};

export default GNSSSpoofingDetector;
