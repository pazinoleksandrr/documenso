'use client';

import { useEffect } from 'react';

import './gTranslate.css';

// Extend the Window interface to include gtranslateSettings
interface Window {
  gtranslateSettings: {
    default_language: string;
    languages: string[];
    wrapper_selector: string;
    flag_size: number;
    switcher_horizontal_position: string;
    switcher_open_direction: string;
  };
}

// Declare gtranslateSettings globally
declare global {
  interface Window {
    gtranslateSettings: {
      default_language: string;
      languages: string[];
      wrapper_selector: string;
      flag_size: number;
      switcher_horizontal_position: string;
      switcher_open_direction: string;
    };
  }
}

const GTranslate: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.gtranslateSettings = {
        default_language: 'iw',
        languages: ['iw', 'fr', 'de', 'it', 'es', 'uk', 'en'],
        wrapper_selector: '.gtranslate_wrapper',
        flag_size: 24,
        switcher_horizontal_position: 'inline',
        switcher_open_direction: 'bottom',
      };

      // Log gtranslateSettings to satisfy ESLint
      console.log(window.gtranslateSettings);

      // Load the gtranslate script
      const script = document.createElement('script');
      script.src = 'https://cdn.gtranslate.net/widgets/latest/dwf.js';
      script.defer = true;
      document.head.appendChild(script);

      // Clean up the script on component unmount
      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  return <div className="gtranslate_wrapper"></div>;
};

export default GTranslate;
