import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Trophy, 
  Calendar, 
  PlusCircle, 
  Activity, 
  XCircle,
  TrendingUp,
  LayoutDashboard,
  Users,
  Trash2,
  Swords,
  PlayCircle,
  Edit2,
  Check,
  AlertTriangle,
  Database,
  Calculator,
  BarChart3,
  Minus,
  Pencil,
  BookOpen,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  LineChart,
  RefreshCw,
  Pizza,
  Lock, 
  Unlock, 
  LogIn,
  Zap,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

// --- CONFIGURAZIONE LOGO E LINK ESTERNI ---
import logo from './logo.png'; 
const PLAYTOMIC_URL = "https://playtomic.io/";

// --- CONFIGURAZIONE FIREBASE ---
let firebaseConfig;
if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  firebaseConfig = {
    apiKey: "AIzaSyB2w2clbQb6bO8JAanYlhNWQ5_X3NQfoxQ",
    authDomain: "padel-challenge-2026.firebaseapp.com",
    projectId: "padel-challenge-2026",
    storageBucket: "padel-challenge-2026.firebasestorage.app",
    messagingSenderId: "1072658469938",
    appId: "1:1072658469938:web:c3fa66d8d03a677e0fd82b"
  };
}

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Errore configurazione Firebase:", e);
}

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'padel-friends-v1';

// --- HELPERS ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 300; 
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date).toISOString().split('T')[0]);
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const calculatePoints = (score) => {
  if (!score) return { t1Points: 0, t2Points: 0, winner: null, t1Games: 0, t2Games: 0 };
  const sets = String(score).trim().split(/\s+/);
  let t1Sets = 0, t2Sets = 0, t1Games = 0, t2Games = 0;

  sets.forEach(set => {
    const parts = set.split('-');
    if (parts.length === 2) {
      const g1 = parseInt(parts[0]), g2 = parseInt(parts[1]);
      if (!isNaN(g1) && !isNaN(g2)) {
        t1Games += g1; t2Games += g2;
        if (g1 > g2) t1Sets++; else if (g2 > g1) t2Sets++;
      }
    }
  });

  let t1Points = 0, t2Points = 0, winner = 'draw';
  if (t1Sets === 2 && t2Sets === 0) { t1Points = 8; t2Points = 0.2 * t2Games; winner = 'team1'; } 
  else if (t2Sets === 2 && t1Sets === 0) { t2Points = 8; t1Points = 0.2 * t1Games; winner = 'team2'; }
  else if (t1Sets === 2 && t2Sets === 1) { t1Points = 6; t2Points = 3; winner = 'team1'; }
  else if (t2Sets === 2 && t1Sets === 1) { t2Points = 6; t1Points = 3; winner = 'team2'; }
  else { t1Points = t1Games * 0.3; t2Points = t2Games * 0.3; winner = 'draw'; }

  return { t1Points, t2Points, winner, t1Games, t2Games, t1Sets, t2Sets };
};

// --- COMPONENTI UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = "button" }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg";
  const variants = {
    primary: "bg-lime-400 text-slate-900 hover:bg-lime-300 shadow-lime-900/20",
    secondary: "bg-slate-700 text-white hover:bg-slate-600 shadow-slate-900/20",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50",
    ghost: "bg-transparent text-slate-400 hover:text-white"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50' : ''}`}>{children}</button>;
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}>{children}</div>
);

const Input = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="mb-4">
    <label className="block text-slate-400 text-sm font-medium mb-1 ml-1">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400" />
  </div>
);

const PlayerAvatar = ({ player, size = "md", className="" }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl", xl: "w-24 h-24 text-3xl" };
  if (player?.photoUrl) return <img src={player.photoUrl} alt={player.name || '?'} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600 bg-slate-800 ${className}`} />;
  return <div className={`${sizeClasses[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 ${className}`}>{player?.name ? player.name.charAt(0).toUpperCase() : '?'}</div>;
};

// --- CHART COMPONENT ---
const ProgressChart = ({ players, matches }) => {
  const sortedMatches = matches.filter(m => m.status === 'completed').sort((a, b) => new Date(a.date) - new Date(b.date));
  const history = {}; players.forEach(p => { history[p.id] = [0]; });
  let maxPoints = 10;
  
  sortedMatches.forEach(m => {
    let t1P = 0, t2P = 0;
    if (m.type === 'tiebreak') { if (m.winner === 'team1') t1P = 2; else t2P = 2; }
    else { const p = calculatePoints(m.score); t1P = p.t1Points; t2P = p.t2Points; }
    players.forEach(p => {
      const currentPoints = history[p.id][history[p.id].length - 1];
      let newPoints = currentPoints;
      if (m.team1?.includes(p.id)) newPoints += t1P;
      if (m.team2?.includes(p.id)) newPoints += t2P;
      history[p.id].push(newPoints);
      if (newPoints > maxPoints) maxPoints = newPoints;
    });
  });

  const numSteps = sortedMatches.length;
  if (numSteps === 0) return <div className="text-center text-slate-500 py-10">Nessuna partita giocata</div>;
  const width = 100, height = 60, padding = 5;
  const chartW = width - (padding * 2), chartH = height - (padding * 2);
  const colors = ['#a3e635', '#3b82f6', '#facc15', '#f472b6', '#a855f7', '#22d3ee'];

  return (
    <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800">
      <div className="flex flex-wrap gap-3 mb-4 justify-center">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-slate-300">{p.name}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {[0, 0.5, 1].map(t => (<line key={t} x1={padding} y1={padding + (chartH * t)} x2={width - padding} y2={padding + (chartH * t)} stroke="#1e293b" strokeWidth="0.5" />))}
        {players.map((p, i) => {
          const points = history[p.id];
          const pointsString = points.map((val, idx) => {
            const x = padding + (idx / numSteps) * chartW;
            const y = (height - padding) - (val / maxPoints) * chartH;
            return `${x},${y}`;
          }).join(' ');
          const lastVal = points[points.length - 1];
          const lastX = padding + (points.length - 1) / numSteps * chartW;
          const lastY = (height - padding) - (lastVal / maxPoints) * chartH;
          return (
            <g key={p.id}>
              <polyline points={pointsString} fill="none" stroke={colors[i % colors.length]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <foreignObject x={lastX - 3} y={lastY - 3} width="8" height="8">
                <PlayerAvatar player={p} size="sm" className="w-full h-full border-[0.5px] border-slate-900" />
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [showSplash, setShowSplash] = useState(true); 
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [calendarView, setCalendarView] = useState('current'); 
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingTieBreak, setIsAddingTieBreak] = useState(false);
  const [newMatchData, setNewMatchData] = useState({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState(null);
  const [loginTargetId, setLoginTargetId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) { console.error("Errore auth:", err); }
    };
    initAuth();
    if (auth) return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), (s) => {
      const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(d);
      const savedId = localStorage.getItem('padel_player_id');
      if (savedId) { const found = d.find(p => p.id === savedId); if (found) setCurrentPlayer(found); }
    });
    const unsubMatches = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), (s) => {
      setMatches(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubAvail = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), (s) => {
      setAvailabilities(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPlayers(); unsubMatches(); unsubAvail(); };
  }, [user]);

  const handleCreateProfile = async () => {
    if (!profileName.trim() || !profilePassword.trim()) return;
    const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), {
      name: profileName, password: profilePassword, photoUrl: newPlayerPhoto, createdAt: serverTimestamp()
    });
    setCurrentPlayer({ id: docRef.id, name: profileName, photoUrl: newPlayerPhoto });
    localStorage.setItem('padel_player_id', docRef.id);
    setIsEditingProfile(false);
  };

  const performLogin = () => {
    const target = players.find(p => p.id === loginTargetId);
    if (target && target.password === loginPassword) {
      setCurrentPlayer(target); localStorage.setItem('padel_player_id', target.id); setLoginTargetId(null);
    } else alert("Password errata!");
  };

  const toggleAvailability = async (dateStr) => {
    if (!currentPlayer) return;
    const existing = availabilities.find(a => a.date === dateStr && a.playerId === currentPlayer.id);
    if (existing) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities', existing.id));
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), { date: dateStr, playerId: currentPlayer.id, playerName: currentPlayer.name });
  };

  const calendarDates = useMemo(() => {
    const today = new Date();
    let month = today.getMonth();
    let year = today.getFullYear();
    if (calendarView === 'next') { month++; if (month > 11) { month = 0; year++; } }
    return getDaysInMonth(year, month).filter(d => d >= today.toISOString().split('T')[0]);
  }, [calendarView]);

  const upcomingMatches = useMemo(() => {
    const counts = {};
    availabilities.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
    return Object.keys(counts).filter(date => counts[date] >= 4);
  }, [availabilities]);

  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6" onClick={() => setShowSplash(false)}>
        <img src={logo} alt="Logo" className="w-64 h-64 object-contain animate-pulse mb-8" />
        <h1 className="text-4xl font-black italic text-white text-center">PADEL CHALLENGE <span className="text-lime-400">2026</span></h1>
        <p className="text-slate-500 mt-4 animate-bounce">Tocca per iniziare</p>
      </div>
    );
  }

  if (!currentPlayer && !isEditingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Accedi al Profilo</h2>
          <div className="space-y-3">
            {players.map(p => (
              <button key={p.id} onClick={() => setLoginTargetId(p.id)} className="w-full bg-slate-700 p-4 rounded-xl flex items-center justify-between hover:bg-slate-600">
                <div className="flex items-center gap-3"><PlayerAvatar player={p} size="sm" /> <span>{p.name}</span></div>
                {p.password ? <Lock size={16} className="text-slate-400"/> : <Unlock size={16} className="text-lime-400"/>}
              </button>
            ))}
            <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="w-full mt-4">Crea Nuovo Profilo</Button>
          </div>
          {loginTargetId && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
              <Card className="w-full max-w-xs">
                <Input label="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => setLoginTargetId(null)} variant="secondary" className="flex-1">Annulla</Button>
                  <Button onClick={performLogin} className="flex-1">Entra</Button>
                </div>
              </Card>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md p-4 border-b border-slate-800 z-40 flex justify-between items-center">
        <div className="flex items-center gap-2 font-black italic"><img src={logo} className="w-6 h-6" /> PADEL 2026</div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
          <PlayerAvatar player={currentPlayer} size="sm" />
          <span className="text-xs font-bold">{currentPlayer?.name}</span>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('ranking')} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center gap-2">
                <Trophy className="text-yellow-400" /> <span className="font-bold">Classifica</span>
              </button>
              <button onClick={() => setActiveTab('calendar')} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center gap-2">
                <Calendar className="text-lime-400" /> <span className="font-bold">Disponibilità</span>
              </button>
            </div>
            <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={20} className="text-lime-400" /> Ultime Attività</h3>
            <div className="space-y-3">
              {matches.filter(m => m.status === 'completed').slice(0, 3).map(m => (
                <Card key={m.id} className="border-l-4 border-l-lime-400">
                  <div className="flex justify-between text-xs text-slate-500 mb-2"><span>{m.date}</span><span>{m.score}</span></div>
                  <div className="flex justify-between font-bold text-sm">
                    <span>{players.find(p => p.id === m.team1[0])?.name} & {players.find(p => p.id === m.team1[1])?.name}</span>
                    <span className="text-slate-600">VS</span>
                    <span>{players.find(p => p.id === m.team2[0])?.name} & {players.find(p => p.id === m.team2[1])?.name}</span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setCalendarView('current')} variant={calendarView==='current'?'primary':'secondary'} className="flex-1">Mese Corrente</Button>
              <Button onClick={() => setCalendarView('next')} variant={calendarView==='next'?'primary':'secondary'} className="flex-1">Mese Prossimo</Button>
            </div>
            
            {upcomingMatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-lime-400 uppercase tracking-widest">Partite Confermate</h4>
                {upcomingMatches.map(date => {
                  const playersInMatch = availabilities.filter(a => a.date === date).map(a => players.find(p => p.id === a.playerId));
                  const shareWA = () => {
                    const text = `🎾 *PADEL CONFERMATO!* \n📅 Data: *${date}* \n👥 Giocatori: ${playersInMatch.map(p => p.name).join(', ')}\n\n_Vado a prenotare su Playtomic!_`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  };
                  return (
                    <Card key={date} className="bg-lime-900/10 border-lime-500/30">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold">{date}</span>
                        <div className="flex -space-x-2">
                          {playersInMatch.map((p, i) => <PlayerAvatar key={i} player={p} size="sm" className="border-2 border-slate-900 shadow-lg"/>)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={shareWA} className="flex-1 bg-green-600/20 text-green-400 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-600/30">
                          <MessageCircle size={14}/> WhatsApp
                        </button>
                        <button onClick={() => window.open(PLAYTOMIC_URL, '_blank')} className="flex-1 bg-blue-600/20 text-blue-400 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600/30">
                          <ExternalLink size={14}/> Playtomic
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {calendarDates.map(date => {
                const dayAvail = availabilities.filter(a => a.date === date);
                const isSelected = dayAvail.some(a => a.playerId === currentPlayer.id);
                return (
                  <button key={date} onClick={() => toggleAvailability(date)} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${isSelected ? 'bg-slate-800 border-lime-400' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold">{date}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{dayAvail.length} Disponibili</span>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 ${isSelected ? 'bg-lime-400 border-lime-400' : 'border-slate-700'}`}>
                      {isSelected && <Check size={16} className="text-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CLASSIFICA E ALTRE TAB SEGUONO LA STESSA LOGICA PRECEDENTE */}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 flex justify-around items-center z-40">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-lime-400' : 'text-slate-500'}><LayoutDashboard /></button>
        <button onClick={() => setActiveTab('ranking')} className={activeTab === 'ranking' ? 'text-lime-400' : 'text-slate-500'}><Trophy /></button>
        <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'text-lime-400' : 'text-slate-500'}><Calendar /></button>
        <button onClick={() => setActiveTab('tournament')} className={activeTab === 'tournament' ? 'text-lime-400' : 'text-slate-500'}><Swords /></button>
      </nav>
    </div>
  );
}
