/**
 * ==============================================================================
 * The Bloom Studio - Google Apps Script (Web App) Backend
 * Google Sheets Real-Time Database + Drive Slips + Calendar + Email + Webhook Triggers
 * ==============================================================================
 *
 * วิธี Deploy เป็น Web App:
 * 1. เปิด Google Sheet เปล่า หรือ Sheet ที่ต้องการใช้เป็น Database
 * 2. ไปที่เมนู "ส่วนขยาย (Extensions)" > "Apps Script"
 * 3. ลบโค้ดเดิม แล้ววางโค้ดทั้งหมดนี้ลงในไฟล์ Code.gs
 * 4. กดบันทึก (Ctrl+S หรือ Cmd+S)
 * 5. กดปุ่ม "ทำให้ใช้งานได้ (Deploy)" > "การทำให้ใช้งานได้ใหม่ (New deployment)"
 * 6. เลือกประเภท: "เว็บแอป (Web app)"
 *    - คำอธิบาย: The Bloom Studio Real-Time API v2
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
        message: 'The Bloom Studio Apps Script Web App is online & real-time ready!',
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

    if (action === 'manageSettings') {
      return createJsonResponse(handleManageSettings(body));
    }

    if (action === 'syncAllData' || action === 'pushAllData') {
      return createJsonResponse(handleSyncAllData(body));
    }

    return createJsonResponse({ success: false, error: 'Unknown POST action: ' + action });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * ฟังก์ชันสร้าง/ตรวจสอบชีตและใส่หัวคอลัมน์อัตโนมัติ พร้อมข้อมูลเริ่มต้น (One-Click Auto Init)
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
  }
  if (serviceSheet.getLastRow() === 0) {
    var serviceCols = ['ID', 'Name', 'Category', 'Price', 'DurationMinutes', 'Description', 'Icon'];
    serviceSheet.appendRow(serviceCols);
    serviceSheet.getRange(1, 1, 1, serviceCols.length).setBackground('#EBF5FB').setFontWeight('bold');
    serviceSheet.setFrozenRows(1);

    // Initial Seed Services
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

    // Initial Seed Staff
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
    settingsSheet.appendRow(['OwnerEmail', Session.getEffectiveUser().getEmail() || 'NatapongMumklang@gmail.com', 'อีเมลร้านสำหรับรับแจ้งเตือน']);
    settingsSheet.appendRow(['PromptPayNumber', '0812345678', 'เบอร์พร้อมเพย์รับชำระเงิน']);
    settingsSheet.appendRow(['ShopName', 'The Bloom Studio', 'ชื่อร้าน']);
    settingsSheet.appendRow(['ServerWebhookUrl', '', 'URL เซิร์ฟเวอร์สำหรับรับการแจ้งเตือน Real-Time เมื่อแก้ชีต']);
  }

  return {
    success: true,
    message: 'เริ่มต้นตาราง Google Sheet เรียบร้อยแล้ว (สร้าง 4 แท็บ พร้อมข้อมูลเริ่มต้น)',
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

  // 1. จัดการสลิปการโอนเงิน (ถ้ามี base64 ส่งมา) -> บันทึกลง Google Drive
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
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ยอดชำระ:</strong> ' + Number(info.servicePrice).toLocaleString() + ' บาท</p>' +
    '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ลูกค้า:</strong> ' + info.customerName + ' (โทร: ' + info.customerPhone + ')</p>' +
    (info.specialRequest ? '<p style="margin: 0 0 8px; font-size: 14px;"><strong>ความต้องการพิเศษ:</strong> ' + info.specialRequest + '</p>' : '') +
    (info.slipUrl ? '<p style="margin: 0; font-size: 14px;"><strong>สลิปการโอนเงิน:</strong> <a href="' + info.slipUrl + '" target="_blank" style="color: #06C755;">ดูรูปสลิปบน Google Drive</a></p>' : '') +
    '</div>' +
    '<p style="font-size: 12px; color: #999; text-align: center; margin: 0;">หากต้องการสอบถามหรือแก้ไขข้อมูล กรุณาติดต่อทางร้านโดยตรง ขอบคุณที่ไว้วางใจ The Bloom Studio ค่ะ</p>' +
    '</div>';

  if (ownerEmail) {
    MailApp.sendEmail({
      to: ownerEmail,
      subject: '🌸 [จองคิวใหม่] ' + info.bookingId + ' - คุณ' + info.customerName + ' (' + info.date + ' ' + info.time + ' น.)',
      htmlBody: htmlBody,
    });
  }

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
      if (newStatus) sheet.getRange(i + 1, 3).setValue(newStatus); // Col 3: Status
      if (body.paymentStatus) sheet.getRange(i + 1, 14).setValue(body.paymentStatus); // Col 14: Payment Status
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

/**
 * ดึงรายการบริการ (Services) จาก Google Sheet
 */
function getServicesFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SERVICES);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var services = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    services.push({
      id: String(row[0]),
      name: String(row[1] || ''),
      category: String(row[2] || 'General'),
      price: Number(row[3] || 0),
      durationMinutes: Number(row[4] || 60),
      description: String(row[5] || ''),
      icon: String(row[6] || 'Sparkles'),
    });
  }
  return services;
}

/**
 * จัดการบริการ (Services) ใน Google Sheet: Add, Update, Delete
 */
function handleManageService(body) {
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SERVICES);
  if (!sheet) return { success: false, error: 'Services sheet not found' };

  var subAction = body.subAction || 'add';
  var data = sheet.getDataRange().getValues();

  if (subAction === 'add') {
    var s = body.service || {};
    var id = s.id || ('s' + Date.now().toString(36));
    var newRow = [
      id,
      s.name || '',
      s.category || 'General',
      Number(s.price || 0),
      Number(s.durationMinutes || 60),
      s.description || '',
      s.icon || 'Sparkles'
    ];
    sheet.appendRow(newRow);
    return { success: true, message: 'เพิ่มบริการสำเร็จ', data: s };
  }

  if (subAction === 'update') {
    var s = body.service || {};
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(s.id)) {
        var rowNum = i + 1;
        if (s.name !== undefined) sheet.getRange(rowNum, 2).setValue(s.name);
        if (s.category !== undefined) sheet.getRange(rowNum, 3).setValue(s.category);
        if (s.price !== undefined) sheet.getRange(rowNum, 4).setValue(Number(s.price));
        if (s.durationMinutes !== undefined) sheet.getRange(rowNum, 5).setValue(Number(s.durationMinutes));
        if (s.description !== undefined) sheet.getRange(rowNum, 6).setValue(s.description);
        if (s.icon !== undefined) sheet.getRange(rowNum, 7).setValue(s.icon);
        return { success: true, message: 'แก้ไขบริการสำเร็จ', data: s };
      }
    }
    return { success: false, error: 'ไม่พบบริการ ' + s.id };
  }

  if (subAction === 'delete') {
    var id = body.id;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'ลบบริการสำเร็จ' };
      }
    }
    return { success: false, error: 'ไม่พบบริการ ' + id };
  }

  return { success: false, error: 'Unknown service action' };
}

/**
 * ดึงรายชื่อช่าง (Staff) จาก Google Sheet
 */
function getStaffFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var staffList = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var servicesStr = String(row[7] || '');
    var servicesArr = servicesStr ? servicesStr.split(',').map(function(item) { return item.trim(); }) : [];
    staffList.push({
      id: String(row[0]),
      name: String(row[1] || ''),
      nickname: String(row[2] || ''),
      role: String(row[3] || 'Therapist'),
      experience: String(row[4] || '1 ปี'),
      rating: Number(row[5] || 5.0),
      avatar: String(row[6] || ''),
      services: servicesArr,
      bio: String(row[8] || ''),
    });
  }
  return staffList;
}

/**
 * จัดการช่าง (Staff) ใน Google Sheet: Add, Update, Delete
 */
function handleManageStaff(body) {
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) return { success: false, error: 'Staff sheet not found' };

  var subAction = body.subAction || 'add';
  var data = sheet.getDataRange().getValues();

  if (subAction === 'add') {
    var st = body.staff || {};
    var id = st.id || ('st' + Date.now().toString(36));
    var servicesStr = Array.isArray(st.services) ? st.services.join(',') : String(st.services || '');
    var newRow = [
      id,
      st.name || '',
      st.nickname || '',
      st.role || 'Therapist',
      st.experience || '3 ปี',
      Number(st.rating || 5.0),
      st.avatar || '',
      servicesStr,
      st.bio || ''
    ];
    sheet.appendRow(newRow);
    return { success: true, message: 'เพิ่มข้อมูลช่างสำเร็จ', data: st };
  }

  if (subAction === 'update') {
    var st = body.staff || {};
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(st.id)) {
        var rowNum = i + 1;
        if (st.name !== undefined) sheet.getRange(rowNum, 2).setValue(st.name);
        if (st.nickname !== undefined) sheet.getRange(rowNum, 3).setValue(st.nickname);
        if (st.role !== undefined) sheet.getRange(rowNum, 4).setValue(st.role);
        if (st.experience !== undefined) sheet.getRange(rowNum, 5).setValue(st.experience);
        if (st.rating !== undefined) sheet.getRange(rowNum, 6).setValue(Number(st.rating));
        if (st.avatar !== undefined) sheet.getRange(rowNum, 7).setValue(st.avatar);
        if (st.services !== undefined) {
          var sStr = Array.isArray(st.services) ? st.services.join(',') : String(st.services);
          sheet.getRange(rowNum, 8).setValue(sStr);
        }
        if (st.bio !== undefined) sheet.getRange(rowNum, 9).setValue(st.bio);
        return { success: true, message: 'แก้ไขข้อมูลช่างสำเร็จ', data: st };
      }
    }
    return { success: false, error: 'ไม่พบช่าง ' + st.id };
  }

  if (subAction === 'delete') {
    var id = body.id;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'ลบข้อมูลช่างสำเร็จ' };
      }
    }
    return { success: false, error: 'ไม่พบช่าง ' + id };
  }

  return { success: false, error: 'Unknown staff action' };
}

/**
 * ดึงการตั้งค่าร้าน (Settings) จาก Google Sheet
 */
function getSettingsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};

  var settings = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      settings[String(row[0])] = String(row[1] || '');
    }
  }
  return settings;
}

/**
 * บันทึกการตั้งค่าร้าน (Settings)
 */
function handleManageSettings(body) {
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) return { success: false, error: 'Settings sheet not found' };

  var settings = body.settings || {};
  var data = sheet.getDataRange().getValues();
  var existingKeys = {};

  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0]);
    if (k) existingKeys[k] = i + 1;
  }

  Object.keys(settings).forEach(function(key) {
    var val = settings[key];
    if (existingKeys[key]) {
      sheet.getRange(existingKeys[key], 2).setValue(String(val));
    } else {
      sheet.appendRow([key, String(val), '']);
    }
  });

  return { success: true, message: 'บันทึกการตั้งค่าลง Google Sheet สำเร็จ', settings: settings };
}

/**
 * ดึงข้อมูลทั้งหมดในตาราง (All Data: Services, Staff, Bookings, Settings)
 */
function getAllDataFromSheet() {
  return {
    services: getServicesFromSheet(),
    staff: getStaffFromSheet(),
    bookings: getBookingsFromSheet(),
    settings: getSettingsFromSheet(),
  };
}

/**
 * บันทึก/ซิงค์ข้อมูลชุดใหญ่ (Full Push/Sync) จากเซิร์ฟเวอร์ขึ้น Google Sheet
 */
function handleSyncAllData(body) {
  setupSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Services
  if (Array.isArray(body.services) && body.services.length > 0) {
    var serviceSheet = ss.getSheetByName(SHEET_SERVICES);
    if (serviceSheet) {
      serviceSheet.clearContents();
      serviceSheet.appendRow(['ID', 'Name', 'Category', 'Price', 'DurationMinutes', 'Description', 'Icon']);
      body.services.forEach(function(s) {
        serviceSheet.appendRow([
          s.id,
          s.name || '',
          s.category || 'General',
          Number(s.price || 0),
          Number(s.durationMinutes || 60),
          s.description || '',
          s.icon || 'Sparkles'
        ]);
      });
      serviceSheet.getRange(1, 1, 1, 7).setBackground('#EBF5FB').setFontWeight('bold');
    }
  }

  // 2. Staff
  if (Array.isArray(body.staff) && body.staff.length > 0) {
    var staffSheet = ss.getSheetByName(SHEET_STAFF);
    if (staffSheet) {
      staffSheet.clearContents();
      staffSheet.appendRow(['ID', 'Name', 'Nickname', 'Role', 'Experience', 'Rating', 'Avatar', 'Services', 'Bio']);
      body.staff.forEach(function(st) {
        var servicesStr = Array.isArray(st.services) ? st.services.join(',') : String(st.services || '');
        staffSheet.appendRow([
          st.id,
          st.name || '',
          st.nickname || '',
          st.role || 'Therapist',
          st.experience || '3 ปี',
          Number(st.rating || 5.0),
          st.avatar || '',
          servicesStr,
          st.bio || ''
        ]);
      });
      staffSheet.getRange(1, 1, 1, 9).setBackground('#EAF2F8').setFontWeight('bold');
    }
  }

  // 3. Bookings (if provided)
  if (Array.isArray(body.bookings) && body.bookings.length > 0) {
    var bookingSheet = ss.getSheetByName(SHEET_BOOKINGS);
    if (bookingSheet && bookingSheet.getLastRow() <= 1) {
      body.bookings.forEach(function(b) {
        bookingSheet.appendRow([
          b.id,
          b.createdAt || new Date().toISOString(),
          b.status || 'pending',
          b.date,
          b.time,
          b.serviceName || '',
          Number(b.servicePrice || 0),
          Number(b.serviceDuration || 60),
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
      });
    }
  }

  return {
    success: true,
    message: 'ซิงค์ข้อมูลทั้งหมดขึ้น Google Sheet สำเร็จสมบูรณ์',
  };
}

/**
 * ฟังก์ชัน Webhook Trigger เมื่อมีการแก้ไขข้อมูลใน Google Sheet โดยตรง (onEdit Trigger)
 * ส่งแจ้งเตือน Real-Time ไปยัง Backend Server ทันที
 */
function onEdit(e) {
  try {
    var settings = getSettingsFromSheet();
    var webhookUrl = settings.ServerWebhookUrl;
    if (!webhookUrl) return;

    var range = e ? e.range : null;
    var sheetName = range ? range.getSheet().getName() : 'Unknown';

    var payload = {
      event: 'SHEET_EDITED',
      sheetName: sheetName,
      row: range ? range.getRow() : null,
      column: range ? range.getColumn() : null,
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
