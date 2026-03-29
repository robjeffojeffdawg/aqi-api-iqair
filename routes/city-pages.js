const express = require('express');
const router = express.Router();
const iqairService = require('../services/iqairService');

// =============================================================
// CITY LOOKUP TABLE
// Maps city slugs to { country, state, displayName, lat, lon }
// Add more cities here as needed
// =============================================================
const CITY_LOOKUP = {
  // ══════════════════════════════════════════════════════════
  // THAILAND — all 77 provinces
  // Each province has two entries:
  //   1. The province/city name slug  e.g. 'chiang-mai'
  //   2. The Mueang (capital) district slug  e.g. 'mueang-chiang-mai'
  // Both point to the same coordinates so either URL works.
  // ══════════════════════════════════════════════════════════

  // ── BANGKOK (special administrative area) ─────────────────
  'bangkok':                    { country: 'Thailand', state: 'Bangkok',                  displayName: 'Bangkok',                   lat: 13.7563, lon: 100.5018 },

  // ── NORTH ─────────────────────────────────────────────────
  'chiang-mai':                 { country: 'Thailand', state: 'Chiang Mai',               displayName: 'Chiang Mai',                lat: 18.7883, lon: 98.9853  },
  'mueang-chiang-mai':          { country: 'Thailand', state: 'Chiang Mai',               displayName: 'Mueang Chiang Mai',         lat: 18.7883, lon: 98.9853  },
  'chiang-rai':                 { country: 'Thailand', state: 'Chiang Rai',               displayName: 'Chiang Rai',                lat: 19.9105, lon: 99.8406  },
  'mueang-chiang-rai':          { country: 'Thailand', state: 'Chiang Rai',               displayName: 'Mueang Chiang Rai',         lat: 19.9105, lon: 99.8406  },
  'lampang':                    { country: 'Thailand', state: 'Lampang',                  displayName: 'Lampang',                   lat: 18.2888, lon: 99.4878  },
  'mueang-lampang':             { country: 'Thailand', state: 'Lampang',                  displayName: 'Mueang Lampang',            lat: 18.2888, lon: 99.4878  },
  'lamphun':                    { country: 'Thailand', state: 'Lamphun',                  displayName: 'Lamphun',                   lat: 18.5744, lon: 99.0087  },
  'mueang-lamphun':             { country: 'Thailand', state: 'Lamphun',                  displayName: 'Mueang Lamphun',            lat: 18.5744, lon: 99.0087  },
  // Mae Hong Son capital — IQAir knows this area as 'Pang Mu' or 'Mae Hi'
  // both are sub-districts of Mueang Mae Hong Son district
  'mae-hong-son':               { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Mae Hong Son',              lat: 19.3020, lon: 97.9654  },
  'mueang-mae-hong-son':        { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Mueang Mae Hong Son',       lat: 19.3020, lon: 97.9654  },
  'nan':                        { country: 'Thailand', state: 'Nan',                      displayName: 'Nan',                       lat: 18.7756, lon: 100.7730 },
  'mueang-nan':                 { country: 'Thailand', state: 'Nan',                      displayName: 'Mueang Nan',                lat: 18.7756, lon: 100.7730 },
  'phrae':                      { country: 'Thailand', state: 'Phrae',                    displayName: 'Phrae',                     lat: 18.1445, lon: 100.1400 },
  'mueang-phrae':               { country: 'Thailand', state: 'Phrae',                    displayName: 'Mueang Phrae',              lat: 18.1445, lon: 100.1400 },
  'phayao':                     { country: 'Thailand', state: 'Phayao',                   displayName: 'Phayao',                    lat: 19.2105, lon: 99.8865  },
  'mueang-phayao':              { country: 'Thailand', state: 'Phayao',                   displayName: 'Mueang Phayao',             lat: 19.2105, lon: 99.8865  },
  'uttaradit':                  { country: 'Thailand', state: 'Uttaradit',                displayName: 'Uttaradit',                 lat: 17.6200, lon: 100.0990 },
  'mueang-uttaradit':           { country: 'Thailand', state: 'Uttaradit',                displayName: 'Mueang Uttaradit',          lat: 17.6200, lon: 100.0990 },

  // ── MAE HONG SON — all 7 districts + IQAir sub-district aliases ──
  // IQAir doesn't recognise "Mae Hong Son" city by that name.
  // Their 4 known cities are sub-district (tambon) level names:
  //   Mae Hi, Pang Mu, Wiang Nuea, Pai
  // We add these as direct IQAir-queryable entries AND keep the
  // coordinate-fallback entries for districts with no IQAir coverage.

  // IQAir-recognised sub-districts (will actually return live data)
  'mae-hi':                     { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Mae Hi',                    lat: 19.2716, lon: 97.9378  },
  'pang-mu':                    { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Pang Mu',                   lat: 19.3090, lon: 97.9680  },
  'wiang-nuea':                 { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Wiang Nuea',                lat: 19.3800, lon: 98.4700  },

  // District entries — use coordinate fallback since IQAir
  // doesn't have them by district name
  'pai':                        { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Pai',                       lat: 19.3583, lon: 98.4417  },
  'pang-mapha':                 { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Pang Mapha',                lat: 19.5316, lon: 98.1833  },
  'soppong':                    { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Soppong',                   lat: 19.5200, lon: 98.2900  },
  'khun-yuam':                  { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Khun Yuam',                 lat: 18.8284, lon: 97.9347  },
  'mae-la-noi':                 { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Mae La Noi',                lat: 18.3667, lon: 97.9667  },
  'mae-sariang':                { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Mae Sariang',               lat: 18.1669, lon: 97.9380  },
  'sop-moei':                   { country: 'Thailand', state: 'Mae Hong Son',             displayName: 'Sop Moei',                  lat: 17.9167, lon: 97.9833  },

  // ── NORTHEAST (ISAN) ──────────────────────────────────────
  'khon-kaen':                  { country: 'Thailand', state: 'Khon Kaen',                displayName: 'Khon Kaen',                 lat: 16.4419, lon: 102.8360 },
  'mueang-khon-kaen':           { country: 'Thailand', state: 'Khon Kaen',                displayName: 'Mueang Khon Kaen',          lat: 16.4419, lon: 102.8360 },
  'udon-thani':                 { country: 'Thailand', state: 'Udon Thani',               displayName: 'Udon Thani',                lat: 17.4138, lon: 102.7872 },
  'mueang-udon-thani':          { country: 'Thailand', state: 'Udon Thani',               displayName: 'Mueang Udon Thani',         lat: 17.4138, lon: 102.7872 },
  'nakhon-ratchasima':          { country: 'Thailand', state: 'Nakhon Ratchasima',        displayName: 'Nakhon Ratchasima',         lat: 14.9799, lon: 102.0978 },
  'mueang-nakhon-ratchasima':   { country: 'Thailand', state: 'Nakhon Ratchasima',        displayName: 'Mueang Nakhon Ratchasima',  lat: 14.9799, lon: 102.0978 },
  'ubon-ratchathani':           { country: 'Thailand', state: 'Ubon Ratchathani',         displayName: 'Ubon Ratchathani',          lat: 15.2448, lon: 104.8472 },
  'mueang-ubon-ratchathani':    { country: 'Thailand', state: 'Ubon Ratchathani',         displayName: 'Mueang Ubon Ratchathani',   lat: 15.2448, lon: 104.8472 },
  'roi-et':                     { country: 'Thailand', state: 'Roi Et',                   displayName: 'Roi Et',                    lat: 16.0538, lon: 103.6520 },
  'mueang-roi-et':              { country: 'Thailand', state: 'Roi Et',                   displayName: 'Mueang Roi Et',             lat: 16.0538, lon: 103.6520 },
  'sakon-nakhon':               { country: 'Thailand', state: 'Sakon Nakhon',             displayName: 'Sakon Nakhon',              lat: 17.1553, lon: 104.1348 },
  'mueang-sakon-nakhon':        { country: 'Thailand', state: 'Sakon Nakhon',             displayName: 'Mueang Sakon Nakhon',       lat: 17.1553, lon: 104.1348 },
  'nakhon-phanom':              { country: 'Thailand', state: 'Nakhon Phanom',            displayName: 'Nakhon Phanom',             lat: 17.3920, lon: 104.7730 },
  'mueang-nakhon-phanom':       { country: 'Thailand', state: 'Nakhon Phanom',            displayName: 'Mueang Nakhon Phanom',      lat: 17.3920, lon: 104.7730 },
  'nong-khai':                  { country: 'Thailand', state: 'Nong Khai',                displayName: 'Nong Khai',                 lat: 17.8782, lon: 102.7412 },
  'mueang-nong-khai':           { country: 'Thailand', state: 'Nong Khai',                displayName: 'Mueang Nong Khai',          lat: 17.8782, lon: 102.7412 },
  'loei':                       { country: 'Thailand', state: 'Loei',                     displayName: 'Loei',                      lat: 17.4860, lon: 101.7223 },
  'mueang-loei':                { country: 'Thailand', state: 'Loei',                     displayName: 'Mueang Loei',               lat: 17.4860, lon: 101.7223 },
  'chaiyaphum':                 { country: 'Thailand', state: 'Chaiyaphum',               displayName: 'Chaiyaphum',                lat: 15.8068, lon: 102.0315 },
  'mueang-chaiyaphum':          { country: 'Thailand', state: 'Chaiyaphum',               displayName: 'Mueang Chaiyaphum',         lat: 15.8068, lon: 102.0315 },
  'maha-sarakham':              { country: 'Thailand', state: 'Maha Sarakham',            displayName: 'Maha Sarakham',             lat: 16.1845, lon: 103.3001 },
  'mueang-maha-sarakham':       { country: 'Thailand', state: 'Maha Sarakham',            displayName: 'Mueang Maha Sarakham',      lat: 16.1845, lon: 103.3001 },
  'kalasin':                    { country: 'Thailand', state: 'Kalasin',                  displayName: 'Kalasin',                   lat: 16.4322, lon: 103.5059 },
  'mueang-kalasin':             { country: 'Thailand', state: 'Kalasin',                  displayName: 'Mueang Kalasin',            lat: 16.4322, lon: 103.5059 },
  'mukdahan':                   { country: 'Thailand', state: 'Mukdahan',                 displayName: 'Mukdahan',                  lat: 16.5436, lon: 104.7237 },
  'mueang-mukdahan':            { country: 'Thailand', state: 'Mukdahan',                 displayName: 'Mueang Mukdahan',           lat: 16.5436, lon: 104.7237 },
  'yasothon':                   { country: 'Thailand', state: 'Yasothon',                 displayName: 'Yasothon',                  lat: 15.7924, lon: 104.1449 },
  'mueang-yasothon':            { country: 'Thailand', state: 'Yasothon',                 displayName: 'Mueang Yasothon',           lat: 15.7924, lon: 104.1449 },
  'amnat-charoen':              { country: 'Thailand', state: 'Amnat Charoen',            displayName: 'Amnat Charoen',             lat: 15.8656, lon: 104.6257 },
  'mueang-amnat-charoen':       { country: 'Thailand', state: 'Amnat Charoen',            displayName: 'Mueang Amnat Charoen',      lat: 15.8656, lon: 104.6257 },
  'bueng-kan':                  { country: 'Thailand', state: 'Bueng Kan',                displayName: 'Bueng Kan',                 lat: 18.3609, lon: 103.6518 },
  'mueang-bueng-kan':           { country: 'Thailand', state: 'Bueng Kan',                displayName: 'Mueang Bueng Kan',          lat: 18.3609, lon: 103.6518 },
  'nong-bua-lamphu':            { country: 'Thailand', state: 'Nongbua Lamphu',           displayName: 'Nong Bua Lamphu',           lat: 17.2041, lon: 102.4410 },
  'mueang-nong-bua-lamphu':     { country: 'Thailand', state: 'Nongbua Lamphu',           displayName: 'Mueang Nong Bua Lamphu',    lat: 17.2041, lon: 102.4410 },
  'buriram':                    { country: 'Thailand', state: 'Buriram',                  displayName: 'Buriram',                   lat: 14.9932, lon: 103.1029 },
  'mueang-buriram':             { country: 'Thailand', state: 'Buriram',                  displayName: 'Mueang Buriram',            lat: 14.9932, lon: 103.1029 },
  'surin':                      { country: 'Thailand', state: 'Surin',                    displayName: 'Surin',                     lat: 14.8826, lon: 103.4937 },
  'mueang-surin':               { country: 'Thailand', state: 'Surin',                    displayName: 'Mueang Surin',              lat: 14.8826, lon: 103.4937 },
  'sisaket':                    { country: 'Thailand', state: 'Sisaket',                  displayName: 'Sisaket',                   lat: 15.1186, lon: 104.3220 },
  'mueang-sisaket':             { country: 'Thailand', state: 'Sisaket',                  displayName: 'Mueang Sisaket',            lat: 15.1186, lon: 104.3220 },

  // ── CENTRAL ───────────────────────────────────────────────
  'nakhon-sawan':               { country: 'Thailand', state: 'Nakhon Sawan',             displayName: 'Nakhon Sawan',              lat: 15.6987, lon: 100.1199 },
  'mueang-nakhon-sawan':        { country: 'Thailand', state: 'Nakhon Sawan',             displayName: 'Mueang Nakhon Sawan',       lat: 15.6987, lon: 100.1199 },
  'nakhon-pathom':              { country: 'Thailand', state: 'Nakhon Pathom',            displayName: 'Nakhon Pathom',             lat: 13.8199, lon: 100.0440 },
  'mueang-nakhon-pathom':       { country: 'Thailand', state: 'Nakhon Pathom',            displayName: 'Mueang Nakhon Pathom',      lat: 13.8199, lon: 100.0440 },
  'ayutthaya':                  { country: 'Thailand', state: 'Phra Nakhon Si Ayutthaya', displayName: 'Ayutthaya',                 lat: 14.3532, lon: 100.5677 },
  'phra-nakhon-si-ayutthaya':   { country: 'Thailand', state: 'Phra Nakhon Si Ayutthaya', displayName: 'Phra Nakhon Si Ayutthaya', lat: 14.3532, lon: 100.5677 },
  'nonthaburi':                 { country: 'Thailand', state: 'Nonthaburi',               displayName: 'Nonthaburi',                lat: 13.8591, lon: 100.5209 },
  'mueang-nonthaburi':          { country: 'Thailand', state: 'Nonthaburi',               displayName: 'Mueang Nonthaburi',         lat: 13.8591, lon: 100.5209 },
  'samut-prakan':               { country: 'Thailand', state: 'Samut Prakan',             displayName: 'Samut Prakan',              lat: 13.5990, lon: 100.5998 },
  'mueang-samut-prakan':        { country: 'Thailand', state: 'Samut Prakan',             displayName: 'Mueang Samut Prakan',       lat: 13.5990, lon: 100.5998 },
  'samut-sakhon':               { country: 'Thailand', state: 'Samut Sakhon',             displayName: 'Samut Sakhon',              lat: 13.5475, lon: 100.2739 },
  'mueang-samut-sakhon':        { country: 'Thailand', state: 'Samut Sakhon',             displayName: 'Mueang Samut Sakhon',       lat: 13.5475, lon: 100.2739 },
  'samut-songkhram':            { country: 'Thailand', state: 'Samut Songkhram',          displayName: 'Samut Songkhram',           lat: 13.4090, lon: 100.0020 },
  'mueang-samut-songkhram':     { country: 'Thailand', state: 'Samut Songkhram',          displayName: 'Mueang Samut Songkhram',    lat: 13.4090, lon: 100.0020 },
  'kanchanaburi':               { country: 'Thailand', state: 'Kanchanaburi',             displayName: 'Kanchanaburi',              lat: 14.0227, lon: 99.5328  },
  'mueang-kanchanaburi':        { country: 'Thailand', state: 'Kanchanaburi',             displayName: 'Mueang Kanchanaburi',       lat: 14.0227, lon: 99.5328  },
  'ratchaburi':                 { country: 'Thailand', state: 'Ratchaburi',               displayName: 'Ratchaburi',                lat: 13.5360, lon: 99.8172  },
  'mueang-ratchaburi':          { country: 'Thailand', state: 'Ratchaburi',               displayName: 'Mueang Ratchaburi',         lat: 13.5360, lon: 99.8172  },
  'phetchaburi':                { country: 'Thailand', state: 'Phetchaburi',              displayName: 'Phetchaburi',               lat: 13.1119, lon: 99.9390  },
  'mueang-phetchaburi':         { country: 'Thailand', state: 'Phetchaburi',              displayName: 'Mueang Phetchaburi',        lat: 13.1119, lon: 99.9390  },
  'prachuap-khiri-khan':        { country: 'Thailand', state: 'Prachuap Khiri Khan',      displayName: 'Prachuap Khiri Khan',       lat: 11.8126, lon: 99.7957  },
  'mueang-prachuap-khiri-khan': { country: 'Thailand', state: 'Prachuap Khiri Khan',      displayName: 'Mueang Prachuap Khiri Khan',lat: 11.8126, lon: 99.7957  },
  'hua-hin':                    { country: 'Thailand', state: 'Prachuap Khiri Khan',      displayName: 'Hua Hin',                   lat: 12.5665, lon: 99.9580  },
  'lopburi':                    { country: 'Thailand', state: 'Lopburi',                  displayName: 'Lopburi',                   lat: 14.7995, lon: 100.6534 },
  'mueang-lopburi':             { country: 'Thailand', state: 'Lopburi',                  displayName: 'Mueang Lopburi',            lat: 14.7995, lon: 100.6534 },
  'saraburi':                   { country: 'Thailand', state: 'Saraburi',                 displayName: 'Saraburi',                  lat: 14.5289, lon: 100.9106 },
  'mueang-saraburi':            { country: 'Thailand', state: 'Saraburi',                 displayName: 'Mueang Saraburi',           lat: 14.5289, lon: 100.9106 },
  'ang-thong':                  { country: 'Thailand', state: 'Ang Thong',                displayName: 'Ang Thong',                 lat: 14.5896, lon: 100.4551 },
  'mueang-ang-thong':           { country: 'Thailand', state: 'Ang Thong',                displayName: 'Mueang Ang Thong',          lat: 14.5896, lon: 100.4551 },
  'sing-buri':                  { country: 'Thailand', state: 'Sing Buri',                displayName: 'Sing Buri',                 lat: 14.8904, lon: 100.3966 },
  'mueang-sing-buri':           { country: 'Thailand', state: 'Sing Buri',                displayName: 'Mueang Sing Buri',          lat: 14.8904, lon: 100.3966 },
  'chai-nat':                   { country: 'Thailand', state: 'Chai Nat',                 displayName: 'Chai Nat',                  lat: 15.1853, lon: 100.1250 },
  'mueang-chai-nat':            { country: 'Thailand', state: 'Chai Nat',                 displayName: 'Mueang Chai Nat',           lat: 15.1853, lon: 100.1250 },
  'nakhon-nayok':               { country: 'Thailand', state: 'Nakhon Nayok',             displayName: 'Nakhon Nayok',              lat: 14.2057, lon: 101.2132 },
  'mueang-nakhon-nayok':        { country: 'Thailand', state: 'Nakhon Nayok',             displayName: 'Mueang Nakhon Nayok',       lat: 14.2057, lon: 101.2132 },
  'pathum-thani':               { country: 'Thailand', state: 'Pathum Thani',             displayName: 'Pathum Thani',              lat: 14.0208, lon: 100.5250 },
  'mueang-pathum-thani':        { country: 'Thailand', state: 'Pathum Thani',             displayName: 'Mueang Pathum Thani',       lat: 14.0208, lon: 100.5250 },
  'suphan-buri':                { country: 'Thailand', state: 'Suphan Buri',              displayName: 'Suphan Buri',               lat: 14.4744, lon: 100.1177 },
  'mueang-suphan-buri':         { country: 'Thailand', state: 'Suphan Buri',              displayName: 'Mueang Suphan Buri',        lat: 14.4744, lon: 100.1177 },
  'kamphaeng-phet':             { country: 'Thailand', state: 'Kamphaeng Phet',           displayName: 'Kamphaeng Phet',            lat: 16.4827, lon: 99.5226  },
  'mueang-kamphaeng-phet':      { country: 'Thailand', state: 'Kamphaeng Phet',           displayName: 'Mueang Kamphaeng Phet',     lat: 16.4827, lon: 99.5226  },
  'nakhon-sawan':               { country: 'Thailand', state: 'Nakhon Sawan',             displayName: 'Nakhon Sawan',              lat: 15.6987, lon: 100.1199 },
  'phichit':                    { country: 'Thailand', state: 'Phichit',                  displayName: 'Phichit',                   lat: 16.4432, lon: 100.3487 },
  'mueang-phichit':             { country: 'Thailand', state: 'Phichit',                  displayName: 'Mueang Phichit',            lat: 16.4432, lon: 100.3487 },
  'phitsanulok':                { country: 'Thailand', state: 'Phitsanulok',              displayName: 'Phitsanulok',               lat: 16.8211, lon: 100.2659 },
  'mueang-phitsanulok':         { country: 'Thailand', state: 'Phitsanulok',              displayName: 'Mueang Phitsanulok',        lat: 16.8211, lon: 100.2659 },
  'phetchabun':                 { country: 'Thailand', state: 'Phetchabun',               displayName: 'Phetchabun',                lat: 16.4189, lon: 101.1591 },
  'mueang-phetchabun':          { country: 'Thailand', state: 'Phetchabun',               displayName: 'Mueang Phetchabun',         lat: 16.4189, lon: 101.1591 },
  'sukhothai':                  { country: 'Thailand', state: 'Sukhothai',                displayName: 'Sukhothai',                 lat: 17.0069, lon: 99.8230  },
  'mueang-sukhothai':           { country: 'Thailand', state: 'Sukhothai',                displayName: 'Mueang Sukhothai',          lat: 17.0069, lon: 99.8230  },
  'tak':                        { country: 'Thailand', state: 'Tak',                      displayName: 'Tak',                       lat: 16.8800, lon: 99.1253  },
  'mueang-tak':                 { country: 'Thailand', state: 'Tak',                      displayName: 'Mueang Tak',                lat: 16.8800, lon: 99.1253  },

  // ── EAST ──────────────────────────────────────────────────
  'chonburi':                   { country: 'Thailand', state: 'Chonburi',                 displayName: 'Chonburi',                  lat: 13.3611, lon: 100.9847 },
  'mueang-chonburi':            { country: 'Thailand', state: 'Chonburi',                 displayName: 'Mueang Chonburi',           lat: 13.3611, lon: 100.9847 },
  'pattaya':                    { country: 'Thailand', state: 'Chonburi',                 displayName: 'Pattaya',                   lat: 12.9236, lon: 100.8825 },
  'rayong':                     { country: 'Thailand', state: 'Rayong',                   displayName: 'Rayong',                    lat: 12.6814, lon: 101.2816 },
  'mueang-rayong':              { country: 'Thailand', state: 'Rayong',                   displayName: 'Mueang Rayong',             lat: 12.6814, lon: 101.2816 },
  'chanthaburi':                { country: 'Thailand', state: 'Chanthaburi',              displayName: 'Chanthaburi',               lat: 12.6113, lon: 102.1039 },
  'mueang-chanthaburi':         { country: 'Thailand', state: 'Chanthaburi',              displayName: 'Mueang Chanthaburi',        lat: 12.6113, lon: 102.1039 },
  'trat':                       { country: 'Thailand', state: 'Trat',                     displayName: 'Trat',                      lat: 12.2427, lon: 102.5175 },
  'mueang-trat':                { country: 'Thailand', state: 'Trat',                     displayName: 'Mueang Trat',               lat: 12.2427, lon: 102.5175 },
  'chachoengsao':               { country: 'Thailand', state: 'Chachoengsao',             displayName: 'Chachoengsao',              lat: 13.6903, lon: 101.0779 },
  'mueang-chachoengsao':        { country: 'Thailand', state: 'Chachoengsao',             displayName: 'Mueang Chachoengsao',       lat: 13.6903, lon: 101.0779 },
  'prachin-buri':               { country: 'Thailand', state: 'Prachin Buri',             displayName: 'Prachin Buri',              lat: 14.0509, lon: 101.3659 },
  'mueang-prachin-buri':        { country: 'Thailand', state: 'Prachin Buri',             displayName: 'Mueang Prachin Buri',       lat: 14.0509, lon: 101.3659 },
  'sa-kaeo':                    { country: 'Thailand', state: 'Sa Kaeo',                  displayName: 'Sa Kaeo',                   lat: 13.8240, lon: 102.0645 },
  'mueang-sa-kaeo':             { country: 'Thailand', state: 'Sa Kaeo',                  displayName: 'Mueang Sa Kaeo',            lat: 13.8240, lon: 102.0645 },

  // ── SOUTH ─────────────────────────────────────────────────
  'phuket':                     { country: 'Thailand', state: 'Phuket',                   displayName: 'Phuket',                    lat: 7.8804,  lon: 98.3923  },
  'mueang-phuket':              { country: 'Thailand', state: 'Phuket',                   displayName: 'Mueang Phuket',             lat: 7.8804,  lon: 98.3923  },
  'krabi':                      { country: 'Thailand', state: 'Krabi',                    displayName: 'Krabi',                     lat: 8.0863,  lon: 98.9063  },
  'mueang-krabi':               { country: 'Thailand', state: 'Krabi',                    displayName: 'Mueang Krabi',              lat: 8.0863,  lon: 98.9063  },
  'trang':                      { country: 'Thailand', state: 'Trang',                    displayName: 'Trang',                     lat: 7.5563,  lon: 99.6111  },
  'mueang-trang':               { country: 'Thailand', state: 'Trang',                    displayName: 'Mueang Trang',              lat: 7.5563,  lon: 99.6111  },
  'surat-thani':                { country: 'Thailand', state: 'Surat Thani',              displayName: 'Surat Thani',               lat: 9.1341,  lon: 99.3308  },
  'mueang-surat-thani':         { country: 'Thailand', state: 'Surat Thani',              displayName: 'Mueang Surat Thani',        lat: 9.1341,  lon: 99.3308  },
  'koh-samui':                  { country: 'Thailand', state: 'Surat Thani',              displayName: 'Koh Samui',                 lat: 9.5120,  lon: 100.0136 },
  'nakhon-si-thammarat':        { country: 'Thailand', state: 'Nakhon Si Thammarat',      displayName: 'Nakhon Si Thammarat',       lat: 8.4322,  lon: 99.9631  },
  'mueang-nakhon-si-thammarat': { country: 'Thailand', state: 'Nakhon Si Thammarat',      displayName: 'Mueang Nakhon Si Thammarat',lat: 8.4322,  lon: 99.9631  },
  'phatthalung':                { country: 'Thailand', state: 'Phatthalung',              displayName: 'Phatthalung',               lat: 7.6166,  lon: 100.0742 },
  'mueang-phatthalung':         { country: 'Thailand', state: 'Phatthalung',              displayName: 'Mueang Phatthalung',        lat: 7.6166,  lon: 100.0742 },
  'songkhla':                   { country: 'Thailand', state: 'Songkhla',                 displayName: 'Songkhla',                  lat: 7.1996,  lon: 100.5956 },
  'mueang-songkhla':            { country: 'Thailand', state: 'Songkhla',                 displayName: 'Mueang Songkhla',           lat: 7.1996,  lon: 100.5956 },
  'hat-yai':                    { country: 'Thailand', state: 'Songkhla',                 displayName: 'Hat Yai',                   lat: 7.0086,  lon: 100.4747 },
  'satun':                      { country: 'Thailand', state: 'Satun',                    displayName: 'Satun',                     lat: 6.6238,  lon: 100.0673 },
  'mueang-satun':               { country: 'Thailand', state: 'Satun',                    displayName: 'Mueang Satun',              lat: 6.6238,  lon: 100.0673 },
  'pattani':                    { country: 'Thailand', state: 'Pattani',                  displayName: 'Pattani',                   lat: 6.8692,  lon: 101.2501 },
  'mueang-pattani':             { country: 'Thailand', state: 'Pattani',                  displayName: 'Mueang Pattani',            lat: 6.8692,  lon: 101.2501 },
  'yala':                       { country: 'Thailand', state: 'Yala',                     displayName: 'Yala',                      lat: 6.5413,  lon: 101.2803 },
  'mueang-yala':                { country: 'Thailand', state: 'Yala',                     displayName: 'Mueang Yala',               lat: 6.5413,  lon: 101.2803 },
  'narathiwat':                 { country: 'Thailand', state: 'Narathiwat',               displayName: 'Narathiwat',                lat: 6.4251,  lon: 101.8253 },
  'mueang-narathiwat':          { country: 'Thailand', state: 'Narathiwat',               displayName: 'Mueang Narathiwat',         lat: 6.4251,  lon: 101.8253 },
  'ranong':                     { country: 'Thailand', state: 'Ranong',                   displayName: 'Ranong',                    lat: 9.9529,  lon: 98.6084  },
  'mueang-ranong':              { country: 'Thailand', state: 'Ranong',                   displayName: 'Mueang Ranong',             lat: 9.9529,  lon: 98.6084  },
  'chumphon':                   { country: 'Thailand', state: 'Chumphon',                 displayName: 'Chumphon',                  lat: 10.4930, lon: 99.1800  },
  'mueang-chumphon':            { country: 'Thailand', state: 'Chumphon',                 displayName: 'Mueang Chumphon',           lat: 10.4930, lon: 99.1800  },
  'phang-nga':                  { country: 'Thailand', state: 'Phang Nga',                displayName: 'Phang Nga',                 lat: 8.4501,  lon: 98.5259  },
  'mueang-phang-nga':           { country: 'Thailand', state: 'Phang Nga',                displayName: 'Mueang Phang Nga',          lat: 8.4501,  lon: 98.5259  },

  // ── INDIA ─────────────────────────────────────────────────
  'delhi':          { country: 'India',   state: 'Delhi',               displayName: 'Delhi',           lat: 28.7041, lon: 77.1025  },
  'mumbai':         { country: 'India',   state: 'Maharashtra',         displayName: 'Mumbai',          lat: 19.0760, lon: 72.8777  },
  'kolkata':        { country: 'India',   state: 'West Bengal',         displayName: 'Kolkata',         lat: 22.5726, lon: 88.3639  },
  'bengaluru':      { country: 'India',   state: 'Karnataka',           displayName: 'Bengaluru',       lat: 12.9716, lon: 77.5946  },
  'chennai':        { country: 'India',   state: 'Tamil Nadu',          displayName: 'Chennai',         lat: 13.0827, lon: 80.2707  },
  'hyderabad':      { country: 'India',   state: 'Telangana',           displayName: 'Hyderabad',       lat: 17.3850, lon: 78.4867  },
  'pune':           { country: 'India',   state: 'Maharashtra',         displayName: 'Pune',            lat: 18.5204, lon: 73.8567  },
  'ahmedabad':      { country: 'India',   state: 'Gujarat',             displayName: 'Ahmedabad',       lat: 23.0225, lon: 72.5714  },

  // ── CHINA ─────────────────────────────────────────────────
  'beijing':        { country: 'China',   state: 'Beijing',             displayName: 'Beijing',         lat: 39.9042, lon: 116.4074 },
  'shanghai':       { country: 'China',   state: 'Shanghai',            displayName: 'Shanghai',        lat: 31.2304, lon: 121.4737 },
  'guangzhou':      { country: 'China',   state: 'Guangdong',           displayName: 'Guangzhou',       lat: 23.1291, lon: 113.2644 },
  'shenzhen':       { country: 'China',   state: 'Guangdong',           displayName: 'Shenzhen',        lat: 22.5431, lon: 114.0579 },
  'chengdu':        { country: 'China',   state: 'Sichuan',             displayName: 'Chengdu',         lat: 30.5728, lon: 104.0668 },
  'wuhan':          { country: 'China',   state: 'Hubei',               displayName: 'Wuhan',           lat: 30.5928, lon: 114.3055 },

  // ── SOUTHEAST ASIA ────────────────────────────────────────
  'jakarta':        { country: 'Indonesia', state: 'Jakarta',           displayName: 'Jakarta',         lat: -6.2088, lon: 106.8456 },
  'surabaya':       { country: 'Indonesia', state: 'East Java',         displayName: 'Surabaya',        lat: -7.2575, lon: 112.7521 },
  'kuala-lumpur':   { country: 'Malaysia',  state: 'Kuala Lumpur',      displayName: 'Kuala Lumpur',    lat: 3.1390,  lon: 101.6869 },
  'singapore':      { country: 'Singapore', state: 'Singapore',         displayName: 'Singapore',       lat: 1.3521,  lon: 103.8198 },
  'manila':         { country: 'Philippines', state: 'Metro Manila',    displayName: 'Manila',          lat: 14.5995, lon: 120.9842 },
  'ho-chi-minh-city': { country: 'Vietnam', state: 'Ho Chi Minh City',  displayName: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297 },
  'hanoi':          { country: 'Vietnam',  state: 'Hanoi',              displayName: 'Hanoi',           lat: 21.0285, lon: 105.8542 },
  'yangon':         { country: 'Myanmar',  state: 'Yangon',             displayName: 'Yangon',          lat: 16.8661, lon: 96.1951  },
  'phnom-penh':     { country: 'Cambodia', state: 'Phnom Penh',         displayName: 'Phnom Penh',      lat: 11.5564, lon: 104.9282 },
  'vientiane':      { country: 'Laos',     state: 'Vientiane Prefecture', displayName: 'Vientiane',     lat: 17.9757, lon: 102.6331 },

  // ── USA ───────────────────────────────────────────────────
  'los-angeles':    { country: 'USA',  state: 'California',             displayName: 'Los Angeles',     lat: 34.0522, lon: -118.2437 },
  'new-york':       { country: 'USA',  state: 'New York',               displayName: 'New York',        lat: 40.7128, lon: -74.0060  },
  'chicago':        { country: 'USA',  state: 'Illinois',               displayName: 'Chicago',         lat: 41.8781, lon: -87.6298  },
  'houston':        { country: 'USA',  state: 'Texas',                  displayName: 'Houston',         lat: 29.7604, lon: -95.3698  },
  'phoenix':        { country: 'USA',  state: 'Arizona',                displayName: 'Phoenix',         lat: 33.4484, lon: -112.0740 },
  'san-francisco':  { country: 'USA',  state: 'California',             displayName: 'San Francisco',   lat: 37.7749, lon: -122.4194 },
  'seattle':        { country: 'USA',  state: 'Washington',             displayName: 'Seattle',         lat: 47.6062, lon: -122.3321 },
  'denver':         { country: 'USA',  state: 'Colorado',               displayName: 'Denver',          lat: 39.7392, lon: -104.9903 },

  // ── EUROPE ────────────────────────────────────────────────
  'london':         { country: 'UK',      state: 'England',             displayName: 'London',          lat: 51.5074, lon: -0.1278   },
  'paris':          { country: 'France',  state: 'Ile-de-France',       displayName: 'Paris',           lat: 48.8566, lon: 2.3522    },
  'berlin':         { country: 'Germany', state: 'Berlin',              displayName: 'Berlin',          lat: 52.5200, lon: 13.4050   },
  'madrid':         { country: 'Spain',   state: 'Community of Madrid', displayName: 'Madrid',          lat: 40.4168, lon: -3.7038   },
  'rome':           { country: 'Italy',   state: 'Lazio',               displayName: 'Rome',            lat: 41.9028, lon: 12.4964   },
  'amsterdam':      { country: 'Netherlands', state: 'North Holland',   displayName: 'Amsterdam',       lat: 52.3676, lon: 4.9041    },
  'warsaw':         { country: 'Poland',  state: 'Masovian',            displayName: 'Warsaw',          lat: 52.2297, lon: 21.0122   },
  'istanbul':       { country: 'Turkey',  state: 'Istanbul',            displayName: 'Istanbul',        lat: 41.0082, lon: 28.9784   },

  // ── MIDDLE EAST ───────────────────────────────────────────
  'dubai':          { country: 'UAE',          state: 'Dubai',          displayName: 'Dubai',           lat: 25.2048, lon: 55.2708   },
  'riyadh':         { country: 'Saudi Arabia', state: 'Riyadh',         displayName: 'Riyadh',          lat: 24.7136, lon: 46.6753   },
  'tehran':         { country: 'Iran',         state: 'Tehran',         displayName: 'Tehran',          lat: 35.6892, lon: 51.3890   },
  'karachi':        { country: 'Pakistan',     state: 'Sindh',          displayName: 'Karachi',         lat: 24.8607, lon: 67.0011   },
  'lahore':         { country: 'Pakistan',     state: 'Punjab',         displayName: 'Lahore',          lat: 31.5204, lon: 74.3587   },

  // ── AFRICA ────────────────────────────────────────────────
  'cairo':          { country: 'Egypt',        state: 'Cairo',          displayName: 'Cairo',           lat: 30.0444, lon: 31.2357   },
  'lagos':          { country: 'Nigeria',      state: 'Lagos',          displayName: 'Lagos',           lat: 6.5244,  lon: 3.3792    },
  'nairobi':        { country: 'Kenya',        state: 'Nairobi',        displayName: 'Nairobi',         lat: -1.2921, lon: 36.8219   },
  'johannesburg':   { country: 'South Africa', state: 'Gauteng',        displayName: 'Johannesburg',    lat: -26.2041, lon: 28.0473  },
  'accra':          { country: 'Ghana',        state: 'Greater Accra',  displayName: 'Accra',           lat: 5.6037,  lon: -0.1870   },

  // ── SOUTH AMERICA ─────────────────────────────────────────
  'sao-paulo':      { country: 'Brazil',    state: 'Sao Paulo',         displayName: 'São Paulo',       lat: -23.5505, lon: -46.6333 },
  'rio-de-janeiro': { country: 'Brazil',    state: 'Rio de Janeiro',    displayName: 'Rio de Janeiro',  lat: -22.9068, lon: -43.1729 },
  'buenos-aires':   { country: 'Argentina', state: 'Buenos Aires',      displayName: 'Buenos Aires',    lat: -34.6037, lon: -58.3816 },
  'bogota':         { country: 'Colombia',  state: 'Bogota',            displayName: 'Bogotá',          lat: 4.7110,   lon: -74.0721 },
  'lima':           { country: 'Peru',      state: 'Lima',              displayName: 'Lima',            lat: -12.0464, lon: -77.0428 },
  'santiago':       { country: 'Chile',     state: 'Santiago',          displayName: 'Santiago',        lat: -33.4489, lon: -70.6693 },

  // ── AUSTRALIA ─────────────────────────────────────────────
  'sydney':         { country: 'Australia', state: 'New South Wales',   displayName: 'Sydney',          lat: -33.8688, lon: 151.2093 },
  'melbourne':      { country: 'Australia', state: 'Victoria',          displayName: 'Melbourne',       lat: -37.8136, lon: 144.9631 },
  'brisbane':       { country: 'Australia', state: 'Queensland',        displayName: 'Brisbane',        lat: -27.4698, lon: 153.0251 },
  'perth':          { country: 'Australia', state: 'Western Australia',  displayName: 'Perth',          lat: -31.9505, lon: 115.8605 },

  // ── JAPAN / SOUTH KOREA ───────────────────────────────────
  'tokyo':          { country: 'Japan',      state: 'Tokyo',            displayName: 'Tokyo',           lat: 35.6762, lon: 139.6503  },
  'osaka':          { country: 'Japan',      state: 'Osaka',            displayName: 'Osaka',           lat: 34.6937, lon: 135.5023  },
  'seoul':          { country: 'South Korea', state: 'Seoul',           displayName: 'Seoul',           lat: 37.5665, lon: 126.9780  },
  'busan':          { country: 'South Korea', state: 'Busan',           displayName: 'Busan',           lat: 35.1796, lon: 129.0756  },
};

// ── AQI helper functions ──────────────────────────────────────

function getAQICategory(aqi) {
  if (aqi <= 50)  return { level: 'Good',                  color: '#00e400', textColor: '#000', emoji: '😊', advice: 'Air quality is satisfactory. Enjoy outdoor activities.' };
  if (aqi <= 100) return { level: 'Moderate',              color: '#ffff00', textColor: '#000', emoji: '😐', advice: 'Acceptable air quality. Unusually sensitive people should consider limiting prolonged outdoor exertion.' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: '#ff7e00', textColor: '#fff', emoji: '😷', advice: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.' };
  if (aqi <= 200) return { level: 'Unhealthy',             color: '#ff0000', textColor: '#fff', emoji: '🤧', advice: 'Everyone may begin to experience health effects. Members of sensitive groups may experience more serious effects.' };
  if (aqi <= 300) return { level: 'Very Unhealthy',        color: '#8f3f97', textColor: '#fff', emoji: '😨', advice: 'Health alert: everyone may experience more serious health effects. Avoid prolonged outdoor exertion.' };
  return           { level: 'Hazardous',                   color: '#7e0023', textColor: '#fff', emoji: '☠️',  advice: 'Health warning of emergency conditions. Everyone is more likely to be affected. Stay indoors.' };
}

function getPollutantName(code) {
  const map = { p1: 'PM10', p2: 'PM2.5', o3: 'Ozone (O₃)', n2: 'Nitrogen Dioxide (NO₂)', s2: 'Sulfur Dioxide (SO₂)', co: 'Carbon Monoxide (CO)' };
  return map[code] || code;
}

function getWindDirection(deg) {
  if (deg === undefined || deg === null) return '';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── SEO City Page Route ───────────────────────────────────────
router.get('/test-city', (req, res) => res.send('<h1>City pages route is working!</h1>'));

// ── IQAir sub-district name overrides ────────────────────────
// Some cities are not in IQAir by their common name.
// This maps displayName → the actual city name IQAir recognises.
// Discovered by querying /api/aqi/cities for each province.
const IQAIR_NAME_OVERRIDE = {
  // Mae Hong Son capital area — IQAir knows sub-districts, not the city
  'Mae Hong Son':        'Pang Mu',
  'Mueang Mae Hong Son': 'Pang Mu',
  // Add more overrides here as you discover them:
  // 'City Display Name': 'IQAir City Name',
};

router.get('/:city-aqi', async (req, res) => {
  try {
    const citySlug = req.params.city;
    console.log(`🌍 City page requested: ${citySlug}`);

    const cityMeta = CITY_LOOKUP[citySlug];

    if (!cityMeta) {
      return res.status(404).send(build404Page(citySlug));
    }

    const { country, state, displayName, lat, lon } = cityMeta;
    console.log(`🌍 Rendering page for: ${displayName}`);

    let aqiData = null;
    let fetchError = null;

    // Strategy 1: Try with state using display name
    try {
      aqiData = await iqairService.getCityData(displayName, state, country);
    } catch (e1) {
      // Strategy 2: Try IQAir override name if one exists
      const overrideName = IQAIR_NAME_OVERRIDE[displayName];
      if (overrideName) {
        try {
          aqiData = await iqairService.getCityData(overrideName, state, country);
          console.log(`✅ Used IQAir override name "${overrideName}" for ${displayName}`);
        } catch (e2) { /* fall through */ }
      }

      // Strategy 3: Try city as state
      if (!aqiData) {
        try {
          aqiData = await iqairService.getCityData(displayName, displayName, country);
        } catch (e3) {
          // Strategy 4: Nearest station by coordinates (always works)
          try {
            const stations = await iqairService.getNearbyStations(lat, lon, 50);
            if (stations && stations.length > 0) {
              aqiData = stations[0];
              console.log(`📍 Used coordinate fallback for ${displayName}`);
            }
          } catch (e4) {
            fetchError = e4.message;
            console.error(`❌ All fetch strategies failed for ${displayName}:`, fetchError);
          }
        }
      }
    }

    // ── Build structured data for Google ─────────────────────
    const aqi       = aqiData ? Math.round(aqiData.aqi?.us ?? aqiData.aqi ?? 0) : null;
    const category  = aqi !== null ? getAQICategory(aqi) : null;
    const pollutant = aqiData ? getPollutantName(aqiData.mainPollutant || aqiData.dominantPollutant || 'p2') : null;
    const temp      = aqiData?.weather?.temperature ?? null;
    const humidity  = aqiData?.weather?.humidity ?? null;
    const wind      = aqiData?.weather?.wind ?? null;
    const windDir   = getWindDirection(aqiData?.weather?.windDirection);
    const now       = new Date();
    const updatedAt = now.toISOString();
    const updatedReadable = now.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }) + ' UTC';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- ── Primary SEO ── -->
    <title>${displayName} AQI Today${aqi !== null ? ` – ${aqi} (${category.level})` : ''} | Live Air Quality Index</title>
    <meta name="description" content="${aqi !== null
      ? `${displayName} air quality index is ${aqi} (${category.level}) right now. Main pollutant: ${pollutant}. ${category.advice}`
      : `Real-time air quality index for ${displayName}. Live AQI, PM2.5, pollution levels, and health recommendations updated hourly.`}">
    <meta name="keywords" content="${displayName} AQI, ${displayName} air quality, ${displayName} pollution, ${displayName} air quality index, ${country} AQI">
    <link rel="canonical" href="https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi">

    <!-- ── Open Graph ── -->
    <meta property="og:title" content="${displayName} Air Quality: AQI ${aqi ?? '--'} (${category?.level ?? 'Loading'})">
    <meta property="og:description" content="${aqi !== null ? `${displayName} AQI is currently ${aqi} – ${category.level}. ${category.advice}` : `Live air quality data for ${displayName}.`}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi">

    <!-- ── Twitter Card ── -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${displayName} AQI: ${aqi ?? '--'} – ${category?.level ?? 'Live Data'}">
    <meta name="twitter:description" content="${aqi !== null ? category.advice : `Check live air quality for ${displayName}.`}">

    <!-- ── Structured Data (JSON-LD) ── -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${displayName} Air Quality Index",
      "description": "Real-time AQI data for ${displayName}, ${country}",
      "url": "https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi",
      "dateModified": "${updatedAt}",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aqi.jeff-o-blogs.com" },
          { "@type": "ListItem", "position": 2, "name": "${displayName} AQI", "item": "https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi" }
        ]
      }
    }
    </script>

    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🌍</text></svg>">

    <!-- ── Google Fonts ── -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">

    <style>
        :root {
            --bg:        #0b0f1a;
            --surface:   #111827;
            --surface2:  #1a2235;
            --border:    rgba(255,255,255,0.07);
            --text:      #e8eaf0;
            --muted:     #8892a4;
            --accent:    #4f8ef7;
            --aqi-color: ${category ? category.color : '#4f8ef7'};
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DM Sans', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
        }

        /* ── Noise texture overlay ── */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
        }

        .wrap {
            position: relative;
            z-index: 1;
            max-width: 860px;
            margin: 0 auto;
            padding: 32px 20px 80px;
        }

        /* ── Navbar ── */
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 48px;
        }

        .nav-brand {
            font-family: 'DM Serif Display', serif;
            font-size: 20px;
            color: var(--text);
            text-decoration: none;
            letter-spacing: -0.3px;
        }

        .nav-brand span { color: var(--accent); }

        .nav-link {
            font-size: 13px;
            font-weight: 500;
            color: var(--muted);
            text-decoration: none;
            padding: 8px 16px;
            border: 1px solid var(--border);
            border-radius: 6px;
            transition: all 0.2s;
        }

        .nav-link:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

        /* ── Hero ── */
        .hero {
            margin-bottom: 32px;
        }

        .breadcrumb {
            font-size: 12px;
            color: var(--muted);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .breadcrumb a { color: var(--muted); text-decoration: none; }
        .breadcrumb a:hover { color: var(--text); }
        .breadcrumb-sep { opacity: 0.4; }

        .hero-title {
            font-family: 'DM Serif Display', serif;
            font-size: clamp(32px, 6vw, 56px);
            line-height: 1.1;
            letter-spacing: -1px;
            margin-bottom: 8px;
        }

        .hero-sub {
            font-size: 14px;
            color: var(--muted);
            font-weight: 300;
        }

        /* ── AQI Card ── */
        .aqi-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 48px 40px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
            animation: fadeUp 0.6s ease both;
        }

        .aqi-card::before {
            content: '';
            position: absolute;
            top: -80px;
            right: -80px;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, var(--aqi-color) 0%, transparent 70%);
            opacity: 0.08;
            pointer-events: none;
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .aqi-main {
            display: flex;
            align-items: flex-end;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .aqi-number {
            font-family: 'DM Serif Display', serif;
            font-size: clamp(80px, 16vw, 128px);
            line-height: 0.9;
            color: var(--aqi-color);
            letter-spacing: -4px;
            text-shadow: 0 0 60px color-mix(in srgb, var(--aqi-color) 30%, transparent);
            transition: color 0.5s ease;
        }

        .aqi-meta {
            padding-bottom: 8px;
        }

        .aqi-unit {
            font-size: 13px;
            font-weight: 500;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .aqi-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 600;
            background: color-mix(in srgb, var(--aqi-color) 15%, transparent);
            color: var(--aqi-color);
            border: 1px solid color-mix(in srgb, var(--aqi-color) 30%, transparent);
        }

        .health-advice {
            font-size: 15px;
            color: var(--muted);
            line-height: 1.7;
            padding-top: 20px;
            border-top: 1px solid var(--border);
        }

        .health-advice strong { color: var(--text); }

        /* ── Stats Grid ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s 0.1s ease both;
        }

        .stat-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            transition: border-color 0.2s;
        }

        .stat-card:hover { border-color: rgba(255,255,255,0.15); }

        .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--muted);
            margin-bottom: 8px;
        }

        .stat-value {
            font-family: 'DM Serif Display', serif;
            font-size: 28px;
            color: var(--text);
            line-height: 1;
            margin-bottom: 4px;
        }

        .stat-unit {
            font-size: 12px;
            color: var(--muted);
        }

        /* ── AQI Scale ── */
        .scale-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s 0.2s ease both;
        }

        .section-title {
            font-family: 'DM Serif Display', serif;
            font-size: 20px;
            margin-bottom: 20px;
            color: var(--text);
        }

        .scale-bar {
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(to right, #00e400, #ffff00, #ff7e00, #ff0000, #8f3f97, #7e0023);
            margin-bottom: 8px;
            position: relative;
        }

        .scale-marker {
            position: absolute;
            top: -4px;
            transform: translateX(-50%);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 3px solid var(--aqi-color);
            box-shadow: 0 0 12px var(--aqi-color);
            transition: left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .scale-labels {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--muted);
            margin-top: 8px;
        }

        .scale-levels {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 20px;
        }

        .scale-level {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--muted);
        }

        .scale-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        /* ── Info Section ── */
        .info-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s 0.3s ease both;
        }

        .info-section p {
            color: var(--muted);
            font-size: 15px;
            line-height: 1.8;
            margin-bottom: 16px;
        }

        .info-section p:last-child { margin-bottom: 0; }

        .info-section strong { color: var(--text); }

        /* ── CTA ── */
        .cta-section {
            background: linear-gradient(135deg, var(--surface2), var(--surface));
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            animation: fadeUp 0.6s 0.4s ease both;
        }

        .cta-title {
            font-family: 'DM Serif Display', serif;
            font-size: 28px;
            margin-bottom: 12px;
        }

        .cta-sub {
            color: var(--muted);
            font-size: 15px;
            margin-bottom: 28px;
        }

        .cta-btn {
            display: inline-block;
            background: var(--accent);
            color: white;
            padding: 14px 36px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
            letter-spacing: 0.2px;
        }

        .cta-btn:hover {
            background: #3a7de8;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(79,142,247,0.3);
        }

        /* ── Footer ── */
        footer {
            text-align: center;
            color: var(--muted);
            font-size: 13px;
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
        }

        footer a { color: var(--muted); text-decoration: none; }
        footer a:hover { color: var(--text); }

        .updated-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--muted);
            background: var(--surface2);
            padding: 4px 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            margin-bottom: 32px;
        }

        .pulse {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* ── Error state ── */
        .error-notice {
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.2);
            border-radius: 12px;
            padding: 16px 20px;
            font-size: 14px;
            color: #fca5a5;
            margin-bottom: 24px;
        }

        @media (max-width: 600px) {
            .aqi-card { padding: 32px 24px; }
            .scale-levels { grid-template-columns: repeat(2,1fr); }
            .stats-grid { grid-template-columns: repeat(2,1fr); }
        }
    </style>
</head>
<body>
<div class="wrap">

    <!-- ── Navbar ── -->
    <nav>
        <a href="https://aqi.jeff-o-blogs.com" class="nav-brand">🌍 <span>AQI</span> Monitor</a>
        <a href="https://aqi.jeff-o-blogs.com" class="nav-link">← All Cities</a>
    </nav>

    <!-- ── Hero ── -->
    <div class="hero">
        <div class="breadcrumb">
            <a href="https://aqi.jeff-o-blogs.com">Home</a>
            <span class="breadcrumb-sep">›</span>
            <span>${displayName} AQI</span>
        </div>
        <h1 class="hero-title">${displayName}<br>Air Quality Index</h1>
        <p class="hero-sub">${country} · Live data updated hourly</p>
    </div>

    ${fetchError ? `<div class="error-notice">⚠️ Could not retrieve live data right now. Showing cached or estimated values. (${fetchError})</div>` : ''}

    ${aqi !== null ? `
    <!-- ── Updated tag ── -->
    <div class="updated-tag">
        <div class="pulse"></div>
        Live · Updated ${updatedReadable}
    </div>

    <!-- ── Main AQI Card ── -->
    <div class="aqi-card">
        <div class="aqi-main">
            <div class="aqi-number">${aqi}</div>
            <div class="aqi-meta">
                <div class="aqi-unit">US AQI</div>
                <div class="aqi-badge">${category.emoji} ${category.level}</div>
            </div>
        </div>
        <div class="health-advice">
            <strong>Health Advisory:</strong> ${category.advice}
            ${pollutant ? `<br><strong>Main Pollutant:</strong> ${pollutant}` : ''}
        </div>
    </div>

    <!-- ── Stats Grid ── -->
    <div class="stats-grid">
        ${temp !== null ? `
        <div class="stat-card">
            <div class="stat-label">🌡️ Temperature</div>
            <div class="stat-value">${temp}°</div>
            <div class="stat-unit">Celsius</div>
        </div>` : ''}
        ${humidity !== null ? `
        <div class="stat-card">
            <div class="stat-label">💧 Humidity</div>
            <div class="stat-value">${humidity}%</div>
            <div class="stat-unit">Relative humidity</div>
        </div>` : ''}
        ${wind !== null ? `
        <div class="stat-card">
            <div class="stat-label">💨 Wind</div>
            <div class="stat-value">${wind}</div>
            <div class="stat-unit">m/s ${windDir}</div>
        </div>` : ''}
        <div class="stat-card">
            <div class="stat-label">📊 CN AQI</div>
            <div class="stat-value">${aqiData?.aqi?.cn ?? '--'}</div>
            <div class="stat-unit">China standard</div>
        </div>
    </div>

    <!-- ── AQI Scale ── -->
    <div class="scale-section">
        <h2 class="section-title">Where does ${aqi} sit on the scale?</h2>
        <div class="scale-bar">
            <div class="scale-marker" style="left: ${Math.min(aqi / 3, 100)}%"></div>
        </div>
        <div class="scale-labels">
            <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span>
        </div>
        <div class="scale-levels">
            <div class="scale-level"><div class="scale-dot" style="background:#00e400"></div>0–50 Good</div>
            <div class="scale-level"><div class="scale-dot" style="background:#ffff00"></div>51–100 Moderate</div>
            <div class="scale-level"><div class="scale-dot" style="background:#ff7e00"></div>101–150 Sensitive</div>
            <div class="scale-level"><div class="scale-dot" style="background:#ff0000"></div>151–200 Unhealthy</div>
            <div class="scale-level"><div class="scale-dot" style="background:#8f3f97"></div>201–300 Very Unhealthy</div>
            <div class="scale-level"><div class="scale-dot" style="background:#7e0023"></div>301+ Hazardous</div>
        </div>
    </div>
    ` : `
    <!-- ── No data state ── -->
    <div class="aqi-card" style="text-align:center; padding: 60px 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📡</div>
        <h2 style="font-family:'DM Serif Display',serif; font-size:24px; margin-bottom:12px;">Data Temporarily Unavailable</h2>
        <p style="color:var(--muted); font-size:15px;">We couldn't retrieve live air quality data for ${displayName} right now. Please try again shortly or use the main app to search by location.</p>
    </div>
    `}

    <!-- ── About AQI Section (SEO content) ── -->
    <div class="info-section">
        <h2 class="section-title">About Air Quality in ${displayName}</h2>
        <p>
            The <strong>Air Quality Index (AQI)</strong> is a standardised scale used to communicate how polluted the air is
            in ${displayName} and how it may affect your health. The US AQI scale runs from 0 to 500 —
            lower values indicate cleaner air, while higher values represent increasingly dangerous pollution levels.
        </p>
        <p>
            In ${displayName}, ${country}, air quality can be affected by vehicle emissions, industrial activity,
            weather patterns, and seasonal factors such as agricultural burning or dust storms.
            Monitoring AQI regularly helps residents and visitors make informed decisions about outdoor activities.
        </p>
        <p>
            <strong>Sensitive groups</strong> — including children, the elderly, and people with respiratory or heart
            conditions — should pay close attention to AQI readings and follow health advisories when levels rise
            above 100. At AQI levels above 150, even healthy individuals may begin to experience symptoms.
        </p>
    </div>

    <!-- ── CTA ── -->
    <div class="cta-section">
        <div class="cta-title">Monitor More Cities</div>
        <p class="cta-sub">Use your location or browse 100+ countries for live air quality data worldwide.</p>
        <a href="https://aqi.jeff-o-blogs.com" class="cta-btn">Open Live AQI Monitor →</a>
    </div>

    <!-- ── Footer ── -->
    <footer>
        <p>
            Data sourced from <strong>IQAir</strong> · 
            <a href="https://aqi.jeff-o-blogs.com">AQI Monitor</a> · 
            Page generated ${updatedReadable}
        </p>
    </footer>

</div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('❌ City page error:', error);
    res.status(500).send('Error loading city page. Please try again.');
  }
});

// ── 404 page for unknown cities ────────────────────────────────
function build404Page(citySlug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>City Not Found | AQI Monitor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body { font-family:'DM Sans',sans-serif; background:#0b0f1a; color:#e8eaf0; min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; }
        h1 { font-family:'DM Serif Display',serif; font-size:48px; margin-bottom:16px; }
        p { color:#8892a4; font-size:16px; margin-bottom:32px; max-width:420px; }
        a { display:inline-block; background:#4f8ef7; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; }
    </style>
</head>
<body>
    <div>
        <div style="font-size:64px;margin-bottom:24px">🌫️</div>
        <h1>City Not Found</h1>
        <p>We don't have a dedicated page for "<strong>${citySlug}</strong>" yet. Use the main app to search any city worldwide.</p>
        <a href="https://aqi.jeff-o-blogs.com">Search All Cities →</a>
    </div>
</body>
</html>`;
}

module.exports = router;
