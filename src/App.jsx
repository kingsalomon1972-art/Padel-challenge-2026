import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Trophy, Calendar, PlusCircle, Activity, XCircle, TrendingUp, LayoutDashboard, Users, 
  Trash2, Swords, PlayCircle, Edit2, Check, AlertTriangle, Database, Calculator, 
  Minus, Pencil, BookOpen, Pizza, Lock, Unlock, LogIn, Zap, AlertCircle, 
  CheckCircle2, MessageCircle, LineChart, Camera 
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
        canvas.width = maxWidth; canvas.height = img.height * scaleSize;
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
const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  const v = { primary: "bg-lime-400 text-slate-900", secondary: "bg-slate-700 text-white", danger: "bg-red-500/20 text-red-400 border border-red-500/50" };
  return <button onClick={onClick} className={`px-4 py-3 rounded-xl font-bold active:scale-95 flex items-center justify-center gap-2 ${v[variant]} ${className}`}>{children}</button>;
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}>{children}</div>
);

const PlayerAvatar = ({ player, size = "md", className="" }) => {
  const s = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16", xl: "w-24 h-24" };
  if (player?.photoUrl) return <img src={player.photoUrl} className={`${s[size]} rounded-full object-cover border-2 border-slate-600 ${className}`} />;
  return <div className={`${s[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 ${className}`}>{player?.name?.charAt(0) || '?'}</div>;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [calendarView, setCalendarView] = useState('current');
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [newMatchData, setNewMatchData] = useState({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });

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

  const ranking = useMemo(() => {
    const stats = {};
    players.forEach(p => stats[p.id] = { ...p, points: 0, wins: 0, losses: 0, played: 0, gamesWon: 0, gamesLost: 0, tbV: 0, tbP: 0 });
    matches.filter(m => m.status === 'completed').forEach(m => {
      let p1=0, p2=0, g1=0, g2=0;
      if (m.type === 'tiebreak') { if(m.winner==='team1') {p1=2; g1=1;} else {p2=2; g2=1;} }
      else { const r = calculatePoints(m.score); p1=r.t1Points; p2=r.t2Points; g1=r.t1Games; g2=r.t2Games; }
      m.team1.forEach(id => { if(stats[id]) { stats[id].points+=p1; stats[id].played++; stats[id].gamesWon+=g1; stats[id].gamesLost+=g2; if(m.winner==='team1') m.type==='tiebreak'?stats[id].tbV++:stats[id].wins++; } });
      m.team2.forEach(id => { if(stats[id]) { stats[id].points+=p2; stats[id].played++; stats[id].gamesWon+=g2; stats[id].gamesLost+=g1; if(m.winner==='team2') m.type==='tiebreak'?stats[id].tbV++:stats[id].wins++; } });
    });
    return Object.values(stats).sort((a,b) => b.points - a.points);
  }, [players, matches]);

  const calendarDates = useMemo(() => {
    const t = new Date();
    let m = t.getMonth(), y = t.getFullYear();
    if (calendarView === 'next') { m++; if(m>11){m=0;y++;} }
    return getDaysInMonth(y, m).filter(d => d >= t.toISOString().split('T')[0]);
  }, [calendarView]);

  const upcomingMatches = useMemo(() => {
    const c = {}; availabilities.forEach(a => c[a.date] = (c[a.date] || 0) + 1);
    return Object.keys(c).filter(d => c[d] >= 4).sort();
  }, [availabilities]);

  if (showSplash) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center" onClick={() => setShowSplash(false)}>
      <img src={logo} className="w-64 animate-pulse" />
      <h1 className="text-white font-black italic text-4xl mt-8">PADEL CHALLENGE</h1>
      <p className="text-slate-500 mt-4 animate-bounce uppercase tracking-widest text-xs">Tocca per entrare</p>
    </div>
  );

  if (!currentPlayer) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
      <Card className="w-full max-w-md">
        <h2 className="text-center font-bold mb-6">Scegli Profilo</h2>
        <div className="space-y-2">{players.map(p => <button key={p.id} onClick={()=>{setCurrentPlayer(p); localStorage.setItem('padel_player_id', p.id);}} className="w-full bg-slate-700 p-4 rounded-xl flex items-center gap-3"><PlayerAvatar player={p} size="sm"/>{p.name}</button>)}</div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 p-4 border-b border-slate-800 z-50 flex justify-between items-center">
        <div className="font-black italic text-xl flex items-center gap-2"><img src={logo} className="w-6 h-6"/> PADEL 2026</div>
        <PlayerAvatar player={currentPlayer} size="sm" />
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center"><span className="text-xs text-slate-500 uppercase">Partite</span><div className="text-3xl font-black">{matches.length}</div></Card>
              <Card className="text-center border-lime-500/20"><span className="text-lime-400 text-xs uppercase font-bold">Punti</span><div className="text-3xl font-black text-lime-400">{ranking.find(r=>r.id===currentPlayer.id)?.points.toFixed(1) || 0}</div></Card>
            </div>
            <Button onClick={()=>setIsAddingMatch(true)} className="w-full py-4 text-lg"><PlusCircle/> Registra Risultato</Button>
            <h3 className="font-bold flex items-center gap-2 text-slate-400"><TrendingUp size={18}/> Ultime Attività</h3>
            {matches.slice(-3).reverse().map(m => (
              <Card key={m.id} className="border-l-4 border-l-lime-400">
                <div className="flex justify-between text-[10px] text-slate-500 mb-2 font-bold uppercase"><span>{m.date}</span><span>{m.score}</span></div>
                <div className="flex justify-between text-sm font-bold">
                  <span className={m.winner==='team1'?'text-lime-400':''}>{players.find(p=>p.id===m.team1[0])?.name} & {players.find(p=>p.id===m.team1[1])?.name}</span>
                  <span className={m.winner==='team2'?'text-lime-400':''}>{players.find(p=>p.id===m.team2[0])?.name} & {players.find(p=>p.id===m.team2[1])?.name}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-400"/> Classifica</h2>
            {ranking.map((p, i) => (
              <Card key={p.id} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3"><span className="text-slate-500 font-bold">#{i+1}</span><PlayerAvatar player={p} size="sm"/><span className="font-bold text-lg">{p.name}</span></div>
                  <div className="text-2xl font-black text-lime-400">{p.points.toFixed(1)}</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase">
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">Vinte</div>{p.wins}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">Game V</div>{p.gamesWon}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">TB V</div>{p.tbV}</div>
                  <div className="bg-slate-900 p-2 rounded"><div className="text-slate-500">Persi</div>{p.losses}</div>
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
                  <div className="flex justify-between items-center mb-4"><span className="font-bold">CONFERMATA: {d}</span><div className="flex -space-x-2">{pInM.map((p,i)=><PlayerAvatar key={i} player={p} size="sm"/>)}</div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>window.open(`https://wa.me/?text=Padel Confermato il ${d}!`)} className="bg-green-600/20 text-green-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><MessageCircle size={14}/> WhatsApp</button>
                    <a href="playtomic://" className="bg-blue-600/20 text-blue-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><PlayCircle size={14}/> Playtomic</a>
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
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><Swords className="text-lime-400"/> Torneo</h2></div>
            {matches.filter(m=>m.round).map(m => (
              <Card key={m.id} className={m.status==='completed'?'opacity-50':''}>
                <div className="flex justify-between text-[10px] mb-2 font-bold"><span>MATCH {m.round}</span><span>{m.score || 'DA GIOCARE'}</span></div>
                <div className="flex justify-between font-bold text-sm">
                  <span>{players.find(p=>p.id===m.team1[0])?.name} & {players.find(p=>p.id===m.team1[1])?.name}</span>
                  <span>{players.find(p=>p.id===m.team2[0])?.name} & {players.find(p=>p.id===m.team2[1])?.name}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 pb-8 flex justify-around items-center z-50">
        <button onClick={()=>setActiveTab('dashboard')} className={activeTab==='dashboard'?'text-lime-400':'text-slate-500'}><LayoutDashboard/></button>
        <button onClick={()=>setActiveTab('tournament')} className={activeTab==='tournament'?'text-lime-400':'text-slate-500'}><Swords/></button>
        <button onClick={()=>setActiveTab('ranking')} className={activeTab==='ranking'?'text-lime-400':'text-slate-500'}><Trophy/></button>
        <button onClick={()=>setActiveTab('calendar')} className={activeTab==='calendar'?'text-lime-400':'text-slate-500'}><Calendar/></button>
      </nav>
    </div>
  );
}
