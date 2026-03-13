import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import GNSSSpoofingDetector from './components/GNSSSpoofingDetector';

const TOKEN_KEY = 'gnss_token';
const USER_KEY  = 'gnss_user';

function App() {
  const [token, setToken] = useState(null);
  const [user,  setUser]  = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t && u) { try { setToken(t); setUser(JSON.parse(u)); } catch { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } }
    setReady(true);
  }, []);

  const handleLogin = (t, u) => {
    setToken(t); setUser(u);
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const handleLogout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  if (!ready) return (
    <div style={{ minHeight:'100vh', background:'#020817', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#3B82F6', fontSize:'2rem' }}>🛰️</div>
    </div>
  );

  if (!token || !user) return <LoginPage onLogin={handleLogin} />;

  return <GNSSSpoofingDetector authToken={token} currentUser={user} onLogout={handleLogout} />;
}

export default App;
