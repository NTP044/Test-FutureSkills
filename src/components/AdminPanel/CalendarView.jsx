import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Calendar as CalendarIcon,
  Sparkles,
  ExternalLink,
  Edit3,
  X,
  Layers,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { rescheduleBooking } from '../../api/bookingService';

const TIME_SLOTS = [
  '10:00',
  '11:30',
  '13:00',
  '14:30',
  '16:00',
  '17:30',
  '19:00',
  '20:00',
];

export default function CalendarView({
  bookings = [],
  staff = [],
  onViewSlip,
  onUpdateStatus,
  onBookingChanged,
}) {
  const [viewType, setViewType] = useState('day'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Modal states for clicking a card on the calendar
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', staffId: '' });
  const [rescheduleError, setRescheduleError] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const prevDate = () => {
    if (viewType === 'day') {
      const d = new Date(selectedDateStr);
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedDateStr(`${y}-${m}-${day}`);
      setCurrentDate(d);
    } else if (viewType === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextDate = () => {
    if (viewType === 'day') {
      const d = new Date(selectedDateStr);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedDateStr(`${y}-${m}-${day}`);
      setCurrentDate(d);
    } else if (viewType === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const setToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${day}`);
    setCurrentDate(d);
  };

  // Group bookings by date string YYYY-MM-DD
  const bookingsByDate = {};
  bookings.forEach((b) => {
    if (!bookingsByDate[b.date]) {
      bookingsByDate[b.date] = [];
    }
    bookingsByDate[b.date].push(b);
  });

  const selectedDayBookings = (bookingsByDate[selectedDateStr] || []).sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  // Week calculation
  const getWeekDates = (baseDate) => {
    const d = new Date(baseDate);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dayOfWeek);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const wDay = new Date(d);
      wDay.setDate(d.getDate() + i);
      const y = wDay.getFullYear();
      const m = String(wDay.getMonth() + 1).padStart(2, '0');
      const day = String(wDay.getDate()).padStart(2, '0');
      week.push({
        dateStr: `${y}-${m}-${day}`,
        dayNum: wDay.getDate(),
        dayName: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'][i],
        dayShort: ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'][i],
        fullDate: wDay,
      });
    }
    return week;
  };

  const currentWeekDates = getWeekDates(currentDate);

  // Month calculations
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = [];
  for (let i = 0; i < firstDayIndex; i++) monthDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthDays.push(d);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold">ยืนยันแล้ว</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full font-bold">เสร็จสิ้น</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-[10px] bg-rose-100 text-rose-800 rounded-full font-bold">ยกเลิก</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">รอยืนยัน</span>;
    }
  };

  const handleOpenReschedule = (booking) => {
    setSelectedBooking(booking);
    setRescheduleData({
      date: booking.date,
      time: booking.time,
      staffId: booking.staffId,
    });
    setIsRescheduling(true);
    setRescheduleError('');
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setIsSubmittingReschedule(true);
    setRescheduleError('');

    try {
      await rescheduleBooking(selectedBooking.id, rescheduleData);
      setIsRescheduling(false);
      setSelectedBooking(null);
      onBookingChanged?.();
    } catch (err) {
      setRescheduleError(err.message || 'ไม่สามารถเลื่อนคิวได้');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevDate}
              className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={setToday}
              className="px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={nextDate}
              className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h3 className="font-bold text-stone-900 text-sm sm:text-base font-serif ml-1">
            {viewType === 'day'
              ? `วัน${new Date(selectedDateStr).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
              : `${monthNames[month]} ${year + 543}`}
          </h3>
        </div>

        {/* View Selector: Day, Week, Month */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewType('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewType === 'day' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            รายวัน (Day)
          </button>
          <button
            type="button"
            onClick={() => setViewType('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewType === 'week' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            รายสัปดาห์ (Week)
          </button>
          <button
            type="button"
            onClick={() => setViewType('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewType === 'month' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            รายเดือน (Month)
          </button>
        </div>
      </div>

      {/* VIEW 1: DAY VIEW (GOOGLE CALENDAR TIME SLOTS GRID) */}
      {viewType === 'day' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
            <div>
              <h4 className="font-bold text-stone-900 text-base">
                ตารางเวลาประจำวัน (Time Slots)
              </h4>
              <p className="text-xs text-stone-500">
                เวลาเปิดทำการ 10:00 - 20:00 น. • มีทั้งหมด {selectedDayBookings.length} คิวจอง
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>มีระบบแจ้งเตือนคิวซ้ำซ้อนอัตโนมัติ</span>
              </span>
            </div>
          </div>

          {/* Time Slot Rows */}
          <div className="space-y-3">
            {TIME_SLOTS.map((slotTime) => {
              const slotBookings = selectedDayBookings.filter((b) => b.time === slotTime);

              return (
                <div
                  key={slotTime}
                  className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                >
                  {/* Time Badge */}
                  <div className="w-20 shrink-0 font-mono font-bold text-xs text-stone-700 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 text-center shadow-2xs">
                    {slotTime} น.
                  </div>

                  {/* Slot Content */}
                  <div className="flex-1 min-w-0">
                    {slotBookings.length === 0 ? (
                      <div className="text-xs text-stone-400 py-1.5 flex items-center gap-1.5 italic">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>ว่าง (สามารถรับคิวจองได้)</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {slotBookings.map((b) => {
                          const hasConflict = b.hasConflict || slotBookings.filter(x => x.staffId === b.staffId && x.status !== 'cancelled').length > 1;

                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBooking(b)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all shadow-2xs ${
                                hasConflict
                                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40'
                                  : b.status === 'confirmed'
                                  ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300'
                                  : b.status === 'cancelled'
                                  ? 'bg-rose-50/50 border-rose-200 opacity-60'
                                  : 'bg-white border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              {/* Header inside card */}
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="font-mono text-[10px] font-bold text-stone-800 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                                  {b.id}
                                </span>
                                <div className="flex items-center gap-1">
                                  {hasConflict && (
                                    <span className="px-1.5 py-0.5 text-[9px] bg-rose-600 text-white rounded font-bold animate-pulse flex items-center gap-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>คิวซ้ำซ้อน!</span>
                                    </span>
                                  )}
                                  {getStatusBadge(b.status)}
                                </div>
                              </div>

                              <h5 className="font-bold text-stone-900 text-xs truncate">{b.serviceName}</h5>

                              <div className="text-[11px] text-stone-600 mt-1 flex items-center justify-between">
                                <span className="truncate">👤 {b.customerName}</span>
                                <span className="text-amber-800 font-bold shrink-0 font-serif">
                                  {Number(b.servicePrice || 0).toLocaleString()} ฿
                                </span>
                              </div>

                              <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between pt-1 border-t border-stone-200/50">
                                <span>ช่าง: <strong className="text-stone-700">{b.staffName}</strong></span>
                                <span>{b.serviceDuration || 60} น.</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK VIEW */}
      {viewType === 'week' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {currentWeekDates.map((dayObj) => {
              const dayBookings = (bookingsByDate[dayObj.dateStr] || []).filter(b => b.status !== 'cancelled');
              const isSelected = dayObj.dateStr === selectedDateStr;

              return (
                <div
                  key={dayObj.dateStr}
                  onClick={() => {
                    setSelectedDateStr(dayObj.dateStr);
                    setViewType('day');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[200px] ${
                    isSelected
                      ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-400/30'
                      : 'bg-stone-50/50 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                      <span className="font-bold text-xs text-stone-700">{dayObj.dayShort}</span>
                      <span className="font-mono font-bold text-sm text-stone-900 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                        {dayObj.dayNum}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {dayBookings.length === 0 ? (
                        <div className="text-[11px] text-stone-400 text-center py-6">ไม่มีคิว</div>
                      ) : (
                        dayBookings.slice(0, 4).map((b) => (
                          <div
                            key={b.id}
                            className="p-1.5 bg-white rounded-lg border border-stone-200 text-[10px] space-y-0.5"
                          >
                            <div className="flex justify-between font-bold text-stone-900">
                              <span>{b.time} น.</span>
                              <span className="text-amber-800">{b.servicePrice?.toLocaleString()} ฿</span>
                            </div>
                            <div className="text-stone-600 truncate">{b.customerName}</div>
                          </div>
                        ))
                      )}
                      {dayBookings.length > 4 && (
                        <div className="text-[10px] text-center font-bold text-amber-700">
                          + อีก {dayBookings.length - 4} คิว
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200 text-center">
                    <span className="text-[10px] font-bold text-stone-600">
                      รวม {dayBookings.length} คิว
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: MONTH VIEW */}
      {viewType === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-stone-500 mb-2">
              <span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span><span>อา.</span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-14 sm:h-20 bg-stone-50/50 rounded-xl" />;

                const mStr = String(month + 1).padStart(2, '0');
                const dStr = String(day).padStart(2, '0');
                const thisDateStr = `${year}-${mStr}-${dStr}`;
                const isSelected = thisDateStr === selectedDateStr;
                const dayBookings = (bookingsByDate[thisDateStr] || []).filter((b) => b.status !== 'cancelled');

                return (
                  <button
                    key={thisDateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(thisDateStr)}
                    className={`h-14 sm:h-20 p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-stone-700'}`}>
                      {day}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="block text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded text-center truncate">
                        {dayBookings.length} คิว
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm flex flex-col">
            <div className="border-b border-stone-100 pb-3 mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm sm:text-base">
                  ตารางคิววันที่ {selectedDateStr}
                </h4>
                <p className="text-xs text-stone-500">{selectedDayBookings.length} รายการจอง</p>
              </div>
              <button
                type="button"
                onClick={() => setViewType('day')}
                className="text-xs text-amber-800 font-bold hover:underline cursor-pointer"
              >
                ดูแบบ Time Slots →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[480px]">
              {selectedDayBookings.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">ไม่มีการจองในวันนี้</div>
              ) : (
                selectedDayBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-stone-800">{b.time} น.</span>
                      {getStatusBadge(b.status)}
                    </div>
                    <div className="font-bold text-stone-900 text-xs">{b.serviceName}</div>
                    <div className="text-xs text-stone-600 flex justify-between">
                      <span>👤 {b.customerName}</span>
                      <span>ช่าง: {b.staffName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Booking Detail & Quick Management / Reschedule */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                  {selectedBooking.id}
                </span>
                {getStatusBadge(selectedBooking.status)}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBooking(null);
                  setIsRescheduling(false);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Rescheduling mode is active */}
            {isRescheduling ? (
              <form onSubmit={handleSaveReschedule} className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <div className="font-bold mb-1">🗓️ เลื่อนวันและเวลานัดหมาย</div>
                  <div>ระบบจะตรวจสอบคิวว่างอัตโนมัติ เพื่อป้องกันคิวซ้ำซ้อน</div>
                </div>

                {rescheduleError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                    {rescheduleError}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">เลือกวันที่ใหม่</label>
                  <input
                    type="date"
                    required
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">เลือกช่วงเวลาใหม่</label>
                  <select
                    value={rescheduleData.time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm bg-white"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t} น.</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium cursor-pointer"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule}
                    className="px-5 py-2 bg-stone-900 text-white rounded-xl font-semibold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingReschedule && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>ยืนยันการเลื่อนคิว</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Regular View Mode */
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <h4 className="font-bold text-stone-900 text-base">{selectedBooking.serviceName}</h4>
                  <div className="text-amber-800 font-extrabold text-lg font-serif">
                    {Number(selectedBooking.servicePrice || 0).toLocaleString()} ฿
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div>
                    <span className="text-stone-400 block text-[11px]">วันและเวลานัด</span>
                    <span className="font-bold text-stone-900">{selectedBooking.date}</span>
                    <span className="text-amber-800 font-bold block">{selectedBooking.time} น.</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[11px]">ช่างผู้ดูแล</span>
                    <span className="font-bold text-stone-900">{selectedBooking.staffName}</span>
                    <span className="text-stone-500 block">ระยะเวลา {selectedBooking.serviceDuration || 60} นาที</span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-stone-400 block text-[11px]">ลูกค้า</span>
                    <span className="font-bold text-stone-900">{selectedBooking.customerName}</span>
                    <a href={`tel:${selectedBooking.customerPhone}`} className="text-stone-600 font-mono text-[11px] block">
                      📞 {selectedBooking.customerPhone}
                    </a>
                  </div>
                  <a
                    href={`tel:${selectedBooking.customerPhone}`}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>โทรหาลูกค้า</span>
                  </a>
                </div>

                {selectedBooking.specialRequest && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-stone-700">
                    <span className="font-bold text-amber-900 block">หมายเหตุพิเศษ:</span>
                    <span>{selectedBooking.specialRequest}</span>
                  </div>
                )}

                {/* Millisecond precision booking timestamp */}
                <div className="p-2.5 bg-stone-100/90 rounded-xl text-[11px] text-stone-600 flex items-center justify-between border border-stone-200/60">
                  <span className="font-medium">⏱️ บันทึกระบบเมื่อ (ระดับมิลลิวินาที):</span>
                  <span className="font-mono font-bold text-stone-900">
                    {(() => {
                      try {
                        const d = selectedBooking.createdAtMs
                          ? new Date(selectedBooking.createdAtMs)
                          : new Date(selectedBooking.createdAt);
                        const hours = String(d.getHours()).padStart(2, '0');
                        const mins = String(d.getMinutes()).padStart(2, '0');
                        const secs = String(d.getSeconds()).padStart(2, '0');
                        const ms = String(d.getMilliseconds()).padStart(3, '0');
                        return `${hours}:${mins}:${secs}.${ms} น.`;
                      } catch {
                        return selectedBooking.createdAt;
                      }
                    })()}
                  </span>
                </div>

                {/* Actions: View Slip, Reschedule, Change Status */}
                <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex gap-2">
                    {selectedBooking.slipUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewSlip(selectedBooking);
                          setSelectedBooking(null);
                        }}
                        className="px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold border border-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ดูสลิปโอนเงิน</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenReschedule(selectedBooking)}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                      <span>เลื่อนคิว (Reschedule)</span>
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateStatus(selectedBooking.id, 'confirmed');
                        setSelectedBooking({ ...selectedBooking, status: 'confirmed' });
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold cursor-pointer"
                    >
                      ยืนยันคิว
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateStatus(selectedBooking.id, 'cancelled');
                        setSelectedBooking({ ...selectedBooking, status: 'cancelled' });
                      }}
                      className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
