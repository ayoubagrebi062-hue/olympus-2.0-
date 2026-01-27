'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../src/lib/utils';

interface LanguageSwitcherProps {
  languages: { code: string; name: string; flag: string }[];
  onLanguageChange: (languageCode: string) => void;
}

const LanguageSwitcher = React.forwardRef<HTMLDivElement, LanguageSwitcherProps>(({ languages, onLanguageChange }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLanguageSelect = (language: { code: string; name: string; flag: string }) => {
    try {
      setSelectedLanguage(language);
      onLanguageChange(language.code);
      alert(`Language switched to ${language.name}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <div ref={ref} className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className={cn(
            'inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-[#0a0a0a] text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500',
            'transition-all duration-200'
          )}
          id="options-menu"
          aria-haspopup="true"
          aria-expanded="true"
          onClick={toggleDropdown}
        >
          <img src={selectedLanguage.flag} alt="Selected language flag" className="w-5 h-5 mr-2 inline" />
          {selectedLanguage.name}
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.08 0l-4.25-5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div
        ref={dropdownRef}
        className={cn(
          'origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-[#0a0a0a] ring-1 ring-black ring-opacity-5 focus:outline-none',
          isOpen ? 'block' : 'hidden',
          'transition-all duration-200'
        )}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="options-menu"
      >
        <div className="py-1" role="none">
          {languages.map((language) => (
            <button
              key={language.code}
              className={cn(
                'text-white block px-4 py-2 text-sm w-full text-left',
                'hover:bg-white/10 hover:text-white'
              )}
              role="menuitem"
              onClick={() => handleLanguageSelect(language)}
            >
              <img src={language.flag} alt={`${language.name} flag`} className="w-5 h-5 mr-2 inline" />
              {language.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';

export { LanguageSwitcher };
export type { LanguageSwitcherProps };
