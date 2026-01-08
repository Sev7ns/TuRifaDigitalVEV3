import React, { useState, useMemo, useEffect } from 'react';
import { Currency, PaymentMethod, RaffleConfig } from '../types';
import { CreditCard, Smartphone, Bitcoin, Upload, X, ArrowLeft, Loader2 } from 'lucide-react';
import { db } from '../services/dataService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicketNumbers: number[];
  totalAmount: number;
  config: RaffleConfig;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectedTicketNumbers,
  totalAmount,
  config,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [refNumber, setRefNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);

  // Load methods when modal opens to ensure they are fresh
  useEffect(() => {
    if (isOpen) {
      setAvailableMethods(db.getPaymentMethods().filter(m => m.isActive));
      setStep(1);
      setSelectedCurrency(null);
      setSelectedMethod(null);
      setRefNumber('');
      setCustomerName('');
      setCustomerPhone('');
    }
  }, [isOpen]);

  const filteredMethods = useMemo(() => {
    if (!selectedCurrency) return [];
    return availableMethods.filter(pm => pm.currency === selectedCurrency);
  }, [selectedCurrency, availableMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || !selectedCurrency) return;
    setIsSubmitting(true);
    
    // Simulación de envío
    setTimeout(() => {
      db.createTransaction(
        selectedTicketNumbers,
        selectedMethod.id,
        selectedCurrency,
        totalAmount,
        refNumber,
        customerName,
        customerPhone
      );
      setIsSubmitting(false);
      onSuccess();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold">Completar Compra</h2>
              <p className="text-slate-400 text-xs">Tickets: {selectedTicketNumbers.join(', ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm text-slate-500 block">Monto a pagar</span>
                <span className="text-3xl font-black text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Moneda de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  {[Currency.USD, Currency.VES, Currency.CRYPTO].map((curr) => (
                    <button
                      key={curr}
                      onClick={() => { setSelectedCurrency(curr); setSelectedMethod(null); }}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        selectedCurrency === curr 
                          ? 'border-brand-500 bg-brand-50 text-brand-700' 
                          : 'border-slate-100 hover:border-slate-200 text-slate-400'
                      }`}
                    >
                      {curr === Currency.USD && <CreditCard size={22} />}
                      {curr === Currency.VES && <Smartphone size={22} />}
                      {curr === Currency.CRYPTO && <Bitcoin size={22} />}
                      <span className="text-xs font-black">{curr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCurrency && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">2. Método de Pago</label>
                  <div className="grid gap-2">
                    {filteredMethods.length > 0 ? filteredMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${
                          selectedMethod?.id === method.id
                            ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                            : 'border-slate-50 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-800">{method.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{method.details}</div>
                        </div>
                        {selectedMethod?.id === method.id && <div className="w-2 h-2 bg-brand-500 rounded-full" />}
                      </button>
                    )) : (
                      <p className="text-xs text-center text-slate-400 py-4 italic">No hay métodos activos para esta moneda.</p>
                    )}
                  </div>
                </div>
              )}

              <button
                disabled={!selectedMethod}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg shadow-brand-200 hover:bg-brand-700 disabled:opacity-30 disabled:grayscale transition-all"
              >
                Continuar con el Pago
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 shadow-inner">
                 <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Datos de Transferencia</span>
                    <span className="bg-brand-500 text-white px-2 py-0.5 rounded text-[10px] font-black">{selectedMethod?.currency}</span>
                 </div>
                 <p className="font-mono text-sm break-all leading-tight">{selectedMethod?.details}</p>
                 <p className="text-slate-400 text-[11px] italic leading-snug">{selectedMethod?.instructions}</p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Nombre Completo</label>
                  <input 
                    required 
                    type="text" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all" 
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">WhatsApp</label>
                  <input 
                    required 
                    type="tel" 
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all" 
                    placeholder="+58 412 0000000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Referencia de Pago</label>
                  <input 
                    required 
                    type="text" 
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all font-mono" 
                    placeholder="Últimos 6 dígitos"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex justify-center items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-70"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={20} /> Procesando...</>
                ) : (
                  <>Notificar Pago Ahora</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};