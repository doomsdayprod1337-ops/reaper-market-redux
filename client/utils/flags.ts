export const FLAG_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
} as const;

export type FlagSize = typeof FLAG_SIZES[keyof typeof FLAG_SIZES];

export const getCountryName = (countryCode: string): string => {
  const countryNames: Record<string, string> = {
    'US': 'United States',
    'UK': 'United Kingdom', 
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'CA': 'Canada',
    'AU': 'Australia',
    'JP': 'Japan',
    'CN': 'China',
    'RU': 'Russia',
    'BR': 'Brazil',
    'IN': 'India',
    'KR': 'South Korea',
    'MX': 'Mexico',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'NO': 'Norway',
    'PL': 'Poland',
    'TR': 'Turkey',
    'AR': 'Argentina',
    'CL': 'Chile',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'PH': 'Philippines',
    'ID': 'Indonesia',
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'TW': 'Taiwan',
    'UA': 'Ukraine',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'GH': 'Ghana',
    'MA': 'Morocco',
    'DZ': 'Algeria',
    'TN': 'Tunisia',
    'LY': 'Libya',
    'SD': 'Sudan',
    'ET': 'Ethiopia',
    'UG': 'Uganda',
    'TZ': 'Tanzania',
    'ZW': 'Zimbabwe',
    'BW': 'Botswana',
    'NA': 'Namibia',
    'ZM': 'Zambia',
    'MW': 'Malawi',
    'MZ': 'Mozambique',
    'AO': 'Angola',
    'CD': 'Democratic Republic of Congo',
    'CG': 'Republic of Congo',
    'CM': 'Cameroon',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'NE': 'Niger',
    'ML': 'Mali',
    'BF': 'Burkina Faso',
    'SN': 'Senegal',
    'GN': 'Guinea',
    'SL': 'Sierra Leone',
    'LR': 'Liberia',
    'CI': 'Ivory Coast',
    'GW': 'Guinea-Bissau',
    'GM': 'Gambia',
    'MR': 'Mauritania',
    'CV': 'Cape Verde',
    'ST': 'Sao Tome and Principe',
    'GQ': 'Equatorial Guinea',
    'GA': 'Gabon',
    'DJ': 'Djibouti',
    'SO': 'Somalia',
    'ER': 'Eritrea',
    'SS': 'South Sudan',
    'RW': 'Rwanda',
    'BI': 'Burundi',
    'KM': 'Comoros',
    'MU': 'Mauritius',
    'SC': 'Seychelles',
    'MG': 'Madagascar',
  };
  
  return countryNames[countryCode.toUpperCase()] || countryCode;
};

export const getCountryEmoji = (countryCode: string): string => {
  const countryEmojis: Record<string, string> = {
    'US': '🇺🇸', 'UK': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹',
    'ES': '🇪🇸', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
    'RU': '🇷🇺', 'BR': '🇧🇷', 'IN': '🇮🇳', 'KR': '🇰🇷', 'MX': '🇲🇽',
    'NL': '🇳🇱', 'SE': '🇸🇪', 'NO': '🇳🇴', 'PL': '🇵🇱', 'TR': '🇹🇷',
    'AR': '🇦🇷', 'CL': '🇨🇱', 'TH': '🇹🇭', 'VN': '🇻🇳', 'PH': '🇵🇭',
    'ID': '🇮🇩', 'MY': '🇲🇾', 'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼',
    'UA': '🇺🇦', 'ZA': '🇿🇦', 'EG': '🇪🇬', 'NG': '🇳🇬', 'KE': '🇰🇪',
  };

  return countryEmojis[countryCode.toUpperCase()] || '🏳️';
};

// Alias for compatibility
export const getFlagEmoji = getCountryEmoji;

// Additional utility functions for CountrySelector component
export const countryFlags = {};

export const getFlagUrl = (countryCode: string, size: any) => {
  // For now, return empty string as we're using emojis
  return '';
};

export const getCountriesByRegion = () => {
  return {};
};

export const searchCountries = (query: string) => {
  return [];
};

export const getPopularCountries = () => {
  return [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' }
  ];
};
