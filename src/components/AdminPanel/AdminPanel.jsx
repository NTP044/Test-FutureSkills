import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Users,
  UserCheck,
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ExternalLink,
  Copy,
  Check,
  Mail,
  Calendar,
  Send,
  Sliders,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  ChevronRight,
  Eye,
  Layers,
  FolderOpen,
  ShieldCheck,
  X,
  Phone,
  User,
} from 'lucide-react';
import CalendarView from './CalendarView';
import SlipViewerModal from './SlipViewerModal';
import {
  getAdminOverview,
  getBookings,
  getServices,
  getStaff,
  getAdminCustomers,
  updateBookingStatus,
  deleteBooking,
  addService,
  updateService,
  deleteService,
  addStaff,
  updateStaff,
  deleteStaff,
  getGasConfig,
  saveGasConfig,
  testGasConnection,
  initGoogleSheet,
  getGasCode,
  syncGoogleSheet,
  pushAllToGoogleSheet,
  subscribeToRealtimeEvents,
  getWorkspaceConfig,
  saveWorkspaceConfig,
  getWorkspaceExportData,
} from '../../api/bookingService';
import {
  requestGoogleAccessToken,
  getCachedToken,
  fetchGoogleUserProfile,
  createFullStudioSpreadsheet,
  getOrCreateDriveFolder,
  clearCachedToken,
} from '../../services/googleWorkspaceService';

export default function AdminPanel({ isOpen, onClose, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, bookings, services, staff, customers, gas
  const [bookingsViewMode, setBookingsViewMode] = useState('list'); // list or calendar
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [realtimeState, setRealtimeState] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Data states
  const [overview, setOverview] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [gasConfig, setGasConfig] = useState({
    webAppUrl: '',
    ownerEmail: 'NatapongMumklang@gmail.com',
    promptpayPhone: '0812345678',
    promptpayName: 'The Bloom Studio',
  });

  // Google Workspace 1-Click states
  const [workspaceConfig, setWorkspaceConfig] = useState({
    spreadsheetId: '',
    spreadsheetUrl: '',
    driveFolderId: '',
    connectedEmail: '',
    lastSyncAt: null,
  });
  const [googleUser, setGoogleUser] = useState(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSettingUpSheet, setIsSettingUpSheet] = useState(false);
  const [setupProgressMsg, setSetupProgressMsg] = useState('');

  // Filter states for Bookings
  const [filterDate, setFilterDate] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals inside Admin
  const [selectedSlipBooking, setSelectedSlipBooking] = useState(null);
  const [serviceModal, setServiceModal] = useState({ open: false, data: null });
  const [staffModal, setStaffModal] = useState({ open: false, data: null });
  const [customerHistoryModal, setCustomerHistoryModal] = useState({ open: false, customer: null });

  // GAS setup tab states
  const [gasCode, setGasCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [gasTestResult, setGasTestResult] = useState(null);
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [gasSaveMsg, setGasSaveMsg] = useState('');

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadAllAdminData();
    }
  }, [isOpen]);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [ovData, bkData, svData, stData, csData, cfgData, wsData] = await Promise.all([
        getAdminOverview().catch(() => null),
        getBookings().catch(() => []),
        getServices().catch(() => []),
        getStaff().catch(() => []),
        getAdminCustomers().catch(() => []),
        getGasConfig().catch(() => ({})),
        getWorkspaceConfig().catch(() => ({})),
      ]);

      if (ovData) setOverview(ovData);
      if (bkData) setBookings(bkData);
      if (svData) setServices(svData);
      if (stData) setStaff(stData);
      if (csData) setCustomers(csData);
      if (cfgData) setGasConfig((prev) => ({ ...prev, ...cfgData }));
      if (wsData) {
        setWorkspaceConfig((prev) => ({ ...prev, ...wsData }));
        if (wsData.spreadsheetId || wsData.spreadsheetUrl) {
          setIsGoogleConnected(true);
        }
      }

      // Check cached Google token if available
      const token = getCachedToken();
      if (token) {
        fetchGoogleUserProfile(token)
          .then((profile) => {
            if (profile?.email) {
              setGoogleUser(profile);
              setIsGoogleConnected(true);
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-Time SSE Subscription for Admin Live Updates
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToRealtimeEvents(
      (event) => {
        const { type } = event;

        // Auto-refresh relevant data when any event happens
        if (
          type === 'BOOKING_CREATED' ||
          type === 'BOOKING_UPDATED' ||
          type === 'BOOKING_CANCELLED' ||
          type === 'SHEET_SYNCED' ||
          type === 'WEBHOOK_TRIGGERED'
        ) {
          getBookings().then(setBookings).catch(() => {});
          getAdminOverview().then(setOverview).catch(() => {});
          getAdminCustomers().then(setCustomers).catch(() => {});
        }

        if (type === 'SERVICES_UPDATED' || type === 'SHEET_SYNCED') {
          getServices().then(setServices).catch(() => {});
        }

        if (type === 'STAFF_UPDATED' || type === 'SHEET_SYNCED') {
          getStaff().then(setStaff).catch(() => {});
        }

        if (type === 'CONFIG_UPDATED') {
          getGasConfig().then((cfg) => setGasConfig((prev) => ({ ...prev, ...cfg }))).catch(() => {});
        }
      },
      (status) => {
        setRealtimeState(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const handlePushAllToSheet = async () => {
    setIsPushing(true);
    setSyncSuccessMsg('');
    try {
      const res = await pushAllToGoogleSheet();
      setSyncSuccessMsg(res.message || 'ส่งข้อมูลทั้งหมดขึ้น Google Sheet สำเร็จ');
      setTimeout(() => setSyncSuccessMsg(''), 4000);
      await loadAllAdminData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg('');
    try {
      const res = await syncGoogleSheet();
      await loadAllAdminData();
      setSyncSuccessMsg(res.message || 'ซิงค์ข้อมูลสำเร็จ');
      setTimeout(() => setSyncSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
      setSyncSuccessMsg('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      getAdminOverview().then(setOverview).catch(() => {});
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + err.message);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm(`คุณต้องการยกเลิก/ลบรายการจองรหัส ${bookingId} หรือไม่?`)) return;
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      getAdminOverview().then(setOverview).catch(() => {});
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบรายการจอง: ' + err.message);
    }
  };

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterStaff && b.staffId !== filterStaff) return false;
    if (filterDate && b.date !== filterDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = b.customerName?.toLowerCase().includes(q);
      const matchPhone = b.customerPhone?.includes(q);
      const matchId = b.id?.toLowerCase().includes(q);
      const matchService = b.serviceName?.toLowerCase().includes(q);
      return matchName || matchPhone || matchId || matchService;
    }
    return true;
  });

  // Services CRUD
  const handleSaveService = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const price = Number(form.price.value);
    const durationMinutes = Number(form.durationMinutes.value);
    const category = form.category.value;
    const description = form.description.value.trim();

    try {
      if (serviceModal.data?.id) {
        await updateService(serviceModal.data.id, { name, price, durationMinutes, category, description });
      } else {
        await addService({ name, price, durationMinutes, category, description });
      }
      setServiceModal({ open: false, data: null });
      const updated = await getServices();
      setServices(updated);
    } catch (err) {
      alert(err.message || 'บันทึกบริการไม่สำเร็จ');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('คุณต้องการลบบริการนี้หรือไม่?')) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message || 'ลบบริการไม่สำเร็จ');
    }
  };

  // Staff CRUD
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const nickname = form.nickname.value.trim();
    const role = form.role.value.trim();
    const experience = form.experience.value.trim();
    const avatar = form.avatar.value.trim();
    const bio = form.bio.value.trim();

    const selectedServiceCheckboxes = Array.from(form.querySelectorAll('input[name="staffServices"]:checked')).map(
      (cb) => cb.value
    );

    try {
      if (staffModal.data?.id) {
        await updateStaff(staffModal.data.id, {
          name,
          nickname,
          role,
          experience,
          avatar,
          bio,
          services: selectedServiceCheckboxes,
        });
      } else {
        await addStaff({
          name,
          nickname,
          role,
          experience,
          avatar,
          bio,
          services: selectedServiceCheckboxes,
        });
      }
      setStaffModal({ open: false, data: null });
      const updated = await getStaff();
      setStaff(updated);
    } catch (err) {
      alert(err.message || 'บันทึกข้อมูลช่างไม่สำเร็จ');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลช่างท่านนี้หรือไม่?')) return;
    try {
      await deleteStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message || 'ลบข้อมูลช่างไม่สำเร็จ');
    }
  };

  // GAS Setup Tab Helpers
  const handleLoadGasCode = async () => {
    try {
      const code = await getGasCode();
      setGasCode(code);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleTestGasConnection = async () => {
    setIsTestingGas(true);
    setGasTestResult(null);
    try {
      const res = await testGasConnection(gasConfig.webAppUrl);
      setGasTestResult({ success: true, message: res.message || 'เชื่อมต่อ Web App สำเร็จ 100%' });
    } catch (err) {
      setGasTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingGas(false);
    }
  };

  // 1-Click Google Workspace Full Auto Setup
  const handle1ClickSetupSheet = async () => {
    setIsSettingUpSheet(true);
    setSetupProgressMsg('กำลังเตรียมการเชื่อมต่อ Google Workspace...');
    try {
      let token = getCachedToken();
      if (!token) {
        setSetupProgressMsg('กำลังเปิดหน้าต่างลงชื่อเข้าใช้ Google เพื่อยืนยันสิทธิ์...');
        const authResult = await requestGoogleAccessToken();
        token = authResult.accessToken;
      }

      setSetupProgressMsg('ตรวจสอบบัญชีสำเร็จ กำลังดึงข้อมูลโปรไฟล์ Google...');
      let profile = null;
      try {
        profile = await fetchGoogleUserProfile(token);
        if (profile) setGoogleUser(profile);
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }

      setSetupProgressMsg('กำลังสร้าง Google Sheet พร้อมโครงสร้าง 5 Tabs สมบูรณ์ (Bookings, Services, Staff, Customers, Settings)...');
      const exportData = await getWorkspaceExportData();
      const sheetResult = await createFullStudioSpreadsheet(token, exportData);

      setSetupProgressMsg('กำลังสร้างโฟลเดอร์สำหรับเก็บสลิปการโอนเงินใน Google Drive (Bloom_Studio_Slips)...');
      let folder = null;
      try {
        folder = await getOrCreateDriveFolder(token, 'Bloom_Studio_Slips');
      } catch (fErr) {
        console.warn('Drive folder creation warning:', fErr);
      }

      setSetupProgressMsg('กำลังบันทึกสถานะการเชื่อมต่อไปยังระบบ The Bloom Studio...');
      const newConfig = {
        spreadsheetId: sheetResult.spreadsheetId,
        spreadsheetUrl: sheetResult.spreadsheetUrl,
        driveFolderId: folder?.id || '',
        connectedEmail: profile?.email || gasConfig.ownerEmail || 'NatapongMumklang@gmail.com',
      };
      await saveWorkspaceConfig(newConfig);
      setWorkspaceConfig(newConfig);
      setIsGoogleConnected(true);

      setSetupProgressMsg('✨ สร้าง Google Sheet ครบทั้ง 5 Tabs และเชื่อมต่อระบบสำเร็จ 100%!');
      setTimeout(() => setSetupProgressMsg(''), 7000);
    } catch (err) {
      console.error('1-Click setup error:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Google: ' + (err.message || err));
      setSetupProgressMsg('');
    } finally {
      setIsSettingUpSheet(false);
    }
  };

  const handleSyncAllToSheet = async () => {
    if (!workspaceConfig.spreadsheetId) {
      return handle1ClickSetupSheet();
    }
    setIsSyncing(true);
    try {
      let token = getCachedToken();
      if (!token) {
        const authResult = await requestGoogleAccessToken();
        token = authResult.accessToken;
      }
      const exportData = await getWorkspaceExportData();
      await createFullStudioSpreadsheet(token, exportData, workspaceConfig.spreadsheetId);
      setSyncSuccessMsg('ซิงค์ข้อมูลล่าสุดไปยัง Google Sheet ทั้ง 5 Tabs สำเร็จเรียบร้อย');
      setTimeout(() => setSyncSuccessMsg(''), 4000);
    } catch (err) {
      alert('การซิงค์ข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInitSheet = async () => {
    if (gasConfig.webAppUrl) {
      try {
        const res = await initGoogleSheet();
        alert(res.message || 'สร้างชีตและคอลัมน์สำเร็จ!');
        return;
      } catch (err) {
        console.warn('GAS init fallback to 1-Click:', err);
      }
    }
    await handle1ClickSetupSheet();
  };

  const handleDisconnectWorkspace = async () => {
    if (!window.confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ Google Sheet หรือไม่?')) return;
    clearCachedToken();
    setGoogleUser(null);
    setIsGoogleConnected(false);
    const emptyConfig = {
      spreadsheetId: '',
      spreadsheetUrl: '',
      driveFolderId: '',
      connectedEmail: '',
    };
    await saveWorkspaceConfig(emptyConfig);
    setWorkspaceConfig(emptyConfig);
  };

  const handleSaveGasConfig = async (e) => {
    e.preventDefault();
    try {
      await saveGasConfig(gasConfig);
      setGasSaveMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      setTimeout(() => setGasSaveMsg(''), 3000);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 text-stone-800 overflow-hidden animate-fadeIn select-none">
      {/* Responsive Top Navbar */}
      <header className="h-14 sm:h-16 bg-stone-900 text-white flex items-center justify-between px-3 sm:px-6 shadow-md shrink-0 z-10">
        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="font-bold text-sm sm:text-base font-serif tracking-wide truncate">
                The Bloom Studio
              </h2>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 uppercase shrink-0">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-stone-400 truncate hidden sm:block">
              ระบบจัดการหลังบ้าน & Google Sheet Database
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Real-time Indicator */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold ${
              realtimeState === 'connected'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : realtimeState === 'connecting'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}
            title="สถานะ Real-Time SSE สองทิศทาง"
          >
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                realtimeState === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : realtimeState === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="hidden xs:inline sm:inline">
              {realtimeState === 'connected' ? 'Real-Time' : 'Connecting'}
            </span>
          </div>

          {/* Quick Pull Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 text-xs rounded-xl border border-stone-700 transition-colors cursor-pointer"
            title="ดึงข้อมูลล่าสุดจาก Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden md:inline">ดึงข้อมูลจากชีต</span>
          </button>

          {/* Close & Back to Store */}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
            title="กลับไปหน้าจองคิวของลูกค้า"
          >
            หน้าร้าน
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 sm:p-2 text-stone-400 hover:text-red-400 active:text-red-300 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
            title="ออกจากระบบแอดมิน"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Sync banner message if any */}
      {syncSuccessMsg && (
        <div className="bg-emerald-600 text-white px-4 py-1 text-xs text-center font-medium flex items-center justify-center gap-2 animate-fadeIn shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Main Layout (Desktop Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar Tabs */}
        <aside className="w-56 bg-white border-r border-stone-200 p-3 flex flex-col justify-between shrink-0 hidden sm:flex overflow-y-auto">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ภาพรวม (Dashboard)</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-4 h-4" />
                <span>รายการจองคิว</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'bookings' ? 'bg-stone-700 text-amber-300' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>บริการในร้าน ({services.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ช่างประจำร้าน ({staff.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>ประวัติลูกค้า ({customers.length})</span>
            </button>

            <div className="pt-3 border-t border-stone-100 my-2" />

            <button
              onClick={() => {
                setActiveTab('gas');
                handleLoadGasCode();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'gas'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ตั้งค่า Google Sheet</span>
            </button>
          </nav>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-500">
            <div className="font-semibold text-stone-800 mb-0.5">ร้าน The Bloom Studio</div>
            <div>พร้อมเพย์: {gasConfig.promptpayPhone}</div>
            <div className="truncate text-stone-400 mt-0.5">อีเมล: {gasConfig.ownerEmail}</div>
          </div>
        </aside>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 flex justify-around p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`p-2 flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">ภาพรวม</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`p-2 flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer relative ${
              activeTab === 'bookings'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">คิวจอง</span>
            {bookings.length > 0 && (
              <span className="absolute top-1 right-3 px-1.5 py-0.2 text-[8px] bg-stone-900 text-amber-300 rounded-full font-bold">
                {bookings.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`p-2 flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">บริการ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`p-2 flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">ช่าง</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`p-2 flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">ลูกค้า</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('gas');
              handleLoadGasCode();
            }}
            className={`p-2 flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'gas'
                ? 'text-emerald-800 font-bold bg-emerald-50'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Sheet</span>
          </button>
        </div>

        {/* Tab Content Area (with pb-28 on mobile to ensure no button is covered by bottom nav) */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
                  ภาพรวมระบบร้าน (Overview)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  สรุปสถิติการจอง รายได้ และประสิทธิภาพการทำงานของร้านวันนี้
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-xs text-stone-500 font-medium">จองวันนี้</span>
                    <h4 className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">{overview?.todayCount || 0} คิว</h4>
                    <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium truncate block">
                      วันนี้: {overview?.todayRevenue?.toLocaleString() || 0} ฿
                    </span>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-xs text-stone-500 font-medium">รอบสัปดาห์</span>
                    <h4 className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">{overview?.weekCount || 0} คิว</h4>
                    <span className="text-[10px] sm:text-[11px] text-stone-400">7 วันที่ผ่านมา</span>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
                  <div className="min-w-0">
                    <span className="text-xs text-stone-500 font-medium">รายได้รวมประมาณการ</span>
                    <h4 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">
                      {overview?.estimatedRevenue?.toLocaleString() || 0} ฿
                    </h4>
                    <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">คิวที่ยืนยัน/มีสลิป</span>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
                  <div className="min-w-0">
                    <span className="text-xs text-stone-500 font-medium">ช่างคิวยอดนิยม</span>
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 mt-0.5 truncate">
                      {overview?.busiestStaff?.name || 'ยังไม่มีข้อมูล'}
                    </h4>
                    <span className="text-[10px] sm:text-[11px] text-stone-500">
                      {overview?.busiestStaff?.count || 0} คิวจอง
                    </span>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 mb-3">สถานะรายการจองทั้งหมด</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                    <span className="text-[11px] sm:text-xs text-amber-800 font-medium">รอยืนยัน</span>
                    <div className="text-lg sm:text-xl font-bold text-amber-900 mt-0.5">
                      {overview?.statusCounts?.pending || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60">
                    <span className="text-[11px] sm:text-xs text-emerald-800 font-medium">ยืนยันแล้ว</span>
                    <div className="text-lg sm:text-xl font-bold text-emerald-900 mt-0.5">
                      {overview?.statusCounts?.confirmed || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60">
                    <span className="text-[11px] sm:text-xs text-blue-800 font-medium">เสร็จสิ้น</span>
                    <div className="text-lg sm:text-xl font-bold text-blue-900 mt-0.5">
                      {overview?.statusCounts?.completed || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-200">
                    <span className="text-[11px] sm:text-xs text-stone-600 font-medium">ยกเลิกแล้ว</span>
                    <div className="text-lg sm:text-xl font-bold text-stone-800 mt-0.5">
                      {overview?.statusCounts?.cancelled || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Ranking Section */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 mb-3">สถิติคิวงานแยกตามช่าง</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {overview?.staffRanking?.map((st) => (
                    <div key={st.staffId} className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center gap-3">
                      <img
                        src={st.avatar}
                        alt={st.name}
                        className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-stone-900 truncate">{st.name}</div>
                        <div className="text-[11px] text-stone-500">
                          {st.count} คิว • {st.totalRevenue.toLocaleString()} ฿
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKINGS (MOBILE CARDS + DESKTOP TABLE & CALENDAR) */}
          {activeTab === 'bookings' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900">จัดการรายการจอง</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    ตรวจสอบคิว เปลี่ยนสถานะ ดูสลิปโอนเงิน และซิงค์ Google Sheet
                  </p>
                </div>

                {/* View Switcher: List vs Calendar */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setBookingsViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      bookingsViewMode === 'list'
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    รายการ (List)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingsViewMode('calendar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      bookingsViewMode === 'calendar'
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    ปฏิทิน (Calendar)
                  </button>
                </div>
              </div>

              {bookingsViewMode === 'calendar' ? (
                <CalendarView
                  bookings={bookings}
                  staff={staff}
                  onViewSlip={(b) => setSelectedSlipBooking(b)}
                  onUpdateStatus={handleStatusChange}
                  onBookingChanged={loadAllAdminData}
                />
              ) : (
                <>
                  {/* Filters Bar */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">ค้นหา (ชื่อ/เบอร์/รหัส)</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="ค้นหา..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">กรองสถานะ</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                      >
                        <option value="all">ทั้งหมด ทุกสถานะ</option>
                        <option value="pending">รอยืนยัน (Pending)</option>
                        <option value="confirmed">ยืนยันแล้ว (Confirmed)</option>
                        <option value="completed">เสร็จสิ้น (Completed)</option>
                        <option value="cancelled">ยกเลิกแล้ว (Cancelled)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">กรองตามช่าง</label>
                      <select
                        value={filterStaff}
                        onChange={(e) => setFilterStaff(e.target.value)}
                        className="w-full px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                      >
                        <option value="">ช่างทุกคน</option>
                        {staff.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">กรองตามวัน</label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                      >
                      </input>
                    </div>
                  </div>

                  {/* MOBILE BOOKING CARDS (sm:hidden) */}
                  <div className="sm:hidden space-y-3">
                    {filteredBookings.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
                        ไม่พบรายการจองที่ตรงกับเงื่อนไข
                      </div>
                    ) : (
                      filteredBookings.map((b) => (
                        <div
                          key={b.id}
                          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3"
                        >
                          {/* Card Header: ID, Status, Price */}
                          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                                {b.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                                  b.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.status === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : b.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {b.status === 'confirmed'
                                  ? 'ยืนยันแล้ว'
                                  : b.status === 'completed'
                                  ? 'เสร็จสิ้น'
                                  : b.status === 'cancelled'
                                  ? 'ยกเลิก'
                                  : 'รอยืนยัน'}
                              </span>
                            </div>
                            <span className="text-sm font-extrabold text-amber-800 font-serif">
                              {Number(b.servicePrice || 0).toLocaleString()} ฿
                            </span>
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center justify-between text-xs text-stone-700">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              <span className="font-semibold">{b.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>{b.time} น.</span>
                            </div>
                          </div>

                          {/* Service & Staff */}
                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-stone-900">{b.serviceName}</div>
                            <div className="text-stone-500 flex items-center gap-1 text-[11px]">
                              <span>ช่างผู้ดูแล:</span>
                              <strong className="text-stone-800">{b.staffName}</strong>
                              <span>({b.serviceDuration || 60} นาที)</span>
                            </div>
                          </div>

                          {/* Customer info & Call Button */}
                          <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-stone-900">{b.customerName}</div>
                              <a
                                href={`tel:${b.customerPhone}`}
                                className="text-stone-600 hover:text-amber-800 font-mono text-[11px] flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-stone-400" />
                                <span>{b.customerPhone}</span>
                              </a>
                            </div>
                            <a
                              href={`tel:${b.customerPhone}`}
                              className="px-3 py-1.5 bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 rounded-xl text-xs font-semibold flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>โทร</span>
                            </a>
                          </div>

                          {/* Special Request */}
                          {b.specialRequest && (
                            <p className="text-[11px] text-stone-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-200/40">
                              หมายเหตุ: {b.specialRequest}
                            </p>
                          )}

                          {/* Action Footer on Mobile */}
                          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                            {/* Status Change Dropdown */}
                            <div className="flex-1 min-w-[130px]">
                              <select
                                value={b.status}
                                onChange={(e) => handleStatusChange(b.id, e.target.value)}
                                className="w-full text-xs font-semibold rounded-xl px-2.5 py-2 border border-stone-300 bg-white text-stone-800 focus:ring-1 focus:ring-stone-900 shadow-2xs"
                              >
                                <option value="pending">รอยืนยัน (Pending)</option>
                                <option value="confirmed">ยืนยันแล้ว (Confirmed)</option>
                                <option value="completed">เสร็จสิ้น (Completed)</option>
                                <option value="cancelled">ยกเลิก (Cancelled)</option>
                              </select>
                            </div>

                            {/* View Slip Button */}
                            {b.slipUrl && (
                              <button
                                type="button"
                                onClick={() => setSelectedSlipBooking(b)}
                                className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-300 flex items-center gap-1 transition-colors"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <span>สลิป</span>
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-2 text-stone-400 hover:text-rose-600 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors"
                              title="ยกเลิก/ลบคิว"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* DESKTOP BOOKINGS TABLE (hidden sm:block) */}
                  <div className="hidden sm:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                          <tr>
                            <th className="p-3.5">รหัสจอง</th>
                            <th className="p-3.5">วัน/เวลา</th>
                            <th className="p-3.5">บริการ</th>
                            <th className="p-3.5">ช่าง</th>
                            <th className="p-3.5">ลูกค้า</th>
                            <th className="p-3.5">การชำระเงิน</th>
                            <th className="p-3.5">สถานะ</th>
                            <th className="p-3.5 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-700">
                          {filteredBookings.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-12 text-center text-stone-400">
                                ไม่พบรายการจองที่ตรงกับเงื่อนไข
                              </td>
                            </tr>
                          ) : (
                            filteredBookings.map((b) => (
                              <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                                <td className="p-3.5 font-mono font-bold text-stone-900">{b.id}</td>
                                <td className="p-3.5">
                                  <div className="font-semibold text-stone-800">{b.date}</div>
                                  <div className="text-[11px] text-amber-700 font-medium">{b.time} น.</div>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-medium text-stone-900">{b.serviceName}</div>
                                  <div className="text-[11px] text-stone-500">
                                    {Number(b.servicePrice || 0).toLocaleString()} ฿ • {b.serviceDuration || 60} น.
                                  </div>
                                </td>
                                <td className="p-3.5 font-medium text-stone-800">{b.staffName}</td>
                                <td className="p-3.5">
                                  <div className="font-bold text-stone-900">{b.customerName}</div>
                                  <div className="text-[11px] text-stone-500 font-mono">{b.customerPhone}</div>
                                  {b.customerEmail && (
                                    <div className="text-[10px] text-blue-600 truncate max-w-[120px]">{b.customerEmail}</div>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  {b.slipUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSlipBooking(b)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold border border-emerald-200 transition-colors cursor-pointer"
                                    >
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      <span>ดูสลิป</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-stone-400">จ่ายหน้าร้าน</span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <select
                                    value={b.status}
                                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
                                    className="text-[11px] font-semibold rounded-lg px-2 py-1 border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800 cursor-pointer"
                                  >
                                    <option value="pending">รอยืนยัน</option>
                                    <option value="confirmed">ยืนยันแล้ว</option>
                                    <option value="completed">เสร็จสิ้น</option>
                                    <option value="cancelled">ยกเลิก</option>
                                  </select>
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {b.calendarEventId && (
                                      <span
                                        className="text-[10px] text-stone-400"
                                        title="บันทึกใน Google Calendar แล้ว"
                                      >
                                        📅
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBooking(b.id)}
                                      className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                      title="ยกเลิก/ลบการจอง"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900">บริการสปาและความงาม</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    เพิ่ม แก้ไข และลบบริการในร้าน ซึ่งจะซิงค์กับ Google Sheet และหน้าจอง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceModal({ open: true, data: null })}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มบริการใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                          {svc.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setServiceModal({ open: true, data: svc })}
                            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(svc.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm sm:text-base">{svc.name}</h4>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{svc.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <span className="text-xs text-stone-500">{svc.durationMinutes} นาที</span>
                      <span className="text-base font-extrabold text-amber-800 font-serif">
                        {svc.price.toLocaleString()} ฿
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STAFF */}
          {activeTab === 'staff' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900">ช่างและผู้เชี่ยวชาญ</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    จัดการข้อมูลช่าง บริการที่ทำได้ และรูปโปรไฟล์
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffModal({ open: true, data: null })}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มช่างใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
                {staff.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-3.5 justify-between"
                  >
                    <div className="flex gap-3.5 min-w-0">
                      <img
                        src={st.avatar}
                        alt={st.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-stone-200 shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-stone-900 text-sm sm:text-base truncate">{st.name}</h4>
                          <span className="text-xs text-stone-500">({st.nickname})</span>
                        </div>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">{st.role}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">ประสบการณ์ {st.experience}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {st.services.map((sid) => {
                            const matchedSvc = services.find((s) => s.id === sid);
                            return (
                              <span
                                key={sid}
                                className="px-2 py-0.5 text-[10px] bg-stone-100 text-stone-600 rounded font-medium"
                              >
                                {matchedSvc?.name || sid}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <button
                        type="button"
                        onClick={() => setStaffModal({ open: true, data: st })}
                        className="flex-1 sm:flex-initial p-2 text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-xl transition-colors border border-stone-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden">แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(st.id)}
                        className="flex-1 sm:flex-initial p-2 text-stone-400 hover:text-red-600 active:bg-stone-100 rounded-xl transition-colors border border-stone-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden">ลบ</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900">ฐานข้อมูลและประวัติลูกค้า</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  รายชื่อลูกค้าทั้งหมด ประวัติการใช้บริการ ยอดเงินสะสม และข้อมูลการติดต่อ
                </p>
              </div>

              {/* MOBILE CUSTOMER CARDS (sm:hidden) */}
              <div className="sm:hidden space-y-3">
                {customers.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
                    ยังไม่มีข้อมูลลูกค้า
                  </div>
                ) : (
                  customers.map((c, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-stone-900 text-sm">{c.name}</div>
                        <span className="text-xs font-bold text-emerald-700 font-serif">
                          {c.totalSpent.toLocaleString()} ฿
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-stone-600">
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-1 font-mono text-stone-800 hover:text-amber-800 font-medium"
                        >
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{c.phone}</span>
                        </a>
                        <span className="text-stone-500">จอง {c.totalBookings} ครั้ง</span>
                      </div>

                      {c.email && (
                        <div className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-stone-400" />
                          <span>{c.email}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-stone-400">ล่าสุด: {c.lastVisitDate}</span>
                        <button
                          type="button"
                          onClick={() => setCustomerHistoryModal({ open: true, customer: c })}
                          className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
                        >
                          ดูประวัติ ({c.history.length})
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP CUSTOMER TABLE (hidden sm:block) */}
              <div className="hidden sm:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                      <tr>
                        <th className="p-3.5">ลูกค้า</th>
                        <th className="p-3.5">เบอร์โทรศัพท์</th>
                        <th className="p-3.5">อีเมล</th>
                        <th className="p-3.5">จำนวนครั้งที่จอง</th>
                        <th className="p-3.5">ยอดใช้จ่ายรวม</th>
                        <th className="p-3.5">ใช้บริการล่าสุด</th>
                        <th className="p-3.5 text-right">ประวัติ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-stone-400">
                            ยังไม่มีข้อมูลลูกค้า
                          </td>
                        </tr>
                      ) : (
                        customers.map((c, i) => (
                          <tr key={i} className="hover:bg-stone-50/70 transition-colors">
                            <td className="p-3.5 font-bold text-stone-900">{c.name}</td>
                            <td className="p-3.5 font-mono text-stone-800">{c.phone}</td>
                            <td className="p-3.5 text-stone-500">{c.email || '-'}</td>
                            <td className="p-3.5 font-semibold text-stone-900">{c.totalBookings} ครั้ง</td>
                            <td className="p-3.5 font-bold text-emerald-700 font-serif">
                              {c.totalSpent.toLocaleString()} ฿
                            </td>
                            <td className="p-3.5 text-stone-600">{c.lastVisitDate}</td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setCustomerHistoryModal({ open: true, customer: c })}
                                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              >
                                ดูประวัติ ({c.history.length})
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GOOGLE WORKSPACE & SHEET INTEGRATION */}
          {activeTab === 'gas' && (
            <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
              {/* PRIMARY HERO: 1-CLICK AUTOMATED WORKSPACE SETUP */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 text-white p-5 sm:p-8 rounded-3xl shadow-xl border border-emerald-500/20">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-400/30 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ระบบสร้างชีตอัตโนมัติในคลิกเดียว (1-Click)</span>
                      </span>
                      {isGoogleConnected ? (
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>เชื่อมต่อพร้อมใช้งาน</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] font-semibold rounded-full border border-amber-400/30">
                          พร้อมเชื่อมต่อ 1 คลิก
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                      สร้าง Google Sheet & เชื่อมต่ออัตโนมัติทั้งระบบ
                    </h3>
                    <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                      กดปุ่มเดียว ระบบจะสร้าง Google Spreadsheet ใหม่พร้อมจัดโครงสร้าง <strong>5 Tabs ครบถ้วน</strong> (Bookings, Services, Staff, Customers, Settings), สร้างโฟลเดอร์ Google Drive เก็บสลิป และซิงค์ข้อมูลร้านให้ทันที
                    </p>

                    {/* Connection details */}
                    {workspaceConfig.spreadsheetUrl && (
                      <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>บัญชี:</span>
                          <span className="text-emerald-300 font-mono">
                            {workspaceConfig.connectedEmail || googleUser?.email || 'เชื่อมต่อแล้ว'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 pt-2 sm:pt-0">
                    {workspaceConfig.spreadsheetUrl ? (
                      <>
                        <a
                          href={workspaceConfig.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>เปิดดู Google Sheet</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleSyncAllToSheet}
                          disabled={isSyncing}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลล่าสุด'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handle1ClickSetupSheet}
                        disabled={isSettingUpSheet}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 rounded-2xl text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSettingUpSheet ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-stone-950" />
                        )}
                        <span>
                          {isSettingUpSheet ? 'กำลังสร้างระบบ...' : '⚡ คลิกเดียวสร้าง Google Sheet & เชื่อมต่อทันที'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Setup Progress Banner */}
                {setupProgressMsg && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-500/40 flex items-center gap-3 animate-pulse text-xs sm:text-sm text-emerald-100 font-medium">
                    <RefreshCw className="w-4 h-4 text-emerald-300 animate-spin shrink-0" />
                    <span>{setupProgressMsg}</span>
                  </div>
                )}
              </div>

              {/* GOOGLE APPS SCRIPT WEB APP INTEGRATION & CODE.GS VIEWER */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
                  <div>
                    <h4 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">GAS</span>
                      <span>โค้ด Google Apps Script (Code.gs) & การเชื่อมต่อ Web App</span>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      คัดลอกโค้ดด้านล่างไปวางใน Apps Script ของ Google Sheet เพื่อเปิดใช้งานระบบ Real-Time เต็มรูปแบบ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleInitSheet}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>⚡ สร้างตาราง 4 แท็บในชีตทันที (Init Sheet)</span>
                  </button>
                </div>

                {/* 4-Step Setup Guide */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <h5 className="font-bold text-stone-900 text-xs mb-3 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 text-[10px] flex items-center justify-center font-bold">i</span>
                    <span>ขั้นตอนการเชื่อมต่อ Google Apps Script (ทำเพียงครั้งเดียว):</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">1</span>
                        <span>เปิด Google Sheet</span>
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        เปิด Google Sheet เปล่า แล้วไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong>
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">2</span>
                        <span>วางโค้ด Code.gs</span>
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        กดปุ่ม <strong>"คัดลอกโค้ดทั้งหมด"</strong> ด้านล่าง แล้วนำไปวางทับในไฟล์ <code>Code.gs</code> แล้วกดบันทึก (Ctrl+S)
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">3</span>
                        <span>Deploy เป็น Web App</span>
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        กด <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; เลือก <strong>Web app</strong> &gt; ผู้เข้าถึง: <strong>ทุกคน (Anyone)</strong>
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">4</span>
                        <span>บันทึก Web App URL</span>
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        นำ <strong>Web App URL</strong> ที่ได้มาวางในช่องด้านล่าง แล้วกด <strong>"บันทึกการตั้งค่า"</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Code Viewer Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>ไฟล์ gas/Code.gs (พร้อมฟังก์ชันครบ 4 แท็บ, Drive Slip, Calendar, Email, Webhook)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{codeCopied ? 'คัดลอกโค้ดเรียบร้อยแล้ว!' : '📋 คัดลอกโค้ดทั้งหมด (Copy Code)'}</span>
                    </button>
                  </div>
                  <div className="relative bg-stone-950 rounded-2xl border border-stone-800 p-4 font-mono text-[11px] text-stone-300 max-h-72 overflow-y-auto leading-relaxed select-all">
                    <pre className="whitespace-pre-wrap">{gasCode || 'กำลังโหลดโค้ด Code.gs...'}</pre>
                  </div>
                </div>

                {/* Configuration Form */}
                <form onSubmit={handleSaveGasConfig} className="space-y-4 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Web App URL (https://script.google.com/macros/s/.../exec)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        value={gasConfig.webAppUrl}
                        onChange={(e) => setGasConfig({ ...gasConfig, webAppUrl: e.target.value })}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleTestGasConnection}
                        disabled={isTestingGas || !gasConfig.webAppUrl}
                        className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {isTestingGas ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                      </button>
                    </div>
                  </div>

                  {gasTestResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        gasTestResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {gasTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{gasTestResult.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        อีเมลร้านสำหรับรับแจ้งเตือนคิวจอง
                      </label>
                      <input
                        type="email"
                        value={gasConfig.ownerEmail}
                        onChange={(e) => setGasConfig({ ...gasConfig, ownerEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        เบอร์พร้อมเพย์รับชำระเงิน
                      </label>
                      <input
                        type="text"
                        value={gasConfig.promptpayPhone}
                        onChange={(e) => setGasConfig({ ...gasConfig, promptpayPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer text-center"
                      >
                        บันทึกการตั้งค่า
                      </button>
                      <button
                        type="button"
                        onClick={handlePushAllToSheet}
                        disabled={isPushing || !gasConfig.webAppUrl}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="ส่ง Services, Staff, Bookings ทั้งหมดขึ้น Google Sheet"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                        <span>{isPushing ? 'กำลังส่ง...' : '🚀 ส่งข้อมูลขึ้นชีต (Push All)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="ดึงข้อมูลล่าสุดจาก Google Sheet"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'กำลังดึง...' : '📥 ดึงข้อมูลจากชีต (Pull)'}</span>
                      </button>
                    </div>
                    {gasSaveMsg && (
                      <span className="text-xs text-emerald-600 font-semibold">{gasSaveMsg}</span>
                    )}
                  </div>
                </form>

                {/* Real-Time Webhook Information Box */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>URL Webhook สำหรับ Real-Time Trigger (onEdit)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const webhookUrl = `${window.location.origin}/api/gas/webhook`;
                        navigator.clipboard.writeText(webhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-600 font-mono bg-white p-2.5 rounded-lg border border-stone-200 select-all overflow-x-auto">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/gas/webhook` : '/api/gas/webhook'}
                  </p>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    💡 โค้ด <code>Code.gs</code> มีฟังก์ชัน <code>onEdit</code> ในตัว เมื่อมีใครแก้ไขข้อมูลใน Google Sheet โดยตรง ระบบจะส่งข้อมูลมาที่ Webhook นี้และอัปเดตหน้าบ้าน/หลังบ้านทันที
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Customer History Detail */}
      {customerHistoryModal.open && customerHistoryModal.customer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full p-4 sm:p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div>
                <h4 className="font-bold text-stone-900 text-base sm:text-lg font-serif">
                  ประวัติการจอง: {customerHistoryModal.customer.name}
                </h4>
                <p className="text-xs text-stone-500 font-mono">
                  เบอร์โทร: {customerHistoryModal.customer.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerHistoryModal({ open: false, customer: null })}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 overflow-y-auto flex-1">
              {customerHistoryModal.customer.history.map((b) => (
                <div key={b.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-900">{b.serviceName}</span>
                    <span className="text-amber-800 font-bold">{b.servicePrice?.toLocaleString()} ฿</span>
                  </div>
                  <div className="text-stone-500">
                    ช่าง: {b.staffName} • วันที่: {b.date} เวลา {b.time} น.
                  </div>
                  <div className="text-[10px] text-stone-400">สถานะ: {b.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Service */}
      {serviceModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <h4 className="font-bold text-stone-900 text-base sm:text-lg font-serif">
                {serviceModal.data ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}
              </h4>
              <button
                type="button"
                onClick={() => setServiceModal({ open: false, data: null })}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ชื่อบริการ</label>
                <input
                  name="name"
                  defaultValue={serviceModal.data?.name || ''}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ราคา (บาท)</label>
                  <input
                    name="price"
                    type="number"
                    defaultValue={serviceModal.data?.price || 690}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ระยะเวลา (นาที)</label>
                  <input
                    name="durationMinutes"
                    type="number"
                    defaultValue={serviceModal.data?.durationMinutes || 60}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">หมวดหมู่</label>
                <select
                  name="category"
                  defaultValue={serviceModal.data?.category || 'Nails'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 bg-white text-sm focus:ring-1 focus:ring-stone-900"
                >
                  <option value="Nails">Nails (เล็บ)</option>
                  <option value="Spa & Nails">Spa & Nails (สปา & เล็บ)</option>
                  <option value="Facial">Facial (ดูแลผิวหน้า)</option>
                  <option value="Massage">Massage (นวดผ่อนคลาย)</option>
                  <option value="Lash">Lash (ต่อขนตา)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">รายละเอียด</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={serviceModal.data?.description || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setServiceModal({ open: false, data: null })}
                  className="px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Staff */}
      {staffModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <h4 className="font-bold text-stone-900 text-base sm:text-lg font-serif">
                {staffModal.data ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างใหม่'}
              </h4>
              <button
                type="button"
                onClick={() => setStaffModal({ open: false, data: null })}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ชื่อ-สกุลช่าง</label>
                  <input
                    name="name"
                    defaultValue={staffModal.data?.name || ''}
                    placeholder="ช่างพลอย"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ชื่อเล่น</label>
                  <input
                    name="nickname"
                    defaultValue={staffModal.data?.nickname || ''}
                    placeholder="พลอย"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ตำแหน่ง</label>
                  <input
                    name="role"
                    defaultValue={staffModal.data?.role || 'Senior Nail Artist'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ประสบการณ์</label>
                  <input
                    name="experience"
                    defaultValue={staffModal.data?.experience || '3 ปี'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">URL รูปภาพ</label>
                <input
                  name="avatar"
                  defaultValue={staffModal.data?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 font-mono text-xs focus:ring-1 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">บริการที่ทำได้</label>
                <div className="max-h-28 overflow-y-auto space-y-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        name="staffServices"
                        value={s.id}
                        defaultChecked={staffModal.data ? staffModal.data.services?.includes(s.id) : true}
                        className="rounded text-stone-900 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-stone-800">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">คำแนะนำตัวย่อ</label>
                <textarea
                  name="bio"
                  rows={2}
                  defaultValue={staffModal.data?.bio || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStaffModal({ open: false, data: null })}
                  className="px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Payment Slip Viewer */}
      <SlipViewerModal
        isOpen={Boolean(selectedSlipBooking)}
        onClose={() => setSelectedSlipBooking(null)}
        booking={selectedSlipBooking}
      />
    </div>
  );
}
