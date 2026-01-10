
export enum TicketStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum RaffleStatus {
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED'
}

// Added Currency enum to support PaymentModal.tsx
export enum Currency {
  USD = 'USD',
  VES = 'VES',
  CRYPTO = 'CRYPTO'
}

export interface Prize {
  id: string;
  name: string;
  rank: number;
}

export interface Winner {
  ticketNumber: number;
  customerName: string;
  prizeName: string;
}

export interface SocialLink {
  id: string;
  platform: 'Tiktok' | 'Facebook' | 'Instagram' | 'WhatsApp' | 'Telegram';
  url: string;
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  currency: string;
  name: string;
  details: string;
  instructions: string;
  isActive: boolean;
}

export interface Ticket {
  number: number;
  status: TicketStatus;
  ownerId?: string;
}

export interface Transaction {
  id: string;
  timestamp: number;
  ticketNumbers: number[];
  paymentMethodId: string;
  currency: string;
  amount: number;
  referenceNumber: string;
  status: TransactionStatus;
  customerName: string;
  customerPhone: string;
  uniqueCode?: string;
  rejectionReason?: string;
}

export interface HistoricalParticipant {
  id: string; // Internal ID
  name: string;
  phone: string;
  tickets: number[];
  uniqueCode: string;
  referenceNumber: string;
  paymentMethodName: string; // Snapshot of the name
  amount: number;
  currency: string;
  isWinner: boolean;
}

export interface RaffleCycle {
  id: string;
  date: string;
  title: string;
  winners: Winner[];
  allParticipants: HistoricalParticipant[]; // Updated structure
}

export interface RaffleConfig {
  raffleId: string; // New Unique ID for the current raffle
  title: string;
  description: string;
  ticketPrice: number;
  totalTickets: number;
  whatsappContact: string;
  ownerName: string;
  websiteName: string; 
  socialLinks: SocialLink[];
  raffleDate: string;
  raffleStatus: RaffleStatus;
  prizes: Prize[];
  winners: Winner[];
  selectionDuration: number;
  allowMultipleWins: boolean;
  carouselImages: string[]; 
  isSuspended: boolean;
}

export type ViewState = 'HOME' | 'CHECK_TICKETS' | 'CONTACT' | 'ADMIN';