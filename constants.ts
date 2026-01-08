import { RaffleConfig, Ticket, TicketStatus, PaymentMethod, RaffleStatus } from './types';

export const INITIAL_CONFIG: RaffleConfig = {
  title: "Mega Sorteo Tecnológico",
  description: "Participa por un ecosistema Apple completo. ¡Tu suerte está a un click!",
  ticketPrice: 10,
  totalTickets: 100,
  whatsappContact: "+584120000000",
  ownerName: "Digital Raffles VE",
  socialLinks: [
    { id: '1', platform: 'Instagram', url: '#', isActive: true },
    { id: '2', platform: 'Facebook', url: '#', isActive: true },
    { id: '3', platform: 'Tiktok', url: '#', isActive: true },
    { id: '4', platform: 'WhatsApp', url: '#', isActive: true },
    { id: '5', platform: 'Telegram', url: '#', isActive: true }
  ],
  raffleDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 días desde hoy
  raffleStatus: RaffleStatus.SCHEDULED,
  prizes: [
    { id: 'p1', name: 'iPhone 15 Pro Max', rank: 1 },
    { id: 'p2', name: 'Apple Watch Series 9', rank: 2 },
    { id: 'p3', name: 'AirPods Pro', rank: 3 }
  ],
  winners: [],
  selectionDuration: 10,
  allowMultipleWins: false
};

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_1',
    currency: 'VES',
    name: 'Pago Móvil',
    details: '0134 - 04140000000 - V12345678',
    instructions: 'Enviar capture al WhatsApp.',
    isActive: true
  },
  {
    id: 'pm_2',
    currency: 'USD',
    name: 'Zelle',
    details: 'pagos@rifadigital.ve',
    instructions: 'Colocar nombre en el memo.',
    isActive: true
  }
];

export const generateInitialTickets = (count: number): Ticket[] => {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    status: TicketStatus.AVAILABLE
  }));
};