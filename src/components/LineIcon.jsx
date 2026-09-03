import React from 'react';

export default function LineIcon({ className = 'w-5 h-5', style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M19.365 9.864c0-4.34-4.205-7.864-9.365-7.864s-9.365 3.524-9.365 7.864c0 3.886 3.435 7.142 8.08 7.766.315.068.744.208.852.478.098.244.064.628.031.874l-.138.832c-.042.253-.198.988.868.539 1.066-.45 5.753-3.388 7.85-5.803 1.135-1.328 1.667-2.791 1.667-4.686z" />
    </svg>
  );
}
