import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, Phone, CheckCircle, Clock3, Ban, FileText } from 'lucide-react';

export default function CalendarView({ bookings = [], onSelectBooking, onViewSlip, onUpdateStatus }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Days calculations
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-semibold">ยืนยันแล้ว</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full font-semibold">เสร็จสิ้น</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-full font-semibold">ยกเลิก</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-semibold">รอยืนยัน</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Calendar Grid Section */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h3 className="font-bold text-stone-900 text-base sm:text-lg font-serif">
            {monthNames[month]} {year + 543}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 sm:px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
            >
              วันนี้
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekdays Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-stone-500 mb-2">
          <span>จ.</span>
          <span>อ.</span>
          <span>พ.</span>
          <span>พฤ.</span>
          <span>ศ.</span>
          <span>ส.</span>
          <span>อา.</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-14 sm:h-20 bg-stone-50/50 rounded-xl" />;
            }

            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const thisDateStr = `${year}-${mStr}-${dStr}`;
            const isSelected = thisDateStr === selectedDateStr;

            const dayBookings = bookingsByDate[thisDateStr] || [];
            const nonCancelled = dayBookings.filter((b) => b.status !== 'cancelled');

            return (
              <button
                key={thisDateStr}
                onClick={() => setSelectedDateStr(thisDateStr)}
                className={`h-14 sm:h-20 p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span
                  className={`text-xs font-bold leading-none ${
                    isSelected
                      ? 'text-amber-900'
                      : 'text-stone-700'
                  }`}
                >
                  {day}
                </span>

                {nonCancelled.length > 0 && (
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="block text-[9px] sm:text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1 py-0.5 rounded leading-tight text-center truncate">
                      {nonCancelled.length} คิว
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm flex flex-col">
        <div className="border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-stone-900 text-sm sm:text-base">
              ตารางคิววันที่ {selectedDateStr}
            </h4>
            <p className="text-xs text-stone-500">
              {selectedDayBookings.length} รายการจอง
            </p>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold px-2 py-1 bg-stone-100 text-stone-700 rounded-lg">
            Google Calendar
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
          {selectedDayBookings.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-stone-400 text-sm">
              ไม่มีการจองในวันนี้
            </div>
          ) : (
            selectedDayBookings.map((b) => (
              <div
                key={b.id}
                className="p-3 sm:p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/70 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800 shrink-0">
                      {b.time} น.
                    </span>
                    <span className="text-xs font-bold text-stone-800 truncate">{b.serviceName}</span>
                  </div>
                  {getStatusBadge(b.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate font-medium text-stone-900">{b.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <a href={`tel:${b.customerPhone}`} className="text-stone-700 hover:text-amber-700 font-mono">
                      {b.customerPhone}
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs pt-1.5 border-t border-stone-200/60 gap-2">
                  <span className="text-stone-500 text-[11px]">
                    ช่าง: <strong className="text-stone-700">{b.staffName}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {b.slipUrl && (
                      <button
                        onClick={() => onViewSlip(b)}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      >
                        ดูสลิป
                      </button>
                    )}

                    <select
                      value={b.status}
                      onChange={(e) => onUpdateStatus(b.id, e.target.value)}
                      className="text-[11px] font-semibold bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-800"
                    >
                      <option value="pending">รอยืนยัน</option>
                      <option value="confirmed">ยืนยันแล้ว</option>
                      <option value="completed">เสร็จสิ้น</option>
                      <option value="cancelled">ยกเลิก</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
