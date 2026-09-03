import React, { useState } from 'react';
import { Lock, Shield, KeyRound, AlertCircle, X, Check } from 'lucide-react';
import { adminLogin } from '../../api/bookingService';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Support direct keyboard input (0-9, Enter, Backspace, Escape)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setPin((prev) => prev + e.key);
          setError('');
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setError('');
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleNumClick = (num) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('กรุณากรอกรหัส PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await adminLogin(pin);
      onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'รหัส PIN ไม่ถูกต้อง (ลอง 1234)');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden text-center p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-stone-900 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
          <KeyRound className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold font-serif text-stone-900">
          ระบบจัดการหลังบ้าน
        </h3>
        <p className="text-xs text-stone-500 mt-1 mb-6">
          กรุณากรอกรหัส PIN แอดมิน (PIN เริ่มต้นคือ <strong className="text-stone-800">1234</strong>)
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-xl flex items-center justify-center gap-1.5 border border-red-200 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                pin.length > i
                  ? 'bg-stone-900 border-stone-900 scale-110 shadow-sm'
                  : 'bg-stone-100 border-stone-300'
              }`}
            />
          ))}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumClick(num)}
              className="w-16 h-12 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-800 font-bold text-lg transition-colors border border-stone-200 shadow-sm flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-12 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-500 font-medium text-xs transition-colors border border-stone-200 flex items-center justify-center mx-auto"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => handleNumClick(0)}
            className="w-16 h-12 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-800 font-bold text-lg transition-colors border border-stone-200 shadow-sm flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="w-16 h-12 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-500 font-medium text-xs transition-colors border border-stone-200 flex items-center justify-center mx-auto"
          >
            ลบ
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || pin.length < 4}
          className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              <span>เข้าสู่ระบบแอดมิน</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
