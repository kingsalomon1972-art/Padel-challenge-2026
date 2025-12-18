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
  MessageCircle
} from 'lucide-react';

import logo from './logo.png'; 

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
} catch (e) { console.error(e); }

const APP_ID = 'padel-friends-v1';

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

// --- UI COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const v = { primary: "bg-lime-400 text-slate-900 shadow-lime-900/20", secondary: "bg-slate-700 text-white", danger: "bg-red-500/20 text-red-400 border border-red-500/50" };
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${v[variant]} ${className}`}>{children}</button>;
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}>{children}</div>
);

const Input = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="mb-4">
    <label className="block text-slate-400 text-sm font-medium mb-1 ml-1">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400" />
  </div>
);

const PlayerAvatar = ({ player, size = "md", className="" }) => {
  const s = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16", xl: "w-24 h-24" };
  if (player?.photoUrl) return <img src={player.photoUrl} className={`${s[size]} rounded-full object-cover border-2 border-slate-600 ${className}`} />;
  return <div className={`${s[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 ${className}`}>{player?.name?.charAt(0) || '?'}</div>;
};

// --- PROGRESS CHART ---
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
          const ptsString = points.map((val, idx) => {
            const x = padding + (idx / numSteps) * chartW;
            const y = (height - padding) - (val / maxPoints) * chartH;
            return `${x},${y}`;
          }).join(' ');
          const lastVal = points[points.length - 1];
          const lastX = padding + (points.length - 1) / numSteps * chartW;
          const lastY = (height - padding) - (lastVal / maxPoints) * chartH;
          return (
            <g key={p.id}>
              <polyline points={ptsString} fill="none" stroke={colors[i % colors.length]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <foreignObject x={lastX - 3} y={lastY - 3} width="8" height="8" className="overflow-visible">
                <PlayerAvatar player={p} size="sm" className="w-full h-full border-[0.5px] border-slate-900 shadow-sm" />
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [calendarView, setCalendarView] = useState('current');
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingTieBreak, setIsAddingTieBreak] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [showChart, setShowChart] = useState(false);

  const [newMatchData, setNewMatchData] = useState({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [loginTargetId, setLoginTargetId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    onAuthStateChanged(auth, u => { if (u && db) {
      onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), s => {
        const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlayers(d);
        const saved = localStorage.getItem('padel_player_id');
        if (saved) setCurrentPlayer(d.find(p => p.id === saved));
      });
      onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), s => setMatches(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), s => setAvailabilities(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }});
    signInAnonymously(auth);
  }, []);

  const handleSaveMatch = async () => {
    const { team1p1, team1p2, team2p1, team2p2, score, date } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2 || !score) return;
    const { winner } = calculatePoints(score);
    const data = { date, team1: [team1p1, team1p2], team2: [team2p1, team2p2], score, winner, status: 'completed' };
    if (editingMatchId) await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', editingMatchId), data);
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), { ...data, createdAt: serverTimestamp() });
    setIsAddingMatch(false);
    setEditingMatchId(null);
  };

  const handleSaveTieBreak = async (winnerTeam) => {
    const { team1p1, team1p2, team2p1, team2p2, score, date } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2 || !score) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), {
      date, team1: [team1p1, team1p2], team2: [team2p1, team2p2], score, winner: winnerTeam, type: 'tiebreak', status: 'completed', createdAt: serverTimestamp()
    });
    setIsAddingTieBreak(false);
  };

  const toggleAvailability = async (dateStr) => {
    if (!currentPlayer) return;
    const existing = availabilities.find(a => a.date === dateStr && a.playerId === currentPlayer.id);
    if (existing) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities', existing.id));
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), { date: dateStr, playerId: currentPlayer.id, playerName: currentPlayer.name });
  };

  const ranking = useMemo(() => {
    const stats = {};
    players.forEach(p => stats[p.id] = { ...p, points: 0, wins: 0, losses: 0, played: 0, gamesWon: 0, gamesLost: 0, tbV: 0, tbP: 0, draws: 0 });
    matches.filter(m => m.status === 'completed').forEach(m => {
      let p1=0, p2=0, g1=0, g2=0, win = m.winner;
      if (m.type === 'tiebreak') { if(win==='team1') p1=2; else p2=2; }
      else { const r = calculatePoints(m.score); p1=r.t1Points; p2=r.t2Points; g1=r.t1Games; g2=r.t2Games; win=r.winner; }
      m.team1.forEach(id => { if(stats[id]) { stats[id].points+=p1; stats[id].played++; stats[id].gamesWon+=g1; stats[id].gamesLost+=g2; if(win==='team1') m.type==='tiebreak'?stats[id].tbV++:stats[id].wins++; else if(win==='team2') m.type==='tiebreak'?stats[id].tbP++:stats[id].losses++; else stats[id].draws++; } });
      m.team2.forEach(id => { if(stats[id]) { stats[id].points+=p2; stats[id].played++; stats[id].gamesWon+=g2; stats[id].gamesLost+=g1; if(win==='team2') m.type==='tiebreak'?stats[id].tbV++:stats[id].wins++; else if(win==='team1') m.type==='tiebreak'?stats[id].tbP++:stats[id].losses++; else stats[id].draws++; } });
    });
    return Object.values(stats).sort((a,b) => b.points - a.points);
  }, [players, matches]);

  const upcomingMatches = useMemo(() => {
    const c = {}; availabilities.forEach(a => c[a.date] = (c[a.date] || 0) + 1);
    return Object.keys(c).filter(d => c[d] >= 4).sort();
  }, [availabilities]);

  const calendarDates = useMemo(() => {
    const t = new Date();
    let m = t.getMonth(), y = t.getFullYear();
    if (calendarView === 'next') { m++; if(m>11){m=0;y++;} }
    return getDaysInMonth(y, m).filter(d => d >= t.toISOString().split('T')[0]);
  }, [calendarView]);

  if (showSplash) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6" onClick={() => setShowSplash(false)}>
      <img src={logo} className="w-64 animate-pulse" />
      <h1 className="text-white font-black italic text-4xl mt-8">PADEL CHALLENGE</h1>
      <p className="text-slate-500 mt-4 animate-bounce uppercase tracking-widest text-xs">Tocca per entrare</p>
    </div>
  );

  if (!currentPlayer && !isEditingProfile) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
      <Card className="w-full max-w-md">
        <h2 className="text-center font-bold mb-6">Scegli Profilo</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {players.map(p => <button key={p.id} onClick={()=>{setCurrentPlayer(p); localStorage.setItem('padel_player_id', p.id);}} className="w-full bg-slate-700 p-4 rounded-xl flex items-center gap-3"><PlayerAvatar player={p} size="sm"/>{p.name}</button>)}
        </div>
        <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="w-full mt-6">Nuovo Giocatore</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans relative">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 p-4 border-b border-slate-800 z-50 flex justify-between items-center">
        <div className="font-black italic text-xl flex items-center gap-2"><img src={logo} className="w-6 h-6"/> PADEL 2026</div>
        <PlayerAvatar player={currentPlayer} size="sm" />
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center py-6 bg-gradient-to-br from-slate-800 to-slate-900"><span className="text-xs text-slate-500 uppercase font-bold">Partite</span><div className="text-3xl font-black">{matches.filter(m=>m.status==='completed').length}</div></Card>
              <Card className="text-center border-lime-500/20"><span className="text-lime-400 text-xs uppercase font-bold">Punti</span><div className="text-3xl font-black text-lime-400">{ranking.find(r=>r.id===currentPlayer.id)?.points.toFixed(1) || 0}</div></Card>
            </div>
            <Button onClick={()=>setIsAddingMatch(true)} className="w-full py-4 text-lg"><PlusCircle/> Registra Risultato</Button>
            <h3 className="font-bold flex items-center gap-2 text-slate-400"><TrendingUp size={18}/> Ultime Partite</h3>
            {matches.filter(m=>m.status==='completed').slice(-3).reverse().map(m => {
              const res = m.type === 'tiebreak' ? {winner: m.winner} : calculatePoints(m.score);
              return (
                <Card key={m.id} className="border-l-4 border-l-lime-400">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-2 font-bold uppercase"><span>{m.date}</span><span>{m.score}</span></div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className={res.winner==='team1'||res.winner==='draw'?'text-lime-400':''}>{players.find(p=>p.id===m.team1[0])?.name} & {players.find(p=>p.id===m.team1[1])?.name}</span>
                    <span className={res.winner==='team2'||res.winner==='draw'?'text-lime-400':''}>{players.find(p=>p.id===m.team2[0])?.name} & {players.find(p=>p.id===m.team2[1])?.name}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-400"/> Classifica</h2><button onClick={() => setShowChart(!showChart)} className="text-lime-400">{showChart ? <LayoutDashboard/> : <LineChart/>}</button></div>
            {showChart ? <ProgressChart players={players} matches={matches} /> : ranking.map((p, i) => (
              <Card key={p.id} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3"><span className="text-slate-500 font-bold">#{i+1}</span><PlayerAvatar player={p} size="sm"/><span className="font-bold text-lg">{p.name}</span></div>
                  <div className="text-2xl font-black text-lime-400">{p.points.toFixed(1)}</div>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-700 text-center text-[10px] uppercase font-bold">
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">Vinte</div>{p.wins}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">Pari</div>{p.draws}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">Perse</div>{p.losses}</div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-[9px] uppercase font-bold">
                  <div className="bg-slate-900 p-2 rounded"><div className="text-lime-500/70">Game V</div>{p.gamesWon}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-red-500/70">Game P</div>{p.gamesLost}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-orange-500/70">TB V</div>{p.tbV}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-orange-500/70">TB P</div>{p.tbP}</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex gap-2"><Button onClick={()=>setCalendarView('current')} className="flex-1">Mese Corrente</Button><Button onClick={()=>setCalendarView('next')} variant="secondary" className="flex-1">Prossimo</Button></div>
            {upcomingMatches.map(d => {
              const pInM = availabilities.filter(a=>a.date===d).map(a=>players.find(p=>p.id===a.playerId));
              return (
                <Card key={d} className="bg-lime-900/10 border-lime-500/30">
                  <div className="flex justify-between items-center mb-4"><span className="font-bold text-lime-400">CONFERMATA: {d}</span><div className="flex -space-x-2">{pInM.map((p,i)=><PlayerAvatar key={i} player={p} size="sm"/>)}</div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>window.open(`https://wa.me/?text=Padel Confermato il ${d}!`)} className="bg-green-600/20 text-green-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><MessageCircle size={14}/> WhatsApp</button>
                    <a href="playtomic://" className="bg-blue-600/20 text-blue-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95"><PlayCircle size={14}/> Playtomic</a>
                  </div>
                </Card>
              );
            })}
            <div className="space-y-2">
              {calendarDates.map(d => {
                const sel = availabilities.some(a=>a.date===d && a.playerId===currentPlayer.id);
                return <button key={d} onClick={()=>toggleAvailability(d)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${sel?'bg-slate-800 border-lime-400':'bg-slate-900 border-slate-800'}`}>
                  <div className="text-left font-bold">{d}</div>{sel && <Check className="text-lime-400"/>}
                </button>;
              })}
            </div>
          </div>
        )}

        {activeTab === 'tournament' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Swords className="text-lime-400"/> Torneo</h2>
            {matches.filter(m=>m.round).map(m => {
              const res = calculatePoints(m.score);
              return (
                <Card key={m.id} className={m.status==='completed'?'opacity-50':''}>
                  <div className="flex justify-between text-[10px] mb-2 font-bold uppercase"><span>MATCH {m.round}</span><span>{m.score || 'DA GIOCARE'}</span></div>
                  <div className="flex justify-between font-bold text-sm">
                    <span className={m.status==='completed'&&(res.winner==='team1'||res.winner==='draw')?'text-lime-400':''}>{players.find(p=>p.id===m.team1[0])?.name} & {players.find(p=>p.id===m.team1[1])?.name}</span>
                    <span className={m.status==='completed'&&(res.winner==='team2'||res.winner==='draw')?'text-lime-400':''}>{players.find(p=>p.id===m.team2[0])?.name} & {players.find(p=>p.id===m.team2[1])?.name}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-lime-400" /> Regolamento</h2>
            <Card className="border-l-4 border-l-lime-400 bg-slate-900/80"><h3 className="font-bold text-white text-lg">Vittoria Netta (2-0)</h3><ul className="text-sm text-slate-300"><li><strong>8 Punti</strong> ai vincitori.</li><li><strong>0.2 Punti</strong> per ogni game ai perdenti.</li></ul></Card>
            <Card className="border-l-4 border-l-yellow-400 bg-slate-900/80"><h3 className="font-bold text-white text-lg">Vittoria Combattuta (2-1)</h3><ul className="text-sm text-slate-300"><li><strong>6 Punti</strong> ai vincitori.</li><li><strong>3 Punti</strong> ai perdenti.</li></ul></Card>
            <Card className="border-l-4 border-l-red-400 bg-slate-900/80"><h3 className="font-bold text-white text-lg">Regola Aurea</h3><p className="text-sm text-slate-300"><strong>Chi perde paga la pizza.</strong> <Pizza size={14} className="inline ml-1"/></p></Card>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Giocatori</h2>
            {players.map(p => (
              <Card key={p.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3"><PlayerAvatar player={p} size="sm" /> <span className="font-bold">{p.name}</span></div>
                {p.id === currentPlayer.id && <span className="text-[10px] bg-lime-400/20 text-lime-400 px-2 py-0.5 rounded">Tu</span>}
              </Card>
            ))}
          </div>
        )}
      </main>

      {isAddingMatch && (
        <div className="fixed inset-0 bg-black/95 z-[60] p-6 overflow-y-auto">
          <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Risultato</h2><button onClick={() => setIsAddingMatch(false)}><XCircle/></button></div>
          <div className="space-y-4">
            <Input label="Data" type="date" value={newMatchData.date} onChange={e => setNewMatchData({...newMatchData, date: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team1p1} onChange={e => setNewMatchData({...newMatchData, team1p1: e.target.value})}><option value="">G1</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team1p2} onChange={e => setNewMatchData({...newMatchData, team1p2: e.target.value})}><option value="">G2</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
            <Input label="Punteggio (es 6-4 6-2)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} />
            <Button onClick={handleSaveMatch} className="w-full py-4">Salva</Button>
            <Button onClick={() => setIsAddingTieBreak(true)} variant="secondary" className="w-full">Tie-Break Extra</Button>
          </div>
        </div>
      )}

      {isAddingTieBreak && (
          <div className="fixed inset-0 bg-black/95 z-[70] p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold text-orange-400">Tie-Break</h2><button onClick={() => setIsAddingTieBreak(false)}><XCircle/></button></div>
            <Input label="Punteggio (es 10-8)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={() => handleSaveTieBreak('team1')} variant="secondary">Vince A</Button>
              <Button onClick={() => handleSaveTieBreak('team2')} variant="secondary">Vince B</Button>
            </div>
          </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-8 p-4 flex justify-around items-center z-50 text-slate-500">
        <button onClick={()=>setActiveTab('dashboard')} className={activeTab==='dashboard'?'text-lime-400':''}><LayoutDashboard/></button>
        <button onClick={()=>setActiveTab('ranking')} className={activeTab==='ranking'?'text-lime-400':''}><Trophy/></button>
        <button onClick={()=>setActiveTab('tournament')} className={activeTab==='tournament'?'text-lime-400':''}><Swords/></button>
        <button onClick={()=>setActiveTab('calendar')} className={activeTab==='calendar'?'text-lime-400':''}><Calendar/></button>
        <button onClick={()=>setActiveTab('players')} className={activeTab==='players'?'text-lime-400':''}><Users/></button>
        <button onClick={()=>setActiveTab('rules')} className={activeTab==='rules'?'text-lime-400':''}><BookOpen/></button>
      </nav>
    </div>
  );
}
