import React, { useState, useEffect } from 'react';
import { QrCode, Upload, CheckCircle2, AlertCircle, Copy, Check, X, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
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
  const [customerEmail, setCustomerEmail] = useState(bookingDetails?.customerEmail || '');
  const [slipFile, setSlipFile] = useState(null);
  const [slipBase64, setSlipBase64] = useState('');
  const [slipPreview, setSlipPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const price = bookingDetails?.servicePrice || 0;

  useEffect(() => {
    if (bookingDetails?.customerEmail) {
      setCustomerEmail(bookingDetails.customerEmail);
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

  const handleSubmit = (payLater = false) => {
    onConfirmBooking({
      customerEmail,
      slipBase64: payLater ? null : slipBase64,
      payLater,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>ระบบชำระเงิน PromptPay ปลอดภัย</span>
          </div>
          <h3 className="text-xl font-bold font-serif">สแกนชำระเงิน & แนบสลิป</h3>
          <p className="text-stone-300 text-sm mt-1">
            {bookingDetails?.serviceName} • {price.toLocaleString()} บาท
          </p>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Submission error if any */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* QR Code Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center flex flex-col items-center">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 mb-3">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="PromptPay QR Code"
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-stone-400">
                  กำลังสร้าง QR Code...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs text-stone-500 font-medium">ชื่อบัญชี: {promptpayName}</div>
              <div className="flex items-center justify-center gap-2 font-mono font-bold text-stone-800 text-base">
                <span>พร้อมเพย์: {promptpayNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors"
                  title="คัดลอกเบอร์พร้อมเพย์"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-xl font-extrabold text-stone-900 mt-2 font-serif">
                ยอดชำระ: <span className="text-amber-700">{price.toLocaleString()}</span> ฿
              </div>
            </div>
          </div>

          {/* Customer Email Input for Google Calendar / Gmail alerts */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-700" />
              <span>อีเมลสำหรับรับแจ้งเตือน & ปฏิทิน (ไม่บังคับ)</span>
            </label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 text-sm transition-all placeholder:text-stone-400"
            />
            <p className="text-xs text-stone-500 mt-1">
              * ระบบจะส่งการแจ้งเตือนและเพิ่มนัดหมายลง Google Calendar ให้อัตโนมัติ
            </p>
          </div>

          {/* Slip Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-amber-700" />
              <span>แนบสลิปหลักฐานการโอนเงิน (อัปโหลดขึ้น Google Drive)</span>
            </label>

            {uploadError && (
              <div className="mb-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {!slipPreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
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
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-stone-200 flex items-center justify-center text-amber-700">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium text-stone-700">
                    ลากรูปสลิปมาวางที่นี่ หรือ <span className="text-amber-700 underline">คลิกเพื่อเลือกไฟล์</span>
                  </div>
                  <div className="text-xs text-stone-400">
                    รองรับไฟล์ JPG, PNG (สูงสุด 10MB)
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative border border-stone-200 rounded-2xl p-3 bg-stone-50 flex items-center gap-3">
                <img
                  src={slipPreview}
                  alt="Slip preview"
                  className="w-16 h-20 object-cover rounded-lg border border-stone-200 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mb-0.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>แนบสลิปเรียบร้อยแล้ว</span>
                  </div>
                  <div className="text-xs text-stone-600 truncate font-mono">
                    {slipFile?.name || 'slip.jpg'}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    พร้อมอัปโหลดขึ้น Google Drive และใส่ลิงก์ใน Google Sheet
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSlip}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-200 transition-colors"
                  title="ลบสลิป"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 text-sm text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-xl transition-colors font-medium cursor-pointer"
          >
            ย้อนกลับ
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !slipBase64}
            className="w-full sm:w-auto flex-1 px-6 py-2.5 text-sm text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังยืนยันการจอง...</span>
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
