// Static city lookup table for AQI search
// Uses exact state/country names as required by IQAir API
// No API calls needed — instant load, works forever

const CITY_INDEX = [
  // ── UK ──
  { city:'London', state:'England', country:'UK' },
  { city:'Manchester', state:'England', country:'UK' },
  { city:'Birmingham', state:'England', country:'UK' },
  { city:'Leeds', state:'England', country:'UK' },
  { city:'Sheffield', state:'England', country:'UK' },
  { city:'Liverpool', state:'England', country:'UK' },
  { city:'Bristol', state:'England', country:'UK' },
  { city:'Newcastle upon Tyne', state:'England', country:'UK' },
  { city:'Nottingham', state:'England', country:'UK' },
  { city:'Leicester', state:'England', country:'UK' },
  { city:'Coventry', state:'England', country:'UK' },
  { city:'Bradford', state:'England', country:'UK' },
  { city:'Sunderland', state:'England', country:'UK' },
  { city:'Oxford', state:'England', country:'UK' },
  { city:'Cambridge', state:'England', country:'UK' },
  { city:'Brighton', state:'England', country:'UK' },
  { city:'Southampton', state:'England', country:'UK' },
  { city:'Portsmouth', state:'England', country:'UK' },
  { city:'Reading', state:'England', country:'UK' },
  { city:'Derby', state:'England', country:'UK' },
  { city:'Wolverhampton', state:'England', country:'UK' },
  { city:'Plymouth', state:'England', country:'UK' },
  { city:'Stoke-on-Trent', state:'England', country:'UK' },
  { city:'Norwich', state:'England', country:'UK' },
  { city:'Luton', state:'England', country:'UK' },
  { city:'Wigan', state:'England', country:'UK' },
  { city:'Bournemouth', state:'England', country:'UK' },
  { city:'Middlesbrough', state:'England', country:'UK' },
  { city:'Peterborough', state:'England', country:'UK' },
  { city:'Swindon', state:'England', country:'UK' },
  { city:'Huddersfield', state:'England', country:'UK' },
  { city:'Blackpool', state:'England', country:'UK' },
  { city:'Bolton', state:'England', country:'UK' },
  { city:'Ipswich', state:'England', country:'UK' },
  { city:'Exeter', state:'England', country:'UK' },
  { city:'Cheltenham', state:'England', country:'UK' },
  { city:'York', state:'England', country:'UK' },
  { city:'Gloucester', state:'England', country:'UK' },
  { city:'Blackburn', state:'England', country:'UK' },
  { city:'Harrogate', state:'England', country:'UK' },
  { city:'Warrington', state:'England', country:'UK' },
  { city:'Slough', state:'England', country:'UK' },
  { city:'Milton Keynes', state:'England', country:'UK' },
  { city:'Northampton', state:'England', country:'UK' },
  { city:'Preston', state:'England', country:'UK' },
  { city:'Wakefield', state:'England', country:'UK' },
  { city:'Hull', state:'England', country:'UK' },
  { city:'Rotherham', state:'England', country:'UK' },
  { city:'Barnsley', state:'England', country:'UK' },
  { city:'Hastings', state:'England', country:'UK' },
  { city:'Eastbourne', state:'England', country:'UK' },
  { city:'Carlisle', state:'England', country:'UK' },
  { city:'Darlington', state:'England', country:'UK' },
  { city:'Walsall', state:'England', country:'UK' },
  { city:'Colchester', state:'England', country:'UK' },
  { city:'Shrewsbury', state:'England', country:'UK' },
  { city:'Hereford', state:'England', country:'UK' },
  { city:'Worcester', state:'England', country:'UK' },
  { city:'Canterbury', state:'England', country:'UK' },
  { city:'Salisbury', state:'England', country:'UK' },
  { city:'Truro', state:'England', country:'UK' },
  { city:'Bath', state:'England', country:'UK' },
  { city:'Winchester', state:'England', country:'UK' },
  { city:'St Albans', state:'England', country:'UK' },
  { city:'Stevenage', state:'England', country:'UK' },
  { city:'Welwyn Garden City', state:'England', country:'UK' },
  { city:'Maidenhead', state:'England', country:'UK' },
  { city:'Wokingham', state:'England', country:'UK' },
  // Scotland
  { city:'Edinburgh', state:'Scotland', country:'UK' },
  { city:'Glasgow', state:'Scotland', country:'UK' },
  { city:'Aberdeen', state:'Scotland', country:'UK' },
  { city:'Inverness', state:'Scotland', country:'UK' },
  { city:'Dundee', state:'Scotland', country:'UK' },
  { city:'Motherwell', state:'Scotland', country:'UK' },
  { city:'Greenock', state:'Scotland', country:'UK' },
  { city:'Clydebank', state:'Scotland', country:'UK' },
  // Wales
  { city:'Cardiff', state:'Wales', country:'UK' },
  { city:'Swansea', state:'Wales', country:'UK' },
  { city:'Newport', state:'Wales', country:'UK' },
  { city:'Wrexham', state:'Wales', country:'UK' },
  { city:'Pontypridd', state:'Wales', country:'UK' },
  { city:'Port Talbot', state:'Wales', country:'UK' },

  // ── THAILAND ──
  { city:'Bangkok', state:'Bangkok', country:'Thailand' },
  { city:'Chiang Mai', state:'Chiang Mai', country:'Thailand' },
  { city:'Chiang Rai', state:'Chiang Rai', country:'Thailand' },
  { city:'Phuket', state:'Phuket', country:'Thailand' },
  { city:'Pattaya', state:'Chon Buri', country:'Thailand' },
  { city:'Khon Kaen', state:'Khon Kaen', country:'Thailand' },
  { city:'Udon Thani', state:'Udon Thani', country:'Thailand' },
  { city:'Nakhon Ratchasima', state:'Nakhon Ratchasima', country:'Thailand' },
  { city:'Hat Yai', state:'Songkhla', country:'Thailand' },
  { city:'Nonthaburi', state:'Nonthaburi', country:'Thailand' },
  { city:'Pathum Thani', state:'Pathum Thani', country:'Thailand' },
  { city:'Samut Prakan', state:'Samut Prakan', country:'Thailand' },
  { city:'Rayong', state:'Rayong', country:'Thailand' },
  { city:'Krabi', state:'Krabi', country:'Thailand' },
  { city:'Koh Samui', state:'Surat Thani', country:'Thailand' },
  { city:'Ayutthaya', state:'Phra Nakhon Si Ayutthaya', country:'Thailand' },
  { city:'Lampang', state:'Lampang', country:'Thailand' },
  { city:'Phitsanulok', state:'Phitsanulok', country:'Thailand' },
  { city:'Nakhon Sawan', state:'Nakhon Sawan', country:'Thailand' },
  { city:'Surat Thani', state:'Surat Thani', country:'Thailand' },

  // ── AUSTRALIA ──
  { city:'Sydney', state:'New South Wales', country:'Australia' },
  { city:'Melbourne', state:'Victoria', country:'Australia' },
  { city:'Brisbane', state:'Queensland', country:'Australia' },
  { city:'Perth', state:'Western Australia', country:'Australia' },
  { city:'Adelaide', state:'South Australia', country:'Australia' },
  { city:'Canberra', state:'Australian Capital Territory', country:'Australia' },
  { city:'Hobart', state:'Tasmania', country:'Australia' },
  { city:'Darwin', state:'Northern Territory', country:'Australia' },
  { city:'Gold Coast', state:'Queensland', country:'Australia' },
  { city:'Newcastle', state:'New South Wales', country:'Australia' },
  { city:'Wollongong', state:'New South Wales', country:'Australia' },
  { city:'Geelong', state:'Victoria', country:'Australia' },
  { city:'Townsville', state:'Queensland', country:'Australia' },
  { city:'Cairns', state:'Queensland', country:'Australia' },
  { city:'Ballarat', state:'Victoria', country:'Australia' },

  // ── FRANCE ──
  { city:'Paris', state:'Ile-de-France', country:'France' },
  { city:'Lyon', state:'Auvergne-Rhône-Alpes', country:'France' },
  { city:'Marseille', state:'Provence-Alpes-Cote d\'Azur', country:'France' },
  { city:'Toulouse', state:'Occitanie', country:'France' },
  { city:'Nice', state:'Provence-Alpes-Cote d\'Azur', country:'France' },
  { city:'Nantes', state:'Pays de la Loire', country:'France' },
  { city:'Bordeaux', state:'Nouvelle-Aquitaine', country:'France' },
  { city:'Strasbourg', state:'Grand Est', country:'France' },
  { city:'Lille', state:'Hauts-de-France', country:'France' },
  { city:'Rennes', state:'Brittany', country:'France' },
  { city:'Reims', state:'Grand Est', country:'France' },
  { city:'Grenoble', state:'Auvergne-Rhône-Alpes', country:'France' },
  { city:'Montpellier', state:'Occitanie', country:'France' },
  { city:'Rouen', state:'Normandy', country:'France' },
  { city:'Clermont-Ferrand', state:'Auvergne-Rhône-Alpes', country:'France' },
  { city:'Tours', state:'Centre', country:'France' },
  { city:'Dijon', state:'Bourgogne-Franche-Comte', country:'France' },

  // ── GERMANY ──
  { city:'Berlin', state:'Berlin', country:'Germany' },
  { city:'Hamburg', state:'Hamburg', country:'Germany' },
  { city:'Munich', state:'Bavaria', country:'Germany' },
  { city:'Cologne', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Frankfurt', state:'Hesse', country:'Germany' },
  { city:'Stuttgart', state:'Baden-Württemberg', country:'Germany' },
  { city:'Düsseldorf', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Dortmund', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Essen', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Leipzig', state:'Saxony', country:'Germany' },
  { city:'Bremen', state:'Bremen', country:'Germany' },
  { city:'Dresden', state:'Saxony', country:'Germany' },
  { city:'Hannover', state:'Lower Saxony', country:'Germany' },
  { city:'Nuremberg', state:'Bavaria', country:'Germany' },
  { city:'Duisburg', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Bochum', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Wuppertal', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Bonn', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Bielefeld', state:'North Rhine-Westphalia', country:'Germany' },
  { city:'Mannheim', state:'Baden-Württemberg', country:'Germany' },
  { city:'Karlsruhe', state:'Baden-Württemberg', country:'Germany' },
  { city:'Augsburg', state:'Bavaria', country:'Germany' },
  { city:'Freiburg', state:'Baden-Württemberg', country:'Germany' },

  // ── JAPAN ──
  { city:'Tokyo', state:'Tokyo', country:'Japan' },
  { city:'Osaka', state:'Osaka', country:'Japan' },
  { city:'Kyoto', state:'Kyoto', country:'Japan' },
  { city:'Yokohama', state:'Kanagawa', country:'Japan' },
  { city:'Nagoya', state:'Aichi', country:'Japan' },
  { city:'Sapporo', state:'Hokkaido', country:'Japan' },
  { city:'Fukuoka', state:'Fukuoka', country:'Japan' },
  { city:'Kobe', state:'Hyogo', country:'Japan' },
  { city:'Hiroshima', state:'Hiroshima', country:'Japan' },
  { city:'Sendai', state:'Miyagi', country:'Japan' },
  { city:'Naha', state:'Okinawa', country:'Japan' },
  { city:'Nagasaki', state:'Nagasaki', country:'Japan' },

  // ── CHINA ──
  { city:'Beijing', state:'Beijing', country:'China' },
  { city:'Shanghai', state:'Shanghai', country:'China' },
  { city:'Guangzhou', state:'Guangdong', country:'China' },
  { city:'Shenzhen', state:'Guangdong', country:'China' },
  { city:'Chengdu', state:'Sichuan', country:'China' },
  { city:'Chongqing', state:'Chongqing', country:'China' },
  { city:'Wuhan', state:'Hubei', country:'China' },
  { city:'Xi\'an', state:'Shaanxi', country:'China' },
  { city:'Hangzhou', state:'Zhejiang', country:'China' },
  { city:'Nanjing', state:'Jiangsu', country:'China' },
  { city:'Tianjin', state:'Tianjin', country:'China' },
  { city:'Suzhou', state:'Jiangsu', country:'China' },

  // ── INDIA ──
  { city:'Mumbai', state:'Maharashtra', country:'India' },
  { city:'Delhi', state:'Delhi', country:'India' },
  { city:'Bangalore', state:'Karnataka', country:'India' },
  { city:'Hyderabad', state:'Telangana', country:'India' },
  { city:'Chennai', state:'Tamil Nadu', country:'India' },
  { city:'Kolkata', state:'West Bengal', country:'India' },
  { city:'Pune', state:'Maharashtra', country:'India' },
  { city:'Ahmedabad', state:'Gujarat', country:'India' },
  { city:'Jaipur', state:'Rajasthan', country:'India' },
  { city:'Lucknow', state:'Uttar Pradesh', country:'India' },
  { city:'Kanpur', state:'Uttar Pradesh', country:'India' },
  { city:'Nagpur', state:'Maharashtra', country:'India' },
  { city:'Surat', state:'Gujarat', country:'India' },
  { city:'Chandigarh', state:'Chandigarh', country:'India' },
  { city:'Bhopal', state:'Madhya Pradesh', country:'India' },
  { city:'Patna', state:'Bihar', country:'India' },
  { city:'Goa', state:'Goa', country:'India' },

  // ── USA ──
  { city:'New York', state:'New York', country:'USA' },
  { city:'Los Angeles', state:'California', country:'USA' },
  { city:'Chicago', state:'Illinois', country:'USA' },
  { city:'Houston', state:'Texas', country:'USA' },
  { city:'Phoenix', state:'Arizona', country:'USA' },
  { city:'Philadelphia', state:'Pennsylvania', country:'USA' },
  { city:'San Antonio', state:'Texas', country:'USA' },
  { city:'San Diego', state:'California', country:'USA' },
  { city:'Dallas', state:'Texas', country:'USA' },
  { city:'San Francisco', state:'California', country:'USA' },
  { city:'Seattle', state:'Washington', country:'USA' },
  { city:'Denver', state:'Colorado', country:'USA' },
  { city:'Boston', state:'Massachusetts', country:'USA' },
  { city:'Nashville', state:'Tennessee', country:'USA' },
  { city:'Portland', state:'Oregon', country:'USA' },
  { city:'Las Vegas', state:'Nevada', country:'USA' },
  { city:'Atlanta', state:'Georgia', country:'USA' },
  { city:'Miami', state:'Florida', country:'USA' },
  { city:'Minneapolis', state:'Minnesota', country:'USA' },
  { city:'New Orleans', state:'Louisiana', country:'USA' },
  { city:'Salt Lake City', state:'Utah', country:'USA' },
  { city:'Austin', state:'Texas', country:'USA' },
  { city:'Detroit', state:'Michigan', country:'USA' },
  { city:'Washington DC', state:'District of Columbia', country:'USA' },
  { city:'Baltimore', state:'Maryland', country:'USA' },
  { city:'Sacramento', state:'California', country:'USA' },
  { city:'Pittsburgh', state:'Pennsylvania', country:'USA' },
  { city:'Honolulu', state:'Hawaii', country:'USA' },
  { city:'Anchorage', state:'Alaska', country:'USA' },

  // ── CANADA ──
  { city:'Toronto', state:'Ontario', country:'Canada' },
  { city:'Vancouver', state:'British Columbia', country:'Canada' },
  { city:'Montreal', state:'Quebec', country:'Canada' },
  { city:'Calgary', state:'Alberta', country:'Canada' },
  { city:'Edmonton', state:'Alberta', country:'Canada' },
  { city:'Ottawa', state:'Ontario', country:'Canada' },
  { city:'Winnipeg', state:'Manitoba', country:'Canada' },
  { city:'Quebec City', state:'Quebec', country:'Canada' },
  { city:'Hamilton', state:'Ontario', country:'Canada' },
  { city:'Halifax', state:'Nova Scotia', country:'Canada' },
  { city:'Victoria', state:'British Columbia', country:'Canada' },

  // ── SINGAPORE ──
  { city:'Singapore', state:'Central Singapore', country:'Singapore' },

  // ── INDONESIA ──
  { city:'Bali', state:'Bali', country:'Indonesia' },
  { city:'Yogyakarta', state:'Yogyakarta', country:'Indonesia' },
  { city:'Medan', state:'North Sumatra', country:'Indonesia' },
  { city:'Makassar', state:'South Sulawesi', country:'Indonesia' },
  { city:'Semarang', state:'Central Java', country:'Indonesia' },
  { city:'Surabaya', state:'East Java', country:'Indonesia' },
  { city:'Bandung', state:'West Java', country:'Indonesia' },
  { city:'Denpasar', state:'Bali', country:'Indonesia' },

  // ── MALAYSIA ──
  { city:'Kuala Lumpur', state:'Kuala Lumpur', country:'Malaysia' },
  { city:'George Town', state:'Penang', country:'Malaysia' },
  { city:'Johor Bahru', state:'Johor', country:'Malaysia' },
  { city:'Ipoh', state:'Perak', country:'Malaysia' },
  { city:'Kota Kinabalu', state:'Sabah', country:'Malaysia' },
  { city:'Kuching', state:'Sarawak', country:'Malaysia' },
  { city:'Shah Alam', state:'Selangor', country:'Malaysia' },
  { city:'Petaling Jaya', state:'Selangor', country:'Malaysia' },
  { city:'Klang', state:'Selangor', country:'Malaysia' },

  // ── SPAIN ──
  { city:'Madrid', state:'Madrid', country:'Spain' },,
  { city:'Barcelona', state:'Catalonia', country:'Spain' },
  { city:'Valencia', state:'Valencia', country:'Spain' },
  { city:'Seville', state:'Andalusia', country:'Spain' },
  { city:'Zaragoza', state:'Aragon', country:'Spain' },
  { city:'Malaga', state:'Andalusia', country:'Spain' },
  { city:'Bilbao', state:'Basque Country', country:'Spain' },
  { city:'Alicante', state:'Valencia', country:'Spain' },
  { city:'Granada', state:'Andalusia', country:'Spain' },
  { city:'Palma', state:'Balearic Islands', country:'Spain' },

  // ── ITALY ──
  { city:'Rome', state:'Lazio', country:'Italy' },
  { city:'Milan', state:'Lombardy', country:'Italy' },
  { city:'Naples', state:'Campania', country:'Italy' },
  { city:'Turin', state:'Piedmont', country:'Italy' },
  { city:'Florence', state:'Tuscany', country:'Italy' },
  { city:'Venice', state:'Veneto', country:'Italy' },
  { city:'Bologna', state:'Emilia-Romagna', country:'Italy' },
  { city:'Genoa', state:'Liguria', country:'Italy' },
  { city:'Palermo', state:'Sicily', country:'Italy' },
  { city:'Catania', state:'Sicily', country:'Italy' },
  { city:'Bari', state:'Apulia', country:'Italy' },
  { city:'Verona', state:'Veneto', country:'Italy' },

  // ── NETHERLANDS ──
  { city:'Amsterdam', state:'North Holland', country:'Netherlands' },
  { city:'Rotterdam', state:'South Holland', country:'Netherlands' },
  { city:'The Hague', state:'South Holland', country:'Netherlands' },
  { city:'Utrecht', state:'Utrecht', country:'Netherlands' },
  { city:'Eindhoven', state:'North Brabant', country:'Netherlands' },
  { city:'Groningen', state:'Groningen', country:'Netherlands' },

  // ── IRELAND ──
  { city:'Dublin', state:'Leinster', country:'Ireland' },
  { city:'Cork', state:'Munster', country:'Ireland' },
  { city:'Limerick', state:'Munster', country:'Ireland' },
  { city:'Galway', state:'Connacht', country:'Ireland' },

  // ── PORTUGAL ──
  { city:'Lisbon', state:'Lisbon', country:'Portugal' },
  { city:'Porto', state:'Porto', country:'Portugal' },
  { city:'Braga', state:'Braga', country:'Portugal' },
  { city:'Faro', state:'Algarve', country:'Portugal' },
  { city:'Coimbra', state:'Centre', country:'Portugal' },

  // ── SWEDEN ──
  { city:'Stockholm', state:'Stockholm', country:'Sweden' },
  { city:'Gothenburg', state:'Vastra Gotaland', country:'Sweden' },
  { city:'Malmö', state:'Skane', country:'Sweden' },
  { city:'Uppsala', state:'Uppsala', country:'Sweden' },

  // ── NORWAY ──
  { city:'Oslo', state:'Oslo', country:'Norway' },
  { city:'Bergen', state:'Vestland', country:'Norway' },
  { city:'Trondheim', state:'Trondelag', country:'Norway' },

  // ── DENMARK ──
  { city:'Copenhagen', state:'Capital Region', country:'Denmark' },
  { city:'Aarhus', state:'Central Jutland', country:'Denmark' },
  { city:'Odense', state:'Southern Denmark', country:'Denmark' },

  // ── BELGIUM ──
  { city:'Brussels', state:'Brussels', country:'Belgium' },
  { city:'Antwerp', state:'Flanders', country:'Belgium' },
  { city:'Ghent', state:'Flanders', country:'Belgium' },
  { city:'Liège', state:'Wallonia', country:'Belgium' },

  // ── SWITZERLAND ──
  { city:'Zurich', state:'Zurich', country:'Switzerland' },
  { city:'Geneva', state:'Geneva', country:'Switzerland' },
  { city:'Basel', state:'Basel-City', country:'Switzerland' },
  { city:'Bern', state:'Bern', country:'Switzerland' },
  { city:'Lausanne', state:'Vaud', country:'Switzerland' },

  // ── GREECE ──
  { city:'Athens', state:'Attica', country:'Greece' },
  { city:'Thessaloniki', state:'Central Macedonia', country:'Greece' },
  { city:'Heraklion', state:'Crete', country:'Greece' },
  { city:'Patras', state:'Western Greece', country:'Greece' },

  // ── TURKEY ──
  { city:'Istanbul', state:'Istanbul', country:'Turkey' },
  { city:'Ankara', state:'Ankara', country:'Turkey' },
  { city:'Izmir', state:'Izmir', country:'Turkey' },
  { city:'Antalya', state:'Antalya', country:'Turkey' },
  { city:'Bursa', state:'Bursa', country:'Turkey' },

  // ── UAE ──
  { city:'Dubai', state:'Dubai', country:'United Arab Emirates' },
  { city:'Abu Dhabi', state:'Abu Dhabi', country:'United Arab Emirates' },
  { city:'Sharjah', state:'Sharjah', country:'United Arab Emirates' },

  // ── SOUTH KOREA ──
{ city:'Seoul', state:'Seoul', country:'South Korea' },
  { city:'Busan', state:'Busan', country:'South Korea' },
  { city:'Incheon', state:'Incheon', country:'South Korea' },
  { city:'Daegu', state:'Daegu', country:'South Korea' },
  { city:'Daejeon', state:'Daejeon', country:'South Korea' },
  { city:'Gwangju', state:'Gwangju', country:'South Korea' },
  { city:'Jeju', state:'Jeju-do', country:'South Korea' },

  // ── TAIWAN ──
  { city:'Taipei', state:'Taipei', country:'Taiwan' },
  { city:'Kaohsiung', state:'Kaohsiung', country:'Taiwan' },
  { city:'Taichung', state:'Taichung', country:'Taiwan' },

  // ── VIETNAM ──
{ city:'Ho Chi Minh City', state:'Ho Chi Minh city', country:'Vietnam' },
  { city:'Hanoi', state:'Ha Noi', country:'Vietnam' },
  { city:'Da Nang', state:'Da Nang city', country:'Vietnam' },

  // ── PHILIPPINES ──
 { city:'Manila', state:'National Capital Region', country:'Philippines' },
  { city:'Cebu', state:'Central Visayas', country:'Philippines' },
  { city:'Davao', state:'Davao', country:'Philippines' },

  // ── SOUTH AFRICA ──
  { city:'Johannesburg', state:'Gauteng', country:'South Africa' },
  { city:'Cape Town', state:'Western Cape', country:'South Africa' },
  { city:'Durban', state:'KwaZulu-Natal', country:'South Africa' },
  { city:'Pretoria', state:'Gauteng', country:'South Africa' },
  { city:'Port Elizabeth', state:'Eastern Cape', country:'South Africa' },

  // ── NEW ZEALAND ──
  { city:'Auckland', state:'Auckland', country:'New Zealand' },
  { city:'Wellington', state:'Wellington', country:'New Zealand' },
  { city:'Christchurch', state:'Canterbury', country:'New Zealand' },
  { city:'Hamilton', state:'Waikato', country:'New Zealand' },

  // ── BRAZIL ──
  { city:'São Paulo', state:'São Paulo', country:'Brazil' },
  { city:'Rio de Janeiro', state:'Rio de Janeiro', country:'Brazil' },
  { city:'Brasília', state:'Federal District', country:'Brazil' },
  { city:'Salvador', state:'Bahia', country:'Brazil' },
  { city:'Fortaleza', state:'Ceará', country:'Brazil' },
  { city:'Manaus', state:'Amazonas', country:'Brazil' },
  { city:'Curitiba', state:'Paraná', country:'Brazil' },
  { city:'Porto Alegre', state:'Rio Grande do Sul', country:'Brazil' },
  { city:'Belo Horizonte', state:'Minas Gerais', country:'Brazil' },
  { city:'Recife', state:'Pernambuco', country:'Brazil' },

  // ── MEXICO ──
  { city:'Mexico City', state:'Mexico City', country:'Mexico' },
  { city:'Guadalajara', state:'Jalisco', country:'Mexico' },
  { city:'Monterrey', state:'Nuevo Leon', country:'Mexico' },
  { city:'Puebla', state:'Puebla', country:'Mexico' },
  { city:'Tijuana', state:'Baja California', country:'Mexico' },
  { city:'Cancun', state:'Quintana Roo', country:'Mexico' },

  // ── ARGENTINA ──
  { city:'Buenos Aires', state:'Buenos Aires', country:'Argentina' },
  { city:'Córdoba', state:'Córdoba', country:'Argentina' },
  { city:'Rosario', state:'Santa Fe', country:'Argentina' },
  { city:'Mendoza', state:'Mendoza', country:'Argentina' },

  // ── CHILE ──
  { city:'Santiago', state:'Metropolitan Region', country:'Chile' },
  { city:'Valparaíso', state:'Valparaíso', country:'Chile' },
  { city:'Concepción', state:'Biobío', country:'Chile' },

  // ── COLOMBIA ──
  { city:'Bogotá', state:'Bogota', country:'Colombia' },
  { city:'Medellín', state:'Antioquia', country:'Colombia' },
  { city:'Cali', state:'Valle del Cauca', country:'Colombia' },
  { city:'Cartagena', state:'Bolívar', country:'Colombia' },

  // ── KENYA ──
  { city:'Nairobi', state:'Nairobi', country:'Kenya' },
  { city:'Mombasa', state:'Mombasa', country:'Kenya' },

  // ── NIGERIA ──
  { city:'Lagos', state:'Lagos', country:'Nigeria' },
  { city:'Abuja', state:'Federal Capital Territory', country:'Nigeria' },
  { city:'Kano', state:'Kano', country:'Nigeria' },

  // ── GHANA ──
  { city:'Accra', state:'Greater Accra', country:'Ghana' },
  { city:'Kumasi', state:'Ashanti', country:'Ghana' },

  // ── POLAND ──
  { city:'Warsaw', state:'Masovian', country:'Poland' },
  { city:'Krakow', state:'Lesser Poland', country:'Poland' },
  { city:'Lodz', state:'Lodz', country:'Poland' },
  { city:'Wroclaw', state:'Lower Silesian', country:'Poland' },
  { city:'Poznan', state:'Greater Poland', country:'Poland' },
  { city:'Gdansk', state:'Pomeranian', country:'Poland' },

  // ── SAUDI ARABIA ──
  { city:'Riyadh', state:'Riyadh', country:'Saudi Arabia' },
  { city:'Jeddah', state:'Makkah', country:'Saudi Arabia' },
  { city:'Mecca', state:'Makkah', country:'Saudi Arabia' },

  // ── PAKISTAN ──
  { city:'Karachi', state:'Sindh', country:'Pakistan' },
  { city:'Lahore', state:'Punjab', country:'Pakistan' },
  { city:'Islamabad', state:'Islamabad', country:'Pakistan' },

  // ── BANGLADESH ──
  { city:'Dhaka', state:'Dhaka', country:'Bangladesh' },
  { city:'Chittagong', state:'Chittagong', country:'Bangladesh' },

  // ── SRI LANKA ──
  { city:'Colombo', state:'Western', country:'Sri Lanka' },
  { city:'Kandy', state:'Central', country:'Sri Lanka' },

  // ── NEPAL ──
  { city:'Kathmandu', state:'Bagmati', country:'Nepal' },
  { city:'Pokhara', state:'Gandaki', country:'Nepal' },

  // ── HONG KONG ──
  { city:'Hong Kong', state:'Hong Kong Island', country:'Hong Kong SAR' },

  // ── ISRAEL ──
  { city:'Tel Aviv', state:'Tel Aviv', country:'Israel' },
  { city:'Jerusalem', state:'Jerusalem', country:'Israel' },

  // ── EGYPT ──
  { city:'Cairo', state:'Cairo', country:'Egypt' },
  { city:'Alexandria', state:'Alexandria', country:'Egypt' },

  // ── MOROCCO ──
  { city:'Casablanca', state:'Casablanca-Settat', country:'Morocco' },
  { city:'Marrakech', state:'Marrakesh-Safi', country:'Morocco' },

  // ── RUSSIA ──
  { city:'Moscow', state:'Moscow', country:'Russia' },
  { city:'Saint Petersburg', state:'Saint Petersburg', country:'Russia' },
  { city:'Novosibirsk', state:'Novosibirsk Oblast', country:'Russia' },
  { city:'Yekaterinburg', state:'Sverdlovsk Oblast', country:'Russia' },

  // ── GUINEA ──
  { city:'Conakry', state:'Conakry', country:'Guinea' },

    // ── AUSTRIA ──
  { city:'Vienna', state:'Vienna', country:'Austria' },
  { city:'Salzburg', state:'Salzburg', country:'Austria' },
  { city:'Graz', state:'Styria', country:'Austria' },
  { city:'Innsbruck', state:'Tyrol', country:'Austria' },
  { city:'Linz', state:'Upper Austria', country:'Austria' },
];

module.exports = CITY_INDEX.map(c => ({ ...c, search: c.city.toLowerCase() }));
