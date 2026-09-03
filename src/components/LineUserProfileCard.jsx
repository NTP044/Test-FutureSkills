import React, { useState } from 'react';
import LineIcon from './LineIcon';
import { LogOut, Copy, Check, Smartphone, Globe, ShieldCheck } from 'lucide-react';

export default function LineUserProfileCard({
  profile,
  isInClient,
  context,
  onLogout,
}) {
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard?.writeText(profile.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      id="line-user-profile-card"
      className="bg-white rounded-2xl p-4 border border-[#06C755]/25 shadow-xs relative overflow-hidden transition-all"
    >
      {/* Subtle top banner accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#06C755] via-[#20d86c] to-[#06C755]" />

      {/* Header bar of the card */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-1.5">
          <div className="w-5 h-5 rounded-full bg-[#06C755] flex items-center justify-center text-white">
            <LineIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-gray-900 tracking-tight">
            LINE User Profile
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#06C755]/10 text-[#06C755] text-[10px] font-medium">
            <ShieldCheck className="w-3 h-3" />
            เชื่อมต่อแล้ว
          </span>
        </div>

        {/* Logout button */}
        <button
          id="btn-line-logout-card"
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 transition-colors"
          title="ออกจากระบบ LINE"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Main Profile Info */}
      <div className="pt-3 flex items-start gap-3.5">
        {/* Profile Picture */}
        <div className="relative shrink-0">
          {profile.pictureUrl ? (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName || 'LINE User'}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#06C755]/30 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#06C755]/15 text-[#06C755] flex items-center justify-center font-bold text-lg border-2 border-[#06C755]/30">
              {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'L'}
            </div>
          )}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#06C755] rounded-full border-2 border-white flex items-center justify-center text-white"
            title="ออนไลน์"
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="flex-1 min-w-0">
          {/* Display Name */}
          <div className="flex items-center gap-1.5">
            <h4
              id="line-profile-display-name"
              className="text-base font-semibold text-gray-900 truncate"
            >
              {profile.displayName || 'ผู้ใช้ LINE'}
            </h4>
          </div>

          {/* Status Message if available */}
          {profile.statusMessage && (
            <p
              id="line-profile-status-message"
              className="text-xs text-gray-500 italic mt-0.5 line-clamp-2 leading-relaxed bg-gray-50/80 px-2 py-1 rounded-md border border-gray-100"
            >
              &ldquo;{profile.statusMessage}&rdquo;
            </p>
          )}

          {/* LINE ID */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 font-medium">LINE ID:</span>
            <code
              id="line-profile-user-id"
              className="text-[11px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[170px]"
            >
              {profile.userId || '-'}
            </code>
            {profile.userId && (
              <button
                type="button"
                onClick={handleCopyId}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 transition-colors"
                title="คัดลอก LINE ID"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Environment Context Badges */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          {isInClient ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              <Smartphone className="w-3 h-3 text-emerald-600" />
              LINE In-App Browser
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              <Globe className="w-3 h-3 text-gray-500" />
              External Browser
            </span>
          )}

          {context?.viewType && (
            <span className="text-gray-400 hidden sm:inline">
              Mode: {context.viewType}
            </span>
          )}
        </div>

        <span className="text-[11px] text-[#D4A373] font-medium">
          ชื่อถูกกรอกลงในฟอร์มอัตโนมัติแล้ว
        </span>
      </div>
    </section>
  );
}
