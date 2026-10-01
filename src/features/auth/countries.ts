export interface CountryInfo {
  name: string;
  nationality: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: CountryInfo[] = [
  { name: 'India', nationality: 'Indian', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'United States', nationality: 'American', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', nationality: 'British', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Canada', nationality: 'Canadian', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Australia', nationality: 'Australian', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'United Arab Emirates', nationality: 'Emirati', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', nationality: 'Saudi', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Singapore', nationality: 'Singaporean', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Germany', nationality: 'German', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', nationality: 'French', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Bangladesh', nationality: 'Bangladeshi', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Pakistan', nationality: 'Pakistani', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Nepal', nationality: 'Nepali', code: 'NP', dialCode: '+977', flag: '🇳🇵' },
  { name: 'Sri Lanka', nationality: 'Sri Lankan', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Philippines', nationality: 'Filipino', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Malaysia', nationality: 'Malaysian', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Indonesia', nationality: 'Indonesian', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'South Africa', nationality: 'South African', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', nationality: 'Nigerian', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Kenya', nationality: 'Kenyan', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Egypt', nationality: 'Egyptian', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Brazil', nationality: 'Brazilian', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Mexico', nationality: 'Mexican', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Japan', nationality: 'Japanese', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'South Korea', nationality: 'South Korean', code: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { name: 'Italy', nationality: 'Italian', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Spain', nationality: 'Spanish', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', nationality: 'Dutch', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'Switzerland', nationality: 'Swiss', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Sweden', nationality: 'Swedish', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Norway', nationality: 'Norwegian', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Denmark', nationality: 'Danish', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Ireland', nationality: 'Irish', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'New Zealand', nationality: 'New Zealander', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Qatar', nationality: 'Qatari', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', nationality: 'Kuwaiti', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Oman', nationality: 'Omani', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Bahrain', nationality: 'Bahraini', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Turkey', nationality: 'Turkish', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Vietnam', nationality: 'Vietnamese', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Thailand', nationality: 'Thai', code: 'TH', dialCode: '+66', flag: '🇹🇭' }
];

export function findCountry(query: string): CountryInfo | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return COUNTRIES.find(c => 
    c.nationality.toLowerCase() === q || 
    c.name.toLowerCase() === q ||
    c.code.toLowerCase() === q
  );
}

export function getDialCodeForNationality(nationalityOrCountry: string): string {
  const matched = findCountry(nationalityOrCountry);
  return matched ? matched.dialCode : '+1';
}
