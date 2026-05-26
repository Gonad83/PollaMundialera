// Mapa FIFA TLA → nombre en español (fuente única para todo el frontend)
export const CODE_TO_ESP = {
  ARG:'Argentina',       BRA:'Brasil',          URU:'Uruguay',         COL:'Colombia',
  ECU:'Ecuador',         PAR:'Paraguay',         CHI:'Chile',
  FRA:'Francia',         ENG:'Inglaterra',       ESP:'España',          POR:'Portugal',
  BEL:'Bélgica',         GER:'Alemania',         NED:'Países Bajos',    ITA:'Italia',
  CRO:'Croacia',         SUI:'Suiza',            AUT:'Austria',         TUR:'Turquía',
  SCO:'Escocia',         NOR:'Noruega',          SWE:'Suecia',          DEN:'Dinamarca',
  SRB:'Serbia',          POL:'Polonia',          UKR:'Ucrania',
  USA:'USA',             MEX:'México',           CAN:'Canadá',          CRC:'Costa Rica',
  JAM:'Jamaica',         HON:'Honduras',         PAN:'Panamá',
  MAR:'Marruecos',       SEN:'Senegal',          EGY:'Egipto',          RSA:'Sudáfrica',
  CIV:'Costa de Marfil', GHA:'Ghana',            ALG:'Argelia',         NGA:'Nigeria',
  CMR:'Camerún',
  JPN:'Japón',           KOR:'Corea del Sur',    KSA:'Arabia Saudita',  IRN:'Irán',
  AUS:'Australia',       QAT:'Catar',            CHN:'China',           IRQ:'Irak',
  NZL:'Nueva Zelanda',   UZB:'Uzbekistán',       BIH:'Bosnia y Herz.',  CZE:'Rep. Checa',
  TUN:'Túnez',           JOR:'Jordania',         CPV:'Cabo Verde',      COD:'RD Congo',
  HTI:'Haití',           HAI:'Haití',            CUW:'Curazao',         CUR:'Curazao',
  SLV:'El Salvador',     TRI:'Trinidad y Tobago',GRN:'Granada',
}

// Traduce un objeto team {code, name} al nombre en español
export const teamEsp = (team) =>
  CODE_TO_ESP[team?.code?.toUpperCase()] || team?.name || ''
