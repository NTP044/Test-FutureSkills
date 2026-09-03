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
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

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
      // update overview stats
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
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  // Services handlers
  const handleSaveService = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const price = Number(form.price.value);
    const durationMinutes = Number(form.durationMinutes.value);
    const category = form.category.value;
    const description = form.description.value;

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
      alert(err.message);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบริการนี้?')) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Staff handlers
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const nickname = form.nickname.value;
    const role = form.role.value;
    const experience = form.experience.value;
    const avatar = form.avatar.value;
    const bio = form.bio.value;

    // Services selected
    const selectedServiceIds = Array.from(form.querySelectorAll('input[name="staffServices"]:checked')).map(
      (el) => el.value
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
          services: selectedServiceIds,
        });
      } else {
        await addStaff({
          name,
          nickname,
          role,
          experience,
          avatar,
          bio,
          services: selectedServiceIds,
        });
      }
      setStaffModal({ open: false, data: null });
      const updated = await getStaff();
      setStaff(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลช่างท่านนี้?')) return;
    try {
      await deleteStaff(id);
      setStaff((prev) => prev.filter((st) => st.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // GAS actions
  const handleLoadGasCode = async () => {
    try {
      const code = await getGasCode();
      setGasCode(code);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyGasCode = () => {
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
    // If Web App URL is configured, try GAS first; otherwise run 1-Click Workspace Setup!
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
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100/95 backdrop-blur-md overflow-hidden animate-fadeIn text-stone-800">
      {/* Top Navbar */}
      <header className="h-16 bg-stone-900 text-white flex items-center justify-between px-4 sm:px-6 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base font-serif tracking-wide">The Bloom Studio</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 uppercase">
                Admin Panel
              </span>
            </div>
            <p className="text-[11px] text-stone-400">ระบบจัดการหลังบ้าน & Google Sheet Database</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time Google Sheet Sync status badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                gasConfig.webAppUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-stone-300 font-medium">
              {gasConfig.webAppUrl ? 'Google Sheet: เชื่อมต่อแล้ว' : 'Google Sheet: ยังไม่ใส่ Web App URL'}
            </span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-xl border border-stone-700 transition-colors"
            title="ซิงค์ข้อมูลกับ Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">ซิงค์ข้อมูล</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors"
          >
            กลับหน้าร้าน
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 text-stone-400 hover:text-red-400 rounded-xl hover:bg-stone-800 transition-colors"
            title="ออกจากระบบแอดมิน"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sync banner message if any */}
      {syncSuccessMsg && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2 animate-fadeIn shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Main Container with Sidebar Tabs + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <aside className="w-56 bg-white border-r border-stone-200 p-3 flex flex-col justify-between shrink-0 hidden sm:flex">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'bookings' ? 'bg-stone-700 text-amber-300' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
            <div className="font-semibold text-stone-800 mb-1">ร้าน The Bloom Studio</div>
            <div>พร้อมเพย์: {gasConfig.promptpayPhone}</div>
            <div className="truncate text-stone-400 mt-0.5">อีเมล: {gasConfig.ownerEmail}</div>
          </div>
        </aside>

        {/* Mobile Tab Selector */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 flex justify-around p-1.5 text-[10px]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`p-2 flex flex-col items-center ${activeTab === 'overview' ? 'text-stone-900 font-bold' : 'text-stone-400'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>ภาพรวม</span>
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`p-2 flex flex-col items-center ${activeTab === 'bookings' ? 'text-stone-900 font-bold' : 'text-stone-400'}`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>จองคิว</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`p-2 flex flex-col items-center ${activeTab === 'services' ? 'text-stone-900 font-bold' : 'text-stone-400'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>บริการ</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`p-2 flex flex-col items-center ${activeTab === 'staff' ? 'text-stone-900 font-bold' : 'text-stone-400'}`}
          >
            <Users className="w-4 h-4" />
            <span>ช่าง</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`p-2 flex flex-col items-center ${activeTab === 'customers' ? 'text-stone-900 font-bold' : 'text-stone-400'}`}
          >
            <UserCheck className="w-4 h-4" />
            <span>ลูกค้า</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('gas');
              handleLoadGasCode();
            }}
            className={`p-2 flex flex-col items-center ${activeTab === 'gas' ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Sheet</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h3 className="text-xl font-bold font-serif text-stone-900">ภาพรวมระบบร้าน (Overview)</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  สรุปสถิติการจอง รายได้ และประสิทธิภาพการทำงานของร้านวันนี้
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-500 font-medium">จองวันนี้</span>
                    <h4 className="text-2xl font-bold text-stone-900 mt-1">{overview?.todayCount || 0} คิว</h4>
                    <span className="text-[11px] text-amber-700 font-medium">
                      รายได้วันนี้: {overview?.todayRevenue?.toLocaleString() || 0} ฿
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-500 font-medium">จองในรอบสัปดาห์</span>
                    <h4 className="text-2xl font-bold text-stone-900 mt-1">{overview?.weekCount || 0} คิว</h4>
                    <span className="text-[11px] text-stone-400">7 วันที่ผ่านมา</span>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-500 font-medium">รายได้ประมาณการรวม</span>
                    <h4 className="text-2xl font-bold text-emerald-700 mt-1">
                      {overview?.estimatedRevenue?.toLocaleString() || 0} ฿
                    </h4>
                    <span className="text-[11px] text-emerald-600 font-medium">คิวที่ยืนยันแล้ว/มีสลิป</span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-500 font-medium">ช่างคิวยอดนิยม</span>
                    <h4 className="text-base font-bold text-stone-900 mt-1 truncate max-w-[140px]">
                      {overview?.busiestStaff?.name || 'ยังไม่มีข้อมูล'}
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      {overview?.busiestStaff?.count || 0} คิวจอง
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <h4 className="text-sm font-bold text-stone-900 mb-3">สถานะรายการจองทั้งหมด</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                    <span className="text-xs text-amber-800 font-medium">รอยืนยัน (Pending)</span>
                    <div className="text-xl font-bold text-amber-900 mt-1">
                      {overview?.statusCounts?.pending || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60">
                    <span className="text-xs text-emerald-800 font-medium">ยืนยันแล้ว (Confirmed)</span>
                    <div className="text-xl font-bold text-emerald-900 mt-1">
                      {overview?.statusCounts?.confirmed || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60">
                    <span className="text-xs text-blue-800 font-medium">ให้บริการสำเร็จ (Completed)</span>
                    <div className="text-xl font-bold text-blue-900 mt-1">
                      {overview?.statusCounts?.completed || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-200">
                    <span className="text-xs text-stone-600 font-medium">ยกเลิกแล้ว (Cancelled)</span>
                    <div className="text-xl font-bold text-stone-800 mt-1">
                      {overview?.statusCounts?.cancelled || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Ranking Section */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <h4 className="text-sm font-bold text-stone-900 mb-3">สถิติคิวงานแยกตามช่าง</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {overview?.staffRanking?.map((st) => (
                    <div key={st.staffId} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center gap-3">
                      <img
                        src={st.avatar}
                        alt={st.name}
                        className="w-10 h-10 rounded-full object-cover border border-stone-200"
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

          {/* TAB 2: BOOKINGS (LIST & CALENDAR) */}
          {activeTab === 'bookings' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold font-serif text-stone-900">จัดการรายการจอง</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    ตรวจสอบคิว เปลี่ยนสถานะ ดูสลิปโอนเงิน และซิงค์ Google Calendar
                  </p>
                </div>

                {/* View Switcher: List vs Calendar */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 self-start sm:self-auto">
                  <button
                    onClick={() => setBookingsViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bookingsViewMode === 'list'
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    ตารางรายการ (List)
                  </button>
                  <button
                    onClick={() => setBookingsViewMode('calendar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                  onViewSlip={(b) => setSelectedSlipBooking(b)}
                  onUpdateStatus={handleStatusChange}
                />
              ) : (
                <>
                  {/* Filters Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">ค้นหา (ชื่อ/เบอร์/รหัส)</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="ค้นหา..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">กรองสถานะ</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
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
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
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
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-800 bg-white"
                      />
                    </div>
                  </div>

                  {/* Bookings Table */}
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
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
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold border border-emerald-200 transition-colors"
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
                                    className="text-[11px] font-semibold rounded-lg px-2 py-1 border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800"
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
                                      className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-serif text-stone-900">บริการสปาและความงาม</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    เพิ่ม แก้ไข และลบบริการในร้าน ซึ่งจะซิงค์กับ Google Sheet และหน้าจองของลูกค้า
                  </p>
                </div>
                <button
                  onClick={() => setServiceModal({ open: true, data: null })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มบริการใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                          {svc.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setServiceModal({ open: true, data: svc })}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(svc.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-stone-900 text-base">{svc.name}</h4>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{svc.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                      <span className="text-xs text-stone-500">{svc.durationMinutes} นาที</span>
                      <span className="text-base font-extrabold text-amber-700 font-serif">
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-serif text-stone-900">ช่างและผู้เชี่ยวชาญ</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    จัดการข้อมูลช่าง บริการที่ทำได้ และรูปโปรไฟล์
                  </p>
                </div>
                <button
                  onClick={() => setStaffModal({ open: true, data: null })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มช่างใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {staff.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between"
                  >
                    <div className="flex gap-4">
                      <img
                        src={st.avatar}
                        alt={st.name}
                        className="w-20 h-20 rounded-2xl object-cover border border-stone-200 shadow-sm shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900 text-base">{st.name}</h4>
                          <span className="text-xs text-stone-500">({st.nickname})</span>
                        </div>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">{st.role}</p>
                        <p className="text-xs text-stone-500 mt-1">ประสบการณ์ {st.experience}</p>
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

                    <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                      <button
                        onClick={() => setStaffModal({ open: true, data: st })}
                        className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(st.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS HISTORY */}
          {activeTab === 'customers' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div>
                <h3 className="text-xl font-bold font-serif text-stone-900">ฐานข้อมูลและประวัติลูกค้า</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  รายชื่อลูกค้าทั้งหมด ประวัติการใช้บริการ ยอดเงินสะสม และข้อมูลการติดต่อ
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
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
                                onClick={() => setCustomerHistoryModal({ open: true, customer: c })}
                                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
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
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* PRIMARY HERO: 1-CLICK AUTOMATED WORKSPACE SETUP */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-500/20">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-400/30 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ระบบสร้างชีตอัตโนมัติในคลิกเดียว (1-Click Google Workspace)</span>
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

                    <h3 className="text-2xl font-bold font-serif text-white">
                      สร้าง Google Sheet & เชื่อมต่ออัตโนมัติทั้งระบบ
                    </h3>
                    <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                      กดปุ่มเดียว ระบบจะสร้าง Google Spreadsheet ใหม่พร้อมจัดโครงสร้าง <strong>5 Tabs ครบถ้วน</strong> (Bookings, Services, Staff, Customers, Settings), ตกแต่งตารางสี Rose Gold, สร้างโฟลเดอร์ Google Drive สำหรับเก็บสลิป และซิงค์ข้อมูลร้านให้ทันที โดยไม่ต้องตั้งค่าใดๆ เพิ่มเติม
                    </p>

                    {/* Connection details if connected */}
                    {workspaceConfig.spreadsheetUrl && (
                      <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>บัญชี:</span>
                          <span className="text-emerald-300 font-mono">
                            {workspaceConfig.connectedEmail || googleUser?.email || 'เชื่อมต่อแล้ว'}
                          </span>
                        </div>
                        {workspaceConfig.driveFolderId && (
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Drive Folder: Bloom_Studio_Slips</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 shrink-0">
                    {workspaceConfig.spreadsheetUrl ? (
                      <>
                        <a
                          href={workspaceConfig.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>เปิดดู Google Sheet ทันที</span>
                        </a>
                        <button
                          onClick={handleSyncAllToSheet}
                          disabled={isSyncing}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลล่าสุด'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handle1ClickSetupSheet}
                        disabled={isSettingUpSheet}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
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
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-900/50 border border-emerald-500/40 flex items-center gap-3 animate-pulse">
                    <RefreshCw className="w-5 h-5 text-emerald-300 animate-spin shrink-0" />
                    <span className="text-xs sm:text-sm text-emerald-100 font-medium">
                      {setupProgressMsg}
                    </span>
                  </div>
                )}

                {/* Secondary action row if connected */}
                {workspaceConfig.spreadsheetUrl && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-stone-400">
                    <button
                      onClick={handle1ClickSetupSheet}
                      disabled={isSettingUpSheet}
                      className="text-stone-300 hover:text-white underline transition-colors"
                    >
                      ต้องการสร้าง Google Sheet อันใหม่ใหม่ทั้งหมด? คลิกที่นี่
                    </button>
                    <button
                      onClick={handleDisconnectWorkspace}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      ยกเลิกการเชื่อมต่อ
                    </button>
                  </div>
                )}
              </div>

              {/* 5 TABS OVERVIEW IN THE GOOGLE SHEET */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-700" />
                      <span>โครงสร้าง 5 Tabs ที่ถูกสร้างใน Google Sheet ให้อัตโนมัติ</span>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      แยกแท็บข้อมูลชัดเจนเพื่อความสะดวกในการจัดการ และอัปเดตแบบเรียลไทม์
                    </p>
                  </div>
                  {workspaceConfig.spreadsheetUrl && (
                    <a
                      href={workspaceConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                    >
                      <span>เปิดดูในชีต</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                  {/* Tab 1 */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">1. Bookings</span>
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold">
                        18 คอลัมน์
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-tight">
                      ประวัติการจองคิว วันที่ เวลา ชื่อบริการ ช่าง ลูกค้า เบอร์โทร ลิงก์สลิป Drive และสถานะ
                    </p>
                  </div>

                  {/* Tab 2 */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">2. Services</span>
                      <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                        {services.length} บริการ
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-tight">
                      รายการสปาและทรีตเมนต์ รหัส ราคา ระยะเวลา และคำอธิบายบริการ
                    </p>
                  </div>

                  {/* Tab 3 */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">3. Staff</span>
                      <span className="px-2 py-0.5 text-[10px] bg-purple-100 text-purple-800 rounded-full font-bold">
                        {staff.length} ท่าน
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-tight">
                      รายชื่อช่างผู้ให้บริการ ตำแหน่ง ประสบการณ์ คะแนนรีวิว และบริการที่เชี่ยวชาญ
                    </p>
                  </div>

                  {/* Tab 4 */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">4. Customers</span>
                      <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full font-bold">
                        {customers.length} คน
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-tight">
                      ฐานข้อมูลลูกค้า เบอร์โทร จำนวนครั้งที่จอง ยอดใช้จ่ายสะสม และวันที่มาล่าสุด
                    </p>
                  </div>

                  {/* Tab 5 */}
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">5. Settings</span>
                      <span className="px-2 py-0.5 text-[10px] bg-stone-200 text-stone-800 rounded-full font-bold">
                        ตั้งค่าร้าน
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-tight">
                      ข้อมูลร้านค้า อีเมลแจ้งเตือน บัญชี PromptPay และพารามิเตอร์ระบบ
                    </p>
                  </div>
                </div>
              </div>

              {/* SECONDARY / ADVANCED: GOOGLE APPS SCRIPT WEB APP INTEGRATION */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-xs flex items-center justify-center font-bold">GAS</span>
                    <span>ทางเลือกเพิ่มเติม: เชื่อมต่อด้วย Google Apps Script (Web App URL)</span>
                  </h4>
                  <span className="text-xs text-stone-400 font-medium">สำหรับ Webhook อัตโนมัติ</span>
                </div>
                <p className="text-xs text-stone-500">
                  หากคุณต้องการให้ Google Apps Script เป็น Webhook ในการรับข้อมูลจากแหล่งภายนอก สามารถนำ Web App URL มาใส่ที่นี่ได้
                </p>

                <form onSubmit={handleSaveGasConfig} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Web App URL (https://script.google.com/macros/s/.../exec)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        value={gasConfig.webAppUrl}
                        onChange={(e) => setGasConfig({ ...gasConfig, webAppUrl: e.target.value })}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-stone-800 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleTestGasConnection}
                        disabled={isTestingGas || !gasConfig.webAppUrl}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        อีเมลร้านค้าสำหรับรับแจ้งเตือน (Owner Notification Email)
                      </label>
                      <input
                        type="email"
                        value={gasConfig.ownerEmail}
                        onChange={(e) => setGasConfig({ ...gasConfig, ownerEmail: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        เบอร์พร้อมเพย์รับชำระเงิน (PromptPay Number)
                      </label>
                      <input
                        type="text"
                        value={gasConfig.promptpayPhone}
                        onChange={(e) => setGasConfig({ ...gasConfig, promptpayPhone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-stone-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      บันทึกการตั้งค่า
                    </button>
                    {gasSaveMsg && (
                      <span className="text-xs text-emerald-600 font-semibold">{gasSaveMsg}</span>
                    )}
                  </div>
                </form>
              </div>

              {/* Step 2: Columns Specification Table */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center">2</span>
                  <span>โครงสร้างคอลัมน์ใน Google Sheet (แท็บ "Bookings")</span>
                </h4>
                <p className="text-xs text-stone-500">
                  ระบบจะสร้างคอลัมน์เหล่านี้ให้อัตโนมัติเมื่อกดปุ่ม "สร้างชีต & คอลัมน์อัตโนมัติ" หรือรันคำสั่งแรก
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                    <thead className="bg-stone-100 text-stone-700 font-semibold">
                      <tr>
                        <th className="p-2.5 border-b border-stone-200">#</th>
                        <th className="p-2.5 border-b border-stone-200">ชื่อคอลัมน์ใน Google Sheet</th>
                        <th className="p-2.5 border-b border-stone-200">ประเภทข้อมูล</th>
                        <th className="p-2.5 border-b border-stone-200">คำอธิบาย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-600 font-mono text-[11px]">
                      <tr>
                        <td className="p-2 text-stone-400">1</td>
                        <td className="p-2 font-bold text-stone-900">Booking ID</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">รหัสการจอง เช่น BLM-K829</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">2</td>
                        <td className="p-2 font-bold text-stone-900">Created At</td>
                        <td className="p-2 text-blue-600">DateTime</td>
                        <td className="p-2 font-sans">วันเวลาที่ทำการจอง</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">3</td>
                        <td className="p-2 font-bold text-stone-900">Status</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">สถานะ (pending, confirmed, completed, cancelled)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">4</td>
                        <td className="p-2 font-bold text-stone-900">Date</td>
                        <td className="p-2 text-blue-600">Date</td>
                        <td className="p-2 font-sans">วันที่นัดหมาย (YYYY-MM-DD)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">5</td>
                        <td className="p-2 font-bold text-stone-900">Time</td>
                        <td className="p-2 text-blue-600">Time</td>
                        <td className="p-2 font-sans">เวลาที่นัดหมาย (HH:mm)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">6</td>
                        <td className="p-2 font-bold text-stone-900">Service Name</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">ชื่อบริการสปา/ความงาม</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">7</td>
                        <td className="p-2 font-bold text-stone-900">Service Price (THB)</td>
                        <td className="p-2 text-blue-600">Number</td>
                        <td className="p-2 font-sans">ราคาค่าบริการ (บาท)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">8</td>
                        <td className="p-2 font-bold text-stone-900">Duration (Mins)</td>
                        <td className="p-2 text-blue-600">Number</td>
                        <td className="p-2 font-sans">ระยะเวลาการให้บริการ (นาที)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">9</td>
                        <td className="p-2 font-bold text-stone-900">Staff Name</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">ชื่อช่างประจำคิว</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">10</td>
                        <td className="p-2 font-bold text-stone-900">Customer Name</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">ชื่อ-นามสกุลลูกค้า</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">11</td>
                        <td className="p-2 font-bold text-stone-900">Customer Phone</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">เบอร์โทรศัพท์ลูกค้า (9-10 หลัก)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">12</td>
                        <td className="p-2 font-bold text-stone-900">Customer Email</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">อีเมลสำหรับส่งแจ้งเตือนและลิงก์ปฏิทิน</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">13</td>
                        <td className="p-2 font-bold text-stone-900">Special Request</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">คำขอหรือรายละเอียดเพิ่มเติม</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">14</td>
                        <td className="p-2 font-bold text-stone-900">Payment Status</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">unpaid / paid_slip / verified</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">15</td>
                        <td className="p-2 font-bold text-stone-900">Payment Slip URL</td>
                        <td className="p-2 text-blue-600">URL</td>
                        <td className="p-2 font-sans">ลิงก์ดูไฟล์สลิปบน Google Drive อัตโนมัติ</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">16</td>
                        <td className="p-2 font-bold text-stone-900">Calendar Event ID</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">รหัสกิจกรรมใน Google Calendar</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">17</td>
                        <td className="p-2 font-bold text-stone-900">LINE User ID</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">รหัส LINE ผู้ใช้ (ถ้าล็อกอินผ่าน LINE LIFF)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-stone-400">18</td>
                        <td className="p-2 font-bold text-stone-900">LINE Display Name</td>
                        <td className="p-2 text-blue-600">String</td>
                        <td className="p-2 font-sans">ชื่อแสดงในแอป LINE</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3: Google Apps Script Code with 1-Click Copy */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center">3</span>
                    <span>โค้ด Google Apps Script (Code.gs) พร้อมคัดลอกใน 1 คลิก</span>
                  </h4>
                  <button
                    onClick={handleCopyGasCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{codeCopied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                  </button>
                </div>

                <div className="bg-stone-900 text-stone-300 p-4 rounded-xl font-mono text-xs max-h-64 overflow-y-auto">
                  <pre>{gasCode || '// กำลังโหลดโค้ด Code.gs...'}</pre>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="font-bold">ขั้นตอนการ Deploy ใน Google Sheet:</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>เปิด Google Sheet เปล่าที่คุณต้องการใช้เป็นฐานข้อมูล</li>
                    <li>คลิกเมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
                    <li>ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดที่คัดลอกจากปุ่มด้านบนลงไป</li>
                    <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
                    <li>เลือกประเภทเป็น <strong>เว็บแอป (Web app)</strong></li>
                    <li>
                      ตั้งค่า <strong className="underline">ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน (Anyone)"</strong> (สำคัญมากเพื่อให้ลูกค้าร้านส่งข้อมูลการจองได้)
                    </li>
                    <li>กด Deploy แล้วคัดลอก Web App URL มาใส่ในช่องที่ 1 ด้านบน</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Customer History Detail */}
      {customerHistoryModal.open && customerHistoryModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h4 className="font-bold text-stone-900 text-lg font-serif">
                  ประวัติการจอง: {customerHistoryModal.customer.name}
                </h4>
                <p className="text-xs text-stone-500 font-mono">
                  เบอร์โทร: {customerHistoryModal.customer.phone}
                </p>
              </div>
              <button
                onClick={() => setCustomerHistoryModal({ open: false, customer: null })}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                ปิด
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-80 overflow-y-auto">
              {customerHistoryModal.customer.history.map((b) => (
                <div key={b.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-900">{b.serviceName}</span>
                    <span className="text-amber-700 font-bold">{b.servicePrice?.toLocaleString()} ฿</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-6">
            <h4 className="font-bold text-stone-900 text-lg font-serif mb-4">
              {serviceModal.data ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}
            </h4>
            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ชื่อบริการ</label>
                <input
                  name="name"
                  defaultValue={serviceModal.data?.name || ''}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
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
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ระยะเวลา (นาที)</label>
                  <input
                    name="durationMinutes"
                    type="number"
                    defaultValue={serviceModal.data?.durationMinutes || 60}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">หมวดหมู่</label>
                <select
                  name="category"
                  defaultValue={serviceModal.data?.category || 'Nails'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 bg-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setServiceModal({ open: false, data: null })}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl font-semibold shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-6">
            <h4 className="font-bold text-stone-900 text-lg font-serif mb-4">
              {staffModal.data ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างใหม่'}
            </h4>
            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ชื่อ-สกุลช่าง</label>
                  <input
                    name="name"
                    defaultValue={staffModal.data?.name || ''}
                    placeholder="ช่างพลอย (Ploy)"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ชื่อเล่น</label>
                  <input
                    name="nickname"
                    defaultValue={staffModal.data?.nickname || ''}
                    placeholder="พลอย"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ตำแหน่ง / ความเชี่ยวชาญ</label>
                  <input
                    name="role"
                    defaultValue={staffModal.data?.role || 'Senior Nail Artist'}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ประสบการณ์</label>
                  <input
                    name="experience"
                    defaultValue={staffModal.data?.experience || '3 ปี'}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">URL รูปภาพประจำตัว</label>
                <input
                  name="avatar"
                  defaultValue={staffModal.data?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">บริการที่สามารถทำได้</label>
                <div className="max-h-28 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="staffServices"
                        value={s.id}
                        defaultChecked={staffModal.data ? staffModal.data.services?.includes(s.id) : true}
                        className="rounded text-stone-900 focus:ring-0"
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
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStaffModal({ open: false, data: null })}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl font-semibold shadow-sm"
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
