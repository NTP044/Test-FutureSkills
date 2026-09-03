import React from 'react';
import { X, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';

export default function SlipViewerModal({ isOpen, onClose, booking }) {
  if (!isOpen || !booking) return null;

  const slipUrl = booking.slipUrl;
  const isDriveLink = slipUrl && slipUrl.includes('drive.google.com');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-stone-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">หลักฐานการโอนเงิน (สลิป)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs text-stone-700 flex flex-col sm:flex-row justify-between gap-2">
            <div>
              <span className="font-bold text-stone-900">รหัสจอง:</span> {booking.id}
              <span className="mx-2">•</span>
              <span className="font-bold text-stone-900">ลูกค้า:</span> {booking.customerName}
            </div>
            <div>
              <span className="font-bold text-stone-900">ยอดเงิน:</span> {Number(booking.servicePrice || 0).toLocaleString()} ฿
            </div>
          </div>

          <div className="bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 max-h-[55vh] flex items-center justify-center p-2">
            {slipUrl ? (
              <img
                src={slipUrl}
                alt="Payment Slip"
                className="max-h-[50vh] w-auto max-w-full object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/400x600/f5f5f4/78716c?text=ดูรูปบน+Google+Drive';
                }}
              />
            ) : (
              <div className="py-16 text-stone-400 text-sm text-center">
                ไม่พบรูปภาพสลิป หรือลูกค้าเลือกชำระเงินที่หน้าร้าน
              </div>
            )}
          </div>

          {slipUrl && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {isDriveLink ? (
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>เปิดดูไฟล์ต้นฉบับบน Google Drive</span>
                </a>
              ) : (
                <span className="text-xs text-stone-400">รูปภาพถูกส่งมาผ่านระบบ</span>
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <a
                  href={slipUrl}
                  download={`slip-${booking.id}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดรูป</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
