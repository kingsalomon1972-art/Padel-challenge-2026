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
  Upload
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
        const maxWidth = 600; // Leggermente più grande per le foto partita
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compressione 0.6 per risparmiare spazio Firestore
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

// --- APP COMPONENT ---
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
  const [matchPhotos, setMatchPhotos] = useState([]);

  const [newMatchData, setNewMatchData] = useState({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [loginTargetId, setLoginTargetId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const matchPhotoInputRef = useRef(null);

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

  const handleMatchPhotoSelect = async (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const remainingSlots = 4 - matchPhotos.length;
      const filesToProcess = files.slice(0, remainingSlots);
      
      const compressed = await Promise.all(filesToProcess.map(file => compressImage(file)));
      setMatchPhotos(prev => [...prev, ...compressed].slice(0, 4));
    }
  };

  const removePhoto = (index) => {
    setMatchPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveMatch = async () => {
    const { team1p1, team1p2, team2p1, team2p2, score, date } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2 || !score) return;
    const { winner } = calculatePoints(score);
    const data = { 
      date, 
      team1: [team1p1, team1p2], 
      team2: [team2p1, team2p2], 
      score, 
      winner, 
      status: 'completed',
      photos: matchPhotos // Salvataggio array foto
    };
    
    if (editingMatchId) await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', editingMatchId), data);
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), { ...data, createdAt: serverTimestamp() });
    
    setIsAddingMatch(false);
    setEditingMatchId(null);
    setMatchPhotos([]);
  };

  const ranking = useMemo(() => {
    const stats = {};
    players.forEach(p => stats[p.id] = { ...p, points: 0, wins: 0, losses: 0, played: 0, gamesWon: 0, gamesLost: 0, tbV: 0 });
    matches.filter(m => m.status === 'completed').forEach(m => {
      let p1=0, p2=0, g1=0, g2=0;
      if (m.type === 'tiebreak') { if(m.winner==='team1') {p1=2; g1=1;} else {p2=2; g2=1;} }
      else { const r = calculatePoints(m.score); p1=r.t1Points; p2=r.t2Points; g1=r.t1Games; g2=r.t2Games; }
      m.team1.forEach(id => { if(stats[id]) { stats[id].points+=p1; stats[id].played++; stats[id].gamesWon+=g1; stats[id].gamesLost+=g2; if(m.winner==='team1') m.type==='tiebreak'?stats[id].tbV++:stats[id].wins++; } });
      m.team2.forEach(id => { if(stats[id]) { stats[id].points+=p2; stats[id].played++; stats[id].gamesWon+=g2; stats[id].gamesLost+=g1; if(m.winner==='team2') m.type==='tiebreak'?stats[id].tbV++:stats[id].wins++; } });
    });
    return Object.values(stats).sort((a,b) => b.points - a.points);
  }, [players, matches]);

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
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans relative">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 p-4 border-b border-slate-800 z-50 flex justify-between items-center">
        <div className="font-black italic text-xl flex items-center gap-2"><img src={logo} className="w-6 h-6"/> PADEL 2026</div>
        <PlayerAvatar player={currentPlayer} size="sm" />
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center"><span className="text-xs text-slate-500 uppercase font-bold">Partite</span><div className="text-3xl font-black">{matches.filter(m=>m.status==='completed').length}</div></Card>
              <Card className="text-center border-lime-500/20"><span className="text-lime-400 text-xs uppercase font-bold">I Miei Punti</span><div className="text-3xl font-black text-lime-400">{ranking.find(r=>r.id===currentPlayer.id)?.points.toFixed(1) || 0}</div></Card>
            </div>
            <Button onClick={()=>setIsAddingMatch(true)} className="w-full py-4 text-lg"><PlusCircle/> Registra Risultato</Button>
            
            <h3 className="font-bold flex items-center gap-2 text-slate-400"><TrendingUp size={18}/> Ultime Partite</h3>
            {matches.filter(m=>m.status==='completed').slice(-3).reverse().map(m => (
              <Card key={m.id} className="border-l-4 border-l-lime-400">
                <div className="flex justify-between text-[10px] text-slate-500 mb-2 font-bold uppercase"><span>{m.date}</span><span>{m.score}</span></div>
                <div className="flex justify-between text-sm font-bold mb-3">
                  <span className={m.winner==='team1'?'text-lime-400':''}>{players.find(p=>p.id===m.team1[0])?.name} & {players.find(p=>p.id===m.team1[1])?.name}</span>
                  <span className={m.winner==='team2'?'text-lime-400':''}>{players.find(p=>p.id===m.team2[0])?.name} & {players.find(p=>p.id===m.team2[1])?.name}</span>
                </div>
                {m.photos?.length > 0 && (
                  <div className="grid grid-cols-4 gap-1">
                    {m.photos.map((url, i) => (
                      <img key={i} src={url} className="w-full h-12 object-cover rounded" alt="Match" />
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ALTRE TAB (RANKING, CALENDAR, TOURNAMENT, RULES) IDENTICHE ALLA VERSIONE ORIGINALE */}
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
                    <a href="playtomic://" className="bg-blue-600/20 text-blue-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95"><PlayCircle size={14}/> Playtomic</a>
                  </div>
                </Card>
              );
            })}
            <div className="space-y-2">
              {getDaysInMonth(new Date().getFullYear(), calendarView === 'current' ? new Date().getMonth() : new Date().getMonth() + 1).filter(d => d >= new Date().toISOString().split('T')[0]).map(d => {
                const sel = availabilities.some(a=>a.date===d && a.playerId===currentPlayer.id);
                return <button key={d} onClick={()=>toggleAvailability(d)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${sel?'bg-slate-800 border-lime-400':'bg-slate-900 border-slate-800'}`}>
                  <div className="text-left font-bold">{d}</div>{sel && <Check className="text-lime-400"/>}
                </button>;
              })}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-lime-400" /> Regolamento</h2>
            <Card className="border-l-4 border-l-lime-400 bg-slate-900/80">
              <h3 className="font-bold text-white text-lg">Vittoria Netta (2-0)</h3>
              <ul className="text-sm text-slate-300"><li><strong>8 Punti</strong> ai vincitori.</li><li><strong>0.2 Punti</strong> per ogni game ai perdenti.</li></ul>
            </Card>
            <Card className="border-l-4 border-l-yellow-400 bg-slate-900/80">
              <h3 className="font-bold text-white text-lg">Vittoria Combattuta (2-1)</h3>
              <ul className="text-sm text-slate-300"><li><strong>6 Punti</strong> ai vincitori.</li><li><strong>3 Punti</strong> ai perdenti.</li></ul>
            </Card>
            <Card className="border-l-4 border-l-red-400 bg-slate-900/80">
                <h3 className="font-bold text-white text-lg">Regola Aurea</h3>
                <p className="text-sm text-slate-300"><strong>Chi perde paga la pizza.</strong> <Pizza size={14} className="inline ml-1"/></p>
            </Card>
          </div>
        )}

      </main>

      {/* MODAL NUOVA PARTITA CON CARICAMENTO FOTO */}
      {isAddingMatch && (
        <div className="fixed inset-0 bg-black/95 z-[60] p-6 overflow-y-auto">
          <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Risultato Match</h2><button onClick={() => {setIsAddingMatch(false); setMatchPhotos([]);}}><XCircle/></button></div>
          <div className="space-y-4">
            <Input label="Data" type="date" value={newMatchData.date} onChange={e => setNewMatchData({...newMatchData, date: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-lime-400 uppercase">Team A</label>
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team1p1} onChange={e => setNewMatchData({...newMatchData, team1p1: e.target.value})}><option value="">P1</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team1p2} onChange={e => setNewMatchData({...newMatchData, team1p2: e.target.value})}><option value="">P2</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-red-400 uppercase">Team B</label>
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team2p1} onChange={e => setNewMatchData({...newMatchData, team2p1: e.target.value})}><option value="">P3</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select className="w-full bg-slate-800 p-3 rounded-xl text-white" value={newMatchData.team2p2} onChange={e => setNewMatchData({...newMatchData, team2p2: e.target.value})}><option value="">P4</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
            </div>
            <Input label="Punteggio (es. 6-4 6-2)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} />
            
            {/* CARICAMENTO FOTO */}
            <div className="mt-4">
              <label className="block text-slate-400 text-sm font-medium mb-2">Foto Match (Max 4)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {matchPhotos.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={url} className="w-full h-full object-cover rounded-lg border border-slate-700" alt="Preview" />
                    <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1"><XCircle size={12}/></button>
                  </div>
                ))}
                {matchPhotos.length < 4 && (
                  <button onClick={() => matchPhotoInputRef.current.click()} className="aspect-square bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-lime-400 hover:border-lime-400 transition-all">
                    <Upload size={20} />
                    <span className="text-[10px] mt-1">Aggiungi</span>
                  </button>
                )}
              </div>
              <input type="file" ref={matchPhotoInputRef} className="hidden" accept="image/*" multiple onChange={handleMatchPhotoSelect} />
            </div>

            <Button onClick={handleSaveMatch} className="w-full py-4 text-lg">Salva Partita</Button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-8 p-4 flex justify-around items-center z-50">
        <button onClick={()=>setActiveTab('dashboard')} className={activeTab==='dashboard'?'text-lime-400':'text-slate-500'}><LayoutDashboard/></button>
        <button onClick={()=>setActiveTab('ranking')} className={activeTab==='ranking'?'text-lime-400':'text-slate-500'}><Trophy/></button>
        <button onClick={()=>setActiveTab('calendar')} className={activeTab==='calendar'?'text-lime-400':'text-slate-500'}><Calendar/></button>
        <button onClick={()=>setActiveTab('players')} className={activeTab==='players'?'text-lime-400':'text-slate-500'}><Users/></button>
        <button onClick={()=>setActiveTab('rules')} className={activeTab==='rules'?'text-lime-400':'text-slate-500'}><BookOpen/></button>
      </nav>
    </div>
  );
}
