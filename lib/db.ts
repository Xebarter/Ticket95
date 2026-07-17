// localStorage-based database for Ticket95.com
// This eliminates native dependencies and works seamlessly in the browser

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'organizer' | 'admin';
  profile?: {
    name: string;
    description?: string;
    logo?: string;
  };
  createdAt: number;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  venue: string;
  ticketPrice: number;
  totalTickets: number;
  ticketsAvailable: number;
  organizerId: string;
  organizerName: string;
  organizerLogo?: string;
  sponsors: Array<{
    id: string;
    name: string;
    logo?: string;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  eventId: string;
  userId: string;
  quantity: number;
  totalPrice: number;
  createdAt: number;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  userId: string;
  eventName: string;
  organizerName: string;
  organizerLogo?: string;
  sponsors: Array<{
    name: string;
    logo?: string;
  }>;
  status: 'valid' | 'used';
  qrCode: string;
  createdAt: number;
}

interface Database {
  users: User[];
  events: Event[];
  orders: Order[];
  tickets: Ticket[];
}

const DB_KEY = 'ticketrevolution_db_v1';
const DEFAULT_DB: Database = {
  users: [],
  events: [],
  orders: [],
  tickets: [],
};

// Admin user seed
const ADMIN_USER: User = {
  id: 'admin-001',
  email: 'admin@ticket95.com',
  passwordHash: '$2b$10$admin_hash',
  role: 'admin',
  profile: {
    name: 'Admin User',
  },
  createdAt: Date.now(),
};

function getDB(): Database {
  if (typeof window === 'undefined') {
    return DEFAULT_DB;
  }

  try {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
      const db = { ...DEFAULT_DB };
      if (db.users.length === 0) {
        db.users.push(ADMIN_USER);
      }
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return db;
    }
    const parsed = JSON.parse(data);
    if (!parsed.users.some((u: User) => u.role === 'admin')) {
      parsed.users.push(ADMIN_USER);
      localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Error reading database:', e);
    return DEFAULT_DB;
  }
}

function saveDB(db: Database): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }
}

export function createUser(email: string, passwordHash: string, role: 'customer' | 'organizer' | 'admin'): User {
  const db = getDB();
  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const user: User = {
    id,
    email,
    passwordHash,
    role,
    createdAt: Date.now(),
  };
  db.users.push(user);
  saveDB(db);
  return user;
}

export function getUserByEmail(email: string): User | undefined {
  const db = getDB();
  return db.users.find((u) => u.email === email);
}

export function getUserById(id: string): User | undefined {
  const db = getDB();
  return db.users.find((u) => u.id === id);
}

export function updateUserProfile(userId: string, profile: { name: string; description?: string; logo?: string }): User | undefined {
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.profile = profile;
    saveDB(db);
  }
  return user;
}

export function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
  const db = getDB();
  const id = 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const event: Event = {
    ...eventData,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.events.push(event);
  saveDB(db);
  return event;
}

export function getEventById(id: string): Event | undefined {
  const db = getDB();
  return db.events.find((e) => e.id === id);
}

export function getApprovedEvents(): Event[] {
  const db = getDB();
  return db.events.filter((e) => e.status === 'approved');
}

export function getEventsByOrganizer(organizerId: string): Event[] {
  const db = getDB();
  return db.events.filter((e) => e.organizerId === organizerId);
}

export function getAllEvents(): Event[] {
  const db = getDB();
  return db.events;
}

export function updateEventStatus(eventId: string, status: 'pending' | 'approved' | 'rejected', rejectionReason?: string): Event | undefined {
  const db = getDB();
  const event = db.events.find((e) => e.id === eventId);
  if (event) {
    event.status = status;
    if (rejectionReason) {
      event.rejectionReason = rejectionReason;
    }
    event.updatedAt = Date.now();
    saveDB(db);
  }
  return event;
}

export function updateEventTickets(eventId: string, quantity: number): Event | undefined {
  const db = getDB();
  const event = db.events.find((e) => e.id === eventId);
  if (event) {
    event.ticketsAvailable = Math.max(0, event.ticketsAvailable - quantity);
    event.updatedAt = Date.now();
    saveDB(db);
  }
  return event;
}

export function createOrder(eventId: string, userId: string, quantity: number, totalPrice: number): Order {
  const db = getDB();
  const id = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const order: Order = {
    id,
    eventId,
    userId,
    quantity,
    totalPrice,
    createdAt: Date.now(),
  };
  db.orders.push(order);
  saveDB(db);
  return order;
}

export function getOrdersByUser(userId: string): Order[] {
  const db = getDB();
  return db.orders.filter((o) => o.userId === userId);
}

export function createTickets(orderId: string, eventId: string, userId: string, quantity: number): Ticket[] {
  const db = getDB();
  const event = db.events.find((e) => e.id === eventId);
  if (!event) return [];

  const tickets: Ticket[] = [];
  for (let i = 0; i < quantity; i++) {
    const id = 'ticket_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 9);
    const qrCode = JSON.stringify({ ticketId: id, eventId, userId });
    const ticket: Ticket = {
      id,
      orderId,
      eventId,
      userId,
      eventName: event.name,
      organizerName: event.organizerName,
      organizerLogo: event.organizerLogo,
      sponsors: event.sponsors,
      status: 'valid',
      qrCode,
      createdAt: Date.now(),
    };
    tickets.push(ticket);
    db.tickets.push(ticket);
  }
  saveDB(db);
  return tickets;
}

export function getTicketsByUser(userId: string): Ticket[] {
  const db = getDB();
  return db.tickets.filter((t) => t.userId === userId);
}

export function getTicketById(id: string): Ticket | undefined {
  const db = getDB();
  return db.tickets.find((t) => t.id === id);
}

export function useTicket(ticketId: string): Ticket | undefined {
  const db = getDB();
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (ticket) {
    ticket.status = 'used';
    saveDB(db);
  }
  return ticket;
}

export function resetDatabase(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DB_KEY);
  }
}
