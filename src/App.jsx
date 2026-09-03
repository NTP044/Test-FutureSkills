import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  ShieldCheck,
  CalendarCheck2,
  MapPin,
  RefreshCw,
  Scissors,
  Smile,
  Footprints,
  Flower2,
  Gem,
  Eye,
  ChevronRight,
  Info,
  Check,
  ArrowRight,
  ReceiptText,
  Lock,
  ExternalLink,
  QrCode,
  Mail,
  FileSpreadsheet
} from 'lucide-react';
import {
  getServices,
  getStaff,
  getAvailability,
  createBooking,
  getBookings,
  cancelBooking,
  getWorkspaceConfig,
} from './api/bookingService.js';
import {
  getCachedToken,
  appendBookingRowToSheet,
  uploadSlipImageToDrive,
  createGoogleCalendarEvent,
} from './services/googleWorkspaceService.js';
import {
  initializeLiff,
  loginWithLine,
  logoutFromLine,
  getLineProfile,
  checkIsInClient,
  getLiffContext,
  isUserLoggedIn,
} from './services/liffService.js';
import LineIcon from './components/LineIcon.jsx';
import LineAuthSection from './components/LineAuthSection.jsx';
import PromptPayModal from './components/PromptPayModal.jsx';
import AdminPanel from './components/AdminPanel/AdminPanel.jsx';
import AdminLoginModal from './components/AdminPanel/AdminLoginModal.jsx';

// Map service icon string to Lucide component
const ServiceIcon = ({ iconName, className = 'w-5 h-5' }) => {
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Footprints':
      return <Footprints className={className} />;
    case 'Smile':
      return <Smile className={className} />;
    case 'Flower2':
      return <Flower2 className={className} />;
    case 'Gem':
      return <Gem className={className} />;
    case 'Eye':
      return <Eye className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

// Thai Date Helpers
const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_DAYS_FULL = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];
const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function formatFullThaiDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = THAI_DAYS_FULL[dateObj.getDay()];
  const monthName = THAI_MONTHS_FULL[month - 1];
  const thaiYear = year + 543;
  return `${dayName}ที่ ${day} ${monthName} ${thaiYear}`;
}

// Generate next 14 days starting from today
function generateDateOptions() {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    dates.push({
      dateStr,
      dayNum: d.getDate(),
      dayShort: THAI_DAYS_SHORT[d.getDay()],
      monthNum: d.getMonth() + 1,
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return dates;
}

export default function App() {
  // Master data from server
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initError, setInitError] = useState(null);

  // Booking Flow State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  // Availability state
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [googleSyncStatus, setGoogleSyncStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Payment & PromptPay Modal
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);

  // Admin Panel & Authentication
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('bloom_admin_logged_in') === 'true';
  });

  // My Bookings Drawer / Modal
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [allBookings, setAllBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');

  // LINE MINI App & LIFF State
  const [liffReady, setLiffReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [lineProfile, setLineProfile] = useState(null);
  const [isInClient, setIsInClient] = useState(false);
  const [liffContext, setLiffContext] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initialize LIFF on mount
  // Requirement: Never call liff.login() automatically on init or page load
  useEffect(() => {
    let isMounted = true;

    async function initLiffApp() {
      try {
        const res = await initializeLiff();
        if (!isMounted) return;

        const inClient = res.isInClient ?? checkIsInClient();
        const logged = res.isLoggedIn ?? isUserLoggedIn();
        const ctx = res.context ?? getLiffContext();

        setIsInClient(inClient);
        setIsLoggedIn(logged);
        setLiffContext(ctx);
        setLiffReady(true);

        // If already logged in (e.g. from previous session or returning from LINE login redirect)
        // fetch profile using liff.getProfile()
        if (logged) {
          const profile = await getLineProfile();
          if (isMounted && profile) {
            setLineProfile(profile);
            // Pre-fill the Customer Name field with LINE display name, keeping it editable
            if (profile.displayName) {
              setCustomerName((prev) => (prev ? prev : profile.displayName));
            }
          }
        }
      } catch (err) {
        console.warn('Error during LIFF init:', err);
        if (isMounted) setLiffReady(true);
      }
    }

    initLiffApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // When Login is clicked, call liff.login()
  const handleLineLogin = () => {
    setIsLoggingIn(true);
    try {
      loginWithLine();
      setTimeout(() => setIsLoggingIn(false), 1200);
    } catch (err) {
      console.error('Error initiating LINE login:', err);
      setIsLoggingIn(false);
      setErrorMessage(
        'ไม่สามารถเข้าสู่ระบบ LINE ได้ในขณะนี้: ' + (err.message || 'โปรดลองใหม่อีกครั้ง')
      );
    }
  };

  // When Logout is clicked, call liff.logout()
  const handleLineLogout = () => {
    try {
      logoutFromLine();
      setIsLoggedIn(false);
      setLineProfile(null);
    } catch (err) {
      console.error('Error during LINE logout:', err);
    }
  };

  // Generated calendar dates
  const calendarDates = useMemo(() => generateDateOptions(), []);

  // Set default date to today on mount
  useEffect(() => {
    if (calendarDates.length > 0 && !selectedDate) {
      setSelectedDate(calendarDates[0].dateStr);
    }
  }, [calendarDates, selectedDate]);

  // Load initial services
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const fetchedServices = await getServices();
        setServices(fetchedServices);
        // Default to first service
        if (fetchedServices.length > 0) {
          setSelectedServiceId(fetchedServices[0].id);
        }
      } catch (err) {
        console.error(err);
        setInitError(err.message || 'ไม่สามารถโหลดข้อมูลบริการได้');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // When selected service changes, load staff who can perform that service
  useEffect(() => {
    if (!selectedServiceId) return;

    async function loadStaffForService() {
      try {
        const staffForService = await getStaff(selectedServiceId);
        setStaffList(staffForService);

        // If currently selected staff cannot do this service, reselect first available staff
        const currentStillValid = staffForService.some(
          (s) => s.id === selectedStaffId
        );
        if (!currentStillValid) {
          if (staffForService.length > 0) {
            setSelectedStaffId(staffForService[0].id);
          } else {
            setSelectedStaffId('');
          }
          // Reset selected time since staff changed
          setSelectedTime('');
        }
      } catch (err) {
        console.error('Error loading staff:', err);
      }
    }

    loadStaffForService();
  }, [selectedServiceId]);

  // When staff or date changes, fetch available time slots
  useEffect(() => {
    if (!selectedStaffId || !selectedDate) {
      setAvailableSlots([]);
      setBookedSlots([]);
      return;
    }

    async function checkSlots() {
      try {
        setLoadingAvailability(true);
        const data = await getAvailability(selectedStaffId, selectedDate);
        setAvailableSlots(data.availableSlots || []);
        setBookedSlots(data.bookedSlots || []);

        // If previously selected time is no longer available, clear it
        if (selectedTime && !data.availableSlots.includes(selectedTime)) {
          setSelectedTime('');
        }
      } catch (err) {
        console.error('Error loading availability:', err);
      } finally {
        setLoadingAvailability(false);
      }
    }

    checkSlots();
  }, [selectedStaffId, selectedDate]);

  // Selected Service & Staff objects
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId]
  );

  const selectedStaff = useMemo(
    () => staffList.find((s) => s.id === selectedStaffId),
    [staffList, selectedStaffId]
  );

  // Form validity check
  const isFormValid = useMemo(() => {
    const cleanPhone = customerPhone.replace(/[\s-]/g, '');
    return (
      selectedServiceId &&
      selectedStaffId &&
      selectedDate &&
      selectedTime &&
      customerName.trim().length >= 2 &&
      cleanPhone.length >= 9 &&
      cleanPhone.length <= 12 &&
      /^\d+$/.test(cleanPhone)
    );
  }, [
    selectedServiceId,
    selectedStaffId,
    selectedDate,
    selectedTime,
    customerName,
    customerPhone,
  ]);

  // Admin auth handlers
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('bloom_admin_logged_in', 'true');
    setShowAdminPanel(true);
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('bloom_admin_logged_in');
    setShowAdminPanel(false);
  };

  // Step 1: When user clicks "จองเลย", open PromptPay Modal
  const handleBookingSubmit = (e) => {
    if (e) e.preventDefault();
    if (!isFormValid || isSubmitting) return;
    setErrorMessage('');
    setShowPromptPayModal(true);
  };

  // Step 2: Final submission from PromptPay Modal (with slip / email / pay later)
  const handleFinalBookingSubmit = async ({ customerEmail, slipBase64, payLater }) => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = {
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        date: selectedDate,
        time: selectedTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        specialRequest: specialRequest.trim(),
        customerEmail: customerEmail?.trim() || null,
        slipBase64: slipBase64 || null,
        paymentStatus: payLater ? 'unpaid' : (slipBase64 ? 'paid_slip' : 'unpaid'),
        lineUserId: lineProfile?.userId || null,
        lineDisplayName: lineProfile?.displayName || null,
      };

      const result = await createBooking(payload);
      setShowPromptPayModal(false);
      const newBooking = result.booking || result;
      setConfirmedBooking(newBooking);
      setGoogleSyncStatus(result.googleSync || null);

      // Background sync to Google Workspace (Sheet & Drive) if connected
      try {
        const token = getCachedToken();
        const wsConfig = await getWorkspaceConfig().catch(() => null);
        if (token && wsConfig?.spreadsheetId) {
          let driveSlipUrl = null;
          if (slipBase64 && wsConfig.driveFolderId) {
            const uploadRes = await uploadSlipImageToDrive(
              token,
              wsConfig.driveFolderId,
              slipBase64,
              newBooking.id
            ).catch(() => null);
            driveSlipUrl = uploadRes?.webViewLink || null;
          }
          const bookingWithSlip = {
            ...newBooking,
            paymentSlipUrl: driveSlipUrl || newBooking.paymentSlipUrl,
          };
          appendBookingRowToSheet(token, wsConfig.spreadsheetId, bookingWithSlip).catch(() => null);
          if (newBooking.date && newBooking.time) {
            createGoogleCalendarEvent(token, bookingWithSlip).catch(() => null);
          }
        }
      } catch (wsErr) {
        console.warn('Workspace background sync error:', wsErr);
      }

      // Refresh availability for current selection
      const updatedAvailability = await getAvailability(
        selectedStaffId,
        selectedDate
      );
      setAvailableSlots(updatedAvailability.availableSlots || []);
      setBookedSlots(updatedAvailability.bookedSlots || []);
      setSelectedTime('');
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.message || 'เกิดข้อผิดพลาดในการจองคิว กรุณาตรวจสอบหรือลองเลือกช่วงเวลาอื่น'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to book another appointment
  const handleBookAnother = () => {
    setConfirmedBooking(null);
    setSelectedTime('');
    setSpecialRequest('');
    setErrorMessage('');
  };

  // Fetch bookings list for the drawer
  const fetchMyBookings = async (phoneFilter = '') => {
    try {
      setLoadingBookings(true);
      const filter = phoneFilter
        ? phoneFilter
        : lineProfile?.userId
        ? { lineUserId: lineProfile.userId }
        : '';
      const data = await getBookings(filter);
      setAllBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const openBookingsDrawer = () => {
    setShowMyBookings(true);
    fetchMyBookings(searchPhone || (lineProfile?.userId ? '' : customerPhone));
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('คุณต้องการยกเลิกการจองคิวนี้ใช่หรือไม่?')) return;
    try {
      await cancelBooking(id);
      await fetchMyBookings(searchPhone || customerPhone);
      // Refresh active availability in case it was on current view
      if (selectedStaffId && selectedDate) {
        const data = await getAvailability(selectedStaffId, selectedDate);
        setAvailableSlots(data.availableSlots || []);
        setBookedSlots(data.bookedSlots || []);
      }
    } catch (err) {
      alert(err.message || 'ไม่สามารถยกเลิกคิวได้');
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-3 border-[#D4A373] border-t-transparent animate-spin mb-4"></div>
        <h2 className="text-xl font-medium text-gray-800 tracking-wide">The Bloom Studio</h2>
        <p className="text-sm text-gray-500 mt-1">กำลังจัดเตรียมข้อมูลบริการและความพร้อม...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-medium text-gray-800">เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-6 py-2.5 bg-[#D4A373] text-white rounded-full text-sm font-medium hover:bg-[#c29060] transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-gray-800 font-sans pb-24">
      {/* Top Floating App Bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-full bg-[#D4A373]/15 flex items-center justify-center text-[#D4A373]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 tracking-tight text-base leading-tight">
                The Bloom Studio
              </h1>
              <span className="text-[11px] text-[#D4A373] font-medium tracking-wide">
                BEAUTY & SPA SANCTUARY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-admin-panel"
              onClick={() => {
                if (isAdminLoggedIn) {
                  setShowAdminPanel(true);
                } else {
                  setShowAdminLogin(true);
                }
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 hover:border-stone-400 transition-all"
              title="ระบบจัดการหลังบ้าน"
            >
              <Lock className="w-3.5 h-3.5 text-stone-700" />
              <span>หลังบ้าน</span>
            </button>

            <button
              id="btn-my-bookings"
              onClick={openBookingsDrawer}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:border-[#D4A373] hover:text-[#D4A373] transition-all"
            >
              <CalendarCheck2 className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>คิวของฉัน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Single Column Container - Mobile First (Max-w-md) */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {/* Hero Header Section */}
        <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#D4A373]/10 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A373]/10 text-[#D4A373] text-xs font-medium mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ระบบจองคิวออนไลน์ 24 ชั่วโมง</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
            จองช่วงเวลาแห่งการปรนนิบัติ
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
            เลือกบริการ ช่างคนโปรด และวันเวลาที่สะดวก เพื่อให้คุณได้รับการดูแลอย่างประณีตที่สุด
          </p>

          {/* Quick trust badges */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4A373] shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-semibold text-gray-800">ช่างมืออาชีพ</p>
                <p className="text-gray-400">ใบเซอร์รับรอง</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4A373] shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-semibold text-gray-800">ตรงต่อเวลา</p>
                <p className="text-gray-400">ล็อกคิวแม่นยำ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-[#D4A373] shrink-0" />
              <div className="text-[11px] leading-tight">
                <p className="font-semibold text-gray-800">เกรดพรีเมียม</p>
                <p className="text-gray-400">ผลิตภัณฑ์นำเข้า</p>
              </div>
            </div>
          </div>
        </section>

        {/* LINE MINI App Auth Section & Profile Card (Under the Hero) */}
        <LineAuthSection
          isLoggedIn={isLoggedIn}
          lineProfile={lineProfile}
          isInClient={isInClient}
          context={liffContext}
          onLogin={handleLineLogin}
          onLogout={handleLineLogout}
          isLoggingIn={isLoggingIn}
        />

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{errorMessage}</p>
              <p className="text-rose-600/80 mt-0.5">กรุณาเลือกช่วงเวลาใหม่ หรือเปลี่ยนช่างที่ต้องการ</p>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: SELECT SERVICE */}
        <section id="step-services" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#D4A373] text-white text-xs font-semibold flex items-center justify-center">
                1
              </span>
              <h3 className="font-semibold text-gray-900 text-base">เลือกบริการ</h3>
            </div>
            <span className="text-xs text-gray-400">
              {services.length} รายการ
            </span>
          </div>

          <div className="space-y-2.5">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  id={`service-${service.id}`}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border text-left min-h-[48px] ${
                    isSelected
                      ? 'border-[#D4A373] bg-[#FAF3EC] ring-1 ring-[#D4A373] shadow-xs'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#D4A373] text-white'
                            : 'bg-gray-50 text-[#D4A373] border border-gray-100'
                        }`}
                      >
                        <ServiceIcon iconName={service.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm leading-snug">
                          {service.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="inline-flex items-center text-gray-500">
                            <Clock className="w-3.5 h-3.5 mr-1 text-[#D4A373]" />
                            {service.durationMinutes} นาที
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="font-semibold text-[#D4A373] text-sm">
                            ฿{service.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-[#D4A373] bg-[#D4A373] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP 2: SELECT STAFF (Filtered by Service) */}
        <section id="step-staff" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#D4A373] text-white text-xs font-semibold flex items-center justify-center">
                2
              </span>
              <h3 className="font-semibold text-gray-900 text-base">เลือกช่างผู้ให้บริการ</h3>
            </div>
            {selectedStaff && (
              <span className="text-xs text-[#D4A373] font-medium">
                เลือก: {selectedStaff.nickname}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">
            แสดงเฉพาะช่างที่เชี่ยวชาญบริการ{' '}
            <span className="text-gray-700 font-medium">
              "{selectedService?.name || 'บริการที่เลือก'}"
            </span>
          </p>

          {/* Horizontal scrollable staff cards */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 px-0.5 -mx-1">
            {staffList.map((member) => {
              const isSelected = selectedStaffId === member.id;
              return (
                <div
                  key={member.id}
                  id={`staff-${member.id}`}
                  onClick={() => setSelectedStaffId(member.id)}
                  className={`shrink-0 w-36 sm:w-40 p-3 rounded-2xl border cursor-pointer text-center transition-all duration-200 min-h-[48px] ${
                    isSelected
                      ? 'bg-[#D4A373] text-white border-[#D4A373] shadow-md transform -translate-y-0.5'
                      : 'bg-white text-gray-800 border-gray-100 hover:border-gray-200 hover:bg-gray-50/70'
                  }`}
                >
                  <div className="relative mx-auto w-16 h-16 mb-2">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className={`w-16 h-16 rounded-full object-cover border-2 shadow-xs ${
                        isSelected ? 'border-white' : 'border-[#D4A373]/30'
                      }`}
                    />
                    <div
                      className={`absolute -bottom-1 right-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs ${
                        isSelected
                          ? 'bg-white text-[#D4A373]'
                          : 'bg-[#D4A373] text-white'
                      }`}
                    >
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>{member.rating}</span>
                    </div>
                  </div>

                  <h4 className="font-medium text-xs truncate">{member.name}</h4>
                  <p
                    className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    {member.role}
                  </p>
                  <p
                    className={`text-[10px] mt-1 font-medium ${
                      isSelected ? 'text-white/90' : 'text-[#D4A373]'
                    }`}
                  >
                    ประสบการณ์ {member.experience}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP 3: SELECT DATE */}
        <section id="step-date" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#D4A373] text-white text-xs font-semibold flex items-center justify-center">
                3
              </span>
              <h3 className="font-semibold text-gray-900 text-base">เลือกวันนัด</h3>
            </div>
            <span className="text-xs text-gray-400">14 วันล่วงหน้า</span>
          </div>

          {/* Highlighted Full Date Header as explicitly requested */}
          <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#D4A373]" />
              <span className="text-xs text-gray-500 font-medium">วันที่เลือก:</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              {formatFullThaiDate(selectedDate)}
            </span>
          </div>

          {/* Horizontal scrollable calendar cards */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 px-0.5 -mx-1">
            {calendarDates.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <button
                  type="button"
                  key={item.dateStr}
                  id={`date-${item.dateStr}`}
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`shrink-0 w-16 py-3 px-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-150 min-h-[48px] ${
                    isSelected
                      ? 'bg-[#D4A373] text-white border-[#D4A373] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      isSelected ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    {item.isToday ? 'วันนี้' : item.dayShort}
                  </span>
                  <span className="text-lg font-bold mt-0.5 leading-none">
                    {item.dayNum}
                  </span>
                  <span
                    className={`text-[10px] mt-1 font-medium ${
                      isSelected ? 'text-white/70' : 'text-gray-400'
                    }`}
                  >
                    {item.monthNum} ก.ย.
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 4: SELECT TIME */}
        <section id="step-time" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-[#D4A373] text-white text-xs font-semibold flex items-center justify-center">
                4
              </span>
              <h3 className="font-semibold text-gray-900 text-base">เลือกเวลา</h3>
            </div>
            {loadingAvailability ? (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> กำลังเช็คคิวว่าง...
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                ว่าง {availableSlots.length} ช่วงเวลา
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">
            คำนวณจากคิวว่างจริงของ{' '}
            <span className="text-gray-800 font-medium">
              {selectedStaff ? selectedStaff.nickname : 'ช่าง'}
            </span>{' '}
            ในวันที่เลือก
          </p>

          {/* Time Slots Grid */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            {availableSlots.length === 0 && !loadingAvailability ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-gray-700">
                  คิวของช่าง {selectedStaff?.nickname} เต็มแล้วในวันนี้
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  กรุณาเลือกวันอื่น หรือเปลี่ยนเป็นช่างท่านอื่นที่ว่าง
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {/* Standard slots */}
                {['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'].map(
                  (timeStr) => {
                    const isBooked = bookedSlots.includes(timeStr);
                    const isSelected = selectedTime === timeStr;

                    if (isBooked) {
                      return (
                        <div
                          key={timeStr}
                          className="py-3 px-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 text-gray-300 text-center min-h-[48px] flex flex-col items-center justify-center cursor-not-allowed select-none"
                        >
                          <span className="text-xs font-normal line-through">
                            {timeStr} น.
                          </span>
                          <span className="text-[9px] text-gray-400">เต็มแล้ว</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        key={timeStr}
                        id={`time-${timeStr.replace(':', '-')}`}
                        onClick={() => setSelectedTime(timeStr)}
                        className={`py-3 px-2 rounded-xl border text-center transition-all duration-150 min-h-[48px] flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#D4A373] text-white border-[#D4A373] shadow-xs'
                            : 'bg-gray-50 text-gray-800 border-gray-100 hover:border-[#D4A373]/40 hover:bg-white'
                        }`}
                      >
                        <span className="text-xs font-medium">{timeStr} น.</span>
                        <span
                          className={`text-[10px] mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-[#D4A373]'
                          }`}
                        >
                          ว่าง
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* STEP 5: CUSTOMER INFORMATION FORM */}
        <section id="step-customer" className="space-y-3 pt-2">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-[#D4A373] text-white text-xs font-semibold flex items-center justify-center">
              5
            </span>
            <h3 className="font-semibold text-gray-900 text-base">ข้อมูลลูกค้า</h3>
          </div>

          <form onSubmit={handleBookingSubmit} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3.5">
            {/* Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="input-customer-name"
                  className="block text-xs font-medium text-gray-700"
                >
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                {lineProfile?.displayName && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#06C755] bg-[#06C755]/10 px-2 py-0.5 rounded-full font-medium">
                    <LineIcon className="w-3 h-3" />
                    <span>ดึงจาก LINE อัตโนมัติ (แก้ไขได้)</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-customer-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="เช่น คุณกมลวรรณ สุขสมบูรณ์"
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] bg-gray-50/50 min-h-[48px]"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="input-customer-phone"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                เบอร์โทรศัพท์ (สำหรับยืนยันคิว) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="input-customer-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] bg-gray-50/50 min-h-[48px]"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                เจ้าหน้าที่จะโทรคอนเฟิร์มคิวล่วงหน้า 1 ชั่วโมง
              </p>
            </div>

            {/* Special Request */}
            <div>
              <label
                htmlFor="input-special-request"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                ความต้องการพิเศษ (ไม่บังคับ)
              </label>
              <textarea
                id="input-special-request"
                rows={2}
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="เช่น โทนสีเล็บที่อยากได้, บริเวณที่ต้องการเน้นเป็นพิเศษ, ผิวบอบบางแพ้ง่าย"
                className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] bg-gray-50/50 resize-none min-h-[72px]"
              />
            </div>
          </form>
        </section>

        {/* STEP 6 & SUMMARY BAR: CONFIRM BUTTON */}
        <section className="pt-2">
          {/* Booking Summary Card */}
          <div className="bg-[#FAF3EC] border border-[#D4A373]/30 rounded-2xl p-4 mb-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-600 pb-2 border-b border-[#D4A373]/15">
              <span>สรุปการจอง:</span>
              <span className="font-semibold text-gray-800">
                {selectedService?.name || '-'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-600 pt-1">
              <div>
                <span className="text-gray-400 block text-[11px]">ช่าง:</span>
                <span className="font-medium text-gray-800">
                  {selectedStaff?.name || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">เวลานัดหมาย:</span>
                <span className="font-medium text-gray-800">
                  {selectedDate && selectedTime
                    ? `${selectedDate} เวลา ${selectedTime} น.`
                    : 'ยังไม่ได้เลือก'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#D4A373]/15">
              <span className="text-gray-500">ยอดชำระที่หน้าร้าน:</span>
              <span className="text-base font-bold text-[#D4A373]">
                ฿{selectedService?.price.toLocaleString() || '0'}
              </span>
            </div>
          </div>

          {/* Confirm Button - Height min 48px */}
          <button
            id="btn-confirm-booking"
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={handleBookingSubmit}
            className={`w-full h-14 min-h-[48px] rounded-2xl font-semibold text-base flex items-center justify-center space-x-2 transition-all duration-200 shadow-md ${
              isFormValid && !isSubmitting
                ? 'bg-[#D4A373] hover:bg-[#c49261] text-white active:scale-[0.99] cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span>กำลังบันทึกคิวของคุณ...</span>
              </>
            ) : (
              <>
                <span>จองเลย</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>

          {!isFormValid && (
            <p className="text-[11px] text-gray-400 text-center mt-2">
              * กรุณาเลือกบริการ ช่าง วันนัด เวลา และกรอกชื่อ-เบอร์โทรศัพท์ให้ครบถ้วน
            </p>
          )}
        </section>

        {/* Footer info */}
        <footer className="pt-6 pb-2 text-center text-gray-400 text-xs space-y-1">
          <p className="font-medium text-gray-500">The Bloom Studio & Spa</p>
          <p className="text-[11px]">
            เปิดบริการทุกวัน 10:00 - 20:30 น. • โทร 02-123-4567
          </p>
          <p className="text-[10px] text-gray-400/80">
            สุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ
          </p>
        </footer>
      </main>

      {/* CONFIRMATION MODAL (จองสำเร็จ สไตล์พรีเมียม) */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-gray-100 shadow-2xl relative overflow-hidden animate-scaleUp">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#D4A373] via-[#e2b992] to-[#D4A373]" />

            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-[#FAF3EC] border-2 border-[#D4A373] text-[#D4A373] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <span className="text-[11px] font-semibold tracking-wider text-[#D4A373] uppercase">
              Confirmation Complete
            </span>
            <h3 className="text-xl font-bold text-gray-900 mt-0.5">
              จองสำเร็จเรียบร้อย!
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              ขอบพระคุณที่ไว้วางใจให้ The Bloom Studio ดูแลคุณ
            </p>

            {/* Booking Details Card */}
            <div className="bg-gray-50 rounded-2xl p-4 my-4 text-left border border-gray-100 text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                <span className="text-gray-400 text-[11px]">รหัสการจอง:</span>
                <span className="font-mono font-bold text-[#D4A373] bg-white px-2 py-0.5 rounded-md border border-gray-100">
                  {confirmedBooking.id}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">บริการ:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {confirmedBooking.serviceName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ช่างดูแล:</span>
                  <span className="font-medium text-gray-800">
                    {confirmedBooking.staffName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">วันนัด:</span>
                  <span className="font-medium text-gray-800">
                    {formatFullThaiDate(confirmedBooking.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">เวลา:</span>
                  <span className="font-bold text-[#D4A373]">
                    {confirmedBooking.time} น.
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200/40">
                  <span className="text-gray-500">ผู้จอง:</span>
                  <span className="text-gray-700">
                    {confirmedBooking.customerName} ({confirmedBooking.customerPhone})
                  </span>
                </div>
                {confirmedBooking.specialRequest && (
                  <div className="pt-1">
                    <span className="text-gray-400 text-[10px] block">คำขอพิเศษ:</span>
                    <span className="text-gray-600 text-[11px] italic">
                      "{confirmedBooking.specialRequest}"
                    </span>
                  </div>
                )}
              </div>

              {/* Google Integration & Drive Badges */}
              <div className="pt-2 border-t border-stone-200/60 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>บันทึกลง Google Sheet อัตโนมัติ</span>
                </div>
                {confirmedBooking.slipUrl && (
                  <div className="flex items-center justify-between text-blue-700 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>อัปโหลดสลิปขึ้น Google Drive แล้ว</span>
                    </span>
                    {confirmedBooking.slipUrl.includes('http') && (
                      <a
                        href={confirmedBooking.slipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] underline hover:text-blue-900"
                      >
                        ดูรูปสลิป
                      </a>
                    )}
                  </div>
                )}
                {confirmedBooking.calendarEventId && (
                  <div className="flex items-center gap-1.5 text-purple-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>เพิ่มนัดหมายใน Google Calendar เรียบร้อย</span>
                  </div>
                )}
                {confirmedBooking.customerEmail && (
                  <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>ส่งอีเมลแจ้งเตือนถึง {confirmedBooking.customerEmail} แล้ว</span>
                  </div>
                )}
              </div>
            </div>

            {/* Advisory notice */}
            <p className="text-[11px] text-gray-500 mb-5 leading-relaxed bg-[#FAF9F6] p-2.5 rounded-xl border border-gray-100">
              📍 กรุณามาถึงสตูดิโอก่อนเวลา 10-15 นาที เพื่อรับเครื่องดื่มต้อนรับและเตรียมพร้อม
            </p>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                id="btn-modal-close"
                onClick={handleBookAnother}
                className="w-full py-3 px-4 rounded-xl bg-[#D4A373] text-white font-medium text-sm hover:bg-[#c49261] transition-colors min-h-[48px] shadow-sm"
              >
                เสร็จสิ้น / ทำการจองใหม่
              </button>
              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  openBookingsDrawer();
                }}
                className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-800 font-medium"
              >
                ดูประวัติคิวการจองทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PromptPay & Slip Upload Modal */}
      <PromptPayModal
        isOpen={showPromptPayModal}
        onClose={() => setShowPromptPayModal(false)}
        bookingDetails={{
          serviceName: selectedService?.name,
          servicePrice: selectedService?.price,
          staffName: selectedStaff?.name,
          date: selectedDate,
          time: selectedTime,
          customerName,
          customerPhone,
        }}
        onConfirmBooking={handleFinalBookingSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Admin Login Modal (PIN Pad) */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Panel Fullscreen Overlay */}
      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          onLogout={handleAdminLogout}
        />
      )}

      {/* MY BOOKINGS DRAWER / MODAL */}
      {showMyBookings && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ReceiptText className="w-5 h-5 text-[#D4A373]" />
                <h3 className="font-semibold text-gray-900 text-base">
                  คิวการจองในระบบ
                </h3>
              </div>
              <button
                onClick={() => setShowMyBookings(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter by phone */}
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <input
                type="tel"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="ค้นหาด้วยเบอร์โทร เช่น 0812345678"
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-[#D4A373]"
              />
              <button
                onClick={() => fetchMyBookings(searchPhone)}
                className="px-3 py-2 bg-[#D4A373] text-white text-xs rounded-lg font-medium hover:bg-[#c49261]"
              >
                ค้นหา
              </button>
              {searchPhone && (
                <button
                  onClick={() => {
                    setSearchPhone('');
                    fetchMyBookings('');
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1"
                >
                  ล้าง
                </button>
              )}
            </div>

            {/* Bookings List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {loadingBookings ? (
                <div className="py-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4A373]" />
                  <p className="text-xs">กำลังโหลดข้อมูลคิว...</p>
                </div>
              ) : allBookings.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <CalendarCheck2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs">ยังไม่มีรายการจองในระบบ</p>
                </div>
              ) : (
                allBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                      b.status === 'cancelled'
                        ? 'bg-gray-50/70 border-gray-200 opacity-60'
                        : 'bg-white border-gray-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {b.id}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          b.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {b.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'ยืนยันคิวแล้ว'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">
                        {b.serviceName}
                      </h4>
                      <div className="flex items-center gap-2 text-gray-500 mt-1">
                        <span>ช่าง: {b.staffName}</span>
                        <span>•</span>
                        <span className="font-medium text-[#D4A373]">
                          {b.date} เวลา {b.time} น.
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500">
                      <span>ผู้จอง: {b.customerName} ({b.customerPhone})</span>
                      {b.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="text-rose-500 hover:text-rose-700 text-[11px] underline"
                        >
                          ยกเลิกคิว
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
