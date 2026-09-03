/**
 * ==============================================================================
 * The Bloom Studio - Google Apps Script (Web App) Backend
 * Google Sheets Database + Google Drive Slip Upload + Google Calendar + Email Alerts
 * ==============================================================================
 *
 * วิธี Deploy เป็น Web App:
 * 1. เปิด Google Sheet เปล่า หรือ Sheet ที่ต้องการใช้เป็น Database
 * 2. ไปที่เมนู "ส่วนขยาย (Extensions)" > "Apps Script"
 * 3. ลบโค้ดเดิม แล้ววางโค้ดทั้งหมดนี้ลงในไฟล์ Code.gs
 * 4. กดบันทึก (Ctrl+S หรือ Cmd+S)
 * 5. กดปุ่ม "ทำให้ใช้งานได้ (Deploy)" > "การทำให้ใช้งานได้ใหม่ (New deployment)"
 * 6. เลือกประเภท: "เว็บแอป (Web app)"
 *    - คำอธิบาย: The Bloom Studio API v1
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน (Me)"
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน (Anyone)" ***สำคัญมาก เพื่อให้ส่งข้อมูลได้โดยไม่ต้องล็อกอิน Google***
 * 7. กด "ทำให้ใช้งานได้ (Deploy)" แล้วให้สิทธิ์การเข้าถึง (Authorize Access)
 * 8. คัดลอก "URL เว็บแอป (Web App URL)" มาใส่ในหน้า Admin Panel > แท็บ Google Sheet
 * ==============================================================================
 */

// ชื่อแท็บใน Google Sheet
var SHEET_BOOKINGS = 'Bookings';
var SHEET_SERVICES = 'Services';
var SHEET_STAFF = 'Staff';
var SHEET_SETTINGS = 'Settings';

// ชื่อโฟลเดอร์ใน Google Drive สำหรับเก็บสลิปการโอน
var DRIVE_FOLDER_NAME = 'The Bloom Studio - Payment Slips';

/**
 * หัวคอลัมน์ของแท็บ Bookings ใน Google Sheet
 */
var BOOKING_COLUMNS = [
  'Booking ID',          // Col 1: รหัสการจอง เช่น BLM-K829
  'Created At',          // Col 2: วันที่และเวลาที่บันทึก
  'Status',              // Col 3: สถานะ (pending, confirmed, completed, cancelled)
  'Date',                // Col 4: วันที่นัดหมาย (YYYY-MM-DD)
  'Time',                // Col 5: เวลาที่นัดหมาย (HH:mm)
  'Service Name',        // Col 6: ชื่อบริการ
  'Service Price (THB)', // Col 7: ราคา (บาท)
  'Duration (Mins)',     // Col 8: ระยะเวลา (นาที)
  'Staff Name',          // Col 9: ชื่อช่าง
  'Customer Name',       // Col 10: ชื่อ-นามสกุลลูกค้า
  'Customer Phone',      // Col 11: เบอร์โทรศัพท์ลูกค้า
  'Customer Email',      // Col 12: อีเมลลูกค้า (สำหรับแจ้งเตือน)
  'Special Request',     // Col 13: ความต้องการพิเศษ
  'Payment Status',      // Col 14: สถานะการชำระเงิน (unpaid, paid_slip, verified)
  'Payment Slip URL',    // Col 15: ลิงก์ดูสลิปบน Google Drive
  'Calendar Event ID',   // Col 16: รหัสอีเวนต์บน Google Calendar
  'LINE User ID',        // Col 17: LINE User ID (ถ้าล็อกอินผ่าน LINE)
  'LINE Display Name'    // Col 18: ชื่อโปรไฟล์ LINE
];

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = params.action || 'ping';

    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'The Bloom Studio Apps Script Web App is online!',
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'initSheet') {
      var initResult = setupSheets();
      return createJsonResponse(initResult);
    }

    if (action === 'getBookings') {
      var bookings = getBookingsFromSheet(params.phone, params.lineUserId);
      return createJsonResponse({ success: true, data: bookings });
    }

    if (action === 'getServices') {
      var services = getServicesFromSheet();
      return createJsonResponse({ success: true, data: services });
    }

    if (action === 'getStaff') {
      var staff = getStaffFromSheet();
      return createJsonResponse({ success: true, data: staff });
    }

    return createJsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var rawData = e && e.postData ? e.postData.contents : null;
    if (!rawData) {
      return createJsonResponse({ success: false, error: 'No POST data received' });
    }

    var body = JSON.parse(rawData);
    var action = body.action || 'createBooking';

    if (action === 'createBooking') {
      return createJsonResponse(handleCreateBooking(body));
    }

    if (action === 'updateBookingStatus') {
      return createJsonResponse(handleUpdateBookingStatus(body));
    }

    if (action === 'cancelBooking') {
      return createJsonResponse(handleCancelBooking(body.id));
    }

    if (action === 'initSheet') {
      return createJsonResponse(setupSheets());
    }

    if (action === 'manageService') {
      return createJsonResponse(handleManageService(body));
    }

    if (action === 'manageStaff') {
      return createJsonResponse(handleManageStaff(body));
    }

    return createJsonResponse({ success: false, error: 'Unknown POST action: ' + action });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * ฟังก์ชันสร้าง/ตรวจสอบชีตและใส่หัวคอลัมน์อัตโนมัติ (One-Click Auto Init)
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet: Bookings
  var bookingSheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!bookingSheet) {
    bookingSheet = ss.insertSheet(SHEET_BOOKINGS);
  }
  if (bookingSheet.getLastRow() === 0) {
    bookingSheet.appendRow(BOOKING_COLUMNS);
    var headerRange = bookingSheet.getRange(1, 1, 1, BOOKING_COLUMNS.length);
    headerRange.setBackground('#F4EAE0')
      .setFontColor('#443026')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    bookingSheet.setFrozenRows(1);
  }

  // 2. Sheet: Services
  var serviceSheet = ss.getSheetByName(SHEET_SERVICES);
  if (!serviceSheet) {
    serviceSheet = ss.insertSheet(SHEET_SERVICES);
    var serviceCols = ['ID', 'Name', 'Category', 'Price', 'DurationMinutes', 'Description'];
    serviceSheet.appendRow(serviceCols);
    serviceSheet.getRange(1, 1, 1, serviceCols.length).setBackground('#EBF5FB').setFontWeight('bold');
    serviceSheet.setFrozenRows(1);
  }

  // 3. Sheet: Staff
  var staffSheet = ss.getSheetByName(SHEET_STAFF);
  if (!staffSheet) {
    staffSheet = ss.insertSheet(SHEET_STAFF);
    var staffCols = ['ID', 'Name', 'Nickname', 'Role', 'Experience', 'Rating', 'Avatar', 'Services'];
    staffSheet.appendRow(staffCols);
    staffSheet.getRange(1, 1, 1, staffCols.length).setBackground('#EAF2F8').setFontWeight('bold');
    staffSheet.setFrozenRows(1);
  }

  // 4. Sheet: Settings
  var settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(['Key', 'Value', 'Description']);
    settingsSheet.getRange(1, 1, 1, 3).setBackground('#E8F8F5').setFontWeight('bold');
    settingsSheet.appendRow(['OwnerEmail', Session.getEffectiveUser().getEmail(), 'อีเมลร้านสำหรับรับแจ้งเตือน']);
    settingsSheet.appendRow(['PromptPayNumber', '0812345678', 'เบอร์พร้อมเพย์รับชำระเงิน']);
    settingsSheet.appendRow(['ShopName', 'The Bloom Studio', 'ชื่อร้าน']);
  }

  return {
    success: true,
    message: 'เริ่มต้นตาราง Google Sheet เรียบร้อยแล้ว (สร้างคอลัมน์ครบ 4 แท็บ)',
    sheetsCreated: [SHEET_BOOKINGS, SHEET_SERVICES, SHEET_STAFF, SHEET_SETTINGS],
    columns: BOOKING_COLUMNS,
  };
}

/**
 * รับข้อมูลการจอง -> บันทึก Google Sheet + อัปโหลดสลิปไป Google Drive + บันทึก Google Calendar + ส่ง Email แจ้งเตือน
 */
function handleCreateBooking(data) {
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);

  var bookingId = data.id || ('BLM-' + new Date().getTime().toString(36).toUpperCase());
  var createdAt = new Date().toISOString();
  var status = data.status || 'pending';
  var date = data.date;
  var time = data.time;
  var serviceName = data.serviceName || '';
  var servicePrice = Number(data.servicePrice || 0);
  var duration = Number(data.serviceDuration || 60);
  var staffName = data.staffName || '';
  var customerName = data.customerName || '';
  var customerPhone = data.customerPhone || '';
  var customerEmail = data.customerEmail || '';
  var specialRequest = data.specialRequest || '';
  var lineUserId = data.lineUserId || '';
  var lineDisplayName = data.lineDisplayName || '';

  // 1. จัดการสลิปการโอนเงิน (ถ้ามี base64 ส่งมา) -> บันทึกลง Google Drive
  var slipUrl = data.slipUrl || '';
  var paymentStatus = 'unpaid';

  if (data.slipBase64) {
    try {
      slipUrl = uploadSlipToGoogleDrive(data.slipBase64, bookingId, customerName);
      paymentStatus = 'paid_slip';
    } catch (err) {
      Logger.log('Drive Upload Error: ' + err.toString());
      slipUrl = 'Upload Failed: ' + err.message;
    }
  } else if (slipUrl) {
    paymentStatus = 'paid_slip';
  }

  // 2. สร้างนัดหมายบน Google Calendar
  var calendarEventId = '';
  try {
    calendarEventId = createGoogleCalendarEvent({
      bookingId: bookingId,
      customerName: customerName,
      customerPhone: customerPhone,
      serviceName: serviceName,
      staffName: staffName,
      date: date,
      time: time,
      duration: duration,
      specialRequest: specialRequest,
      slipUrl: slipUrl,
    });
  } catch (calErr) {
    Logger.log('Calendar Error: ' + calErr.toString());
  }

  // 3. บันทึกแถวลงใน Google Sheet
  var rowData = [
    bookingId,
    createdAt,
    status,
    date,
    time,
    serviceName,
    servicePrice,
    duration,
    staffName,
    customerName,
    customerPhone,
    customerEmail,
    specialRequest,
    paymentStatus,
    slipUrl,
    calendarEventId,
    lineUserId,
    lineDisplayName,
  ];

  sheet.appendRow(rowData);

  // 4. ส่ง Email แจ้งเตือน (ทั้งร้านค้า และ ลูกค้า ถ้าใส่อีเมลมา)
  try {
    sendBookingEmails({
      bookingId: bookingId,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail,
      serviceName: serviceName,
      servicePrice: servicePrice,
      staffName: staffName,
      date: date,
      time: time,
      duration: duration,
      specialRequest: specialRequest,
      slipUrl: slipUrl,
    });
  } catch (emailErr) {
    Logger.log('Email Alert Error: ' + emailErr.toString());
  }

  var createdObj = {
    id: bookingId,
    createdAt: createdAt,
    status: status,
    date: date,
    time: time,
    serviceName: serviceName,
    servicePrice: servicePrice,
    serviceDuration: duration,
    staffName: staffName,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    specialRequest: specialRequest,
    paymentStatus: paymentStatus,
    slipUrl: slipUrl,
    calendarEventId: calendarEventId,
    lineUserId: lineUserId,
    lineDisplayName: lineDisplayName,
  };

  return {
    success: true,
    message: 'บันทึกข้อมูลการจองลง Google Sheet สำเร็จ',
    booking: createdObj,
  };
}

/**
 * อัปโหลดสลิป Base64 ขึ้น Google Drive และสร้าง Direct View Link
 */
function uploadSlipToGoogleDrive(base64Data, bookingId, customerName) {
  var folderIterator = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder;
  if (folderIterator.hasNext()) {
    folder = folderIterator.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  var cleanBase64 = base64Data;
  var mimeType = 'image/jpeg';

  if (base64Data.indexOf('data:') === 0) {
    var parts = base64Data.split(';base64,');
    mimeType = parts[0].replace('data:', '');
    cleanBase64 = parts[1];
  }

  var decodedBytes = Utilities.base64Decode(cleanBase64);
  var fileName = 'Slip_' + bookingId + '_' + (customerName || 'customer') + '.jpg';
  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  var file = folder.createFile(blob);
  // ตั้งค่าให้อ่านไฟล์ได้ผ่านลิงก์
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

/**
 * สร้างกิจกรรมบน Google Calendar ประจำบัญชีผู้ใช้
 */
function createGoogleCalendarEvent(info) {
  var calendar = CalendarApp.getDefaultCalendar();
  if (!calendar) return '';

  var dateParts = info.date.split('-'); // YYYY-MM-DD
  var timeParts = info.time.split(':'); // HH:mm

  var startDateTime = new Date(
    Number(dateParts[0]),
    Number(dateParts[1]) - 1,
    Number(dateParts[2]),
    Number(timeParts[0]),
    Number(timeParts[1]),
    0
  );

  var endDateTime = new Date(startDateTime.getTime() + info.duration * 60 * 1000);

  var title = '🌸 คิวจอง: ' + info.serviceName + ' - ' + info.customerName;
  var description =
    'รหัสการจอง: ' + info.bookingId + '\n' +
    'ลูกค้า: ' + info.customerName + ' (โทร: ' + info.customerPhone + ')\n' +
    'ช่างผู้ให้บริการ: ' + info.staffName + '\n' +
    'บริการ: ' + info.serviceName + ' (' + info.duration + ' นาที)\n' +
    'วันเวลา: ' + info.date + ' เวลา ' + info.time + ' น.\n' +
    (info.specialRequest ? 'หมายเหตุ: ' + info.specialRequest + '\n' : '') +
    (info.slipUrl ? 'สลิปการโอน: ' + info.slipUrl + '\n' : '') +
    '\n---\nThe Bloom Studio Spa & Beauty';

  var event = calendar.createEvent(title, startDateTime, endDateTime, {
    description: description,
  });

  return event.getId();
}

/**
 * ส่งอีเมลแจ้งเตือนไปยังเจ้าของร้านและลูกค้า
 */
function sendBookingEmails(info) {
  var ownerEmail = Session.getEffectiveUser().getEmail();

  var htmlBody =
    '<div style="font-family: \'Sarabun\', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7ded5; padding: 24px;">' +
    '<div style="text-align: center; border-bottom: 1px solid #f0e6dc; padding-bottom: 16px; margin-bottom: 20px;">' +
    '<h2 style="color: #443026; margin: 0; font-size: 20px;">🌸 The Bloom Studio</h2>' +
    '<p style="color: #8c7667; font-size: 13px; margin: 4px 0 0;">ใบแจ้งยืนยันคิวการจองบริการสปาและความงาม</p>' +
    '</div>' +
    '<div style="background: #faf6f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>รหัสการจอง:</strong> <span style="color: #D4A373; font-weight: bold;">' + info.bookingId + '</span></p>' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>บริการ:</strong> ' + info.serviceName + '</p>' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ช่างผู้ดูแล:</strong> ' + info.staffName + '</p>' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>วันและเวลานัด:</strong> ' + info.date + ' เวลา ' + info.time + ' น. (' + info.duration + ' นาที)</p>' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ยอดชำระ:</strong> ' + info.servicePrice.toLocaleString() + ' บาท</p>' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ลูกค้า:</strong> ' + info.customerName + ' (โทร: ' + info.customerPhone + ')</p>' +
    (info.specialRequest ? '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ความต้องการพิเศษ:</strong> ' + info.specialRequest + '</p>' : '') +
    (info.slipUrl ? '<p style="margin: 0; font-size: 14px;"><strong>สลิปการโอนเงิน:</strong> <a href="' + info.slipUrl + '" target="_blank" style="color: #06C755;">ดูรูปสลิปบน Google Drive</a></p>' : '') +
    '</div>' +
    '<p style="font-size: 12px; color: #999; text-align: center; margin: 0;">หากต้องการสอบถามหรือแก้ไขข้อมูล กรุณาติดต่อทางร้านโดยตรง ขอบคุณที่ไว้วางใจ The Bloom Studio ค่ะ</p>' +
    '</div>';

  // 1. ส่งอีเมลให้ร้านค้า
  if (ownerEmail) {
    MailApp.sendEmail({
      to: ownerEmail,
      subject: '🌸 [จองคิวใหม่] ' + info.bookingId + ' - คุณ' + info.customerName + ' (' + info.date + ' ' + info.time + ' น.)',
      htmlBody: htmlBody,
    });
  }

  // 2. ส่งอีเมลให้ลูกค้า (ถ้าลูกค้ากรอกไว้)
  if (info.customerEmail && info.customerEmail.indexOf('@') > 0) {
    MailApp.sendEmail({
      to: info.customerEmail,
      subject: '🌸 ยืนยันการจองคิว The Bloom Studio (รหัส: ' + info.bookingId + ')',
      htmlBody: htmlBody,
    });
  }
}

/**
 * ดึงรายการจองจาก Google Sheet
 */
function getBookingsFromSheet(phoneFilter, lineUserIdFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var bookings = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // ข้ามแถวว่าง

    var b = {
      id: String(row[0]),
      createdAt: row[1] ? new Date(row[1]).toISOString() : '',
      status: String(row[2] || 'pending'),
      date: formatSheetDate(row[3]),
      time: formatSheetTime(row[4]),
      serviceName: String(row[5] || ''),
      servicePrice: Number(row[6] || 0),
      serviceDuration: Number(row[7] || 60),
      staffName: String(row[8] || ''),
      customerName: String(row[9] || ''),
      customerPhone: String(row[10] || '').replace(/[^0-9]/g, ''),
      customerEmail: String(row[11] || ''),
      specialRequest: String(row[12] || ''),
      paymentStatus: String(row[13] || 'unpaid'),
      slipUrl: String(row[14] || ''),
      calendarEventId: String(row[15] || ''),
      lineUserId: String(row[16] || ''),
      lineDisplayName: String(row[17] || ''),
    };

    if (phoneFilter) {
      var cleanPhone = phoneFilter.replace(/[^0-9]/g, '');
      if (b.customerPhone.indexOf(cleanPhone) === -1) continue;
    }

    if (lineUserIdFilter && b.lineUserId !== lineUserIdFilter) {
      continue;
    }

    bookings.push(b);
  }

  return bookings;
}

/**
 * อัปเดตสถานะการจองใน Google Sheet
 */
function handleUpdateBookingStatus(body) {
  var id = body.id;
  var newStatus = body.status;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 3).setValue(newStatus); // Col 3 คือ Status
      if (body.paymentStatus) {
        sheet.getRange(i + 1, 14).setValue(body.paymentStatus); // Col 14 คือ Payment Status
      }
      return { success: true, message: 'อัปเดตสถานะเป็น ' + newStatus + ' เรียบร้อย' };
    }
  }

  return { success: false, error: 'ไม่พบรายการจอง ' + id };
}

/**
 * ยกเลิกการจอง
 */
function handleCancelBooking(id) {
  return handleUpdateBookingStatus({ id: id, status: 'cancelled' });
}

function formatSheetDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(val);
}

function formatSheetTime(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var h = String(val.getHours()).padStart(2, '0');
    var m = String(val.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  return String(val);
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
