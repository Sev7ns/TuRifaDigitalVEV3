import React, { useState, useEffect, useMemo } from 'react';
import { db } from './services/dataService';
import { TicketGrid } from './components/TicketGrid';
import { PaymentModal } from './components/PaymentModal';
import { 
  ViewState, Ticket, RaffleConfig, Transaction, TransactionStatus, 
  TicketStatus, PaymentMethod, SocialLink, RaffleStatus, Prize, Winner, RaffleCycle 
} from './types';
import { 
  Home, Settings, LogOut, Search, XCircle, Plus, Trash2, 
  ShieldCheck, ToggleLeft, ToggleRight, Instagram, Facebook, 
  MessageCircle, Send, Video, Trophy, Play, Archive, Edit, Save, Check, X 
} from 'lucide-react';

// --- HELPERS ---

const toLocalDateTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

// --- SUB-COMPONENTES ---

const CheckTicketsView = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{valid: boolean, transaction?: Transaction} | null>(null);
  const handleCheck = () => {
    if (!code.trim()) return;
    setResult(db.checkStatus(code.toUpperCase()));
  };
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black mb-2">Mis Tickets</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="TRD-XXXXXX" 
            className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono uppercase" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
          />
          <button type="button" onClick={handleCheck} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all">
            <Search size={20} />
          </button>
        </div>
      </div>
      {result && (
        <div className="animate-in fade-in slide-in-from-top-4">
          {result.valid && result.transaction ? (
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 border-t-4 border-t-brand-500">
              <h3 className="font-black text-slate-900">{result.transaction.customerName}</h3>
              <div className="bg-slate-50 p-6 rounded-[32px] text-center mt-4">
                <div className="text-[10px] font-black text-slate-400 uppercase">Tus Números</div>
                <div className="text-3xl font-black text-brand-600">{result.transaction.ticketNumbers.join(' - ')}</div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 border-t-4 border-t-red-500 text-center">
              <XCircle className="text-red-500 mx-auto mb-2" size={32} />
              <h3 className="font-black">No encontrado</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const timer = setInterval(() => {
      const distance = new Date(targetDate).getTime() - new Date().getTime();
      if (distance < 0) { clearInterval(timer); return; }
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return (
    <div className="flex justify-center gap-3 py-4">
      {[{ label: 'D', val: timeLeft.d }, { label: 'H', val: timeLeft.h }, { label: 'M', val: timeLeft.m }, { label: 'S', val: timeLeft.s }].map(t => (
        <div key={t.label} className="bg-white w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
          <span className="text-lg font-black text-slate-900 leading-none">{t.val}</span>
          <span className="text-[8px] font-black uppercase text-slate-400">{t.label}</span>
        </div>
      ))}
    </div>
  );
};

const SocialIcon = ({ platform }: { platform: SocialLink['platform'] }) => {
  switch (platform) {
    case 'Instagram': return <Instagram size={16} />;
    case 'Facebook': return <Facebook size={16} />;
    case 'Tiktok': return <Video size={16} />;
    case 'WhatsApp': return <MessageCircle size={16} />;
    case 'Telegram': return <Send size={16} />;
  }
};

// --- ADMIN HUB COMPONENT ---

const AdminHub: React.FC<{
  initialConfig: RaffleConfig;
  tickets: Ticket[];
  onExit: () => void;
  onRefreshParent: () => void;
}> = ({ initialConfig, tickets, onExit, onRefreshParent }) => {
  const [adminTab, setAdminTab] = useState<'SORTEO' | 'PARTICIPANTES' | 'HISTORY' | 'AJUSTES'>('SORTEO');
  const [partSubTab, setPartSubTab] = useState<'PENDING' | 'ACTIVE'>('PENDING');
  
  // Local state for edits
  const [editConfig, setEditConfig] = useState(initialConfig);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(db.getPaymentMethods());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [history, setHistory] = useState<RaffleCycle[]>(db.getHistory());
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [histFilter, setHistFilter] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // UI States for inline forms (replacing prompts)
  const [newPrizeName, setNewPrizeName] = useState('');
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({ name: '', currency: 'VES' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Granular Refresh Functions
  const refreshPaymentMethods = () => setPaymentMethods(db.getPaymentMethods());
  const refreshHistory = () => setHistory(db.getHistory());
  const refreshTransactions = () => {
    setTransactions(db.getTransactions());
    onRefreshParent();
  };
  const reloadAll = () => {
    refreshPaymentMethods();
    refreshHistory();
    refreshTransactions();
    setEditConfig(db.getConfig());
    onRefreshParent();
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    // Inline confirmation check via UI or double click is better, but simple confirm is standard.
    // If confirm is blocked, we just do it? No, safe to assume user gesture works on button.
    // Using a simple toggle for safety if confirm fails in some webviews.
    if (confirmDeleteId === 'ARCHIVE_ALL') {
      db.archiveCurrentCycle();
      reloadAll();
      setConfirmDeleteId(null);
      showStatus('Jornada archivada correctamente');
    } else {
      setConfirmDeleteId('ARCHIVE_ALL');
      setTimeout(() => setConfirmDeleteId(null), 3000); // Reset after 3s
    }
  };

  const handleRun = (e: React.MouseEvent) => {
    e.preventDefault();
    const sold = tickets.filter(t => t.status === TicketStatus.SOLD);
    if (!sold.length) return alert('No hay ventas activas para sortear.');
    
    db.startRaffleAnimation();
    onRefreshParent();
    showStatus('Sorteo iniciado...');
    
    setTimeout(() => {
      const freshTxs = db.getTransactions();
      const freshTickets = db.getTickets();
      const freshSold = freshTickets.filter(t => t.status === TicketStatus.SOLD);
      const shuffled = [...freshSold].sort(() => Math.random() - 0.5);
      const ws: Winner[] = editConfig.prizes.map((p, i) => {
        const winTk = editConfig.allowMultipleWins ? shuffled[Math.floor(Math.random()*shuffled.length)] : shuffled[i % shuffled.length];
        const owner = freshTxs.find(t => t.uniqueCode === winTk.ownerId);
        return { ticketNumber: winTk.number, customerName: owner?.customerName || 'Anónimo', prizeName: p.name };
      });
      db.completeRaffle(ws);
      reloadAll();
      showStatus('Sorteo completado');
    }, editConfig.selectionDuration * 1000);
  };

  const handleSaveConfig = (e: React.MouseEvent) => {
    e.preventDefault();
    db.updateConfig(editConfig);
    setEditConfig(db.getConfig()); 
    onRefreshParent();
    showStatus('Configuración guardada');
  };

  const handleAddPrize = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newPrizeName.trim()) {
      setEditConfig(prev => ({
        ...prev,
        prizes: [...prev.prizes, { id: Date.now().toString(), name: newPrizeName, rank: prev.prizes.length + 1 }]
      }));
      setNewPrizeName('');
    }
  };

  const handleDeletePrize = (id: string) => {
    setEditConfig(prev => ({
      ...prev,
      prizes: prev.prizes.filter(p => p.id !== id)
    }));
  };

  const handleAddPaymentMethod = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newMethod.name && newMethod.currency) {
      db.addPaymentMethod({
        currency: newMethod.currency.toUpperCase(),
        name: newMethod.name,
        details: 'Editar detalles...',
        instructions: 'Editar instrucciones...',
        isActive: true
      });
      refreshPaymentMethods();
      setIsAddingMethod(false);
      setNewMethod({ name: '', currency: 'VES' });
    }
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (confirmDeleteId === id) {
      db.deletePaymentMethod(id);
      refreshPaymentMethods();
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const handleUpdateMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMethod) {
      db.updatePaymentMethod(editingMethod);
      setEditingMethod(null);
      refreshPaymentMethods();
    }
  };

  const handleRemoveParticipant = (txId: string) => {
     if (confirmDeleteId === txId) {
       db.withdrawParticipant(txId);
       refreshTransactions();
       setConfirmDeleteId(null);
     } else {
       setConfirmDeleteId(txId);
       setTimeout(() => setConfirmDeleteId(null), 3000);
     }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in">
      {statusMsg && (
        <div className="fixed top-24 right-6 bg-brand-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-in slide-in-from-right font-bold">
          {statusMsg}
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-slate-900 p-6 rounded-[40px] flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center"><ShieldCheck /></div>
            <div><h2 className="text-xl font-black">Admin Hub</h2><p className="text-[10px] text-slate-400 uppercase tracking-widest">Panel de Control</p></div>
          </div>
          <div className="flex gap-2">
            {(['SORTEO', 'PARTICIPANTES', 'HISTORY', 'AJUSTES'] as const).map(t => (
              <button 
                type="button"
                key={t} 
                onClick={() => setAdminTab(t)} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${adminTab === t ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
            <button type="button" onClick={onExit} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={18}/></button>
          </div>
        </div>
      </div>

      {adminTab === 'SORTEO' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-lg font-black flex items-center gap-2"><Trophy className="text-amber-500"/> Gestión de Jornada</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Fecha y Hora</label>
                <div className="relative group">
                  <input 
                    type="datetime-local" 
                    value={toLocalDateTime(editConfig.raffleDate)} 
                    onChange={e => setEditConfig({...editConfig, raffleDate: e.target.value ? new Date(e.target.value).toISOString() : ''})} 
                    onClick={(e) => {
                      try { (e.target as any).showPicker?.(); } catch(err) {}
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer appearance-none min-h-[50px]" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Sorteo (Seg)</label>
                  <input type="number" value={editConfig.selectionDuration} onChange={e => setEditConfig({...editConfig, selectionDuration: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Multiganador</label>
                  <button type="button" onClick={() => setEditConfig({...editConfig, allowMultipleWins: !editConfig.allowMultipleWins})} className={`w-full p-4 rounded-2xl font-black text-xs transition-all ${editConfig.allowMultipleWins ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {editConfig.allowMultipleWins ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleRun} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"><Play size={18}/> Iniciar Sorteo</button>
                <button type="button" onClick={handleArchive} className={`${confirmDeleteId === 'ARCHIVE_ALL' ? 'bg-red-500 text-white' : 'bg-brand-50 text-brand-600'} px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all`}>
                  <Archive size={18}/> {confirmDeleteId === 'ARCHIVE_ALL' ? '¿Confirmar?' : 'Archivar'}
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
             <div className="flex justify-between mb-4 items-center">
               <h3 className="text-lg font-black">Premios Configurados</h3>
             </div>
             
             {/* Inline Add Prize Form */}
             <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={newPrizeName} 
                    onChange={e => setNewPrizeName(e.target.value)}
                    placeholder="Nuevo Premio..."
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleAddPrize(e as any)}
                />
                <button type="button" onClick={handleAddPrize} className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all">
                    <Plus size={20}/>
                </button>
             </div>

             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {editConfig.prizes.map((p, i) => (
                  <div key={p.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group hover:bg-slate-100 transition-all">
                     <span className="font-bold text-sm text-slate-700">#{i+1} {p.name}</span>
                     <button type="button" onClick={() => handleDeletePrize(p.id)} className="text-red-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                  </div>
                ))}
                {editConfig.prizes.length === 0 && <p className="text-center text-slate-400 py-10 italic text-xs">Aún no hay premios.</p>}
             </div>
             <button type="button" onClick={handleSaveConfig} className="w-full mt-4 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">Guardar Lista de Premios</button>
          </div>
        </div>
      )}

      {adminTab === 'PARTICIPANTES' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-2xl">
            <button type="button" onClick={() => setPartSubTab('PENDING')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${partSubTab === 'PENDING' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Pendientes ({transactions.filter(t => t.status === TransactionStatus.PENDING).length})</button>
            <button type="button" onClick={() => setPartSubTab('ACTIVE')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${partSubTab === 'ACTIVE' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Activos ({transactions.filter(t => t.status === TransactionStatus.APPROVED).length})</button>
          </div>
          {partSubTab === 'PENDING' ? (
            <div className="grid md:grid-cols-3 gap-6">
              {transactions.filter(t => t.status === TransactionStatus.PENDING).map(t => (
                <div key={t.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-t-4 border-t-amber-400">
                  <h4 className="font-black text-slate-900">{t.customerName}</h4>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-4 font-mono"><span>Ref: {t.referenceNumber}</span><span>{t.currency}</span></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {db.approveTransaction(t.id); refreshTransactions();}} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-[10px] font-black hover:bg-green-600 transition-all">APROBAR</button>
                    <button type="button" onClick={() => {const r = prompt('Motivo del rechazo:'); r && (db.rejectTransaction(t.id, r), refreshTransactions());}} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all">RECHAZAR</button>
                  </div>
                </div>
              ))}
              {transactions.filter(t => t.status === TransactionStatus.PENDING).length === 0 && <p className="col-span-full text-center text-slate-400 py-20 italic">No hay solicitudes pendientes.</p>}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                  <tr><th className="p-6">Nombre</th><th className="p-6">Tickets</th><th className="p-6">Acción</th></tr>
                </thead>
                <tbody>
                  {transactions.filter(t => t.status === TransactionStatus.APPROVED).map(t => (
                    <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50 transition-all">
                      <td className="p-6 font-bold">{t.customerName}</td>
                      <td className="p-6 font-black text-brand-600">{t.ticketNumbers.join(', ')}</td>
                      <td className="p-6">
                        <button 
                            type="button" 
                            onClick={() => handleRemoveParticipant(t.id)} 
                            className={`${confirmDeleteId === t.id ? 'bg-red-500 text-white' : 'text-red-300 hover:text-red-500 hover:bg-red-50'} p-2 rounded-lg transition-all`}
                        >
                          <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.filter(t => t.status === TransactionStatus.APPROVED).length === 0 && <p className="text-center text-slate-400 py-20 italic">No hay participantes activos.</p>}
            </div>
          )}
        </div>
      )}

      {adminTab === 'HISTORY' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black">Historial de Jornadas</h3>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Search size={18} className="text-slate-300"/><input placeholder="Filtrar..." className="bg-transparent outline-none text-sm" value={histFilter} onChange={e => setHistFilter(e.target.value)}/>
            </div>
          </div>
          {history.length === 0 && <p className="text-center text-slate-400 py-20 italic">El historial está vacío.</p>}
          {history.filter(h => h.title.toLowerCase().includes(histFilter.toLowerCase())).map(h => (
            <div key={h.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex justify-between border-b pb-4 mb-4 items-center">
                <div><h4 className="font-black text-slate-900">{h.title}</h4><p className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString()}</p></div>
                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black">{h.allParticipants.length} PARTICIPANTES</div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Ganadores</span>
                   <div className="grid gap-2">
                     {h.winners.map((w,i)=>(<div key={i} className="text-xs bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100 font-bold flex items-center gap-2"><Trophy size={14}/> #{w.ticketNumber} - {w.customerName} ({w.prizeName})</div>))}
                   </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adminTab === 'AJUSTES' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-lg font-black flex items-center gap-2"><Settings /> Configuración General</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Ticket ($)</label>
                  <input type="number" value={editConfig.ticketPrice} onChange={e => setEditConfig({...editConfig, ticketPrice: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tickets</label>
                  <input type="number" value={editConfig.totalTickets} onChange={e => setEditConfig({...editConfig, totalTickets: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título Sorteo</label>
                <input value={editConfig.title} onChange={e => setEditConfig({...editConfig, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                <textarea value={editConfig.description} onChange={e => setEditConfig({...editConfig, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" rows={3}/>
              </div>
              <div className="pt-4 border-t">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Redes Sociales</label>
                <div className="grid grid-cols-2 gap-2">
                  {editConfig.socialLinks.map((s, idx) => (
                    <div key={s.id} className="flex gap-2">
                       <div className="bg-slate-100 p-3 rounded-xl"><SocialIcon platform={s.platform} /></div>
                       <input value={s.url} onChange={e => {
                         const n = [...editConfig.socialLinks]; n[idx].url = e.target.value; setEditConfig({...editConfig, socialLinks: n});
                       }} className="flex-1 bg-slate-50 p-2 rounded-xl text-[10px] border border-slate-100 outline-none" />
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleSaveConfig} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black active:scale-95 transition-all">Guardar Ajustes</button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black">Pasarelas de Pago</h3>
              <button type="button" onClick={() => setIsAddingMethod(!isAddingMethod)} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all">
                {isAddingMethod ? <X size={18}/> : <Plus size={18}/>}
              </button>
            </div>
            
            {isAddingMethod && (
                <div className="bg-brand-50 p-4 rounded-2xl space-y-2 animate-in slide-in-from-top-2 border border-brand-100">
                    <input 
                        className="w-full p-2 rounded-lg text-xs" 
                        placeholder="Nombre (ej: Binance)" 
                        value={newMethod.name}
                        onChange={e => setNewMethod({...newMethod, name: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <select 
                            className="p-2 rounded-lg text-xs bg-white flex-1"
                            value={newMethod.currency}
                            onChange={e => setNewMethod({...newMethod, currency: e.target.value})}
                        >
                            <option value="VES">VES</option>
                            <option value="USD">USD</option>
                            <option value="CRYPTO">CRYPTO</option>
                        </select>
                        <button type="button" onClick={handleAddPaymentMethod} className="bg-brand-500 text-white px-4 rounded-lg text-xs font-bold">Agregar</button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group hover:bg-slate-100 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="cursor-pointer flex-1" onClick={() => setEditingMethod(editingMethod?.id === pm.id ? null : pm)}>
                      <div className="font-bold text-sm text-slate-800 flex items-center gap-2">{pm.name} <Edit size={12} className="text-slate-300 group-hover:text-brand-500 transition-all"/></div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">{pm.currency}</div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button type="button" onClick={() => {db.togglePaymentMethod(pm.id); refreshPaymentMethods();}} className={pm.isActive ? 'text-green-500' : 'text-slate-300'}>
                        {pm.isActive ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeletePaymentMethod(pm.id)} 
                        className={`${confirmDeleteId === pm.id ? 'bg-red-500 text-white p-2 rounded-lg' : 'text-red-200 hover:text-red-500 p-1'} transition-all`}
                      >
                         <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                  {editingMethod?.id === pm.id && (
                    <form onSubmit={handleUpdateMethod} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 animate-in zoom-in-95">
                       <div className="space-y-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase">Nombre Pasarela</label>
                         <input value={editingMethod.name} onChange={e => setEditingMethod({...editingMethod, name: e.target.value})} className="w-full text-xs p-2 bg-slate-50 rounded-lg outline-none border border-slate-100" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase">Datos Cuenta</label>
                         <input value={editingMethod.details} onChange={e => setEditingMethod({...editingMethod, details: e.target.value})} className="w-full text-xs p-2 bg-slate-50 rounded-lg outline-none border border-slate-100" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase">Instrucciones</label>
                         <textarea value={editingMethod.instructions} onChange={e => setEditingMethod({...editingMethod, instructions: e.target.value})} className="w-full text-xs p-2 bg-slate-50 rounded-lg outline-none border border-slate-100" rows={2}/>
                       </div>
                       <div className="flex gap-2">
                         <button type="submit" className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 hover:bg-brand-600 active:scale-95 transition-all"><Save size={12}/> GUARDAR</button>
                         <button type="button" onClick={() => setEditingMethod(null)} className="flex-1 bg-slate-100 text-slate-400 py-2 rounded-lg text-[10px] font-black">CANCELAR</button>
                       </div>
                    </form>
                  )}
                </div>
              ))}
              {paymentMethods.length === 0 && <p className="text-center text-slate-400 py-6 italic text-xs">Sin pasarelas configuradas.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [config, setConfig] = useState<RaffleConfig>(db.getConfig());
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isRaffling, setIsRaffling] = useState(false);
  const [cycleNum, setCycleNum] = useState<number | null>(null);

  useEffect(() => {
    setTickets(db.getTickets());
    setConfig(db.getConfig());
  }, [view, isAdmin]);

  useEffect(() => {
    if (config.raffleStatus === RaffleStatus.RUNNING && !isRaffling) {
      setIsRaffling(true);
      const sold = tickets.filter(t => t.status === TicketStatus.SOLD).map(t => t.number);
      if (sold.length === 0) { setIsRaffling(false); return; }
      let its = 0;
      const interval = setInterval(() => {
        setCycleNum(sold[Math.floor(Math.random() * sold.length)]);
        if (++its >= config.selectionDuration * 10) {
          clearInterval(interval);
          setIsRaffling(false);
          setCycleNum(null);
          setConfig(db.getConfig());
        }
      }, 100);
    }
  }, [config.raffleStatus, tickets]);

  const refreshGlobal = () => {
    setTickets(db.getTickets());
    setConfig(db.getConfig());
  };

  const HomeView = () => (
    <div className="max-w-4xl mx-auto pb-24 px-4 animate-in fade-in">
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-12 mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-500" />
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4 tracking-tighter">{config.title}</h1>
        <p className="text-slate-500 text-lg mb-8 italic font-medium">"{config.description}"</p>
        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-200/50">
           {config.raffleStatus === RaffleStatus.SCHEDULED && (
             <><span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Sorteo programado para</span><CountdownTimer targetDate={config.raffleDate} /></>
           )}
           {config.raffleStatus === RaffleStatus.RUNNING && (
             <div className="py-8 text-center"><span className="text-[10px] font-black uppercase text-brand-600 animate-pulse">Sorteo en vivo</span><div className="text-8xl font-black text-slate-900 tabular-nums">{cycleNum || '...'}</div></div>
           )}
           {config.raffleStatus === RaffleStatus.COMPLETED && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in zoom-in-95">
                {config.winners.map((w,i)=>(
                  <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-b-4 border-b-amber-400 text-left">
                    <div className="text-[10px] font-black text-slate-400 uppercase">{w.prizeName}</div>
                    <div className="text-2xl font-black">#{w.ticketNumber}</div>
                    <div className="text-xs font-bold text-brand-600 truncate">{w.customerName}</div>
                  </div>
                ))}
                {config.winners.length === 0 && <p className="col-span-full py-4 text-slate-400 italic text-xs">Sin ganadores registrados.</p>}
             </div>
           )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-6 px-4">
         <h3 className="text-xl font-black">Tickets Disponibles</h3>
         <span className="text-xs font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">{tickets.filter(t => t.status === TicketStatus.AVAILABLE).length} Libres</span>
      </div>
      <TicketGrid 
        tickets={tickets} 
        selectedIds={selectedNumbers} 
        onToggle={n => setSelectedNumbers(prev => prev.includes(n) ? prev.filter(x => x!==n) : [...prev, n])} 
      />
      {selectedNumbers.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-10">
          <div className="max-w-md mx-auto bg-slate-900 text-white rounded-[32px] p-6 shadow-2xl flex items-center justify-between">
            <div><div className="text-[10px] text-slate-400 font-black">Inversión</div><div className="text-3xl font-black">${selectedNumbers.length * config.ticketPrice}</div></div>
            <button type="button" onClick={() => setIsPaymentOpen(true)} className="bg-brand-500 text-white px-8 py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-lg">COMPRAR</button>
          </div>
        </div>
      )}
      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        selectedTicketNumbers={selectedNumbers} 
        totalAmount={selectedNumbers.length * config.ticketPrice} 
        config={config} 
        onSuccess={() => {setIsPaymentOpen(false); setSelectedNumbers([]); setTickets(db.getTickets());}} 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('HOME')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black group-hover:bg-brand-500 transition-all">TR</div>
            <span className="font-black text-2xl tracking-tighter">TuRifaDigital<span className="text-brand-500">VE</span></span>
          </div>
          <nav className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
            {(['HOME', 'CHECK_TICKETS', 'CONTACT'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setView(tab)} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${view === tab ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab === 'HOME' && <Home size={18} />}
                {tab === 'CHECK_TICKETS' && <ShieldCheck size={18} />}
                {tab === 'CONTACT' && <MessageCircle size={18} />}
                <span className={view === tab ? 'block' : 'hidden md:block'}>
                  {tab === 'HOME' ? 'Inicio' : tab === 'CHECK_TICKETS' ? 'Estatus' : 'Soporte'}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="min-h-[calc(100vh-200px)] pt-6">
        {view === 'HOME' && <HomeView />}
        {view === 'CHECK_TICKETS' && <div className="max-w-md mx-auto pt-10 px-6"><CheckTicketsView /></div>}
        {view === 'CONTACT' && (
          <div className="max-w-md mx-auto pt-20 text-center space-y-6 px-6">
            <h2 className="text-3xl font-black">Soporte Directo</h2>
            <a 
              href={`https://wa.me/${config.whatsappContact}`} 
              className="flex items-center justify-center gap-3 bg-green-500 text-white px-8 py-5 rounded-[24px] font-black shadow-xl hover:bg-green-600 active:scale-95 transition-all"
            >
              <MessageCircle size={24} /> WhatsApp Oficial
            </a>
          </div>
        )}
        {view === 'ADMIN' && (
          isAdmin ? (
            <AdminHub 
              initialConfig={config} 
              tickets={tickets} 
              onExit={() => setIsAdmin(false)} 
              onRefreshParent={refreshGlobal} 
            />
          ) : (
            <div className="max-w-sm mx-auto pt-32 px-4">
              <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
                <ShieldCheck size={48} className="mx-auto text-slate-900 mb-6" />
                <h2 className="text-2xl font-black mb-6">Acceso Admin</h2>
                <input 
                  type="password" 
                  placeholder="Contraseña Maestro" 
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4 text-center outline-none focus:ring-4 focus:ring-brand-50" 
                  value={adminPass} 
                  onChange={e => setAdminPass(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (adminPass === 'admin' ? setIsAdmin(true) : alert('Incorrecto'))} 
                />
                <button 
                  type="button" 
                  onClick={() => adminPass === 'admin' ? setIsAdmin(true) : alert('Incorrecto')} 
                  className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-black active:scale-95 transition-all"
                >
                  Entrar al Panel
                </button>
              </div>
            </div>
          )
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 mt-20 relative">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 items-center gap-12 text-center md:text-left">
          <div className="flex justify-center md:justify-start gap-4">
             {config.socialLinks.filter(s => s.isActive).map(link => (
                <a key={link.id} href={link.url} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all">
                  <SocialIcon platform={link.platform} />
                </a>
             ))}
          </div>
          <div className="text-center">
            <h4 className="font-black text-slate-900 text-xl tracking-tighter leading-none">TuRifaDigitalVE</h4>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-3">Sitio web por CarmeloIT</p>
          </div>
          <div className="flex justify-center md:justify-end">
            <button 
              type="button" 
              onClick={() => setView('ADMIN')} 
              className="text-[10px] font-black text-slate-300 hover:text-brand-500 transition-all uppercase tracking-widest border border-slate-100 px-4 py-2 rounded-lg"
            >
              Admin Access
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;