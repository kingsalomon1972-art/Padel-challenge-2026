import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
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
  Check,
  AlertTriangle,
  Minus,
  Pencil,
  BookOpen,
  Pizza,
  Lock, 
  Unlock, 
  Zap,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  PlayCircle,
  LineChart
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
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const variants = {
    primary: "bg-lime-400 text-slate-900 hover:bg-lime-300",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    danger: "bg-red-500/20 text-red-400 border border-red-500/50"
  };
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}>{children}</button>;
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
  const sizeClasses = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16", xl: "w-24 h-24" };
  if (player?.photoUrl) return <img src={player.photoUrl} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600 bg-slate-800 ${className}`} />;
  return <div className={`${sizeClasses[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 ${className}`}>{player?.name ? player.name.charAt(0).toUpperCase() : '?'}</div>;
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

  // Modal states
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingTieBreak, setIsAddingTieBreak] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);

  const [newMatchData, setNewMatchData] = useState({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [loginTargetId, setLoginTargetId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
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
      const allMatches = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(allMatches.sort((a,b) => (a.round || 0) - (b.round || 0)));
    });
    const unsubAvail = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), (s) => {
      setAvailabilities(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPlayers(); unsubMatches(); unsubAvail(); };
  }, [user]);

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

  const generateTournament = async () => {
    if (players.length < 4) { alert("Servono 4 giocatori!"); return; }
    const p = players.slice(0, 4);
    const rounds = [
      {t1:[p[0].id,p[1].id], t2:[p[2].id,p[3].id]},
      {t1:[p[0].id,p[2].id], t2:[p[1].id,p[3].id]},
      {t1:[p[0].id,p[3].id], t2:[p[1].id,p[2].id]}
    ];
    for(let i=0; i<rounds.length; i++) {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), {
        ...rounds[i], round: i+1, status: 'scheduled', score: '', date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const ranking = useMemo(() => {
    const stats = {};
    players.forEach(p => stats[p.id] = { id: p.id, name: p.name, points: 0, wins: 0, played: 0 });
    matches.filter(m => m.status === 'completed').forEach(m => {
      let p1 = 0, p2 = 0;
      if (m.type === 'tiebreak') { if (m.winner === 'team1') p1 = 2; else p2 = 2; }
      else { const res = calculatePoints(m.score); p1 = res.t1Points; p2 = res.t2Points; }
      m.team1.forEach(id => { if (stats[id]) { stats[id].points += p1; stats[id].played++; if(m.winner==='team1') stats[id].wins++; } });
      m.team2.forEach(id => { if (stats[id]) { stats[id].points += p2; stats[id].played++; if(m.winner==='team2') stats[id].wins++; } });
    });
    return Object.values(stats).sort((a,b) => b.points - a.points);
  }, [players, matches]);

  const upcomingMatches = useMemo(() => {
    const counts = {};
    availabilities.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
    return Object.keys(counts).filter(date => counts[date] >= 4).sort();
  }, [availabilities]);

  if (showSplash) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center" onClick={() => setShowSplash(false)}><img src={logo} className="w-48 mb-8 animate-pulse" /><h1 className="text-white font-black italic text-3xl">PADEL CHALLENGE</h1></div>;

  if (!currentPlayer && !isEditingProfile) return <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center"><Card className="w-full max-w-md"><h2 className="text-white text-center font-bold mb-4">Chi sei?</h2><div className="space-y-2">{players.map(p => <button key={p.id} onClick={() => {setCurrentPlayer(p); localStorage.setItem('padel_player_id', p.id);}} className="w-full bg-slate-700 p-3 rounded-xl text-white">{p.name}</button>)}<Button onClick={() => setIsEditingProfile(true)} variant="secondary" className="w-full">Nuovo Giocatore</Button></div></Card></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="fixed top-0 left-0 right-0 bg-slate-900 p-4 border-b border-slate-800 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2 font-black italic"><img src={logo} className="w-6 h-6" /> PADEL 2026</div>
        <PlayerAvatar player={currentPlayer} size="sm" />
      </header>

      <main className="pt-20 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center"><span className="text-xs text-slate-500">MATCH</span><div className="text-2xl font-bold">{matches.length}</div></Card>
              <Card className="text-center"><span className="text-xs text-lime-400">PUNTI</span><div className="text-2xl font-bold text-lime-400">{ranking.find(r => r.id === currentPlayer.id)?.points.toFixed(1) || 0}</div></Card>
            </div>
            <Button onClick={() => setIsAddingMatch(true)} className="w-full py-4"><PlusCircle/> Nuovo Risultato Libero</Button>
          </div>
        )}

        {activeTab === 'tournament' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><Swords className="text-lime-400"/> Tabellone Torneo</h2>{matches.length === 0 && <Button onClick={generateTournament} variant="secondary">Genera (4P)</Button>}</div>
            {matches.map(m => (
              <Card key={m.id} onClick={() => {setEditingMatchId(m.id); setNewMatchData({team1p1:m.team1[0], team1p2:m.team1[1], team2p1:m.team2[0], team2p2:m.team2[1], score:m.score, date:m.date}); setIsAddingMatch(true);}} className={m.status === 'completed' ? 'opacity-60' : 'border-lime-500/50'}>
                <div className="flex justify-between text-[10px] mb-2"><span>MATCH {m.round || 'L'}</span><span>{m.status === 'completed' ? 'FINALE' : 'DA GIOCARE'}</span></div>
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <div className="text-sm font-bold">{players.find(p=>p.id===m.team1[0])?.name}</div>
                    <div className="text-sm font-bold">{players.find(p=>p.id===m.team1[1])?.name}</div>
                  </div>
                  <div className="px-4 font-black text-lime-400">{m.score || 'VS'}</div>
                  <div className="text-center flex-1">
                    <div className="text-sm font-bold">{players.find(p=>p.id===m.team2[0])?.name}</div>
                    <div className="text-sm font-bold">{players.find(p=>p.id===m.team2[1])?.name}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-2">
            <h2 className="text-xl font-bold mb-4">Classifica Generale</h2>
            {ranking.map((p, idx) => (
              <Card key={p.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3"><span className="text-xs text-slate-500">#{idx+1}</span><PlayerAvatar player={p} size="sm"/> <span className="font-bold">{p.name}</span></div>
                <div className="text-lime-400 font-black">{p.points.toFixed(1)}</div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex gap-2"><Button onClick={() => setCalendarView('current')} className="flex-1">Mese Corrente</Button></div>
            {upcomingMatches.map(date => (
              <Card key={date} className="bg-lime-900/10 border-lime-500/30">
                <div className="flex justify-between items-center mb-4"><span className="font-bold text-lime-400">CONFERMATA: {date}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => window.open(`https://wa.me/?text=Padel Confermato per il ${date}!`)} className="flex-1 bg-green-600/20 text-green-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><MessageCircle size={14}/> WhatsApp</button>
                  <a href="playtomic://" className="flex-1 bg-blue-600/20 text-blue-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><PlayCircle size={14}/> Playtomic</a>
                </div>
              </Card>
            ))}
            <div className="space-y-2">
              {calendarDates.map(date => {
                const isSelected = availabilities.some(a => a.date === date && a.playerId === currentPlayer.id);
                return <button key={date} onClick={() => toggleAvailability(date)} className={`w-full p-4 rounded-xl border flex justify-between ${isSelected ? 'bg-slate-800 border-lime-400' : 'bg-slate-900 border-slate-800'}`}><span>{date}</span>{isSelected && <Check className="text-lime-400"/>}</button>
              })}
            </div>
          </div>
        )}
      </main>

      {isAddingMatch && (
        <div className="fixed inset-0 bg-black/95 z-[60] p-6 overflow-y-auto">
          <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Risultato</h2><button onClick={() => setIsAddingMatch(false)}><XCircle/></button></div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team1p1} onChange={e => setNewMatchData({...newMatchData, team1p1: e.target.value})}><option value="">G1</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team1p2} onChange={e => setNewMatchData({...newMatchData, team1p2: e.target.value})}><option value="">G2</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
              <div className="space-y-2">
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team2p1} onChange={e => setNewMatchData({...newMatchData, team2p1: e.target.value})}><option value="">G3</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team2p2} onChange={e => setNewMatchData({...newMatchData, team2p2: e.target.value})}><option value="">G4</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
            </div>
            <Input label="Risultato (es 6-4 6-2)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} />
            <Button onClick={handleSaveMatch} className="w-full py-4">Salva</Button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 pb-8 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-lime-400' : 'text-slate-500'}><LayoutDashboard /></button>
        <button onClick={() => setActiveTab('tournament')} className={activeTab === 'tournament' ? 'text-lime-400' : 'text-slate-500'}><Swords /></button>
        <button onClick={() => setActiveTab('ranking')} className={activeTab === 'ranking' ? 'text-lime-400' : 'text-slate-500'}><Trophy /></button>
        <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'text-lime-400' : 'text-slate-500'}><Calendar /></button>
      </nav>
    </div>
  );
}
