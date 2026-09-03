import React, { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-semibold text-gray-800">เกิดข้อผิดพลาดในการแสดงผล</h2>
          <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
            {this.state.error?.message || 'ระบบกำลังโหลดข้อมูลใหม่อีกครั้ง กรุณากดปุ่มด้านล่างเพื่อเริ่มใหม่'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-5 px-6 py-3 bg-[#D4A373] hover:bg-[#c49261] text-white rounded-2xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            โหลดหน้าเว็บใหม่อีกครั้ง
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
