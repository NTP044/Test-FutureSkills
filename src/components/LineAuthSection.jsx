import React, { useState, useEffect } from 'react';
import LineIcon from './LineIcon';
import LineUserProfileCard from './LineUserProfileCard';
import {
  LogIn,
  LogOut,
  Smartphone,
  Globe,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function LineAuthSection({
  isLoggedIn,
  lineProfile,
  isInClient,
  context,
  onLogin,
  onLogout,
  isLoggingIn,
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
      setIsInsideIframe(window.self !== window.top);
    }
  }, []);

  const handleCopyCurrentUrl = () => {
    if (typeof window !== 'undefined') {
      const urlToCopy = `${window.location.origin}/`;
      navigator.clipboard?.writeText(urlToCopy);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // If user is already logged in, render the LINE User Profile Card directly here under the hero
  if (isLoggedIn && lineProfile) {
    return (
      <div className="space-y-2">
        <LineUserProfileCard
          profile={lineProfile}
          isInClient={isInClient}
          context={context}
          onLogout={onLogout}
        />
      </div>
    );
  }

  // When NOT logged in: Show Login with LINE button under the hero
  return (
    <section
      id="line-auth-section"
      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-[#06C755]/15 flex items-center justify-center text-[#06C755]">
            <LineIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-gray-800">LINE MINI App</span>
        </div>

        {/* In-Client detection badge */}
        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          {isInClient ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              <Smartphone className="w-3 h-3 text-emerald-600" />
              LINE App
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              <Globe className="w-3 h-3 text-gray-500" />
              External Browser
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        เข้าสู่ระบบด้วย LINE เพื่อดึงข้อมูลชื่อ-โปรไฟล์อัตโนมัติ และติดตามสถานะการจองได้สะดวกรวดเร็ว
      </p>

      {/* Main Login with LINE Button - Prominent, Height >= 48px, Official LINE Green #06C755 */}
      <button
        id="btn-line-login"
        type="button"
        onClick={onLogin}
        disabled={isLoggingIn}
        className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.99] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
      >
        <LineIcon className="w-5 h-5 fill-white shrink-0" />
        <span>{isLoggingIn ? 'กำลังเชื่อมต่อ LINE...' : 'เข้าสู่ระบบด้วย LINE (Login with LINE)'}</span>
      </button>

      {/* Quick Launch & Testing Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <a
          id="link-open-liff-miniapp"
          href="https://miniapp.line.me/2010691658-aaTEbpoN"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/15 text-[#06C755] font-medium text-xs border border-[#06C755]/20 transition-all text-center"
        >
          <LineIcon className="w-4 h-4 shrink-0" />
          <span>เปิดด้วย LINE MINI App</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
        </a>

        <a
          id="link-open-shared-app"
          href="https://ais-pre-6xz4ebeb36aauxyoowfpwj-157778757157.asia-southeast1.run.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs border border-stone-200 transition-all text-center"
        >
          <Globe className="w-3.5 h-3.5 shrink-0 text-stone-500" />
          <span>เปิดหน้า Shared App</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
        </a>
      </div>

      {/* Endpoint URL Configuration Helper Accordion */}
      <div className="pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowConfigHelper(!showConfigHelper)}
          className="w-full flex items-center justify-between text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
        >
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Endpoint URL: เชื่อมต่อ LINE Developers Console แล้ว</span>
          </span>
          {showConfigHelper ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>

        {showConfigHelper && (
          <div className="mt-2.5 p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-xs space-y-2 text-stone-700 animate-fadeIn">
            <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Endpoint URL ที่ลงทะเบียนไว้ใน Developing:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-emerald-200">
              <code className="text-[11px] font-mono text-emerald-900 break-all flex-1 select-all">
                https://ais-pre-6xz4ebeb36aauxyoowfpwj-157778757157.asia-southeast1.run.app
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    'https://ais-pre-6xz4ebeb36aauxyoowfpwj-157778757157.asia-southeast1.run.app'
                  );
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-[11px] font-medium transition-colors shrink-0"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>คัดลอก</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-stone-500 pt-1">
              LIFF App Name: <strong>Dorm System</strong> | LIFF ID: <code className="font-mono text-stone-700">2010691658-aaTEbpoN</code>
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#D4A373]" />
          กรอกชื่อผู้จองให้อัตโนมัติ (แก้ไขได้ตลอดเวลา)
        </span>
        <span className="text-gray-300">•</span>
        <span>LIFF v2</span>
      </div>
    </section>
  );
}
