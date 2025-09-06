import React from 'react';

interface WarningPopupProps {
  onAccept: () => void;
}

const WarningPopup: React.FC<WarningPopupProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-[var(--border)] animate-fadeInUp">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Warning / انتباہ</h2>
        <div className="space-y-4 text-lg text-text-primary">
          <p>We are not responsible for any scam or fraud. All deposits are at your own risk.</p>
          <p className="font-sans">ہم کسی بھی فراڈ یا سکیم کے ذمہ دار نہیں، ڈپازٹ آپ کے اپنے رسک پر ہوگا۔</p>
        </div>
        <button
          onClick={onAccept}
          className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        >
          I Understand & Accept / میں سمجھ گیا اور قبول کرتا ہوں
        </button>
      </div>
    </div>
  );
};

export default WarningPopup;