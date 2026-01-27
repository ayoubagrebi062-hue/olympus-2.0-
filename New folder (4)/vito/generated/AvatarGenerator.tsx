// Full component code here...
'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { cn } from '../src/lib/utils';

interface AvatarGeneratorProps {
  onUpload: (file: File) => void;
  onEnhance: (file: File) => Promise<File>;
  onCustomize: (file: File) => void;
}

const AvatarGenerator = forwardRef<HTMLInputElement, AvatarGeneratorProps>(({ onUpload, onEnhance, onCustomize }, ref) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      onUpload(uploadedFile);
      setIsLoading(true);
      const enhancedFile = await onEnhance(uploadedFile);
      setIsLoading(false);
      onCustomize(enhancedFile);
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 text-white p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
      <h1 className="text-4xl font-bold mb-4">Unlock Exclusive Avatars with Our AI-Powered Generator</h1>
      <p className="text-base mb-6">Join the Elite with Avatars That Stand Out</p>
      <input
        type="file"
        ref={ref || inputRef}
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload your photo to generate an avatar"
      />
      <button
        className={cn(
          'bg-violet-600 text-white py-2 px-4 rounded-lg',
          'hover:bg-violet-500 hover:-translate-y-0.5 focus:ring-2 focus:ring-violet-500',
          'transition-all duration-200'
        )}
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? 'Enhancing...' : 'Create Your Exclusive Avatar Now!'}
      </button>
    </div>
  );
});

export { AvatarGenerator };
export type { AvatarGeneratorProps };
