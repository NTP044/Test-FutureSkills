import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Middleware - allow up to 25MB for base64 slip images
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// Google Apps Script and Store Configuration
let gasConfig = {
  webAppUrl: process.env.GAS_WEB_APP_URL || '',
  ownerEmail: process.env.OWNER_EMAIL || 'NatapongMumklang@gmail.com',
  promptpayPhone: '0812345678',
  promptpayName: 'The Bloom Studio',
  adminPin: '1234',
  autoSync: true,
  lastSyncAt: null,
  syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
  lastSyncError: null,
};

// Google Workspace Direct Cloud Integration (Sheets API, Drive API, Calendar API)
let workspaceConfig = {
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  spreadsheetUrl: process.env.GOOGLE_SPREADSHEET_URL || '',
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  connectedEmail: 'NatapongMumklang@gmail.com',
  connectedAt: null,
  lastSyncAt: null,
  status: 'ready',
};

/**
 * Persist in-memory database to disk so all devices and restarts share exact same data
 */
function saveDatabase() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = {
      gasConfig,
      workspaceConfig,
      services,
      staff,
      bookings,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB Save Warning]', err.message);
  }
}

/**
 * Load database from disk on startup
 */
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.gasConfig) gasConfig = { ...gasConfig, ...data.gasConfig };
      if (data.workspaceConfig) workspaceConfig = { ...workspaceConfig, ...data.workspaceConfig };
      if (Array.isArray(data.services) && data.services.length > 0) services = data.services;
      if (Array.isArray(data.staff) && data.staff.length > 0) staff = data.staff;
      if (Array.isArray(data.bookings) && data.bookings.length > 0) bookings = data.bookings;
      console.log('✅ Persistent Database loaded from', DB_FILE);
    }
  } catch (err) {
    console.warn('[DB Load Warning]', err.message);
  }
}

// In-Memory Data Store (Services)
let services = [
  {
    id: 's1',
    name: 'ทำเล็บเจลพรีเมียม (Gel Manicure Art)',
    category: 'Nails',
    durationMinutes: 60,
    price: 690,
    description: 'ตัดแต่งทรงหนัง ทาสีเจลเกรดพรีเมียมนำเข้าจากเกาหลี พร้อมเคลือบเงา 3 ชั้น ปกป้องหน้าเล็บยาวนาน',
    icon: 'Sparkles',
  },
  {
    id: 's2',
    name: 'สปาเท้า & เพดิคิวร์ดีท็อกซ์ (Aroma Foot Spa)',
    category: 'Spa & Nails',
    durationMinutes: 75,
    price: 990,
    description: 'แช่น้ำแร่เกลือหิมาลายัน สครับผลัดเซลล์ผิว ตัดแต่งเล็บ ขูดส้นเท้า และมาสก์บำรุงเข้มข้น',
    icon: 'Footprints',
  },
  {
    id: 's3',
    name: 'เฟเชียลทรีตเมนต์บำรุงล้ำลึก (Deep Glow Facial)',
    category: 'Facial',
    durationMinutes: 60,
    price: 1290,
    description: 'ทำความสะอาดล้ำลึก นวดกระตุ้นคอลลาเจน ผลักวิตามินเข้มข้นด้วยไอออนโต และมาสก์ไฮยาลูรอนสดชื่น',
    icon: 'Smile',
  },
  {
    id: 's4',
    name: 'นวดอโรมาเธอราปีผ่อนคลาย (Aroma Oil Massage)',
    category: 'Massage',
    durationMinutes: 90,
    price: 1590,
    description: 'นวดปรับสมดุลด้วยน้ำมันหอมระเหยออร์แกนิกเกรดบริสุทธิ์ ช่วยคลายความตึงเครียดและฟื้นฟูกายใจ',
    icon: 'Flower2',
  },
  {
    id: 's5',
    name: 'สปายกกระชับผิวหน้ากัวซา (Gua Sha Facial Lift)',
    category: 'Facial',
    durationMinutes: 45,
    price: 890,
    description: 'ศาสตร์การนวดกระชับกรอบหน้าด้วยหินหยกธรรมชาติแท้ รีดน้ำเหลือง ลดบวม ผิวตึงกระชับมีเลือดฝาด',
    icon: 'Gem',
  },
  {
    id: 's6',
    name: 'ต่อขนตาธรรมชาติเส้นต่อเส้น (Natural Lash)',
    category: 'Lash',
    durationMinutes: 90,
    price: 1390,
    description: 'เทคนิคญี่ปุ่นเส้นต่อเส้น น้ำหนักเบาสบาย ไม่เคืองตา ออกแบบรูปตาเฉพาะบุคคลให้หวานละมุนเป็นธรรมชาติ',
    icon: 'Eye',
  },
];

// In-Memory Data Store (Staff)
let staff = [
  {
    id: 'st1',
    name: 'ช่างพลอย (Ploy)',
    nickname: 'พลอย',
    role: 'Senior Nail & Lash Artist',
    experience: '5 ปี',
    rating: 4.95,
    reviewsCount: 184,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    services: ['s1', 's2', 's6'],
    bio: 'เชี่ยวชาญการเพ้นท์เล็บสไตล์มินิมอลเกาหลีและต่อขนตาเส้นต่อเส้นเนียนเป็นธรรมชาติ',
  },
  {
    id: 'st2',
    name: 'ช่างเมย์ (May)',
    nickname: 'เมย์',
    role: 'Master Aesthetician & Facialist',
    experience: '7 ปี',
    rating: 4.98,
    reviewsCount: 242,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    services: ['s3', 's5'],
    bio: 'ผู้เชี่ยวชาญด้านการดูแลฟื้นฟูผิวหน้า การกดจุดรีดน้ำเหลือง และศาสตร์กัวซาหยกแท้',
  },
  {
    id: 'st3',
    name: 'ช่างแนน (Nan)',
    nickname: 'แนน',
    role: 'Certified Spa & Body Therapist',
    experience: '6 ปี',
    rating: 4.93,
    reviewsCount: 168,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    services: ['s2', 's4'],
    bio: 'ใบรับรองสปานานาชาติ เชี่ยวชาญการนวดอโรมาผ่อนคลายกล้ามเนื้อและสปาเท้าบำบัด',
  },
  {
    id: 'st4',
    name: 'ช่างกิ๊ฟ (Gift)',
    nickname: 'กิ๊ฟ',
    role: 'All-Rounder Beauty Specialist',
    experience: '4 ปี',
    rating: 4.91,
    reviewsCount: 139,
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
    services: ['s1', 's2', 's3', 's5'],
    bio: 'มีความประณีต อ่อนโยน ให้บริการทั้งเล็บ สปา และดูแลผิวหน้าอย่างครบวงจร',
  },
];

// Standard slots available each day
const STANDARD_SLOTS = [
  '10:00',
  '11:30',
  '13:00',
  '14:30',
  '16:00',
  '17:30',
  '19:00',
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial seed bookings
let bookings = [
  {
    id: 'BK-SEED-01',
    serviceId: 's1',
    serviceName: 'ทำเล็บเจลพรีเมียม (Gel Manicure Art)',
    servicePrice: 690,
    serviceDuration: 60,
    staffId: 'st1',
    staffName: 'ช่างพลอย (Ploy)',
    date: getTodayString(),
    time: '13:00',
    customerName: 'คุณวริศรา เจริญสุข',
    customerPhone: '0812345678',
    customerEmail: 'warisara.demo@gmail.com',
    specialRequest: 'ขอโทนสีนู้ดชมพูธรรมชาติ',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'confirmed',
    paymentStatus: 'paid_slip',
    slipUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'BK-SEED-02',
    serviceId: 's3',
    serviceName: 'เฟเชียลทรีตเมนต์บำรุงล้ำลึก (Deep Glow Facial)',
    servicePrice: 1290,
    serviceDuration: 60,
    staffId: 'st2',
    staffName: 'ช่างเมย์ (May)',
    date: getTodayString(),
    time: '14:30',
    customerName: 'คุณธนภัทร วงศ์ษา',
    customerPhone: '0898765432',
    customerEmail: 'thanapat.demo@gmail.com',
    specialRequest: 'ผิวแพ้ง่าย ขอผลิตภัณฑ์สูตรอ่อนโยน',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'pending',
    paymentStatus: 'unpaid',
    slipUrl: '',
  },
];

// ================= REAL-TIME SERVER-SENT EVENTS (SSE) ENGINE =================
const sseClients = new Set();

/**
 * Broadcast an event to all connected Frontend and Admin clients in real-time
 */
function broadcastEvent(type, data = {}) {
  const payload = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  const message = `event: message\ndata: ${payload}\n\n`;

  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (err) {
      console.warn('[SSE Broadcast Warning]', err.message);
      sseClients.delete(client);
    }
  });
}

// SSE Heartbeat keep-alive every 20 seconds
setInterval(() => {
  sseClients.forEach((client) => {
    try {
      client.write(':keepalive\n\n');
    } catch (err) {
      sseClients.delete(client);
    }
  });
}, 20000);

// Helper: Call Google Apps Script Web App
async function callGas(action, data = {}, method = 'POST') {
  if (!gasConfig.webAppUrl) {
    return { success: false, reason: 'NO_GAS_URL' };
  }

  try {
    let response;
    if (method === 'GET') {
      const url = new URL(gasConfig.webAppUrl);
      url.searchParams.set('action', action);
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
      response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
      });
    } else {
      response = await fetch(gasConfig.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
        redirect: 'follow',
      });
    }

    const json = await response.json();
    return json;
  } catch (err) {
    console.warn('[GAS Call Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sync from Google Sheet and update in-memory stores
 */
async function syncFromGas(silent = false) {
  if (!gasConfig.webAppUrl) return { success: false, reason: 'NO_GAS_URL' };

  gasConfig.syncStatus = 'syncing';
  try {
    const result = await callGas('getAllData', {}, 'GET');
    if (result && result.success && result.data) {
      const { services: sheetServices, staff: sheetStaff, bookings: sheetBookings, settings: sheetSettings } = result.data;

      let changed = false;

      // 1. Sync Services if available
      if (Array.isArray(sheetServices) && sheetServices.length > 0) {
        services = sheetServices;
        changed = true;
      }

      // 2. Sync Staff if available
      if (Array.isArray(sheetStaff) && sheetStaff.length > 0) {
        staff = sheetStaff;
        changed = true;
      }

      // 3. Sync Bookings
      if (Array.isArray(sheetBookings) && sheetBookings.length > 0) {
        // Merge with local newly created bookings if any
        const sheetIds = new Set(sheetBookings.map((b) => b.id));
        const localRecent = bookings.filter((b) => !sheetIds.has(b.id));
        bookings = [...sheetBookings, ...localRecent];
        changed = true;
      }

      // 4. Sync Settings
      if (sheetSettings) {
        if (sheetSettings.PromptPayNumber) gasConfig.promptpayPhone = sheetSettings.PromptPayNumber;
        if (sheetSettings.ShopName) gasConfig.promptpayName = sheetSettings.ShopName;
        if (sheetSettings.OwnerEmail) gasConfig.ownerEmail = sheetSettings.OwnerEmail;
      }

      gasConfig.lastSyncAt = new Date().toISOString();
      gasConfig.syncStatus = 'synced';
      gasConfig.lastSyncError = null;
      saveDatabase();

      if (!silent || changed) {
        broadcastEvent('SHEET_SYNCED', {
          lastSyncAt: gasConfig.lastSyncAt,
          totalBookings: bookings.length,
          totalServices: services.length,
          totalStaff: staff.length,
        });
      }

      return { success: true, count: bookings.length };
    } else {
      // Fallback: Try getBookings only
      const bRes = await callGas('getBookings', {}, 'GET');
      if (bRes && bRes.success && Array.isArray(bRes.data)) {
        const sheetIds = new Set(bRes.data.map((b) => b.id));
        const localRecent = bookings.filter((b) => !sheetIds.has(b.id));
        bookings = [...bRes.data, ...localRecent];
        gasConfig.lastSyncAt = new Date().toISOString();
        gasConfig.syncStatus = 'synced';
        saveDatabase();
        broadcastEvent('SHEET_SYNCED', { lastSyncAt: gasConfig.lastSyncAt, totalBookings: bookings.length });
        return { success: true, count: bookings.length };
      }
      gasConfig.syncStatus = 'error';
      gasConfig.lastSyncError = 'Invalid response from Google Sheet';
      return { success: false, error: 'Invalid response from Google Sheet' };
    }
  } catch (err) {
    gasConfig.syncStatus = 'error';
    gasConfig.lastSyncError = err.message;
    console.warn('[Auto-sync from GAS failed]', err.message);
    return { success: false, error: err.message };
  }
}

// Background poller: Checks Google Sheets every 15 seconds for external edits
setInterval(() => {
  if (gasConfig.webAppUrl && gasConfig.autoSync) {
    syncFromGas(true).catch(() => {});
  }
}, 15000);

// ================= REAL-TIME STREAM ROUTE =================

// GET /api/realtime/stream - SSE connection for real-time bi-directional events
app.get('/api/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection event with current state
  const initPayload = JSON.stringify({
    type: 'CONNECTED',
    data: {
      clientCount: sseClients.size,
      gasConnected: Boolean(gasConfig.webAppUrl),
      lastSyncAt: gasConfig.lastSyncAt,
      servicesCount: services.length,
      staffCount: staff.length,
      bookingsCount: bookings.length,
    },
    timestamp: new Date().toISOString(),
  });
  res.write(`event: message\ndata: ${initPayload}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET /api/realtime/status - Check real-time engine status
app.get('/api/realtime/status', (req, res) => {
  res.json({
    success: true,
    connectedClients: sseClients.size,
    gasConfig: {
      connected: Boolean(gasConfig.webAppUrl),
      autoSync: gasConfig.autoSync,
      lastSyncAt: gasConfig.lastSyncAt,
      syncStatus: gasConfig.syncStatus,
      lastSyncError: gasConfig.lastSyncError,
    },
  });
});

// POST /api/gas/webhook - Webhook triggered by Google Sheet onEdit trigger
app.post('/api/gas/webhook', async (req, res) => {
  console.log('[Google Sheet Webhook Received]', req.body);
  const result = await syncFromGas(false);

  broadcastEvent('WEBHOOK_TRIGGERED', {
    event: req.body.event || 'SHEET_EDITED',
    sheetName: req.body.sheetName,
    syncResult: result,
  });

  res.json({ success: true, message: 'Webhook processed & Real-Time sync broadcasted', result });
});

// ================= API ROUTES =================

// GET /api/services
app.get('/api/services', (req, res) => {
  res.json({ success: true, data: services });
});

// POST /api/services - Add Service
app.post('/api/services', (req, res) => {
  const { name, category, durationMinutes, price, description, icon } = req.body;
  if (!name || !price) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อบริการและราคา' });
  }

  const newService = {
    id: `s${Date.now().toString(36)}`,
    name: String(name).trim(),
    category: category ? String(category).trim() : 'General',
    durationMinutes: Number(durationMinutes) || 60,
    price: Number(price) || 0,
    description: description ? String(description).trim() : '',
    icon: icon || 'Sparkles',
  };

  services.push(newService);
  saveDatabase();

  // Broadcast real-time update
  broadcastEvent('SERVICES_UPDATED', { services, action: 'add', item: newService });

  // Sync to GAS in background
  if (gasConfig.webAppUrl) {
    callGas('manageService', { subAction: 'add', service: newService }).catch(() => {});
  }

  res.status(201).json({ success: true, data: newService });
});

// PUT /api/services/:id - Update Service
app.put('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const idx = services.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'ไม่พบบริการที่ต้องการแก้ไข' });
  }

  const { name, category, durationMinutes, price, description, icon } = req.body;
  services[idx] = {
    ...services[idx],
    name: name ? String(name).trim() : services[idx].name,
    category: category ? String(category).trim() : services[idx].category,
    durationMinutes: durationMinutes ? Number(durationMinutes) : services[idx].durationMinutes,
    price: price !== undefined ? Number(price) : services[idx].price,
    description: description !== undefined ? String(description).trim() : services[idx].description,
    icon: icon || services[idx].icon,
  };
  saveDatabase();

  // Broadcast real-time update
  broadcastEvent('SERVICES_UPDATED', { services, action: 'update', item: services[idx] });

  // Sync to GAS
  if (gasConfig.webAppUrl) {
    callGas('manageService', { subAction: 'update', service: services[idx] }).catch(() => {});
  }

  res.json({ success: true, data: services[idx] });
});

// DELETE /api/services/:id - Delete Service
app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const idx = services.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'ไม่พบบริการที่ระบุ' });
  }

  const removed = services.splice(idx, 1)[0];
  saveDatabase();

  // Broadcast real-time update
  broadcastEvent('SERVICES_UPDATED', { services, action: 'delete', id });

  if (gasConfig.webAppUrl) {
    callGas('manageService', { subAction: 'delete', id }).catch(() => {});
  }

  res.json({ success: true, message: 'ลบบริการเรียบร้อยแล้ว', data: removed });
});

// GET /api/staff
app.get('/api/staff', (req, res) => {
  const { serviceId } = req.query;
  if (!serviceId) {
    return res.json({ success: true, data: staff });
  }
  const filtered = staff.filter((s) => s.services.includes(String(serviceId)));
  res.json({ success: true, data: filtered });
});

// POST /api/staff - Add Staff
app.post('/api/staff', (req, res) => {
  const { name, nickname, role, experience, avatar, services: stServices, bio } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อช่าง' });
  }

  const newStaff = {
    id: `st${Date.now().toString(36)}`,
    name: String(name).trim(),
    nickname: nickname ? String(nickname).trim() : '',
    role: role ? String(role).trim() : 'Therapist',
    experience: experience ? String(experience).trim() : '3 ปี',
    rating: 5.0,
    reviewsCount: 1,
    avatar: avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    services: Array.isArray(stServices) && stServices.length > 0 ? stServices : ['s1', 's2'],
    bio: bio ? String(bio).trim() : '',
  };

  staff.push(newStaff);
  saveDatabase();

  // Broadcast real-time update
  broadcastEvent('STAFF_UPDATED', { staff, action: 'add', item: newStaff });

  if (gasConfig.webAppUrl) {
    callGas('manageStaff', { subAction: 'add', staff: newStaff }).catch(() => {});
  }

  res.status(201).json({ success: true, data: newStaff });
});

// PUT /api/staff/:id - Update Staff
app.put('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'ไม่พบช่างที่ระบุ' });
  }

  const { name, nickname, role, experience, avatar, services: stServices, bio } = req.body;
  staff[idx] = {
    ...staff[idx],
    name: name ? String(name).trim() : staff[idx].name,
    nickname: nickname ? String(nickname).trim() : staff[idx].nickname,
    role: role ? String(role).trim() : staff[idx].role,
    experience: experience ? String(experience).trim() : staff[idx].experience,
    avatar: avatar || staff[idx].avatar,
    services: Array.isArray(stServices) ? stServices : staff[idx].services,
    bio: bio !== undefined ? String(bio).trim() : staff[idx].bio,
  };
  saveDatabase();

  // Broadcast real-time update
  broadcastEvent('STAFF_UPDATED', { staff, action: 'update', item: staff[idx] });

  if (gasConfig.webAppUrl) {
    callGas('manageStaff', { subAction: 'update', staff: staff[idx] }).catch(() => {});
  }

  res.json({ success: true, data: staff[idx] });
});

// DELETE /api/staff/:id - Delete Staff
app.delete('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'ไม่พบช่างที่ระบุ' });
  }

  const removed = staff.splice(idx, 1)[0];
  saveDatabase();

  // Broadcast real-time update
  broadcastEvent('STAFF_UPDATED', { staff, action: 'delete', id });

  if (gasConfig.webAppUrl) {
    callGas('manageStaff', { subAction: 'delete', id }).catch(() => {});
  }

  res.json({ success: true, message: 'ลบข้อมูลช่างเรียบร้อยแล้ว', data: removed });
});

// GET /api/availability
app.get('/api/availability', (req, res) => {
  const { staffId, date } = req.query;

  if (!staffId || !date) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุ staffId และ date (YYYY-MM-DD)',
    });
  }

  const staffMember = staff.find((s) => s.id === String(staffId));
  if (!staffMember) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลช่างที่ระบุ' });
  }

  const bookedSlots = bookings
    .filter(
      (b) =>
        b.staffId === String(staffId) &&
        b.date === String(date) &&
        b.status !== 'cancelled'
    )
    .map((b) => b.time);

  const availableSlots = STANDARD_SLOTS.filter((slot) => !bookedSlots.includes(slot));

  res.json({
    success: true,
    data: {
      staffId: String(staffId),
      staffName: staffMember.name,
      date: String(date),
      allSlots: STANDARD_SLOTS,
      bookedSlots,
      availableSlots,
    },
  });
});

// POST /api/bookings - สร้างการจอง บันทึกลง Google Sheet / Drive / Calendar / Email + Broadcast Real-time
app.post('/api/bookings', async (req, res) => {
  const {
    serviceId,
    staffId,
    date,
    time,
    customerName,
    customerPhone,
    customerEmail,
    specialRequest,
    slipBase64,
    slipUrl,
  } = req.body;

  if (!serviceId || !staffId || !date || !time || !customerName || !customerPhone) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (บริการ, ช่าง, วัน, เวลา, ชื่อ และเบอร์โทรศัพท์)',
    });
  }

  const trimmedName = String(customerName).trim();
  const trimmedPhone = String(customerPhone).trim().replace(/[\s-]/g, '');

  if (trimmedName.length < 2) {
    return res.status(400).json({ success: false, error: 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร' });
  }

  if (trimmedPhone.length < 9 || trimmedPhone.length > 12 || !/^\d+$/.test(trimmedPhone)) {
    return res.status(400).json({ success: false, error: 'เบอร์โทรศัพท์ไม่ถูกต้อง (9-10 หลัก)' });
  }

  const selectedService = services.find((s) => s.id === String(serviceId));
  if (!selectedService) {
    return res.status(404).json({ success: false, error: 'ไม่พบบริการที่เลือก' });
  }

  const selectedStaff = staff.find((st) => st.id === String(staffId));
  if (!selectedStaff) {
    return res.status(404).json({ success: false, error: 'ไม่พบช่างที่เลือก' });
  }

  // Conflict check
  const isConflict = bookings.some(
    (b) =>
      b.staffId === String(staffId) &&
      b.date === String(date) &&
      b.time === String(time) &&
      b.status !== 'cancelled'
  );

  if (isConflict) {
    return res.status(409).json({
      success: false,
      error: `ขออภัย ช่าง ${selectedStaff.name} มีคิวการจองในวันที่ ${date} เวลา ${time} น. แล้ว กรุณาเลือกเวลาอื่น`,
    });
  }

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const bookingId = `BLM-${timestampSuffix}${randomSuffix}`;

  const hasSlip = Boolean(slipBase64 || slipUrl);

  const newBooking = {
    id: bookingId,
    serviceId: selectedService.id,
    serviceName: selectedService.name,
    servicePrice: selectedService.price,
    serviceDuration: selectedService.durationMinutes,
    staffId: selectedStaff.id,
    staffName: selectedStaff.name,
    staffAvatar: selectedStaff.avatar,
    date: String(date),
    time: String(time),
    customerName: trimmedName,
    customerPhone: trimmedPhone,
    customerEmail: customerEmail ? String(customerEmail).trim() : '',
    lineUserId: req.body.lineUserId ? String(req.body.lineUserId).trim() : null,
    lineDisplayName: req.body.lineDisplayName ? String(req.body.lineDisplayName).trim() : null,
    specialRequest: specialRequest ? String(specialRequest).trim() : '',
    paymentStatus: hasSlip ? 'paid_slip' : 'unpaid',
    slipUrl: slipUrl || (slipBase64 ? 'Processing Google Drive Upload...' : ''),
    calendarEventId: '',
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  // Add to local memory first for instant response
  bookings.push(newBooking);
  saveDatabase();

  // Broadcast Real-time event immediately so all connected clients see slot booked & admin sees queue
  broadcastEvent('BOOKING_CREATED', { booking: newBooking });
  broadcastEvent('AVAILABILITY_CHANGED', { staffId: selectedStaff.id, date });

  // Send to Google Apps Script Web App (Sheets + Drive + Calendar + Email)
  let gasResult = null;
  if (gasConfig.webAppUrl) {
    try {
      gasResult = await callGas('createBooking', {
        ...newBooking,
        slipBase64: slipBase64 || undefined,
      });

      if (gasResult && gasResult.success && gasResult.booking) {
        // Update local booking with Google Drive slip URL and Calendar Event ID
        const idx = bookings.findIndex((b) => b.id === bookingId);
        if (idx !== -1) {
          if (gasResult.booking.slipUrl) {
            bookings[idx].slipUrl = gasResult.booking.slipUrl;
          }
          if (gasResult.booking.calendarEventId) {
            bookings[idx].calendarEventId = gasResult.booking.calendarEventId;
          }
          saveDatabase();
          broadcastEvent('BOOKING_UPDATED', { booking: bookings[idx] });
        }
      }
    } catch (gasErr) {
      console.warn('Failed to forward booking to Google Apps Script:', gasErr);
    }
  }

  const finalBooking = bookings.find((b) => b.id === bookingId) || newBooking;

  res.status(201).json({
    success: true,
    message: 'จองคิวสำเร็จ เรียบร้อยแล้ว',
    booking: finalBooking,
    googleSync: {
      synced: Boolean(gasResult?.success),
      gasUrlConfigured: Boolean(gasConfig.webAppUrl),
      calendarSynced: Boolean(finalBooking.calendarEventId),
      driveSlipCreated: Boolean(finalBooking.slipUrl && finalBooking.slipUrl.startsWith('http')),
    },
  });
});

// GET /api/bookings
app.get('/api/bookings', (req, res) => {
  const { phone, lineUserId, status } = req.query;
  let result = bookings;

  if (lineUserId) {
    result = result.filter((b) => b.lineUserId === String(lineUserId).trim());
  } else if (phone) {
    const cleanPhone = String(phone).trim().replace(/[\s-]/g, '');
    result = result.filter((b) => b.customerPhone === cleanPhone);
  }

  if (status && status !== 'all') {
    result = result.filter((b) => b.status === status);
  }

  // Calculate anti-collision warning flag for each booking
  const enrichedBookings = result.map((b) => {
    if (b.status === 'cancelled') return { ...b, hasConflict: false };
    const hasConflict = bookings.some(
      (other) =>
        other.id !== b.id &&
        other.status !== 'cancelled' &&
        other.staffId === b.staffId &&
        other.date === b.date &&
        other.time === b.time
    );
    return { ...b, hasConflict };
  });

  res.json({
    success: true,
    data: [...enrichedBookings].reverse(),
  });
});

// PUT /api/bookings/:id/reschedule - เลื่อนคิวการจอง (Reschedule with Anti-Collision Check)
app.put('/api/bookings/:id/reschedule', async (req, res) => {
  const { id } = req.params;
  const { date, time, staffId } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'ไม่พบรายการจองนี้' });
  }

  if (!date || !time) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุวันที่และเวลาใหม่' });
  }

  const targetStaffId = staffId ? String(staffId) : booking.staffId;
  const targetStaff = staff.find((s) => s.id === targetStaffId);

  // Anti-Collision Check: Check if slot is already booked for this staff
  const isConflict = bookings.some(
    (b) =>
      b.id !== id &&
      b.staffId === targetStaffId &&
      b.date === String(date) &&
      b.time === String(time) &&
      b.status !== 'cancelled'
  );

  if (isConflict) {
    return res.status(409).json({
      success: false,
      error: `ขออภัย ช่าง ${targetStaff ? targetStaff.name : 'ที่เลือก'} มีคิวการจองในวันที่ ${date} เวลา ${time} น. แล้ว (คิวซ้ำซ้อน)`,
    });
  }

  const oldStaffId = booking.staffId;
  const oldDate = booking.date;

  booking.date = String(date);
  booking.time = String(time);
  if (targetStaff) {
    booking.staffId = targetStaff.id;
    booking.staffName = targetStaff.name;
    booking.staffAvatar = targetStaff.avatar;
  }
  saveDatabase();

  // Broadcast Real-time event
  broadcastEvent('BOOKING_UPDATED', { booking, action: 'reschedule' });
  broadcastEvent('AVAILABILITY_CHANGED', { staffId: oldStaffId, date: oldDate });
  broadcastEvent('AVAILABILITY_CHANGED', { staffId: booking.staffId, date: booking.date });

  // Sync to Google Sheet via Apps Script
  if (gasConfig.webAppUrl) {
    callGas('rescheduleBooking', {
      id,
      date: booking.date,
      time: booking.time,
      staffName: booking.staffName,
    }).catch(() => {});
  }

  res.json({
    success: true,
    message: 'เลื่อนคิวการจองสำเร็จ',
    booking,
  });
});

// POST /api/bookings/:id/slip - แนบสลิปการโอนเงิน (Upload Slip & Save to Google Drive + Email Alert)
app.post('/api/bookings/:id/slip', async (req, res) => {
  const { id } = req.params;
  const { slipBase64, customerName } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'ไม่พบรายการจองนี้' });
  }

  if (!slipBase64) {
    return res.status(400).json({ success: false, error: 'กรุณาแนบไฟล์สลิป (Base64)' });
  }

  booking.paymentStatus = 'paid_slip';
  booking.slipUrl = 'Processing Google Drive Upload...';
  saveDatabase();

  // Broadcast immediate update
  broadcastEvent('BOOKING_UPDATED', { booking, action: 'slip_uploaded' });

  // Forward to Google Apps Script for Drive storage & Admin Email notification
  if (gasConfig.webAppUrl) {
    try {
      const gasResult = await callGas('uploadSlip', {
        bookingId: id,
        slipBase64,
        customerName: customerName || booking.customerName,
      });

      if (gasResult && gasResult.success && gasResult.slipUrl) {
        booking.slipUrl = gasResult.slipUrl;
        saveDatabase();
        broadcastEvent('BOOKING_UPDATED', { booking, action: 'slip_drive_saved' });
      }
    } catch (gasErr) {
      console.warn('Failed to forward slip to Google Apps Script:', gasErr);
    }
  }

  res.json({
    success: true,
    message: 'ส่งสลิปเรียบร้อย รอการตรวจสอบ',
    booking,
  });
});

// PATCH /api/bookings/:id/status - อัปเดตสถานะการจอง (pending, confirmed, completed, cancelled)
app.patch('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'ไม่พบรายการจองนี้' });
  }

  if (status) booking.status = status;
  if (paymentStatus) booking.paymentStatus = paymentStatus;
  saveDatabase();

  // Broadcast real-time update to all clients
  broadcastEvent('BOOKING_UPDATED', { booking });
  broadcastEvent('AVAILABILITY_CHANGED', { staffId: booking.staffId, date: booking.date });

  // Sync to Google Sheet
  if (gasConfig.webAppUrl) {
    callGas('updateBookingStatus', { id, status: booking.status, paymentStatus: booking.paymentStatus }).catch(() => {});
  }

  res.json({
    success: true,
    message: `อัปเดตสถานะเป็น ${booking.status} สำเร็จ`,
    booking,
  });
});

// DELETE /api/bookings/:id - ยกเลิกหรือลบการจองออกจากระบบ & Google Sheet
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;
  const bookingIndex = bookings.findIndex((b) => b.id === id);

  if (bookingIndex === -1) {
    return res.status(404).json({ success: false, error: 'ไม่พบรายการจองนี้ในระบบ' });
  }

  let updated;
  if (permanent === 'true') {
    updated = bookings.splice(bookingIndex, 1)[0];
    saveDatabase();
    if (gasConfig.webAppUrl) {
      callGas('deleteBooking', { id }).catch(() => {});
    }
  } else {
    bookings[bookingIndex].status = 'cancelled';
    updated = bookings[bookingIndex];
    saveDatabase();
    if (gasConfig.webAppUrl) {
      callGas('cancelBooking', { id }).catch(() => {});
    }
  }

  // Broadcast real-time update
  broadcastEvent('BOOKING_CANCELLED', { booking: updated, permanent: permanent === 'true' });
  broadcastEvent('AVAILABILITY_CHANGED', { staffId: updated.staffId, date: updated.date });

  res.json({
    success: true,
    message: permanent === 'true' ? 'ลบรายการจองออกจาก Google Sheet เรียบร้อยแล้ว' : 'ยกเลิกการจองเรียบร้อยแล้ว',
    booking: updated,
  });
});

// GET /api/admin/overview - สรุปภาพรวม Dashboard
app.get('/api/admin/overview', (req, res) => {
  const today = getTodayString();

  // Filter today bookings
  const todayBookings = bookings.filter((b) => b.date === today && b.status !== 'cancelled');

  // Calculate 7-day range (this week)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekBookings = bookings.filter((b) => {
    const bDate = new Date(b.date);
    return bDate >= sevenDaysAgo && b.status !== 'cancelled';
  });

  // Estimated Revenue (confirmed or completed or paid_slip)
  const estimatedRevenue = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed' || b.paymentStatus === 'paid_slip')
    .reduce((sum, b) => sum + (Number(b.servicePrice) || 0), 0);

  const todayRevenue = todayBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (Number(b.servicePrice) || 0), 0);

  // Status distribution
  const statusCounts = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  // Staff queue count
  const staffCounts = {};
  staff.forEach((st) => {
    staffCounts[st.id] = {
      staffId: st.id,
      name: st.name,
      avatar: st.avatar,
      count: 0,
      totalRevenue: 0,
    };
  });

  bookings.forEach((b) => {
    if (b.status !== 'cancelled' && staffCounts[b.staffId]) {
      staffCounts[b.staffId].count += 1;
      staffCounts[b.staffId].totalRevenue += Number(b.servicePrice || 0);
    }
  });

  const staffRanking = Object.values(staffCounts).sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: {
      todayDate: today,
      todayCount: todayBookings.length,
      todayRevenue,
      weekCount: weekBookings.length,
      totalBookings: bookings.length,
      estimatedRevenue,
      statusCounts,
      busiestStaff: staffRanking[0] || null,
      staffRanking,
    },
  });
});

// GET /api/admin/customers - รายการประวัติลูกค้า
app.get('/api/admin/customers', (req, res) => {
  const customerMap = {};

  bookings.forEach((b) => {
    const phone = b.customerPhone || 'unknown';
    if (!customerMap[phone]) {
      customerMap[phone] = {
        phone,
        name: b.customerName,
        email: b.customerEmail || '',
        lineUserId: b.lineUserId || '',
        lineDisplayName: b.lineDisplayName || '',
        totalBookings: 0,
        totalSpent: 0,
        lastVisitDate: b.date,
        history: [],
      };
    }

    customerMap[phone].totalBookings += 1;
    if (b.status !== 'cancelled') {
      customerMap[phone].totalSpent += Number(b.servicePrice || 0);
    }

    if (new Date(b.date) > new Date(customerMap[phone].lastVisitDate)) {
      customerMap[phone].lastVisitDate = b.date;
      customerMap[phone].name = b.customerName; // latest name
    }

    customerMap[phone].history.push(b);
  });

  const customerList = Object.values(customerMap).sort((a, b) => b.totalBookings - a.totalBookings);

  res.json({
    success: true,
    data: customerList,
  });
});

// GET /api/gas/config - ดึงการตั้งค่า Google Apps Script
app.get('/api/gas/config', (req, res) => {
  res.json({
    success: true,
    config: {
      ...gasConfig,
      adminPin: '****',
    },
  });
});

// POST /api/gas/config - บันทึกการตั้งค่า Google Apps Script
app.post('/api/gas/config', async (req, res) => {
  const { webAppUrl, ownerEmail, promptpayPhone, promptpayName, adminPin, autoSync } = req.body;

  if (webAppUrl !== undefined) gasConfig.webAppUrl = String(webAppUrl).trim();
  if (ownerEmail !== undefined) gasConfig.ownerEmail = String(ownerEmail).trim();
  if (promptpayPhone !== undefined) gasConfig.promptpayPhone = String(promptpayPhone).trim();
  if (promptpayName !== undefined) gasConfig.promptpayName = String(promptpayName).trim();
  if (autoSync !== undefined) gasConfig.autoSync = Boolean(autoSync);
  if (adminPin && String(adminPin).length >= 4) gasConfig.adminPin = String(adminPin).trim();

  saveDatabase();

  // If new webAppUrl set, trigger initial sync
  if (webAppUrl) {
    syncFromGas(true).catch(() => {});
  }

  broadcastEvent('CONFIG_UPDATED', {
    gasConfig: { ...gasConfig, adminPin: '****' },
  });

  res.json({
    success: true,
    message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว',
    config: {
      ...gasConfig,
      adminPin: '****',
    },
  });
});

// POST /api/gas/test - ทดสอบการเชื่อมต่อ Google Apps Script Web App
app.post('/api/gas/test', async (req, res) => {
  const targetUrl = req.body.webAppUrl || gasConfig.webAppUrl;
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุ Web App URL เพื่อทดสอบ' });
  }

  try {
    const testRes = await fetch(`${targetUrl}?action=ping`, { redirect: 'follow' });
    const testJson = await testRes.json();
    res.json({
      success: true,
      message: 'เชื่อมต่อ Google Apps Script Web App สำเร็จ!',
      gasResponse: testJson,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `ไม่สามารถเชื่อมต่อได้: ${err.message}. กรุณาตรวจสอบว่าตั้งค่า "Who has access" เป็น "Anyone" หรือยัง`,
    });
  }
});

// POST /api/gas/init-sheet - สั่งสร้างชีตและคอลัมน์อัตโนมัติบน Google Sheet
app.post('/api/gas/init-sheet', async (req, res) => {
  if (!gasConfig.webAppUrl) {
    return res.status(400).json({ success: false, error: 'ยังไม่ได้ตั้งค่า Web App URL' });
  }

  try {
    const result = await callGas('initSheet', {}, 'POST');
    // After init, pull fresh data
    await syncFromGas(true);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/gas/code - ดึงโค้ด Code.gs เพื่อให้นำไปคัดลอกลง Google Apps Script ได้ใน 1 คลิก
app.get('/api/gas/code', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'gas', 'Code.gs');
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf-8');
      return res.json({ success: true, code });
    }
    res.status(404).json({ success: false, error: 'Code.gs not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/gas/sync - ดึงข้อมูลล่าสุดจาก Google Sheet มาอัปเดต In-Memory Database (1-Click Pull)
app.post('/api/gas/sync', async (req, res) => {
  if (!gasConfig.webAppUrl) {
    return res.json({ success: true, message: 'ใช้ระบบ In-memory ปกติ (ยังไม่ได้ตั้งค่า Web App URL)', synced: false });
  }

  const result = await syncFromGas(false);
  if (result.success) {
    return res.json({
      success: true,
      message: `ซิงค์ข้อมูลจาก Google Sheet สำเร็จ (${result.count} รายการ)`,
      total: bookings.length,
      synced: true,
      lastSyncAt: gasConfig.lastSyncAt,
    });
  }

  res.status(500).json({ success: false, error: result.error || 'ไม่สามารถซิงค์ข้อมูลได้' });
});

// POST /api/gas/push-all - ส่งข้อมูลทั้งหมดในระบบขึ้น Google Sheet (1-Click Full Push)
app.post('/api/gas/push-all', async (req, res) => {
  if (!gasConfig.webAppUrl) {
    return res.status(400).json({ success: false, error: 'ยังไม่ได้ตั้งค่า Web App URL' });
  }

  try {
    const result = await callGas('syncAllData', {
      services,
      staff,
      bookings,
    }, 'POST');

    gasConfig.lastSyncAt = new Date().toISOString();
    broadcastEvent('SHEET_SYNCED', { lastSyncAt: gasConfig.lastSyncAt, source: 'push-all' });

    res.json({
      success: true,
      message: 'ส่งข้อมูลทั้งหมด (Services, Staff, Bookings) ขึ้น Google Sheet สำเร็จสมบูรณ์',
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GOOGLE WORKSPACE 1-CLICK ENDPOINTS =================

// GET /api/workspace/config - ดึงสถานะ Google Workspace Integration
app.get('/api/workspace/config', (req, res) => {
  res.json({
    success: true,
    config: workspaceConfig,
  });
});

// POST /api/workspace/config - บันทึกผลการเชื่อมต่อ 1-Click
app.post('/api/workspace/config', (req, res) => {
  const { spreadsheetId, spreadsheetUrl, driveFolderId, connectedEmail } = req.body;
  if (spreadsheetId) workspaceConfig.spreadsheetId = String(spreadsheetId).trim();
  if (spreadsheetUrl) workspaceConfig.spreadsheetUrl = String(spreadsheetUrl).trim();
  if (driveFolderId) workspaceConfig.driveFolderId = String(driveFolderId).trim();
  if (connectedEmail) workspaceConfig.connectedEmail = String(connectedEmail).trim();
  workspaceConfig.connectedAt = new Date().toISOString();
  workspaceConfig.lastSyncAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'บันทึกสถานะ Google Workspace สำเร็จ',
    config: workspaceConfig,
  });
});

// GET /api/workspace/export-data - ดึงข้อมูลทั้งหมดของร้านเพื่อซิงค์ขึ้น Google Sheet ใน 1 คลิก
app.get('/api/workspace/export-data', (req, res) => {
  res.json({
    success: true,
    data: {
      services,
      staff,
      bookings,
    },
  });
});

// POST /api/admin/login - ตรวจสอบรหัส PIN แอดมิน
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (String(pin).trim() === gasConfig.adminPin) {
    return res.json({ success: true, message: 'ยินดีต้อนรับเข้าสู่ระบบจัดการหลังบ้าน' });
  }
  res.status(401).json({ success: false, error: 'รหัส PIN ไม่ถูกต้อง (ค่าเริ่มต้นคือ 1234)' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'The Bloom Studio',
    gasConnected: Boolean(gasConfig.webAppUrl),
    realtimeClients: sseClients.size,
    lastSyncAt: gasConfig.lastSyncAt,
    timestamp: new Date(),
  });
});

// ================= VITE INTEGRATION =================
async function startServer() {
  // Load persistent database from disk on startup
  loadDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initial sync on startup if gas URL is set
  if (gasConfig.webAppUrl) {
    syncFromGas(true).catch(() => {});
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 The Bloom Studio server running on http://0.0.0.0:${PORT}`);
    console.log(`⚡ Real-Time SSE Stream active on http://0.0.0.0:${PORT}/api/realtime/stream`);
  });
}

startServer();
