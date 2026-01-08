import { Ticket, Transaction, RaffleConfig, PaymentMethod, TicketStatus, TransactionStatus, Prize, Winner, RaffleStatus, RaffleCycle } from '../types';
import { INITIAL_CONFIG, INITIAL_PAYMENT_METHODS, generateInitialTickets } from '../constants';

const KEYS = {
  TICKETS: 'trd_tickets_v2',
  TRANSACTIONS: 'trd_transactions_v2',
  CONFIG: 'trd_config_v2',
  PAYMENT_METHODS: 'trd_payment_methods_v2',
  HISTORY: 'trd_history_v2'
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

class DataService {
  private get<T>(key: string, defaultVal: T): T {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultVal;
  }

  private set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getConfig(): RaffleConfig {
    return this.get<RaffleConfig>(KEYS.CONFIG, INITIAL_CONFIG);
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
      customerPhone
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

    const uniqueCode = `TRD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    tx.status = TransactionStatus.APPROVED;
    tx.uniqueCode = uniqueCode;
    this.set(KEYS.TRANSACTIONS, transactions);

    const tickets = this.getTickets();
    tx.ticketNumbers.forEach(n => {
      const t = tickets.find(tk => tk.number === n);
      if (t) { t.status = TicketStatus.SOLD; t.ownerId = uniqueCode; }
    });
    this.set(KEYS.TICKETS, tickets);
    return tx;
  }

  rejectTransaction(txId: string, reason: string) {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    tx.status = TransactionStatus.REJECTED;
    tx.rejectionReason = reason;
    this.set(KEYS.TRANSACTIONS, transactions);

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

    const participants = txs
      .filter(t => t.status === TransactionStatus.APPROVED)
      .map(t => ({
        name: t.customerName,
        phone: t.customerPhone,
        tickets: t.ticketNumbers,
        isWinner: config.winners.some(w => t.ticketNumbers.includes(w.ticketNumber))
      }));

    const newEntry: RaffleCycle = {
      id: generateId(),
      date: new Date().toISOString(),
      title: config.title,
      winners: config.winners,
      allParticipants: participants
    };

    history.push(newEntry);
    this.set(KEYS.HISTORY, history);

    // RESET ACTUAL
    this.set(KEYS.TRANSACTIONS, []);
    this.set(KEYS.TICKETS, generateInitialTickets(config.totalTickets));
    config.winners = [];
    config.raffleStatus = RaffleStatus.SCHEDULED;
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
    const tx = this.getTransactions().find(t => t.uniqueCode === code && t.status === TransactionStatus.APPROVED);
    return { valid: !!tx, transaction: tx };
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