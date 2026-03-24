import React, { useState, useEffect } from 'react';
import { Key, Save, ShieldCheck } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (sttKey: string, minimaxKey: string) => void;
  initialSttKey: string;
  initialMinimaxKey: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, initialSttKey, initialMinimaxKey }) => {
  const [sttKey, setSttKey] = useState(initialSttKey);
  const [minimaxKey, setMinimaxKey] = useState(initialMinimaxKey);
  
  useEffect(() => {
    setSttKey(initialSttKey);
    setMinimaxKey(initialMinimaxKey);
  }, [initialSttKey, initialMinimaxKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all scale-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-teal-50 rounded-full">
            <Key className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">配置 API 密钥</h2>
            <p className="text-xs text-gray-500">您的密钥仅存储在本地浏览器中</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SiliconFlow / STT Key</label>
            <input
              type="password"
              value={sttKey}
              onChange={(e) => setSttKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimax Key</label>
            <input
              type="password"
              value={minimaxKey}
              onChange={(e) => setMinimaxKey(e.target.value)}
              placeholder="ey..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm transition-all"
            />
          </div>
        </div>

        <button
          onClick={() => onSave(sttKey, minimaxKey)}
          className="mt-8 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-gray-200"
        >
          <Save className="w-4 h-4" />
          <span>保存并继续</span>
        </button>
        
        <div className="mt-4 flex items-center justify-center space-x-1 text-xs text-green-600">
           <ShieldCheck className="w-3 h-3" />
           <span>安全加密存储</span>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
