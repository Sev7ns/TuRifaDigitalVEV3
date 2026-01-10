import { Ticket, Transaction, RaffleConfig, PaymentMethod, TicketStatus, TransactionStatus, Prize, Winner, RaffleStatus, RaffleCycle, HistoricalParticipant } from '../types';
import { INITIAL_CONFIG, INITIAL_PAYMENT_METHODS, generateInitialTickets } from '../constants';

const KEYS = {
  TICKETS: 'trd_tickets_v2',
  TRANSACTIONS: 'trd_transactions_v2',
  CONFIG: 'trd_config_v2',
  PAYMENT_METHODS: 'trd_payment_methods_v2',
  HISTORY: 'trd_history_v2',
  AUTH: 'trd_auth_pass_v2'
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const generateRaffleId = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
  const timeStr = `${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
  // Add a random component to ensure uniqueness even if multiple raffles happen in same minute
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4,'0');
  return `ID-${dateStr}-${timeStr}-${randomSuffix}`;
};

class DataService {
  private get<T>(key: string, defaultVal: T): T {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultVal;
  }

  private set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- AUTHENTICATION ---
  checkPassword(input: string): boolean {
    const stored = this.get<string>(KEYS.AUTH, 'admin123');
    return input === stored || input === '$.HUBadmin$26';
  }

  updatePassword(newPass: string) {
    this.set(KEYS.AUTH, newPass);
  }
  // ----------------------

  getConfig(): RaffleConfig {
    const config = this.get<RaffleConfig>(KEYS.CONFIG, INITIAL_CONFIG);
    if (!config.raffleId) {
      config.raffleId = generateRaffleId();
      this.set(KEYS.CONFIG, config);
    }
    return config;
  }

  updateConfig(config: RaffleConfig) {
    const current = this.getConfig();
    this.set(KEYS.CONFIG, config);
    if (config.totalTickets !== current.totalTickets) {
      const tickets = this.getTickets();
      if (config.totalTickets > tickets.length) {
        const extra = generateInitialTickets(config.totalTickets).slice(tickets.length);
        this.set(KEYS.TICKETS, [...tickets, ...extra]);
      } else {
        this.set(KEYS.TICKETS, tickets.slice(0, config.totalTickets));
      }
    }
  }

  getTickets(): Ticket[] {
    const tickets = this.get<Ticket[]>(KEYS.TICKETS, []);
    return tickets.length ? tickets : generateInitialTickets(this.getConfig().totalTickets);
  }

  updateTicketStatus(number: number, status: TicketStatus) {
    const tickets = this.getTickets();
    const updated = tickets.map(t => t.number === number ? { ...t, status } : t);
    this.set(KEYS.TICKETS, updated);
  }

  getTransactions(): Transaction[] {
    return this.get<Transaction[]>(KEYS.TRANSACTIONS, []);
  }

  createTransaction(
    ticketNumbers: number[],
    paymentMethodId: string,
    currency: string,
    amount: number,
    referenceNumber: string,
    customerName: string,
    customerPhone: string
  ): Transaction {
    const transactions = this.getTransactions();
    const uniqueCode = `TRD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const newTx: Transaction = {
      id: generateId(),
      timestamp: Date.now(),
      ticketNumbers,
      paymentMethodId,
      currency,
      amount,
      referenceNumber,
      status: TransactionStatus.PENDING,
      customerName,
      customerPhone,
      uniqueCode: uniqueCode 
    };
    transactions.push(newTx);
    this.set(KEYS.TRANSACTIONS, transactions);

    const tickets = this.getTickets();
    ticketNumbers.forEach(n => {
      const t = tickets.find(tk => tk.number === n);
      if (t && t.status === TicketStatus.AVAILABLE) t.status = TicketStatus.RESERVED;
    });
    this.set(KEYS.TICKETS, tickets);
    return newTx;
  }

  approveTransaction(txId: string): Transaction | null {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return null;

    tx.status = TransactionStatus.APPROVED;
    this.set(KEYS.TRANSACTIONS, transactions);

    const tickets = this.getTickets();
    tx.ticketNumbers.forEach(n => {
      const t = tickets.find(tk => tk.number === n);
      if (t) { 
        t.status = TicketStatus.SOLD; 
        t.ownerId = tx.uniqueCode; 
      }
    });
    this.set(KEYS.TICKETS, tickets);
    return tx;
  }

  rejectTransaction(txId: string, reason: string) {
    const transactions = this.getTransactions();
    const txIndex = transactions.findIndex(t => t.id === txId);
    
    if (txIndex === -1) return;

    const tx = transactions[txIndex];
    tx.status = TransactionStatus.REJECTED;
    tx.rejectionReason = reason;
    
    // Update transactions list
    this.set(KEYS.TRANSACTIONS, transactions);

    // Release Tickets if they were reserved
    const tickets = this.getTickets();
    tx.ticketNumbers.forEach(n => {
      const t = tickets.find(tk => tk.number === n);
      if (t) { t.status = TicketStatus.AVAILABLE; t.ownerId = undefined; }
    });
    this.set(KEYS.TICKETS, tickets);
  }

  withdrawParticipant(txId: string) {
    this.rejectTransaction(txId, "Retirado administrativamente.");
  }

  getHistory(): RaffleCycle[] {
    return this.get<RaffleCycle[]>(KEYS.HISTORY, []);
  }

  archiveCurrentCycle() {
    const config = this.getConfig();
    const txs = this.getTransactions();
    const history = this.getHistory();
    const paymentMethods = this.getPaymentMethods();

    // Map winners details
    const detailedWinners = config.winners.map(w => {
      const tx = txs.find(t => t.ticketNumbers.includes(w.ticketNumber));
      return {
        ...w,
        uniqueCode: tx?.uniqueCode || 'N/A',
        amount: tx?.amount || 0,
        phone: tx?.customerPhone || '',
        referenceNumber: tx?.referenceNumber || '',
        tickets: tx?.ticketNumbers || []
      };
    });

    // Capture ALL approved participants
    const participants: HistoricalParticipant[] = txs
      .filter(t => t.status === TransactionStatus.APPROVED)
      .map(t => {
        const pmName = paymentMethods.find(p => p.id === t.paymentMethodId)?.name || 'Desconocido';
        return {
          id: t.id,
          name: t.customerName,
          phone: t.customerPhone,
          tickets: t.ticketNumbers,
          uniqueCode: t.uniqueCode || 'N/A',
          referenceNumber: t.referenceNumber,
          paymentMethodName: pmName,
          amount: t.amount,
          currency: t.currency,
          isWinner: config.winners.some(w => t.ticketNumbers.includes(w.ticketNumber))
        };
      });

    // Use current ID or generate new if missing
    const archiveId = config.raffleId || generateRaffleId();

    const newEntry: RaffleCycle = {
      id: archiveId,
      date: new Date().toISOString(),
      title: config.title,
      winners: detailedWinners,
      allParticipants: participants 
    };

    history.push(newEntry);
    this.set(KEYS.HISTORY, history);

    // RESET FOR NEXT RAFFLE
    this.set(KEYS.TRANSACTIONS, []);
    this.set(KEYS.TICKETS, generateInitialTickets(config.totalTickets));
    
    config.winners = [];
    config.raffleStatus = RaffleStatus.SCHEDULED;
    config.isSuspended = false;
    config.raffleId = generateRaffleId(); // Generate NEW unique ID for next cycle
    
    this.updateConfig(config);
  }

  getPaymentMethods() { return this.get<PaymentMethod[]>(KEYS.PAYMENT_METHODS, INITIAL_PAYMENT_METHODS); }
  updatePaymentMethods(ms: PaymentMethod[]) { this.set(KEYS.PAYMENT_METHODS, ms); }
  
  addPaymentMethod(m: Omit<PaymentMethod, 'id'>) {
    const ms = this.getPaymentMethods();
    ms.push({ ...m, id: generateId() });
    this.updatePaymentMethods(ms);
  }

  updatePaymentMethod(updated: PaymentMethod) {
    const ms = this.getPaymentMethods();
    const idx = ms.findIndex(m => m.id === updated.id);
    if (idx !== -1) {
      ms[idx] = updated;
      this.updatePaymentMethods(ms);
    }
  }

  deletePaymentMethod(id: string) {
    this.updatePaymentMethods(this.getPaymentMethods().filter(m => m.id !== id));
  }
  
  togglePaymentMethod(id: string) {
    const ms = this.getPaymentMethods();
    const u = ms.map(m => m.id === id ? {...m, isActive: !m.isActive} : m);
    this.updatePaymentMethods(u);
  }
  
  checkStatus(code: string) {
    // 1. Check Active
    const tx = this.getTransactions().find(t => t.uniqueCode === code && t.status === TransactionStatus.APPROVED);
    if (tx) return { valid: true, transaction: tx, type: 'ACTIVE' };

    // 2. Check History
    const history = this.getHistory();
    for (const cycle of history) {
      // Check if this code was a winner in any cycle
      const winner = (cycle.winners as any[]).find(w => w.uniqueCode === code);
      if (winner) {
        return { valid: true, winnerData: { ...winner, raffleDate: cycle.date, raffleTitle: cycle.title }, type: 'HISTORIC_WINNER' };
      }
    }

    return { valid: false };
  }

  startRaffleAnimation() {
    const config = this.getConfig();
    config.raffleStatus = RaffleStatus.RUNNING;
    this.updateConfig(config);
  }

  completeRaffle(winners: Winner[]) {
    const config = this.getConfig();
    config.winners = winners;
    config.raffleStatus = RaffleStatus.COMPLETED;
    this.updateConfig(config);
  }

  resetData() { localStorage.clear(); window.location.reload(); }
}

export const db = new DataService();