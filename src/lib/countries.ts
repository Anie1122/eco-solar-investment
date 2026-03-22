// src/lib/countries.ts
export type CountryItem = {
  name: string;     // "Nigeria"
  code: string;     // "NG"
  dial: string;     // "+234"
  currency: string; // "NGN"
};

// Dial codes (E.164) by ISO-3166-1 alpha-2 (plus territories).
export const DIAL_BY_ISO: Record<string, string> = {
  AF: '+93', AX: '+358', AL: '+355', DZ: '+213', AS: '+1', AD: '+376', AO: '+244',
  AI: '+1', AQ: '+672', AG: '+1', AR: '+54', AM: '+374', AW: '+297', AU: '+61',
  AT: '+43', AZ: '+994',

  BS: '+1', BH: '+973', BD: '+880', BB: '+1', BY: '+375', BE: '+32', BZ: '+501',
  BJ: '+229', BM: '+1', BT: '+975', BO: '+591', BQ: '+599', BA: '+387', BW: '+267',
  BV: '+47', BR: '+55', IO: '+246', BN: '+673', BG: '+359', BF: '+226', BI: '+257',

  KH: '+855', CM: '+237', CA: '+1', CV: '+238', KY: '+1', CF: '+236', TD: '+235',
  CL: '+56', CN: '+86', CX: '+61', CC: '+61', CO: '+57', KM: '+269', CG: '+242',
  CD: '+243', CK: '+682', CR: '+506', CI: '+225', HR: '+385', CU: '+53', CW: '+599',
  CY: '+357', CZ: '+420',

  DK: '+45', DJ: '+253', DM: '+1', DO: '+1',

  EC: '+593', EG: '+20', SV: '+503', GQ: '+240', ER: '+291', EE: '+372', SZ: '+268', ET: '+251',

  FK: '+500', FO: '+298', FJ: '+679', FI: '+358', FR: '+33', GF: '+594', PF: '+689', TF: '+262',

  GA: '+241', GM: '+220', GE: '+995', DE: '+49', GH: '+233', GI: '+350', GR: '+30',
  GL: '+299', GD: '+1', GP: '+590', GU: '+1', GT: '+502', GG: '+44', GN: '+224',
  GW: '+245', GY: '+592',

  HT: '+509', HM: '+672', VA: '+39', HN: '+504', HK: '+852', HU: '+36',

  IS: '+354', IN: '+91', ID: '+62', IR: '+98', IQ: '+964', IE: '+353', IM: '+44', IL: '+972', IT: '+39',

  JM: '+1', JP: '+81', JE: '+44', JO: '+962',

  KZ: '+7', KE: '+254', KI: '+686', KP: '+850', KR: '+82', KW: '+965', KG: '+996',

  LA: '+856', LV: '+371', LB: '+961', LS: '+266', LR: '+231', LY: '+218', LI: '+423',
  LT: '+370', LU: '+352',

  MO: '+853', MG: '+261', MW: '+265', MY: '+60', MV: '+960', ML: '+223', MT: '+356',
  MH: '+692', MQ: '+596', MR: '+222', MU: '+230', YT: '+262', MX: '+52', FM: '+691',
  MD: '+373', MC: '+377', MN: '+976', ME: '+382', MS: '+1', MA: '+212', MZ: '+258', MM: '+95',

  NA: '+264', NR: '+674', NP: '+977', NL: '+31', NC: '+687', NZ: '+64', NI: '+505', NE: '+227',
  NG: '+234', NU: '+683', NF: '+672', MK: '+389', MP: '+1', NO: '+47',

  OM: '+968',

  PK: '+92', PW: '+680', PS: '+970', PA: '+507', PG: '+675', PY: '+595', PE: '+51',
  PH: '+63', PN: '+64', PL: '+48', PT: '+351', PR: '+1',

  QA: '+974',

  RE: '+262', RO: '+40', RU: '+7', RW: '+250',

  BL: '+590', SH: '+290', KN: '+1', LC: '+1', MF: '+590', PM: '+508', VC: '+1', WS: '+685',
  SM: '+378', ST: '+239', SA: '+966', SN: '+221', RS: '+381', SC: '+248', SL: '+232',
  SG: '+65', SX: '+1', SK: '+421', SI: '+386', SB: '+677', SO: '+252', ZA: '+27', GS: '+500',
  SS: '+211', ES: '+34', LK: '+94', SD: '+249', SR: '+597', SJ: '+47', SE: '+46', CH: '+41', SY: '+963',

  TW: '+886', TJ: '+992', TZ: '+255', TH: '+66', TL: '+670', TG: '+228', TK: '+690', TO: '+676',
  TT: '+1', TN: '+216', TR: '+90', TM: '+993', TC: '+1', TV: '+688',

  UG: '+256', UA: '+380', AE: '+971', GB: '+44', US: '+1', UM: '+1', UY: '+598', UZ: '+998',

  VU: '+678', VE: '+58', VN: '+84', VG: '+1', VI: '+1',

  WF: '+681', EH: '+212',

  YE: '+967',

  ZM: '+260', ZW: '+263',
};

// MUCH more complete currency mapping.
// If you notice any country still wrong later, tell me the country names and I’ll patch the map.
export const CURRENCY_BY_ISO: Record<string, string> = {
  // Africa
  DZ: 'DZD', AO: 'AOA', BJ: 'XOF', BW: 'BWP', BF: 'XOF', BI: 'BIF', CM: 'XAF', CV: 'CVE',
  CF: 'XAF', TD: 'XAF', KM: 'KMF', CG: 'XAF', CD: 'CDF', CI: 'XOF', DJ: 'DJF', EG: 'EGP',
  GQ: 'XAF', ER: 'ERN', SZ: 'SZL', ET: 'ETB', GA: 'XAF', GM: 'GMD', GH: 'GHS', GN: 'GNF',
  GW: 'XOF', KE: 'KES', LS: 'LSL', LR: 'LRD', LY: 'LYD', MG: 'MGA', MW: 'MWK', ML: 'XOF',
  MR: 'MRU', MU: 'MUR', MA: 'MAD', MZ: 'MZN', NA: 'NAD', NE: 'XOF', NG: 'NGN', RW: 'RWF',
  ST: 'STN', SN: 'XOF', SC: 'SCR', SL: 'SLE', SO: 'SOS', ZA: 'ZAR', SS: 'SSP', SD: 'SDG',
  TZ: 'TZS', TG: 'XOF', TN: 'TND', UG: 'UGX', ZM: 'ZMW', ZW: 'ZWL', EH: 'MAD',

  // Europe
  AL: 'ALL', AD: 'EUR', AT: 'EUR', BE: 'EUR', BA: 'BAM', BG: 'BGN', BY: 'BYN', CH: 'CHF',
  CY: 'EUR', CZ: 'CZK', DE: 'EUR', DK: 'DKK', EE: 'EUR', ES: 'EUR', FI: 'EUR', FR: 'EUR',
  GB: 'GBP', GG: 'GBP', GI: 'GIP', GR: 'EUR', HR: 'EUR', HU: 'HUF', IE: 'EUR', IM: 'GBP',
  IS: 'ISK', IT: 'EUR', JE: 'GBP', LI: 'CHF', LT: 'EUR', LU: 'EUR', LV: 'EUR', MC: 'EUR',
  MD: 'MDL', ME: 'EUR', MK: 'MKD', MT: 'EUR', NL: 'EUR', NO: 'NOK', PL: 'PLN', PT: 'EUR',
  RO: 'RON', RS: 'RSD', RU: 'RUB', SE: 'SEK', SI: 'EUR', SK: 'EUR', SM: 'EUR', UA: 'UAH',
  VA: 'EUR', SJ: 'NOK', AX: 'EUR', FO: 'DKK',

  // Middle East
  AE: 'AED', BH: 'BHD', IL: 'ILS', IQ: 'IQD', IR: 'IRR', JO: 'JOD', KW: 'KWD', LB: 'LBP',
  OM: 'OMR', PS: 'ILS', QA: 'QAR', SA: 'SAR', SY: 'SYP', TR: 'TRY', YE: 'YER',

  // Asia
  AF: 'AFN', AM: 'AMD', AZ: 'AZN', BD: 'BDT', BN: 'BND', BT: 'BTN', CN: 'CNY', GE: 'GEL',
  HK: 'HKD', ID: 'IDR', IN: 'INR', JP: 'JPY', KG: 'KGS', KH: 'KHR', KP: 'KPW', KR: 'KRW',
  KZ: 'KZT', LA: 'LAK', LK: 'LKR', MM: 'MMK', MN: 'MNT', MO: 'MOP', MY: 'MYR', NP: 'NPR',
  PH: 'PHP', PK: 'PKR', SG: 'SGD', TH: 'THB', TJ: 'TJS', TL: 'USD', TM: 'TMT', TW: 'TWD',
  UZ: 'UZS', VN: 'VND',

  // Oceania
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD', FM: 'USD', KI: 'AUD', MH: 'USD', NR: 'AUD', PG: 'PGK',
  PW: 'USD', SB: 'SBD', TO: 'TOP', TV: 'AUD', VU: 'VUV', WS: 'WST',
  NC: 'XPF', PF: 'XPF', WF: 'XPF', CK: 'NZD', NU: 'NZD', TK: 'NZD',
  CX: 'AUD', CC: 'AUD', NF: 'AUD', PN: 'NZD', GU: 'USD', AS: 'USD', MP: 'USD',

  // Americas & Caribbean
  AG: 'XCD', AI: 'XCD', AR: 'ARS', AW: 'AWG', BB: 'BBD', BM: 'BMD', BO: 'BOB', BR: 'BRL',
  BS: 'BSD', BZ: 'BZD', CA: 'CAD', CL: 'CLP', CO: 'COP', CR: 'CRC', CU: 'CUP', CW: 'ANG',
  DM: 'XCD', DO: 'DOP', EC: 'USD', GD: 'XCD', GF: 'EUR', GL: 'DKK', GP: 'EUR', GT: 'GTQ',
  GY: 'GYD', HN: 'HNL', HT: 'HTG', JM: 'JMD', KN: 'XCD', KY: 'KYD', LC: 'XCD', MQ: 'EUR',
  MS: 'XCD', MX: 'MXN', NI: 'NIO', PA: 'PAB', PE: 'PEN', PR: 'USD', PY: 'PYG', RE: 'EUR',
  SR: 'SRD', TT: 'TTD', US: 'USD', UY: 'UYU', VC: 'XCD', VE: 'VES', VG: 'USD', VI: 'USD',
  BL: 'EUR', MF: 'EUR', PM: 'EUR', SH: 'SHP', FK: 'FKP', GS: 'FKP',
  BQ: 'USD', SX: 'ANG', UM: 'USD',
};

export function getCurrencyForCountry(code: string) {
  const c = CURRENCY_BY_ISO[code];
  return c ?? 'USD';
}

export function getDialForCountry(code: string) {
  return DIAL_BY_ISO[code] ?? '+';
}

// Builds alphabetical list with dedupe.
// NOTE: uses Intl.DisplayNames, so it stays lightweight (no npm packages).
export function buildCountriesAtoZ(locale: string = 'en'): CountryItem[] {
  const regionNames =
    typeof Intl !== 'undefined' && (Intl as any).DisplayNames
      ? new (Intl as any).DisplayNames([locale], { type: 'region' })
      : null;

  const ISO_CODES = Object.keys(DIAL_BY_ISO);

  const list: CountryItem[] = [];
  for (const code of ISO_CODES) {
    const name = regionNames ? regionNames.of(code) : code;
    if (!name || name === code) continue;

    list.push({
      name,
      code,
      dial: getDialForCountry(code),
      currency: getCurrencyForCountry(code),
    });
  }

  // Deduplicate by name + currency + dial (prevents “United Kingdom” duplicates, etc.)
  const seen = new Set<string>();
  const deduped: CountryItem[] = [];
  for (const item of list) {
    const k = `${item.name}|${item.currency}|${item.dial}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(item);
  }

  deduped.sort((a, b) => a.name.localeCompare(b.name));
  return deduped;
  }
