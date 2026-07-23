export type CachedVerifierTicket = {
  id: string
  qr_code: string
  status: 'valid' | 'used' | 'expired' | 'refunded'
  ticket_type_name: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  updated_at: string
}

export type PendingCheckIn = {
  ticketId: string
  scannedAt: string
  qr_code: string
}

export type VerifierLocalSession = {
  slug: string
  token: string
  eventId: string
  eventName: string
  deviceName: string
  expiresAt: string
  syncedAt: string | null
}

const DB_NAME = 'ticket95-verifier'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'slug' })
      }
      if (!db.objectStoreNames.contains('tickets')) {
        const store = db.createObjectStore('tickets', { keyPath: 'id' })
        store.createIndex('by_slug_qr', ['slug', 'qr_code'], { unique: false })
        store.createIndex('by_slug', 'slug', { unique: false })
      }
      if (!db.objectStoreNames.contains('pending')) {
        const store = db.createObjectStore('pending', { keyPath: 'ticketId' })
        store.createIndex('by_slug', 'slug', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'))
  })
}

export async function saveSession(session: VerifierLocalSession): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('sessions', 'readwrite')
  tx.objectStore('sessions').put(session)
  await txDone(tx)
  db.close()
}

export async function loadSession(slug: string): Promise<VerifierLocalSession | null> {
  const db = await openDb()
  const tx = db.transaction('sessions', 'readonly')
  const req = tx.objectStore('sessions').get(slug)
  const result = await new Promise<VerifierLocalSession | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return result || null
}

export async function clearSession(slug: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['sessions', 'tickets', 'pending'], 'readwrite')
  tx.objectStore('sessions').delete(slug)
  const ticketStore = tx.objectStore('tickets')
  const ticketIndex = ticketStore.index('by_slug')
  const ticketReq = ticketIndex.getAllKeys(slug)
  const ticketKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    ticketReq.onsuccess = () => resolve(ticketReq.result || [])
    ticketReq.onerror = () => reject(ticketReq.error)
  })
  for (const key of ticketKeys) ticketStore.delete(key)

  const pendingStore = tx.objectStore('pending')
  const pendingIndex = pendingStore.index('by_slug')
  const pendingReq = pendingIndex.getAllKeys(slug)
  const pendingKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    pendingReq.onsuccess = () => resolve(pendingReq.result || [])
    pendingReq.onerror = () => reject(pendingReq.error)
  })
  for (const key of pendingKeys) pendingStore.delete(key)

  await txDone(tx)
  db.close()
}

type TicketRecord = CachedVerifierTicket & { slug: string }

export async function replaceTickets(
  slug: string,
  tickets: CachedVerifierTicket[]
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('tickets', 'readwrite')
  const store = tx.objectStore('tickets')
  const index = store.index('by_slug')
  const existing = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const req = index.getAllKeys(slug)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  for (const key of existing) store.delete(key)
  for (const ticket of tickets) {
    store.put({ ...ticket, slug } satisfies TicketRecord)
  }
  await txDone(tx)
  db.close()
}

export async function upsertTickets(
  slug: string,
  tickets: CachedVerifierTicket[]
): Promise<void> {
  if (!tickets.length) return
  const db = await openDb()
  const tx = db.transaction('tickets', 'readwrite')
  const store = tx.objectStore('tickets')
  for (const ticket of tickets) {
    store.put({ ...ticket, slug } satisfies TicketRecord)
  }
  await txDone(tx)
  db.close()
}

export async function loadTickets(slug: string): Promise<CachedVerifierTicket[]> {
  const db = await openDb()
  const tx = db.transaction('tickets', 'readonly')
  const index = tx.objectStore('tickets').index('by_slug')
  const req = index.getAll(slug)
  const rows = await new Promise<TicketRecord[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result || []) as TicketRecord[])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return rows.map(({ slug: _s, ...ticket }) => ticket)
}

export function buildTicketMaps(tickets: CachedVerifierTicket[]) {
  const byQr = new Map<string, CachedVerifierTicket>()
  const byId = new Map<string, CachedVerifierTicket>()
  for (const ticket of tickets) {
    byId.set(ticket.id, ticket)
    if (ticket.qr_code) byQr.set(ticket.qr_code, ticket)
  }
  return { byQr, byId }
}

export async function enqueuePending(
  slug: string,
  item: PendingCheckIn
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('pending', 'readwrite')
  tx.objectStore('pending').put({ ...item, slug })
  await txDone(tx)
  db.close()
}

export async function listPending(slug: string): Promise<PendingCheckIn[]> {
  const db = await openDb()
  const tx = db.transaction('pending', 'readonly')
  const index = tx.objectStore('pending').index('by_slug')
  const req = index.getAll(slug)
  const rows = await new Promise<Array<PendingCheckIn & { slug: string }>>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return rows.map(({ slug: _s, ...item }) => item)
}

export async function removePending(ticketId: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('pending', 'readwrite')
  tx.objectStore('pending').delete(ticketId)
  await txDone(tx)
  db.close()
}
