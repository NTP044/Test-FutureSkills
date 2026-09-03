/**
 * ==============================================================================
 * The Bloom Studio - Google Apps Script (Web App) Backend
 * ระบบจัดการหลังบ้าน Google Sheet + Google Drive + Google Calendar + Email Notification
 * ==============================================================================
 *
 * 📌 ฟังก์ชันหลักในระบบ:
 * 1. ตารางข้อมูล 4 แท็บ: Bookings, Services, Staff, Settings
 * 2. บันทึกสลิปโอนเงินไปยัง Google Drive (โฟลเดอร์ The Bloom Studio - Payment Slips)
 * 3. บันทึกนัดหมายลง Google Calendar ประจำบัญชีผู้ใช้โดยอัตโนมัติ
 * 4. ส่งอีเมลแจ้งเตือน HTML สวยงามไปยัง Admin ทันทีเมื่อมี:
 *    - การจองใหม่ (New Booking) -> "🔔 มีการจองใหม่ - [ชื่อลูกค้า] [วันที่]"
 *    - การยกเลิกการจอง (Cancelled) -> "❌ แจ้งเตือนการยกเลิกคิว - [ชื่อลูกค้า] [วันที่]"
 *    - มีการแนบสลิปโอนเงิน (Payment Slip) -> "💳 มีการแนบสลิปโอนเงินใหม่ - [ชื่อลูกค้า] [รหัสจอง]"
 * 5. ระบบ Real-Time Webhook (onEdit) แจ้งเตือนเซิร์ฟเวอร์ทันทีเมื่อมีการแก้ข้อมูลใน Google Sheet
 *
 * 📌 วิธีตั้งค่าและ Deploy เป็น Web App:
 * 1. เปิด Google Sheet ที่ต้องการใช้เป็น Database
 * 2. ไปที่เมนู "ส่วนขยาย (Extensions)" > "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้ลงในไฟล์ Code.gs
 * 4. (วิธีตั้งค่าอีเมล Admin): สามารถระบุอีเมล Admin ได้ในแท็บ "Settings" แถว OwnerEmail หรือปล่อยให้ดึงอีเมลเจ้าของชีตอัตโนมัติ
 * 5. กดปุ่ม "ทำให้ใช้งานได้ (Deploy)" > "การทำให้ใช้งานได้ใหม่ (New deployment)"
 *    - เลือกประเภท: "เว็บแอป (Web app)"
 *    - ดำเนินการในฐานะ: "ฉัน (Me)"
 *    - ผู้ที่มีสิทธิ์เข้าถึง: "ทุกคน (Anyone)" ***สำคัญมาก เพื่อให้ Frontend/Backend เชื่อมต่อได้***
 * 6. กด "Deploy" แล้วให้สิทธิ์การเข้าถึง (Authorize)
 * 7. นำ Web App URL ที่ได้ มาวางในหน้า Admin Panel > แท็บ Google Sheet
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
  'Customer Email',      // Col 12: อีเมลลูกค้า
  'Special Request',     // Col 13: ความต้องการพิเศษ
  'Payment Status',      // Col 14: สถานะการชำระเงิน (unpaid, paid_slip, verified)
  'Payment Slip URL',    // Col 15: ลิงก์ดูสลิปบน Google Drive
  'Calendar Event ID',   // Col 16: รหัสอีเวนต์บน Google Calendar
  'LINE User ID',        // Col 17: LINE User ID
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
        message: 'The Bloom Studio Apps Script Web App is online & ready!',
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

    if (action === 'getSettings') {
      var settings = getSettingsFromSheet();
      return createJsonResponse({ success: true, data: settings });
    }

    if (action === 'getAllData') {
      var allData = getAllDataFromSheet();
      return createJsonResponse({ success: true, data: allData });
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

    // 1. สร้างการจองใหม่ (พร้อมส่ง Email แจ้ง Admin ทันที)
    if (action === 'createBooking') {
      return createJsonResponse(handleCreateBooking(body));
    }

    // 2. อัปโหลด/แนบสลิปการโอนเงิน (พร้อมอัปเดตชีต & ส่ง Email แจ้งเตือน Admin)
    if (action === 'uploadSlip') {
      return createJsonResponse(handleUploadSlip(body));
    }

    // 3. อัปเดตสถานะการจอง (เช่น confirmed, completed, cancelled)
    if (action === 'updateBookingStatus') {
      return createJsonResponse(handleUpdateBookingStatus(body));
    }

    // 4. เลื่อนคิวการจอง (Reschedule)
    if (action === 'rescheduleBooking') {
      return createJsonResponse(handleRescheduleBooking(body));
    }

    // 5. ยกเลิกการจอง
    if (action === 'cancelBooking') {
      return createJsonResponse(handleCancelBooking(body.id));
    }

    // 5.1 ลบแถวการจองออกจาก Google Sheet
    if (action === 'deleteBooking') {
      return createJsonResponse(handleDeleteBooking(body.id));
    }

    // 6. สร้างชีตและโครงสร้างเริ่มต้น
    if (action === 'initSheet') {
      return createJsonResponse(setupSheets());
    }

    // 7. จัดการบริการ (Services CRUD)
    if (action === 'manageService') {
      return createJsonResponse(handleManageService(body));
    }

    // 8. จัดการช่าง (Staff CRUD)
    if (action === 'manageStaff') {
      return createJsonResponse(handleManageStaff(body));
    }

    // 9. จัดการตั้งค่า (Settings)
    if (action === 'manageSettings') {
      return createJsonResponse(handleManageSettings(body));
    }

    // 10. ซิงค์ข้อมูลทั้งหมด (Push / Pull)
    if (action === 'syncAllData' || action === 'pushAllData') {
      return createJsonResponse(handleSyncAllData(body));
    }

    return createJsonResponse({ success: false, error: 'Unknown POST action: ' + action });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Google Sheet Custom Top Menu (เมนูจัดการของ The Bloom Studio ใน Google Sheet)
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🌸 The Bloom Studio')
      .addItem('⚡ สร้างโครงสร้างชีต & เชื่อม Google Workspace ทั้งหมด', 'setupSheets')
      .addItem('📁 เปิดโฟลเดอร์ Google Drive (เก็บสลิป)', 'menuOpenDriveFolder')
      .addItem('📅 เปิดดู Google Calendar', 'menuOpenCalendar')
      .addSeparator()
      .addItem('✉️ ทดสอบส่งอีเมลแจ้งเตือน Admin', 'menuTestAdminEmail')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen Error: ' + e.toString());
  }
}

function menuOpenDriveFolder() {
  var folderIterator = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var url = folderIterator.hasNext() ? folderIterator.next().getUrl() : 'https://drive.google.com';
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family: sans-serif; text-align: center; padding: 20px;">' +
    '<h3>📁 โฟลเดอร์สลิปบน Google Drive</h3>' +
    '<p>โฟลเดอร์สำหรับจัดเก็บสลิปการโอนเงินของลูกค้าทั้งหมดอัตโนมัติ</p>' +
    '<a href="' + url + '" target="_blank" style="display:inline-block; padding:10px 20px; background:#15803d; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">เปิด Google Drive</a>' +
    '</div>'
  ).setWidth(350).setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, 'Google Drive Payment Slips');
}

function menuOpenCalendar() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family: sans-serif; text-align: center; padding: 20px;">' +
    '<h3>📅 Google Calendar</h3>' +
    '<p>นัดหมายคิวจองทั้งหมดจะถูกเพิ่มลงใน Google Calendar อัตโนมัติ</p>' +
    '<a href="https://calendar.google.com" target="_blank" style="display:inline-block; padding:10px 20px; background:#1d4ed8; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">เปิด Google Calendar</a>' +
    '</div>'
  ).setWidth(350).setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, 'Google Calendar Management');
}

function menuTestAdminEmail() {
  var adminEmail = getAdminEmail();
  sendEmailSafely(
    adminEmail,
    '🔔 [ทดสอบระบบ] การแจ้งเตือน The Bloom Studio ทำงานปกติ',
    '<div style="font-family:sans-serif; padding:20px; border:1px solid #e2e8f0; border-radius:12px;">' +
    '<h3 style="color:#15803d;">ระบบแจ้งเตือนอีเมล The Bloom Studio ทำงานถูกต้อง 100%</h3>' +
    '<p>อีเมลนี้เป็นการทดสอบส่งจาก Google Apps Script ไปยัง: <strong>' + adminEmail + '</strong></p>' +
    '</div>'
  );
  SpreadsheetApp.getUi().alert('ส่งอีเมลทดสอบไปยัง ' + adminEmail + ' เรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมาย');
}

/**
 * ฟังก์ชันสร้าง/ตรวจสอบชีต และเชื่อมต่อบริการ Google Workspace ทั้งหมดอัตโนมัติ
 * (Google Sheet 4 แท็บ + โฟลเดอร์ Google Drive + Google Calendar + Admin Email)
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 0. เชื่อมต่อและสร้างโฟลเดอร์ Google Drive สำหรับเก็บสลิป
  var driveFolderUrl = '';
  var driveFolderId = '';
  try {
    var folderIterator = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    var folder;
    if (folderIterator.hasNext()) {
      folder = folderIterator.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    }
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    driveFolderUrl = folder.getUrl();
    driveFolderId = folder.getId();
  } catch (driveErr) {
    Logger.log('Drive folder init error: ' + driveErr.toString());
  }

  // 0.1 เชื่อมต่อ Google Calendar
  var calendarId = '';
  try {
    var cal = CalendarApp.getDefaultCalendar();
    if (cal) {
      calendarId = cal.getId();
    }
  } catch (calErr) {
    Logger.log('Calendar init error: ' + calErr.toString());
  }

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
  }
  if (serviceSheet.getLastRow() === 0) {
    var serviceCols = ['ID', 'Name', 'Category', 'Price', 'DurationMinutes', 'Description', 'Icon'];
    serviceSheet.appendRow(serviceCols);
    serviceSheet.getRange(1, 1, 1, serviceCols.length).setBackground('#EBF5FB').setFontWeight('bold');
    serviceSheet.setFrozenRows(1);

    var defaultServices = [
      ['s1', 'ทำเล็บเจลพรีเมียม (Gel Manicure Art)', 'Nails', 690, 60, 'ตัดแต่งทรงหนัง ทาสีเจลเกรดพรีเมียมนำเข้าจากเกาหลี พร้อมเคลือบเงา 3 ชั้น ปกป้องหน้าเล็บยาวนาน', 'Sparkles'],
      ['s2', 'สปาเท้า & เพดิคิวร์ดีท็อกซ์ (Aroma Foot Spa)', 'Spa & Nails', 990, 75, 'แช่น้ำแร่เกลือหิมาลายัน สครับผลัดเซลล์ผิว ตัดแต่งเล็บ ขูดส้นเท้า และมาสก์บำรุงเข้มข้น', 'Footprints'],
      ['s3', 'เฟเชียลทรีตเมนต์บำรุงล้ำลึก (Deep Glow Facial)', 'Facial', 1290, 60, 'ทำความสะอาดล้ำลึก นวดกระตุ้นคอลลาเจน ผลักวิตามินเข้มข้นด้วยไอออนโต และมาสก์ไฮยาลูรอนสดชื่น', 'Smile'],
      ['s4', 'นวดอโรมาเธอราปีผ่อนคลาย (Aroma Oil Massage)', 'Massage', 1590, 90, 'นวดปรับสมดุลด้วยน้ำมันหอมระเหยออร์แกนิกเกรดบริสุทธิ์ ช่วยคลายความตึงเครียดและฟื้นฟูกายใจ', 'Flower2'],
      ['s5', 'สปายกกระชับผิวหน้ากัวซา (Gua Sha Facial Lift)', 'Facial', 890, 45, 'ศาสตร์การนวดกระชับกรอบหน้าด้วยหินหยกธรรมชาติแท้ รีดน้ำเหลือง ลดบวม ผิวตึงกระชับมีเลือดฝาด', 'Gem'],
      ['s6', 'ต่อขนตาธรรมชาติเส้นต่อเส้น (Natural Lash)', 'Lash', 1390, 90, 'เทคนิคญี่ปุ่นเส้นต่อเส้น น้ำหนักเบาสบาย ไม่เคืองตา ออกแบบรูปตาเฉพาะบุคคลให้หวานละมุนเป็นธรรมชาติ', 'Eye']
    ];
    defaultServices.forEach(function(row) {
      serviceSheet.appendRow(row);
    });
  }

  // 3. Sheet: Staff
  var staffSheet = ss.getSheetByName(SHEET_STAFF);
  if (!staffSheet) {
    staffSheet = ss.insertSheet(SHEET_STAFF);
  }
  if (staffSheet.getLastRow() === 0) {
    var staffCols = ['ID', 'Name', 'Nickname', 'Role', 'Experience', 'Rating', 'Avatar', 'Services', 'Bio'];
    staffSheet.appendRow(staffCols);
    staffSheet.getRange(1, 1, 1, staffCols.length).setBackground('#EAF2F8').setFontWeight('bold');
    staffSheet.setFrozenRows(1);

    var defaultStaff = [
      ['st1', 'ช่างพลอย (Ploy)', 'พลอย', 'Senior Nail & Lash Artist', '5 ปี', 4.95, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', 's1,s2,s6', 'เชี่ยวชาญการเพ้นท์เล็บสไตล์มินิมอลเกาหลีและต่อขนตาเส้นต่อเส้นเนียนเป็นธรรมชาติ'],
      ['st2', 'ช่างเมย์ (May)', 'เมย์', 'Master Aesthetician & Facialist', '7 ปี', 4.98, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', 's3,s5', 'ผู้เชี่ยวชาญด้านการดูแลฟื้นฟูผิวหน้า การกดจุดรีดน้ำเหลือง และศาสตร์กัวซาหยกแท้'],
      ['st3', 'ช่างแนน (Nan)', 'แนน', 'Certified Spa & Body Therapist', '6 ปี', 4.93, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80', 's2,s4', 'ใบรับรองสปานานาชาติ เชี่ยวชาญการนวดอโรมาผ่อนคลายกล้ามเนื้อและสปาเท้าบำบัด'],
      ['st4', 'ช่างกิ๊ฟ (Gift)', 'กิ๊ฟ', 'All-Rounder Beauty Specialist', '4 ปี', 4.91, 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80', 's1,s2,s3,s5', 'มีความประณีต อ่อนโยน ให้บริการทั้งเล็บ สปา และดูแลผิวหน้าอย่างครบวงจร']
    ];
    defaultStaff.forEach(function(row) {
      staffSheet.appendRow(row);
    });
  }

  // 4. Sheet: Settings
  var settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
  }
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(['Key', 'Value', 'Description']);
    settingsSheet.getRange(1, 1, 1, 3).setBackground('#E8F8F5').setFontWeight('bold');
    settingsSheet.setFrozenRows(1);
    var defaultEmail = Session.getEffectiveUser().getEmail() || 'NatapongMumklang@gmail.com';
    settingsSheet.appendRow(['OwnerEmail', defaultEmail, 'อีเมลแอดมินสำหรับรับการแจ้งเตือนคิวจอง']);
    settingsSheet.appendRow(['PromptPayNumber', '0812345678', 'เบอร์พร้อมเพย์รับชำระเงิน']);
    settingsSheet.appendRow(['ShopName', 'The Bloom Studio', 'ชื่อร้าน']);
    settingsSheet.appendRow(['ServerWebhookUrl', '', 'URL เซิร์ฟเวอร์สำหรับรับการแจ้งเตือน Real-Time']);
    settingsSheet.appendRow(['GoogleDriveFolderUrl', driveFolderUrl, 'ลิงก์โฟลเดอร์ Google Drive เก็บสลิป']);
    settingsSheet.appendRow(['GoogleDriveFolderId', driveFolderId, 'รหัสโฟลเดอร์ Google Drive']);
    settingsSheet.appendRow(['GoogleCalendarId', calendarId, 'รหัส Google Calendar ที่เชื่อมต่อ']);
  }

  return {
    success: true,
    message: 'เริ่มต้นระบบ Google Sheet และ Google Workspace ทั้งหมดเรียบร้อยแล้ว (4 แท็บ + Google Drive + Google Calendar + Email Notification)',
    sheetsCreated: [SHEET_BOOKINGS, SHEET_SERVICES, SHEET_STAFF, SHEET_SETTINGS],
    driveFolderUrl: driveFolderUrl,
    calendarId: calendarId,
  };
}

/**
 * ดึงอีเมลแอดมินจาก Settings หรือ Session
 */
function getAdminEmail() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_SETTINGS);
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === 'OwnerEmail' && data[i][1]) {
          return String(data[i][1]).trim();
        }
      }
    }
  } catch (e) {
    Logger.log('Get admin email error: ' + e.toString());
  }
  return Session.getEffectiveUser().getEmail() || 'NatapongMumklang@gmail.com';
}

/**
 * 1. รับข้อมูลการจอง -> บันทึก Google Sheet + อัปโหลดสลิปไป Google Drive + บันทึก Google Calendar + ส่ง Email แจ้งเตือน Admin ทันที
 */
function handleCreateBooking(data) {
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);

  var bookingId = data.id || ('BLM-' + new Date().getTime().toString(36).toUpperCase());
  var createdAt = data.createdAt || new Date().toISOString();
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

  // จัดการสลิปการโอนเงิน (ถ้ามี base64 ส่งมา) -> บันทึกลง Google Drive
  var slipUrl = data.slipUrl || '';
  var paymentStatus = data.paymentStatus || 'unpaid';

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

  // สร้างนัดหมายบน Google Calendar
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

  // บันทึกแถวลงใน Google Sheet
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

  // ส่ง Email แจ้งเตือน Admin ทันที (Trigger ภายใน doPost หลังบันทึกสำเร็จ)
  try {
    sendNewBookingAdminEmail({
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
      paymentStatus: paymentStatus,
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
 * 2. อัปโหลดสลิปแยกหลังจากสร้างการจองแล้ว -> เก็บใน Google Drive + อัปเดตแถวใน Sheet + ส่ง Email แจ้งเตือน Admin
 */
function handleUploadSlip(data) {
  var bookingId = data.bookingId || data.id;
  var slipBase64 = data.slipBase64;
  var customerName = data.customerName || 'Customer';

  if (!bookingId || !slipBase64) {
    return { success: false, error: 'กรุณาระบุ bookingId และ slipBase64' };
  }

  // 1. อัปโหลดขึ้น Google Drive
  var slipUrl = uploadSlipToGoogleDrive(slipBase64, bookingId, customerName);

  // 2. อัปเดตแถวใน Sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return { success: false, error: 'ไม่พบแท็บ Bookings' };

  var rows = sheet.getDataRange().getValues();
  var targetRowIdx = -1;
  var bookingData = null;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(bookingId).trim()) {
      targetRowIdx = i + 1; // 1-indexed for Sheet
      bookingData = rows[i];
      break;
    }
  }

  if (targetRowIdx > 0) {
    sheet.getRange(targetRowIdx, 14).setValue('paid_slip'); // Col 14: Payment Status
    sheet.getRange(targetRowIdx, 15).setValue(slipUrl);    // Col 15: Payment Slip URL
  }

  // 3. ส่ง Email แจ้งเตือน Admin ว่ามีสลิปใหม่เข้ามา
  try {
    sendSlipUploadedAdminEmail({
      bookingId: bookingId,
      customerName: bookingData ? bookingData[9] : customerName,
      customerPhone: bookingData ? bookingData[10] : '',
      serviceName: bookingData ? bookingData[5] : '',
      servicePrice: bookingData ? bookingData[6] : '',
      date: bookingData ? bookingData[3] : '',
      time: bookingData ? bookingData[4] : '',
      slipUrl: slipUrl,
    });
  } catch (err) {
    Logger.log('Slip Email Alert Error: ' + err.toString());
  }

  return {
    success: true,
    message: 'อัปโหลดสลิปไปยัง Google Drive และอัปเดตชีตเรียบร้อยแล้ว',
    bookingId: bookingId,
    slipUrl: slipUrl,
    paymentStatus: 'paid_slip',
  };
}

/**
 * 3. เลื่อนคิวการจอง (Reschedule Booking)
 */
function handleRescheduleBooking(data) {
  var bookingId = data.bookingId || data.id;
  var newDate = data.date;
  var newTime = data.time;
  var newStaffName = data.staffName;

  if (!bookingId || !newDate || !newTime) {
    return { success: false, error: 'กรุณาระบุ bookingId, date และ time ใหม่' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return { success: false, error: 'ไม่พบแท็บ Bookings' };

  var rows = sheet.getDataRange().getValues();
  var targetRowIdx = -1;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(bookingId).trim()) {
      targetRowIdx = i + 1;
      break;
    }
  }

  if (targetRowIdx > 0) {
    sheet.getRange(targetRowIdx, 4).setValue(newDate); // Col 4: Date
    sheet.getRange(targetRowIdx, 5).setValue(newTime); // Col 5: Time
    if (newStaffName) {
      sheet.getRange(targetRowIdx, 9).setValue(newStaffName); // Col 9: Staff Name
    }
    return { success: true, message: 'เลื่อนคิวใน Google Sheet เรียบร้อยแล้ว' };
  }

  return { success: false, error: 'ไม่พบรายการจองรหัส ' + bookingId };
}

/**
 * 4. อัปโหลดสลิป Base64 ขึ้น Google Drive และสร้าง Direct View Link
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
  var safeCustomerName = (customerName || 'customer').replace(/[\s\/\\:*?"<>|]/g, '_');
  var fileName = 'Slip_' + bookingId + '_' + safeCustomerName + '.jpg';
  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

/**
 * 5. สร้างกิจกรรมบน Google Calendar
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
    (info.specialRequest ? 'ความต้องการพิเศษ: ' + info.specialRequest + '\n' : '') +
    (info.slipUrl ? 'สลิปการโอน: ' + info.slipUrl + '\n' : '') +
    '\n---\nThe Bloom Studio Spa & Beauty';

  var event = calendar.createEvent(title, startDateTime, endDateTime, {
    description: description,
  });

  return event.getId();
}

/**
 * 6. ส่ง HTML Email แจ้งเตือน Admin เมื่อมี "การจองใหม่"
 * หัวข้อ: "🔔 มีการจองใหม่ - [ชื่อลูกค้า] [วันที่]"
 */
function sendNewBookingAdminEmail(info) {
  var adminEmail = getAdminEmail();
  if (!adminEmail) return;

  var subject = '🔔 มีการจองใหม่ - คุณ' + info.customerName + ' [' + info.date + ']';

  var htmlBody =
    '<div style="font-family: \'Sarabun\', -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e7ded5; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">' +
    '  <div style="text-align: center; border-bottom: 2px solid #f4eae0; padding-bottom: 20px; margin-bottom: 22px;">' +
    '    <span style="background: #2D6A4F; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; rounded: 12px; border-radius: 20px; text-transform: uppercase;">🔔 New Booking Alert</span>' +
    '    <h2 style="color: #443026; margin: 12px 0 4px; font-size: 22px; font-weight: bold;">The Bloom Studio</h2>' +
    '    <p style="color: #8c7667; font-size: 13px; margin: 0;">มีการจองคิวบริการ Wellness & Beauty ใหม่เข้ามาในระบบ</p>' +
    '  </div>' +
    '  <div style="background: #FAF6F0; border-radius: 16px; border: 1px solid #ebd9c8; padding: 20px; margin-bottom: 22px;">' +
    '    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">' +
    '      <tr><td style="padding: 6px 0; color: #777; width: 35%;">รหัสการจอง:</td><td style="padding: 6px 0; font-weight: bold; color: #D4A373; font-family: monospace; font-size: 15px;">' + info.bookingId + '</td></tr>' +
    '      <tr><td style="padding: 6px 0; color: #777;">ลูกค้า:</td><td style="padding: 6px 0; font-weight: bold; color: #1c1917;">' + info.customerName + '</td></tr>' +
    '      <tr><td style="padding: 6px 0; color: #777;">เบอร์โทรศัพท์:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;"><a href="tel:' + info.customerPhone + '" style="color: #2b6cb0; text-decoration: none;">' + info.customerPhone + '</a></td></tr>' +
    (info.customerEmail ? '      <tr><td style="padding: 6px 0; color: #777;">อีเมลลูกค้า:</td><td style="padding: 6px 0;">' + info.customerEmail + '</td></tr>' : '') +
    '      <tr><td style="padding: 6px 0; color: #777;">บริการ:</td><td style="padding: 6px 0; font-weight: bold; color: #1c1917;">' + info.serviceName + '</td></tr>' +
    '      <tr><td style="padding: 6px 0; color: #777;">ช่างผู้ให้บริการ:</td><td style="padding: 6px 0; font-weight: bold; color: #7c2d12;">' + info.staffName + '</td></tr>' +
    '      <tr><td style="padding: 6px 0; color: #777;">วันและเวลานัดหมาย:</td><td style="padding: 6px 0; font-weight: bold; color: #047857;">' + info.date + ' เวลา ' + info.time + ' น. (' + (info.duration || 60) + ' นาที)</td></tr>' +
    '      <tr><td style="padding: 6px 0; color: #777;">ยอดชำระ:</td><td style="padding: 6px 0; font-weight: bold; font-size: 16px; color: #b45309;">' + Number(info.servicePrice || 0).toLocaleString() + ' บาท</td></tr>' +
    (info.specialRequest ? '      <tr><td style="padding: 6px 0; color: #777;">ความต้องการพิเศษ:</td><td style="padding: 6px 0; color: #555; font-style: italic;">' + info.specialRequest + '</td></tr>' : '') +
    '      <tr><td style="padding: 6px 0; color: #777;">สถานะการชำระเงิน:</td><td style="padding: 6px 0; font-weight: bold;">' + (info.slipUrl ? '<span style="color: #059669;">แนบสลิปแล้ว (Paid Slip)</span>' : '<span style="color: #d97706;">ชำระหน้าร้าน / รอโอน</span>') + '</td></tr>' +
    '    </table>' +
    '  </div>' +
    (info.slipUrl ?
      '  <div style="text-align: center; margin-bottom: 22px;">' +
      '    <a href="' + info.slipUrl + '" target="_blank" style="display: inline-block; background: #047857; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(4,120,87,0.3);">' +
      '      🖼️ คลิกเพื่อดูสลิปโอนเงินบน Google Drive' +
      '    </a>' +
      '  </div>' : '') +
    '  <div style="text-align: center; border-top: 1px solid #f0e6dc; pt-4; padding-top: 16px; font-size: 12px; color: #a8a29e;">' +
    '    ข้อมูลนี้ถูกบันทึกลง Google Sheet และ Google Calendar เรียบร้อยแล้วแบบ Real-Time' +
    '  </div>' +
    '</div>';

  sendEmailSafely(adminEmail, subject, htmlBody);

  // ส่งสำเนาให้ลูกค้าด้วยถ้าลูกค้ากรอกอีเมลมา
  if (info.customerEmail && info.customerEmail.indexOf('@') > 0) {
    var customerSubject = '🌸 ยืนยันการจองคิว The Bloom Studio (รหัส: ' + info.bookingId + ')';
    sendEmailSafely(info.customerEmail, customerSubject, htmlBody);
  }
}

/**
 * 7. ส่ง HTML Email แจ้งเตือน Admin เมื่อมี "การยกเลิกคิว (Cancelled)"
 * หัวข้อ: "❌ แจ้งเตือนการยกเลิกคิว - [ชื่อลูกค้า] [วันที่]"
 */
function sendCancelledBookingAdminEmail(info) {
  var adminEmail = getAdminEmail();
  if (!adminEmail) return;

  var subject = '❌ แจ้งเตือนการยกเลิกคิว - คุณ' + info.customerName + ' [' + info.date + ']';

  var htmlBody =
    '<div style="font-family: \'Sarabun\', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #fecdd3; padding: 28px;">' +
    '  <div style="text-align: center; border-bottom: 2px solid #ffe4e6; padding-bottom: 18px; margin-bottom: 20px;">' +
    '    <span style="background: #e11d48; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">Cancelled Alert</span>' +
    '    <h2 style="color: #881337; margin: 12px 0 4px; font-size: 20px; font-weight: bold;">The Bloom Studio</h2>' +
    '    <p style="color: #9f1239; font-size: 13px; margin: 0;">รายการจองคิวต่อไปนี้ถูกยกเลิกแล้ว</p>' +
    '  </div>' +
    '  <div style="background: #fff1f2; border-radius: 14px; border: 1px solid #fecdd3; padding: 18px; margin-bottom: 20px; font-size: 14px; color: #4c0519;">' +
    '    <p style="margin: 0 0 6px;"><strong>รหัสการจอง:</strong> <span style="font-family: monospace; font-weight: bold;">' + info.bookingId + '</span></p>' +
    '    <p style="margin: 0 0 6px;"><strong>ลูกค้า:</strong> ' + info.customerName + ' (โทร: ' + info.customerPhone + ')</p>' +
    '    <p style="margin: 0 0 6px;"><strong>บริการ:</strong> ' + info.serviceName + '</p>' +
    '    <p style="margin: 0 0 6px;"><strong>ช่าง:</strong> ' + info.staffName + '</p>' +
    '    <p style="margin: 0;"><strong>วันเวลาเดิม:</strong> ' + info.date + ' เวลา ' + info.time + ' น.</p>' +
    '  </div>' +
    '  <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">สถานะใน Google Sheet ได้รับการเปลี่ยนเป็น cancelled เรียบร้อยแล้ว</p>' +
    '</div>';

  sendEmailSafely(adminEmail, subject, htmlBody);
}

/**
 * 8. ส่ง HTML Email แจ้งเตือน Admin เมื่อมี "สลิปใหม่เข้ามา"
 * หัวข้อ: "💳 มีการแนบสลิปโอนเงินใหม่ - [ชื่อลูกค้า] [รหัสจอง]"
 */
function sendSlipUploadedAdminEmail(info) {
  var adminEmail = getAdminEmail();
  if (!adminEmail) return;

  var subject = '💳 มีการแนบสลิปโอนเงินใหม่ - คุณ' + info.customerName + ' [' + info.bookingId + ']';

  var htmlBody =
    '<div style="font-family: \'Sarabun\', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #bbf7d0; padding: 28px;">' +
    '  <div style="text-align: center; border-bottom: 2px solid #dcfce7; padding-bottom: 18px; margin-bottom: 20px;">' +
    '    <span style="background: #15803d; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">Payment Slip Uploaded</span>' +
    '    <h2 style="color: #14532d; margin: 12px 0 4px; font-size: 20px; font-weight: bold;">The Bloom Studio</h2>' +
    '    <p style="color: #166534; font-size: 13px; margin: 0;">ลูกค้าได้ทำการแนบหลักฐานการโอนเงิน (สลิป) เรียบร้อยแล้ว</p>' +
    '  </div>' +
    '  <div style="background: #f0fdf4; border-radius: 14px; border: 1px solid #bbf7d0; padding: 18px; margin-bottom: 20px; font-size: 14px; color: #14532d;">' +
    '    <p style="margin: 0 0 6px;"><strong>รหัสการจอง:</strong> <span style="font-family: monospace; font-weight: bold;">' + info.bookingId + '</span></p>' +
    '    <p style="margin: 0 0 6px;"><strong>ลูกค้า:</strong> ' + info.customerName + ' (โทร: ' + info.customerPhone + ')</p>' +
    '    <p style="margin: 0 0 6px;"><strong>บริการ:</strong> ' + info.serviceName + '</p>' +
    '    <p style="margin: 0 0 6px;"><strong>ยอดเงิน:</strong> ' + Number(info.servicePrice || 0).toLocaleString() + ' บาท</p>' +
    '    <p style="margin: 0;"><strong>วันเวลานัด:</strong> ' + info.date + ' เวลา ' + info.time + ' น.</p>' +
    '  </div>' +
    '  <div style="text-align: center; margin-bottom: 20px;">' +
    '    <a href="' + info.slipUrl + '" target="_blank" style="display: inline-block; background: #15803d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px;">' +
    '      🔍 เปิดดูไฟล์สลิปบน Google Drive' +
    '    </a>' +
    '  </div>' +
    '  <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">ระบบได้อัปเดตสถานะเป็น "paid_slip" ใน Google Sheet เรียบร้อยแล้ว</p>' +
    '</div>';

  sendEmailSafely(adminEmail, subject, htmlBody);
}

/**
 * ฟังก์ชันช่วยส่งอีเมลอย่างปลอดภัย รองรับทั้ง MailApp และ GmailApp
 */
function sendEmailSafely(recipient, subject, htmlBody) {
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody,
    });
  } catch (mailErr) {
    try {
      GmailApp.sendEmail(recipient, subject, '', { htmlBody: htmlBody });
    } catch (gmailErr) {
      Logger.log('Cannot send email: ' + gmailErr.toString());
    }
  }
}

/**
 * ดึงรายการจองจาก Google Sheet
 */
function getBookingsFromSheet(phoneFilter, lineUserIdFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var bookings = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var bPhone = String(r[10] || '').trim();
    var bLineId = String(r[16] || '').trim();

    if (phoneFilter && bPhone !== String(phoneFilter).trim()) continue;
    if (lineUserIdFilter && bLineId !== String(lineUserIdFilter).trim()) continue;

    bookings.push({
      id: r[0],
      createdAt: r[1],
      status: r[2],
      date: r[3],
      time: r[4],
      serviceName: r[5],
      servicePrice: Number(r[6] || 0),
      serviceDuration: Number(r[7] || 60),
      staffName: r[8],
      customerName: r[9],
      customerPhone: r[10],
      customerEmail: r[11],
      specialRequest: r[12],
      paymentStatus: r[13],
      slipUrl: r[14],
      calendarEventId: r[15],
      lineUserId: r[16],
      lineDisplayName: r[17],
    });
  }

  return bookings;
}

/**
 * ดึงรายการบริการจาก Google Sheet
 */
function getServicesFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SERVICES);
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    list.push({
      id: String(r[0]),
      name: String(r[1]),
      category: String(r[2]),
      price: Number(r[3] || 0),
      durationMinutes: Number(r[4] || 60),
      description: String(r[5] || ''),
      icon: String(r[6] || 'Sparkles'),
    });
  }
  return list;
}

/**
 * ดึงรายชื่อช่างจาก Google Sheet
 */
function getStaffFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var svcStr = String(r[7] || '');
    var svcList = svcStr ? svcStr.split(',') : [];

    list.push({
      id: String(r[0]),
      name: String(r[1]),
      nickname: String(r[2] || ''),
      role: String(r[3] || ''),
      experience: String(r[4] || ''),
      rating: Number(r[5] || 5.0),
      avatar: String(r[6] || ''),
      services: svcList,
      bio: String(r[8] || ''),
    });
  }
  return list;
}

/**
 * ดึงข้อมูลการตั้งค่าจาก Google Sheet
 */
function getSettingsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SETTINGS);
  var config = {
    ownerEmail: getAdminEmail(),
    promptpayPhone: '0812345678',
    shopName: 'The Bloom Studio',
    serverWebhookUrl: '',
  };

  if (!sheet) return config;

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var key = String(rows[i][0]).trim();
    var val = String(rows[i][1]).trim();
    if (key === 'OwnerEmail') config.ownerEmail = val;
    if (key === 'PromptPayNumber') config.promptpayPhone = val;
    if (key === 'ShopName') config.shopName = val;
    if (key === 'ServerWebhookUrl') config.serverWebhookUrl = val;
  }
  return config;
}

/**
 * ดึงข้อมูลทั้งหมด 4 แท็บในรอบเดียว
 */
function getAllDataFromSheet() {
  return {
    bookings: getBookingsFromSheet(),
    services: getServicesFromSheet(),
    staff: getStaffFromSheet(),
    settings: getSettingsFromSheet(),
  };
}

/**
 * อัปเดตสถานะการจองใน Sheet
 */
function handleUpdateBookingStatus(data) {
  var bookingId = data.id || data.bookingId;
  var newStatus = data.status;

  if (!bookingId || !newStatus) {
    return { success: false, error: 'Missing bookingId or status' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  var rows = sheet.getDataRange().getValues();
  var targetRowIdx = -1;
  var rowData = null;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(bookingId).trim()) {
      targetRowIdx = i + 1;
      rowData = rows[i];
      break;
    }
  }

  if (targetRowIdx > 0) {
    sheet.getRange(targetRowIdx, 3).setValue(newStatus); // Col 3: Status

    // ถ้าสถานะเปลี่ยนเป็น cancelled ให้ส่งอีเมลแจ้งเตือนยกเลิก
    if (newStatus === 'cancelled' && rowData) {
      try {
        sendCancelledBookingAdminEmail({
          bookingId: bookingId,
          customerName: rowData[9],
          customerPhone: rowData[10],
          serviceName: rowData[5],
          staffName: rowData[8],
          date: rowData[3],
          time: rowData[4],
        });
      } catch (e) {
        Logger.log('Cancel email error: ' + e.toString());
      }
    }

    return { success: true, message: 'Updated booking status to ' + newStatus };
  }

  return { success: false, error: 'Booking ID not found: ' + bookingId };
}

/**
 * ยกเลิกการจอง
 */
function handleCancelBooking(bookingId) {
  return handleUpdateBookingStatus({ id: bookingId, status: 'cancelled' });
}

/**
 * ลบแถวการจองออกจาก Google Sheet โดยตรง
 */
function handleDeleteBooking(bookingId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(bookingId).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Deleted booking row from Google Sheet' };
    }
  }
  return { success: false, error: 'Booking ID not found: ' + bookingId };
}

/**
 * จัดการบริการ (Services Add/Edit/Delete)
 */
function handleManageService(body) {
  var subAction = body.subAction || 'add';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SERVICES);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(SHEET_SERVICES);
  }

  var rows = sheet.getDataRange().getValues();

  if (subAction === 'add') {
    var svc = body.service;
    sheet.appendRow([
      svc.id,
      svc.name,
      svc.category || 'Nails',
      Number(svc.price || 0),
      Number(svc.durationMinutes || 60),
      svc.description || '',
      svc.icon || 'Sparkles',
    ]);
    return { success: true, message: 'Service added to Google Sheet' };
  }

  if (subAction === 'update') {
    var svc = body.service;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(svc.id).trim()) {
        sheet.getRange(i + 1, 2).setValue(svc.name);
        sheet.getRange(i + 1, 3).setValue(svc.category || 'Nails');
        sheet.getRange(i + 1, 4).setValue(Number(svc.price || 0));
        sheet.getRange(i + 1, 5).setValue(Number(svc.durationMinutes || 60));
        sheet.getRange(i + 1, 6).setValue(svc.description || '');
        sheet.getRange(i + 1, 7).setValue(svc.icon || 'Sparkles');
        return { success: true, message: 'Service updated in Google Sheet' };
      }
    }
  }

  if (subAction === 'delete') {
    var id = body.id;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(id).trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Service deleted from Google Sheet' };
      }
    }
  }

  return { success: false, error: 'Unknown subAction' };
}

/**
 * จัดการช่าง (Staff Add/Edit/Delete)
 */
function handleManageStaff(body) {
  var subAction = body.subAction || 'add';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(SHEET_STAFF);
  }

  var rows = sheet.getDataRange().getValues();

  if (subAction === 'add') {
    var st = body.staff;
    var svcStr = Array.isArray(st.services) ? st.services.join(',') : (st.services || '');
    sheet.appendRow([
      st.id,
      st.name,
      st.nickname || '',
      st.role || '',
      st.experience || '',
      Number(st.rating || 5.0),
      st.avatar || '',
      svcStr,
      st.bio || '',
    ]);
    return { success: true, message: 'Staff added to Google Sheet' };
  }

  if (subAction === 'update') {
    var st = body.staff;
    var svcStr = Array.isArray(st.services) ? st.services.join(',') : (st.services || '');
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(st.id).trim()) {
        sheet.getRange(i + 1, 2).setValue(st.name);
        sheet.getRange(i + 1, 3).setValue(st.nickname || '');
        sheet.getRange(i + 1, 4).setValue(st.role || '');
        sheet.getRange(i + 1, 5).setValue(st.experience || '');
        sheet.getRange(i + 1, 6).setValue(Number(st.rating || 5.0));
        sheet.getRange(i + 1, 7).setValue(st.avatar || '');
        sheet.getRange(i + 1, 8).setValue(svcStr);
        sheet.getRange(i + 1, 9).setValue(st.bio || '');
        return { success: true, message: 'Staff updated in Google Sheet' };
      }
    }
  }

  if (subAction === 'delete') {
    var id = body.id;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(id).trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Staff deleted from Google Sheet' };
      }
    }
  }

  return { success: false, error: 'Unknown subAction' };
}

/**
 * จัดการการตั้งค่า (Settings Update)
 */
function handleManageSettings(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(SHEET_SETTINGS);
  }

  var settings = body.settings || {};
  var rows = sheet.getDataRange().getValues();

  var map = {
    OwnerEmail: settings.ownerEmail,
    PromptPayNumber: settings.promptpayPhone,
    ShopName: settings.shopName,
    ServerWebhookUrl: settings.serverWebhookUrl,
  };

  for (var i = 1; i < rows.length; i++) {
    var k = String(rows[i][0]).trim();
    if (map[k] !== undefined && map[k] !== null) {
      sheet.getRange(i + 1, 2).setValue(map[k]);
    }
  }

  return { success: true, message: 'Settings updated in Google Sheet' };
}

/**
 * 1-Click Sync All Data (Full Push)
 */
function handleSyncAllData(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sync Services
  if (Array.isArray(body.services) && body.services.length > 0) {
    var sSheet = ss.getSheetByName(SHEET_SERVICES);
    if (sSheet) {
      sSheet.clearContents();
      sSheet.appendRow(['ID', 'Name', 'Category', 'Price', 'DurationMinutes', 'Description', 'Icon']);
      body.services.forEach(function(s) {
        sSheet.appendRow([s.id, s.name, s.category, s.price, s.durationMinutes, s.description, s.icon || '']);
      });
    }
  }

  // 2. Sync Staff
  if (Array.isArray(body.staff) && body.staff.length > 0) {
    var stSheet = ss.getSheetByName(SHEET_STAFF);
    if (stSheet) {
      stSheet.clearContents();
      stSheet.appendRow(['ID', 'Name', 'Nickname', 'Role', 'Experience', 'Rating', 'Avatar', 'Services', 'Bio']);
      body.staff.forEach(function(st) {
        var svcStr = Array.isArray(st.services) ? st.services.join(',') : (st.services || '');
        stSheet.appendRow([st.id, st.name, st.nickname, st.role, st.experience, st.rating, st.avatar, svcStr, st.bio]);
      });
    }
  }

  // 3. Sync Bookings
  if (Array.isArray(body.bookings) && body.bookings.length > 0) {
    var bSheet = ss.getSheetByName(SHEET_BOOKINGS);
    if (bSheet) {
      bSheet.clearContents();
      bSheet.appendRow(BOOKING_COLUMNS);
      body.bookings.forEach(function(b) {
        bSheet.appendRow([
          b.id,
          b.createdAt,
          b.status,
          b.date,
          b.time,
          b.serviceName,
          b.servicePrice,
          b.serviceDuration,
          b.staffName,
          b.customerName,
          b.customerPhone,
          b.customerEmail,
          b.specialRequest,
          b.paymentStatus,
          b.slipUrl,
          b.calendarEventId,
          b.lineUserId,
          b.lineDisplayName,
        ]);
      });
    }
  }

  return { success: true, message: 'ซิงค์ข้อมูลทั้งหมด 4 แท็บขึ้น Google Sheet สำเร็จ 100%' };
}

/**
 * Google Sheet OnEdit Trigger -> ยิง Webhook แจ้งเซิร์ฟเวอร์แบบ Real-Time
 */
function onEdit(e) {
  try {
    var settings = getSettingsFromSheet();
    var webhookUrl = settings.serverWebhookUrl;
    if (!webhookUrl) return;

    var sheetName = e.range.getSheet().getName();
    var payload = {
      event: 'SHEET_EDITED',
      sheetName: sheetName,
      row: e.range.getRow(),
      column: e.range.getColumn(),
      timestamp: new Date().toISOString(),
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    UrlFetchApp.fetch(webhookUrl, options);
  } catch (err) {
    Logger.log('onEdit Webhook Error: ' + err.toString());
  }
}

/**
 * Helper คืนค่า JSON Response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
