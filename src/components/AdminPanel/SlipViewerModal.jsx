import React from 'react';
import { X, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';

export default function SlipViewerModal({ isOpen, onClose, booking }) {
  if (!isOpen || !booking) return null;

  const slipUrl = booking.slipUrl;
  const isDriveLink = slipUrl && slipUrl.includes('drive.google.com');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-stone-900 text-white">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">หลักฐานการโอนเงิน (สลิป)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700 flex flex-col sm:flex-row justify-between gap-2">
            <div>
              <span className="font-bold text-stone-900">รหัสจอง:</span> {booking.id}
              <span className="mx-2">•</span>
              <span className="font-bold text-stone-900">ลูกค้า:</span> {booking.customerName}
            </div>
            <div>
              <span className="font-bold text-stone-900">ยอดเงิน:</span> {Number(booking.servicePrice || 0).toLocaleString()} ฿
            </div>
          </div>

          <div className="bg-stone-100 rounded-xl overflow-hidden border border-stone-200 max-h-[60vh] flex items-center justify-center">
            {slipUrl ? (
              <img
                src={slipUrl}
                alt="Payment Slip"
                className="max-h-[55vh] w-auto object-contain"
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
            <div className="flex items-center justify-between pt-2">
              {isDriveLink ? (
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดดูไฟล์ต้นฉบับบน Google Drive</span>
                </a>
              ) : (
                <span className="text-xs text-stone-400">รูปภาพถูกส่งมาผ่านระบบ</span>
              )}

              <a
                href={slipUrl}
                download={`slip-${booking.id}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดรูป</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
