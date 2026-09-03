/**
 * Google Workspace Service (Client-Side Direct Integration)
 * รองรับ Google Sheets API v4, Google Drive API v3, Google Calendar API v3
 * เชื่อมต่อด้วย Google Identity Services (GSI) ตามมาตรฐาน Google AI Studio
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const GOOGLE_CLIENT_ID =
  firebaseConfig?.oAuthClientId ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '799216805502-itm6ejopfl5qbdkbmil7h6kmgpv2e37g.apps.googleusercontent.com';

// Initialize Firebase App instance safely
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

// Memory cache for access token
let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * ดึง Access Token ปัจจุบันที่ยังไม่หมดอายุ
 */
export function getCachedToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }
  const stored = localStorage.getItem('bloom_google_access_token');
  const storedExp = Number(localStorage.getItem('bloom_google_token_exp') || 0);
  if (stored && Date.now() < storedExp) {
    cachedAccessToken = stored;
    tokenExpiresAt = storedExp;
    return stored;
  }
  return null;
}

/**
 * บันทึก Access Token
 */
export function setCachedToken(token, expiresInSeconds = 3600) {
  cachedAccessToken = token;
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000 - 60000; // ลบ 1 นาทีก่อนหมดอายุ
  localStorage.setItem('bloom_google_access_token', token);
  localStorage.setItem('bloom_google_token_exp', String(tokenExpiresAt));
}

/**
 * ล้าง Token เมื่อ Logout
 */
export function clearCachedToken() {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
  localStorage.removeItem('bloom_google_access_token');
  localStorage.removeItem('bloom_google_token_exp');
  signOut(auth).catch(() => {});
}

/**
 * ตรวจสอบความพร้อมของ Google Identity Services (GSI)
 */
export function isGsiLoaded() {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.oauth2);
}

/**
 * ขอ Token ผ่าน Firebase Auth GoogleAuthProvider (หรือ GSI Fallback)
 */
export async function requestGoogleAccessToken() {
  // Strategy 1: Firebase Auth GoogleAuthProvider (Official AI Studio Pattern)
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'offline',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedToken(credential.accessToken, 3600);
      return {
        accessToken: credential.accessToken,
        user: result.user,
        expiresIn: 3600,
      };
    }
  } catch (fbErr) {
    console.warn('[Firebase Auth signInWithPopup]', fbErr);
    // If the user deliberately closed the popup window
    if (fbErr.code === 'auth/popup-closed-by-user' || fbErr.code === 'auth/cancelled-popup-request') {
      throw new Error('การเข้าสู่ระบบถูกยกเลิก กรุณากดปุ่มเพื่อลองใหม่อีกครั้ง');
    }
    // If domain not authorized yet in Firebase, fall back to GSI token client
  }

  // Strategy 2: Google Identity Services (GSI) tokenClient
  const effectiveClientId =
    firebaseConfig?.oAuthClientId ||
    GOOGLE_CLIENT_ID ||
    '799216805502-itm6ejopfl5qbdkbmil7h6kmgpv2e37g.apps.googleusercontent.com';

  if (isGsiLoaded() && effectiveClientId) {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: effectiveClientId,
          scope: REQUIRED_SCOPES,
          prompt: 'consent',
          callback: (response) => {
            if (response.error) {
              console.error('[GSI Error]', response);
              return reject(new Error(response.error_description || response.error));
            }
            if (response.access_token) {
              const expiresIn = Number(response.expires_in) || 3600;
              setCachedToken(response.access_token, expiresIn);
              resolve({
                accessToken: response.access_token,
                expiresIn,
              });
            } else {
              reject(new Error('ไม่ได้รับ Access Token จาก Google'));
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  throw new Error('ไม่สามารถเชื่อมต่อ Google ได้ กรุณาลองใหม่อีกครั้ง');
}

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้ Google (เช่น อีเมล)
 */
export async function fetchGoogleUserProfile(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[Fetch UserProfile Failed]', err);
    return null;
  }
}

/**
 * 1-Click: สร้าง Google Sheet ที่มีโครงสร้าง Tab ครบถ้วนทันที
 * - Bookings
 * - Services
 * - Staff
 * - Customers
 * - Settings
 */
export async function createFullStudioSpreadsheet(token, initialData = {}) {
  const { services = [], staff = [], bookings = [] } = initialData;

  // 1. สร้าง Spreadsheet พร้อม Tab ทั้ง 5 แผ่น
  const createPayload = {
    properties: {
      title: 'The Bloom Studio - ระบบฐานข้อมูลและการจอง (Cloud Database)',
      locale: 'th_TH',
      timeZone: 'Asia/Bangkok',
    },
    sheets: [
      { properties: { title: 'Bookings', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Services', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Staff', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Customers', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Settings', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || 'ไม่สามารถสร้าง Google Sheet ได้');
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. เติมหัวตาราง (Headers) และข้อมูลเริ่มต้นให้กับทุก Tab
  const bookingHeaders = [
    'Booking ID',
    'Created At',
    'Status',
    'Date',
    'Time',
    'Service Name',
    'Service Price (THB)',
    'Duration (Mins)',
    'Staff Name',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Special Request',
    'Payment Status',
    'Payment Slip URL',
    'Calendar Event ID',
    'LINE User ID',
    'LINE Display Name',
  ];

  const bookingRows = bookings.map((b) => [
    b.id || '',
    b.createdAt || new Date().toISOString(),
    b.status || 'pending',
    b.date || '',
    b.time || '',
    b.serviceName || '',
    b.servicePrice || 0,
    b.serviceDuration || 60,
    b.staffName || '',
    b.customerName || '',
    b.customerPhone || '',
    b.customerEmail || '',
    b.specialRequest || '',
    b.paymentStatus || 'unpaid',
    b.slipUrl || '',
    b.calendarEventId || '',
    b.lineUserId || '',
    b.lineDisplayName || '',
  ]);

  const serviceHeaders = [
    'Service ID',
    'Service Name',
    'Category',
    'Duration (Mins)',
    'Price (THB)',
    'Description',
    'Active Status',
  ];

  const serviceRows = services.map((s) => [
    s.id,
    s.name,
    s.category || 'General',
    s.durationMinutes || 60,
    s.price || 0,
    s.description || '',
    'Active',
  ]);

  const staffHeaders = [
    'Staff ID',
    'Staff Name',
    'Nickname',
    'Role',
    'Experience',
    'Rating',
    'Reviews Count',
    'Services Handled',
    'Bio',
  ];

  const staffRows = staff.map((st) => [
    st.id,
    st.name,
    st.nickname || '',
    st.role || '',
    st.experience || '',
    st.rating || 5.0,
    st.reviewsCount || 0,
    Array.isArray(st.services) ? st.services.join(', ') : '',
    st.bio || '',
  ]);

  const customerHeaders = [
    'Customer Phone',
    'Customer Name',
    'Customer Email',
    'Total Bookings',
    'Total Spent (THB)',
    'Last Visit Date',
    'LINE User ID',
  ];

  // รวบรวม Customer data
  const customerMap = {};
  bookings.forEach((b) => {
    const ph = b.customerPhone || 'unknown';
    if (!customerMap[ph]) {
      customerMap[ph] = {
        phone: ph,
        name: b.customerName,
        email: b.customerEmail || '',
        count: 0,
        spent: 0,
        lastDate: b.date,
        lineId: b.lineUserId || '',
      };
    }
    customerMap[ph].count += 1;
    if (b.status !== 'cancelled') {
      customerMap[ph].spent += Number(b.servicePrice || 0);
    }
    if (b.date > customerMap[ph].lastDate) {
      customerMap[ph].lastDate = b.date;
      customerMap[ph].name = b.customerName;
    }
  });

  const customerRows = Object.values(customerMap).map((c) => [
    c.phone,
    c.name,
    c.email,
    c.count,
    c.spent,
    c.lastDate,
    c.lineId,
  ]);

  const settingsHeaders = ['Key', 'Value', 'Description'];
  const settingsRows = [
    ['Store Name', 'The Bloom Studio', 'ชื่อร้าน'],
    ['Owner Email', 'NatapongMumklang@gmail.com', 'อีเมลเจ้าของร้านสำหรับรับแจ้งเตือน'],
    ['PromptPay Phone', '0812345678', 'เบอร์พร้อมเพย์รับชำระเงิน'],
    ['PromptPay Name', 'The Bloom Studio', 'ชื่อบัญชีพร้อมเพย์'],
    ['Created At', new Date().toISOString(), 'วันเวลาที่สร้างชีต'],
    ['Version', '2.0.0 (Direct Workspace Cloud)', 'เวอร์ชันระบบ'],
  ];

  // 3. ใส่ข้อมูลผ่าน values.batchUpdate
  const valuePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Bookings!A1',
        values: [bookingHeaders, ...bookingRows],
      },
      {
        range: 'Services!A1',
        values: [serviceHeaders, ...serviceRows],
      },
      {
        range: 'Staff!A1',
        values: [staffHeaders, ...staffRows],
      },
      {
        range: 'Customers!A1',
        values: [customerHeaders, ...customerRows],
      },
      {
        range: 'Settings!A1',
        values: [settingsHeaders, ...settingsRows],
      },
    ],
  };

  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(valuePayload),
    }
  );

  if (!valuesRes.ok) {
    console.warn('[Sheet Values BatchUpdate Error]', await valuesRes.text());
  }

  // 4. จัดสไตล์หัวตารางให้สวยงาม (Rose Gold Theme `#E8D5C8` / Bold text)
  try {
    const formatRequests = spreadsheet.sheets.map((s) => ({
      repeatCell: {
        range: {
          sheetId: s.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.93, green: 0.84, blue: 0.8 }, // Rose Gold tint
            textFormat: {
              foregroundColor: { red: 0.25, green: 0.18, blue: 0.15 },
              fontSize: 10,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatRequests }),
      }
    );
  } catch (formatErr) {
    console.warn('[Format Styling Ignored]', formatErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    sheets: spreadsheet.sheets.map((s) => s.properties.title),
  };
}

/**
 * สร้างหรือค้นหาโฟลเดอร์สำหรับเก็บสลิปใน Google Drive
 */
export async function getOrCreateDriveFolder(token, folderName = 'Bloom_Studio_Slips') {
  try {
    // 1. ตรวจสอบว่ามีโฟลเดอร์นี้อยู่แล้วหรือไม่
    const query = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0];
      }
    }

    // 2. สร้างโฟลเดอร์ใหม่
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const folder = await createRes.json();
      return folder;
    }
    return null;
  } catch (err) {
    console.warn('[Get/Create Drive Folder Error]', err);
    return null;
  }
}

/**
 * อัปโหลดรูปภาพสลิป Base64 ไปยัง Google Drive
 */
export async function uploadSlipImageToDrive(token, base64Data, fileName, folderId = null) {
  if (!base64Data || !token) return null;

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const metadata = {
      name: fileName || `slip_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', blob);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      console.warn('[Drive Upload Failed]', await uploadRes.text());
      return null;
    }

    const file = await uploadRes.json();

    // กำหนดสิทธิ์ให้ผู้มีลิงก์ดูได้ (Reader)
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      );
    } catch (permErr) {
      console.warn('[Drive Permission Warning]', permErr);
    }

    return file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
  } catch (err) {
    console.error('[Upload Slip Error]', err);
    return null;
  }
}

/**
 * เพิ่มแถวการจองใหม่ลงใน Google Sheet 'Bookings'
 */
export async function appendBookingRowToSheet(token, spreadsheetId, booking) {
  if (!token || !spreadsheetId || !booking) return false;

  try {
    const row = [
      booking.id || '',
      booking.createdAt || new Date().toISOString(),
      booking.status || 'pending',
      booking.date || '',
      booking.time || '',
      booking.serviceName || '',
      booking.servicePrice || 0,
      booking.serviceDuration || 60,
      booking.staffName || '',
      booking.customerName || '',
      booking.customerPhone || '',
      booking.customerEmail || '',
      booking.specialRequest || '',
      booking.paymentStatus || 'unpaid',
      booking.slipUrl || '',
      booking.calendarEventId || '',
      booking.lineUserId || '',
      booking.lineDisplayName || '',
    ];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bookings!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    return res.ok;
  } catch (err) {
    console.warn('[Append Booking To Sheet Failed]', err);
    return false;
  }
}

/**
 * อัปเดตสถานะการจองในแถว Google Sheet
 */
export async function updateBookingInSheet(token, spreadsheetId, bookingId, newStatus, newPaymentStatus) {
  if (!token || !spreadsheetId || !bookingId) return false;

  try {
    // 1. ดึงคอลัมน์ A (Booking IDs)
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bookings!A:C`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!getRes.ok) return false;

    const data = await getRes.json();
    const rows = data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === bookingId);
    if (rowIndex === -1) return false;

    const rowNumber = rowIndex + 1; // 1-indexed

    // อัปเดตคอลัมน์ C (Status)
    if (newStatus) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bookings!C${rowNumber}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [[newStatus]] }),
        }
      );
    }

    // อัปเดตคอลัมน์ N (Payment Status)
    if (newPaymentStatus) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bookings!N${rowNumber}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [[newPaymentStatus]] }),
        }
      );
    }

    return true;
  } catch (err) {
    console.warn('[Update Booking In Sheet Error]', err);
    return false;
  }
}

/**
 * สร้างการนัดหมายบน Google Calendar
 */
export async function createGoogleCalendarEvent(token, booking) {
  if (!token || !booking) return null;

  try {
    const duration = Number(booking.serviceDuration) || 60;
    const [hours, minutes] = String(booking.time).split(':').map(Number);
    const startDate = new Date(`${booking.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+07:00`);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const eventPayload = {
      summary: `[The Bloom Studio] นัดหมาย: ${booking.serviceName} - คุณ ${booking.customerName}`,
      description: [
        `รหัสการจอง: ${booking.id}`,
        `บริการ: ${booking.serviceName} (${duration} นาที)`,
        `ราคา: ${booking.servicePrice} บาท`,
        `ช่างผู้ให้บริการ: ${booking.staffName}`,
        `ลูกค้า: คุณ ${booking.customerName} (${booking.customerPhone})`,
        booking.customerEmail ? `อีเมล: ${booking.customerEmail}` : '',
        booking.specialRequest ? `คำขอพิเศษ: ${booking.specialRequest}` : '',
        booking.slipUrl ? `รูปสลิป: ${booking.slipUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Bangkok',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Bangkok',
      },
      colorId: '4', // Flamingo / Rose tint
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!res.ok) {
      console.warn('[Calendar Create Event Failed]', await res.text());
      return null;
    }

    const eventData = await res.json();
    return eventData.id || null;
  } catch (err) {
    console.warn('[Calendar Create Event Error]', err);
    return null;
  }
}
