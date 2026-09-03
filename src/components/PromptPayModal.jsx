import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Copy, Check, X, ShieldCheck, Mail } from 'lucide-react';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';

export default function PromptPayModal({
  isOpen,
  onClose,
  bookingDetails,
  onConfirmBooking,
  isSubmitting,
  errorMessage = '',
  promptpayNumber = '0812345678',
  promptpayName = 'The Bloom Studio',
}) {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(
    String(bookingDetails?.customerEmail || '')
  );
  const [slipFile, setSlipFile] = useState(null);
  const [slipBase64, setSlipBase64] = useState('');
  const [slipPreview, setSlipPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const price = bookingDetails?.servicePrice || 0;

  useEffect(() => {
    if (bookingDetails?.customerEmail) {
      setCustomerEmail(String(bookingDetails.customerEmail));
    }
  }, [bookingDetails?.customerEmail]);

  useEffect(() => {
    if (isOpen && price) {
      generatePromptPayQRDataUrl(promptpayNumber, price)
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [isOpen, price, promptpayNumber]);

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(promptpayNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setUploadError('');
    setSlipFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      setSlipPreview(result);
      setSlipBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRemoveSlip = () => {
    setSlipFile(null);
    setSlipPreview('');
    setSlipBase64('');
  };

  const handleSubmit = () => {
    if (!slipBase64) return;
    onConfirmBooking({
      customerEmail: String(customerEmail || '').trim() || null,
      slipBase64: slipBase64,
      payLater: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-0 sm:p-4">
      {/* Modal / Bottom Sheet Box */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92dvh] flex flex-col animate-slideUp sm:animate-scaleUp">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white px-5 py-3.5 sm:py-4 relative flex-shrink-0">
          {/* Mobile Drag Pill */}
          <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-2 sm:hidden" />
          
          <button
            onClick={onClose}
            className="absolute top-3.5 right-4 p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold uppercase tracking-wider mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ระบบชำระเงินมัดจำ PromptPay ปลอดภัย</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold font-serif text-white flex items-center gap-2">
            <span>สแกนชำระมัดจำ & แนบสลิป</span>
          </h3>
          <p className="text-stone-300 text-xs mt-0.5 truncate">
            {bookingDetails?.serviceName} • {price.toLocaleString()} บาท
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
          {/* Submission Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* QR Code Card */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 text-center flex flex-col items-center">
            <div className="bg-white p-2 sm:p-3 rounded-2xl shadow-sm border border-stone-100 mb-2">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="PromptPay QR Code"
                  className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
                />
              ) : (
                <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center text-stone-400 text-xs">
                  กำลังสร้าง QR Code...
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-stone-500">ชื่อบัญชี: {promptpayName}</div>
              <div className="flex items-center justify-center gap-1.5 font-mono font-bold text-stone-800 text-sm sm:text-base">
                <span>พร้อมเพย์: {promptpayNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors"
                  title="คัดลอกเบอร์พร้อมเพย์"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-stone-900 font-serif pt-0.5">
                ยอดชำระ: <span className="text-amber-700">{price.toLocaleString()}</span> ฿
              </div>
            </div>
          </div>

          {/* Customer Email Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-700" />
              <span>อีเมลสำหรับรับแจ้งเตือน & ปฏิทิน (ไม่บังคับ)</span>
            </label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 text-xs sm:text-sm transition-all placeholder:text-stone-400"
            />
          </div>

          {/* Slip Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-700" />
              <span>แนบสลิปหลักฐานการโอนเงิน (จำเป็น) <span className="text-rose-500">*</span></span>
            </label>

            {uploadError && (
              <div className="mb-2 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {!slipPreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                  isDragOver
                    ? 'border-amber-600 bg-amber-50/50'
                    : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
                }`}
              >
                <input
                  type="file"
                  id="slip-upload-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-stone-200 flex items-center justify-center text-amber-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-medium text-stone-700">
                    กดที่นี่เพื่อ <span className="text-amber-700 underline font-semibold">เลือกรูปสลิปจากเครื่อง</span>
                  </div>
                  <div className="text-[10px] text-stone-400">
                    รองรับ JPG, PNG (สูงสุด 10MB)
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative border border-stone-200 rounded-2xl p-2.5 bg-stone-50 flex items-center gap-2.5">
                <img
                  src={slipPreview}
                  alt="Slip preview"
                  className="w-14 h-16 object-cover rounded-lg border border-stone-200 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>แนบสลิปเรียบร้อยแล้ว</span>
                  </div>
                  <div className="text-[11px] text-stone-600 truncate font-mono">
                    {slipFile?.name || 'slip.jpg'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSlip}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-200 transition-colors"
                  title="เปลี่ยนรูปสลิป"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex gap-2.5 items-center flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs sm:text-sm text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-xl transition-colors font-medium cursor-pointer"
          >
            ย้อนกลับ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !slipBase64}
            className="flex-1 py-2.5 sm:py-3 px-4 text-xs sm:text-sm text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังบันทึกและซิงค์...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{slipBase64 ? 'ยืนยันการจอง (พร้อมสลิปมัดจำ)' : 'กรุณาแนบสลิปโอนเงินมัดจำ'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
