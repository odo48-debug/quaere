import React from 'react';

interface FileUploaderProps {
  onProcess: () => void;
  isProcessing: boolean;
  disabled: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onProcess, isProcessing, disabled }) => {

  return (
    <button
      onClick={onProcess}
      disabled={disabled || isProcessing}
      className="w-full inline-flex justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-on-primary bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {isProcessing ? 'Analyzing...' : 'Analyze PDF'}
    </button>
  );
};
