/**
 * API Service Layer for The Bloom Studio
 * Handles communication with Express backend endpoints, Google Apps Script, and Real-Time SSE Streams
 */

const API_BASE = '/api';

/**
 * ดึงรายการบริการทั้งหมด
 * @returns {Promise<Array>} รายการบริการ
 */
export async function getServices() {
  const response = await fetch(`${API_BASE}/services`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถโหลดรายการบริการได้');
  }
  return data.data;
}

/**
 * เพิ่มบริการใหม่
 */
export async function addService(serviceData) {
  const response = await fetch(`${API_BASE}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถเพิ่มบริการได้');
  }
  return data.data;
}

/**
 * แก้ไขบริการ
 */
export async function updateService(id, serviceData) {
  const response = await fetch(`${API_BASE}/services/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถแก้ไขบริการได้');
  }
  return data.data;
}

/**
 * ลบบริการ
 */
export async function deleteService(id) {
  const response = await fetch(`${API_BASE}/services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถลบบริการได้');
  }
  return data.data;
}

/**
 * ดึงรายชื่อช่าง
 */
export async function getStaff(serviceId) {
  const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : '';
  const response = await fetch(`${API_BASE}/staff${query}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อช่างได้');
  }
  return data.data;
}

/**
 * เพิ่มช่างใหม่
 */
export async function addStaff(staffData) {
  const response = await fetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถเพิ่มข้อมูลช่างได้');
  }
  return data.data;
}

/**
 * แก้ไขข้อมูลช่าง
 */
export async function updateStaff(id, staffData) {
  const response = await fetch(`${API_BASE}/staff/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถแก้ไขข้อมูลช่างได้');
  }
  return data.data;
}

/**
 * ลบข้อมูลช่าง
 */
export async function deleteStaff(id) {
  const response = await fetch(`${API_BASE}/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถลบข้อมูลช่างได้');
  }
  return data.data;
}

/**
 * ดึงช่วงเวลาว่างของช่าง
 */
export async function getAvailability(staffId, date) {
  if (!staffId || !date) {
    return { availableSlots: [], bookedSlots: [], allSlots: [] };
  }
  const query = `?staffId=${encodeURIComponent(staffId)}&date=${encodeURIComponent(date)}`;
  const response = await fetch(`${API_BASE}/availability${query}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถตรวจสอบช่วงเวลาว่างได้');
  }
  return data.data;
}

/**
 * สร้างการจองใหม่ (รองรับสลิป Base64 อัปโหลดขึ้น Google Drive & ส่งเมล)
 */
export async function createBooking(bookingData) {
  const response = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'เกิดข้อผิดพลาดในการจองคิว กรุณาลองใหม่อีกครั้ง');
  }

  return {
    booking: data.booking,
    googleSync: data.googleSync,
  };
}

/**
 * ดึงรายการจอง (กรองตามเบอร์โทร, lineUserId หรือ status)
 */
export async function getBookings(filter = '') {
  let query = '';
  if (typeof filter === 'object' && filter !== null) {
    const params = new URLSearchParams();
    if (filter.lineUserId) params.set('lineUserId', filter.lineUserId);
    if (filter.phone) params.set('phone', filter.phone);
    if (filter.status) params.set('status', filter.status);
    const qs = params.toString();
    query = qs ? `?${qs}` : '';
  } else if (typeof filter === 'string' && filter) {
    query = `?phone=${encodeURIComponent(filter)}`;
  }
  const response = await fetch(`${API_BASE}/bookings${query}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถโหลดประวัติการจองได้');
  }
  return data.data;
}

/**
 * อัปเดตสถานะการจอง (pending -> confirmed -> completed / cancelled)
 */
export async function updateBookingStatus(id, status, paymentStatus) {
  const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, paymentStatus }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถอัปเดตสถานะการจองได้');
  }
  return data.booking;
}

/**
 * ยกเลิกการจอง / ลบการจอง
 */
export async function cancelBooking(id) {
  const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถยกเลิกการจองได้');
  }
  return data.booking;
}

export const deleteBooking = cancelBooking;

/**
 * เลื่อนคิวการจอง (Reschedule Booking)
 * @param {string} id - รหัสการจอง
 * @param {Object} scheduleData - { date, time, staffId }
 */
export async function rescheduleBooking(id, scheduleData) {
  const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}/reschedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถเลื่อนคิวได้ (อาจมีคิวซ้ำซ้อน)');
  }
  return data.booking;
}

/**
 * แนบสลิปการโอนเงิน (Upload Slip)
 * @param {string} id - รหัสการจอง
 * @param {Object} slipData - { slipBase64, customerName }
 */
export async function uploadBookingSlip(id, slipData) {
  const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}/slip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slipData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถอัปโหลดสลิปได้');
  }
  return data.booking;
}

/**
 * ข้อมูล Dashboard Overview สำหรับแอดมิน
 */
export async function getAdminOverview() {
  const response = await fetch(`${API_BASE}/admin/overview`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถโหลดข้อมูล Overview ได้');
  }
  return data.data;
}

/**
 * ข้อมูลประวัติลูกค้า
 */
export async function getAdminCustomers() {
  const response = await fetch(`${API_BASE}/admin/customers`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
  }
  return data.data;
}

/**
 * ตรวจสอบรหัส PIN แอดมิน
 */
export async function adminLogin(pin) {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'รหัส PIN ไม่ถูกต้อง');
  }
  return data;
}

/**
 * จัดการการตั้งค่า Google Apps Script
 */
export async function getGasConfig() {
  const response = await fetch(`${API_BASE}/gas/config`);
  const data = await response.json();
  return data.config;
}

export async function saveGasConfig(config) {
  const response = await fetch(`${API_BASE}/gas/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถบันทึกการตั้งค่าได้');
  }
  return data;
}

export async function testGasConnection(webAppUrl) {
  const response = await fetch(`${API_BASE}/gas/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webAppUrl }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'เชื่อมต่อไม่สำเร็จ');
  }
  return data;
}

export async function initGoogleSheet() {
  const response = await fetch(`${API_BASE}/gas/init-sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถสร้างตาราง Sheet ได้');
  }
  return data;
}

export async function getGasCode() {
  const response = await fetch(`${API_BASE}/gas/code`);
  const data = await response.json();
  return data.code;
}

/**
 * ดึงข้อมูลล่าสุดจาก Google Sheet มาอัปเดตระบบ (1-Click Pull)
 */
export async function syncGoogleSheet() {
  const response = await fetch(`${API_BASE}/gas/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  return data;
}

/**
 * ส่งข้อมูลทั้งหมดขึ้น Google Sheet (1-Click Push All)
 */
export async function pushAllToGoogleSheet() {
  const response = await fetch(`${API_BASE}/gas/push-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถส่งข้อมูลขึ้น Google Sheet ได้');
  }
  return data;
}

export async function getWorkspaceConfig() {
  const response = await fetch(`${API_BASE}/workspace/config`);
  const data = await response.json();
  return data.config || {};
}

export async function saveWorkspaceConfig(config) {
  const response = await fetch(`${API_BASE}/workspace/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await response.json();
  return data;
}

export async function getWorkspaceExportData() {
  const response = await fetch(`${API_BASE}/workspace/export-data`);
  const data = await response.json();
  return data.data || {};
}

/**
 * ตรวจสอบสถานะ Real-Time Engine
 */
export async function getRealtimeStatus() {
  const response = await fetch(`${API_BASE}/realtime/status`);
  const data = await response.json();
  return data;
}

/**
 * Real-Time Event Subscription using Server-Sent Events (SSE)
 * @param {Function} onEvent Callback for real-time messages ({ type, data, timestamp })
 * @param {Function} onStatusChange Callback for connection status ('connecting' | 'connected' | 'error' | 'closed')
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToRealtimeEvents(onEvent, onStatusChange) {
  let eventSource = null;
  let reconnectTimer = null;
  let isClosed = false;

  function connect() {
    if (isClosed) return;
    onStatusChange?.('connecting');

    try {
      eventSource = new EventSource(`${API_BASE}/realtime/stream`);

      eventSource.onopen = () => {
        onStatusChange?.('connected');
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent?.(parsed);
        } catch (err) {
          console.warn('[SSE Parse Warning]', err);
        }
      };

      eventSource.onerror = () => {
        onStatusChange?.('error');
        eventSource?.close();
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch (err) {
      onStatusChange?.('error');
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      onStatusChange?.('closed');
    }
  };
}
