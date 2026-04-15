import React from 'react';
import { useCreator } from '../contexts/CreatorContext';

export const PrintFooter: React.FC = () => {
  const { creatorInfo } = useCreator();
  const appName = creatorInfo.app_name || 'Manager Pro';
  const dateTime = new Date().toLocaleString();

  return (
    <footer className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-gray-500 py-2 border-t bg-white">
      {appName} - {dateTime}
    </footer>
  );
};