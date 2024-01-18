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
        default_language: 'iw', // Corrected from 'iw'
        languages: [
          'iw',
          'fr',
          'de',
          'it',
          'es',
          'uk',
          'en',
          'ko',
          'ar',
          'ja',
          'ru',
          'pt',
          'zh-CN',
          'hi',
          'tr',
          'nl',
          'pl',
          'sv',
          'fi',
          'no',
          'da',
          'el',
          'hu',
          'cs',
          'ro',
          'sk',
          'bg',
          'hr',
          'sr',
          'sl',
          'et',
          'lv',
          'lt',
          'mk',
          'sq',
          'bs',
          'ms',
          'vi',
          'th',
          'id',
          'fa',
          'ja',
          'ar',
          'bn',
          'gu',
          'kn',
          'ml',
          'mr',
          'pa',
          'ta',
          'te',
          'ur',
        ],
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
// import { useEffect, useState } from 'react';
//import './gTranslate.css';

//const GTranslate: React.FC = () => {
//const [translatedText, setTranslatedText] = useState<string | null>(null);

//useEffect(() => {
// const apiKey = 'YOUR_API_KEY'; // Replace with your actual API key
// const textToTranslate = 'Hello, world!';
// const targetLanguage = 'fr'; // Target language code (e.g., 'fr' for French)
// Construct the API endpoint URL
//     const apiUrl = `https://api.translation-service-provider.com/translate?apiKey=${apiKey}&text=${textToTranslate}&target=${targetLanguage}`;

//     // Fetch the translation from the API
//     fetch(apiUrl)
//       .then((response) => response.json())
//       .then((data) => {
//         const translatedText = data.translation; // Adjust this based on the API response structure
//         setTranslatedText(translatedText);
//       })
//       .catch((error) => {
//         console.error('Error:', error);
//       });
//   }, []);

//   return (
//     <div className="gtranslate_wrapper">
//       {translatedText ? (
//         <p>Translated Text: {translatedText}</p>
//       ) : (
//         <p>Loading translation...</p>
//       )}
//     </div>
//   );
// };

// export default GTranslate;
