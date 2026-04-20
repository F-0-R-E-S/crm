// ISO-3166-1 alpha-2 + synonym map.
// Источник истины alpha-2: https://www.iso.org/iso-3166-country-codes.html
// Полная таблица синонимов — cron-обновляемый справочник (см. Operational Follow-ups).
const ALPHA2 = new Set([
  "AF","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ",
  "BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BA","BW","BV","BR","IO","BN","BG","BF","BI",
  "KH","CM","CA","CV","KY","CF","TD","CL","CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CY","CZ",
  "DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","ET","FK","FO","FJ","FI","FR","GF","PF","GA",
  "GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GN","GW","GY","HT","HN","HK","HU",
  "IS","IN","ID","IR","IQ","IE","IL","IT","JM","JP","JO","KZ","KE","KI","KP","KR","KW","KG","LA",
  "LV","LB","LS","LR","LY","LI","LT","LU","MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM",
  "NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK","MP","NO",
  "OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR","QA","RE","RO","RU","RW",
  "BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO","ZA","GS","ES","LK","SD","SR","SJ","SZ","SE","CH","SY",
  "TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV",
  "UG","UA","AE","GB","US","UM","UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE","ZM","ZW",
]);

const SYNONYMS: Record<string, string> = {
  UK: "GB",
  "U.K.": "GB",
  "U.K": "GB",
  GBR: "GB",
  ENG: "GB",
  USA: "US",
  "U.S.": "US",
  "U.S.A.": "US",
  RUS: "RU",
  UKR: "UA",
  DEU: "DE",
  GER: "DE",
  FRA: "FR",
  ITA: "IT",
  ESP: "ES",
  PRT: "PT",
  CAN: "CA",
  AUS: "AU",
  NZL: "NZ",
  CHN: "CN",
  JPN: "JP",
  KOR: "KR",
  IND: "IN",
  BRA: "BR",
  MEX: "MX",
  ARG: "AR",
  NLD: "NL",
  BEL: "BE",
  CHE: "CH",
  AUT: "AT",
  SWE: "SE",
  NOR: "NO",
  DNK: "DK",
  FIN: "FI",
  POL: "PL",
  CZE: "CZ",
  SVK: "SK",
  HUN: "HU",
  ROU: "RO",
  BGR: "BG",
  TUR: "TR",
  ISR: "IL",
  ARE: "AE",
  SAU: "SA",
  ZAF: "ZA",
};

export function normalizeGeo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper.length === 2 && ALPHA2.has(upper)) return upper;
  const stripped = upper.replace(/\./g, "");
  if (SYNONYMS[upper]) return SYNONYMS[upper];
  if (SYNONYMS[stripped]) return SYNONYMS[stripped];
  if (stripped.length === 2 && ALPHA2.has(stripped)) return stripped;
  return null;
}

export function isValidIso3166Alpha2(code: string): boolean {
  return ALPHA2.has(code.toUpperCase());
}
