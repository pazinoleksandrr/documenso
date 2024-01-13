'use client';

// import Head from 'next/head';
import { useEffect } from 'react';

const GTranslate = () => {
  useEffect(() => {
    // This effect will only run on the client side
    window.gtranslateSettings = {
      default_language: 'en',
      native_language_names: true,
      detect_browser_language: true,
      languages: ['en', 'fr', 'de', 'it', 'es'],
      wrapper_selector: '.gtranslate_wrapper',
      flag_size: 24,
      switcher_horizontal_position: 'right',
      switcher_vertical_position: 'top',
      switcher_open_direction: 'top',
    };

    // Load the gtranslate script
    const script = document.createElement('script');
    script.src = 'https://cdn.gtranslate.net/widgets/latest/dwf.js';
    script.defer = true;
    document.head.appendChild(script);

    // Clean up the script on component unmount
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <>
      <div className="gtranslate_wrapper"></div>
    </>
  );
};

export default GTranslate;
