import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const bgClass = type === 'error' ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100';
  const textClass = type === 'error' ? 'text-red-800' : 'text-teal-800';
  const Icon = type === 'error' ? AlertCircle : CheckCircle;

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center px-4 py-3 rounded-lg border shadow-lg ${bgClass} animate-in slide-in-from-top-4 duration-300`}>
      <Icon className={`w-5 h-5 mr-2 ${type === 'error' ? 'text-red-500' : 'text-teal-500'}`} />
      <span className={`text-sm font-medium ${textClass}`}>{message}</span>
      <button onClick={onClose} className={`ml-4 p-1 hover:bg-black/5 rounded-full ${textClass}`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
