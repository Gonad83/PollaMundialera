// Mapa FIFA TLA -> nombre en espanol (fuente unica para todo el frontend)
export const CODE_TO_ESP = {
  ARG: 'Argentina', BRA: 'Brasil', URU: 'Uruguay', COL: 'Colombia',
  ECU: 'Ecuador', PAR: 'Paraguay', CHI: 'Chile',
  FRA: 'Francia', ENG: 'Inglaterra', ESP: 'Espana', POR: 'Portugal',
  BEL: 'Belgica', GER: 'Alemania', NED: 'Paises Bajos', ITA: 'Italia',
  CRO: 'Croacia', SUI: 'Suiza', AUT: 'Austria', TUR: 'Turquia',
  SCO: 'Escocia', NOR: 'Noruega', SWE: 'Suecia', DEN: 'Dinamarca',
  SRB: 'Serbia', POL: 'Polonia', UKR: 'Ucrania',
  USA: 'USA', MEX: 'Mexico', CAN: 'Canada', CRC: 'Costa Rica',
  JAM: 'Jamaica', HON: 'Honduras', PAN: 'Panama',
  MAR: 'Marruecos', SEN: 'Senegal', EGY: 'Egipto', RSA: 'Sudafrica',
  CIV: 'Costa de Marfil', GHA: 'Ghana', ALG: 'Argelia', NGA: 'Nigeria',
  CMR: 'Camerun', BOL: 'Bolivia',
  JPN: 'Japon', KOR: 'Corea del Sur', KSA: 'Arabia Saudita', IRN: 'Iran',
  AUS: 'Australia', QAT: 'Catar', CHN: 'China', IRQ: 'Irak',
  NZL: 'Nueva Zelanda', UZB: 'Uzbekistan', BIH: 'Bosnia y Herz.', CZE: 'Rep. Checa',
  TUN: 'Tunez', JOR: 'Jordania', CPV: 'Cabo Verde', COD: 'RD Congo',
  HTI: 'Haiti', HAI: 'Haiti', CUW: 'Curazao', CUR: 'Curazao',
  SLV: 'El Salvador', TRI: 'Trinidad y Tobago', GRN: 'Granada',
}

const CODE_TO_FLAG_ISO = {
  ARG: 'ar', BRA: 'br', URU: 'uy', COL: 'co', ECU: 'ec', PAR: 'py', CHI: 'cl',
  FRA: 'fr', ENG: 'gb-eng', ESP: 'es', POR: 'pt', BEL: 'be', GER: 'de', NED: 'nl',
  ITA: 'it', CRO: 'hr', SUI: 'ch', AUT: 'at', TUR: 'tr', SCO: 'gb-sct', NOR: 'no',
  SWE: 'se', DEN: 'dk', SRB: 'rs', POL: 'pl', UKR: 'ua',
  USA: 'us', MEX: 'mx', CAN: 'ca', CRC: 'cr', JAM: 'jm', HON: 'hn', PAN: 'pa',
  MAR: 'ma', SEN: 'sn', EGY: 'eg', RSA: 'za', CIV: 'ci', GHA: 'gh', ALG: 'dz',
  NGA: 'ng', CMR: 'cm', BOL: 'bo',
  JPN: 'jp', KOR: 'kr', KSA: 'sa', IRN: 'ir', AUS: 'au', QAT: 'qa', CHN: 'cn',
  IRQ: 'iq', NZL: 'nz', UZB: 'uz', BIH: 'ba', CZE: 'cz', TUN: 'tn', JOR: 'jo',
  CPV: 'cv', COD: 'cd', HTI: 'ht', HAI: 'ht', CUW: 'cw', CUR: 'cw', SLV: 'sv',
  TRI: 'tt', GRN: 'gd',
}

// Traduce un objeto team {code, name} al nombre en espanol.
export const teamEsp = (team) =>
  CODE_TO_ESP[team?.code?.toUpperCase()] || team?.name || ''

export const teamFlagUrl = (team) => {
  const flag = team?.flagUrl
  if (flag && (flag.startsWith('http') || flag.startsWith('/'))) return flag

  const code = team?.code?.toUpperCase()
  const iso = CODE_TO_FLAG_ISO[code]
  return iso ? `https://flagcdn.com/w80/${iso}.png` : null
}
