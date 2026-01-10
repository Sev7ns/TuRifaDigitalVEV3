import { RaffleConfig, Ticket, TicketStatus, PaymentMethod, RaffleStatus } from './types';

export const INITIAL_CONFIG: RaffleConfig = {
  raffleId: `RFL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`,
  title: "Mega Sorteo Tecnológico",
  description: "Participa por un ecosistema Apple completo. ¡Tu suerte está a un click!",
  ticketPrice: 10,
  totalTickets: 100,
  whatsappContact: "+584120000000",
  ownerName: "Digital Raffles VE",
  websiteName: "TuRifaDigitalVE",
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
  allowMultipleWins: false,
  carouselImages: [
    "https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=1200&auto=format&fit=crop", // iPhone 15
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1200&auto=format&fit=crop", // Apple Watch
    "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=1200&auto=format&fit=crop"  // AirPods
  ],
  isSuspended: false
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