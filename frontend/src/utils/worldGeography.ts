// Données géographiques mondiales complètes
// Structure hiérarchique : Continent > Pays > Région > Préfecture > Sous-préfecture > Quartier

export interface GeographicLocation {
  code: string;
  name: string;
  children?: GeographicLocation[];
}

// Structure mondiale complète
export const WORLD_GEOGRAPHY: GeographicLocation[] = [
  // AFRIQUE
  {
    code: 'C1',
    name: 'Afrique',
    children: [
      {
        code: 'P1',
        name: 'Guinée',
        children: [
          // 1. Basse-Guinée (Guinée maritime) - région naturelle
          {
            code: 'R1',
            name: 'Basse-Guinée',
            children: [
              {
                code: 'PR1',
                name: 'Conakry',
                children: [
                  { code: 'SP1', name: 'Kaloum', children: [{ code: 'Q1', name: 'Almamya' }, { code: 'Q2', name: 'Boulbinet' }, { code: 'Q3', name: 'Coronthie' }] },
                  { code: 'SP2', name: 'Dixinn', children: [{ code: 'Q4', name: 'Belle-Vue' }, { code: 'Q5', name: 'Camayenne' }] },
                  { code: 'SP3', name: 'Matam', children: [{ code: 'Q6', name: 'Gbessia Port 1' }, { code: 'Q7', name: 'Madina' }] },
                  { code: 'SP4', name: 'Ratoma', children: [{ code: 'Q8', name: 'Bambeto' }, { code: 'Q9', name: 'Cosa' }] },
                  { code: 'SP5', name: 'Matoto', children: [{ code: 'Q10', name: 'Entag' }, { code: 'Q11', name: 'Simbaya' }] }
                ]
              },
              { code: 'PR2', name: 'Boffa', children: [{ code: 'SP10', name: 'Boffa-Centre', children: [{ code: 'Q16', name: 'Boffa' }] }] },
              { code: 'PR3', name: 'Boké', children: [{ code: 'SP20', name: 'Boké-Centre', children: [{ code: 'Q20', name: 'Boké Ville' }, { code: 'Q21', name: 'Kamsar' }] }] },
              { code: 'PR4', name: 'Fria', children: [{ code: 'SP30', name: 'Fria-Centre', children: [{ code: 'Q30', name: 'Fria Ville' }] }] },
              { code: 'PR5', name: 'Gaoual', children: [{ code: 'SP40', name: 'Gaoual-Centre', children: [{ code: 'Q40', name: 'Gaoual' }] }] },
              { code: 'PR6', name: 'Koundara', children: [{ code: 'SP50', name: 'Koundara-Centre', children: [{ code: 'Q50', name: 'Koundara' }] }] },
              { code: 'PR7', name: 'Coyah', children: [{ code: 'SP60', name: 'Coyah-Centre', children: [{ code: 'Q60', name: 'Coyah' }] }] },
              { code: 'PR8', name: 'Dubréka', children: [{ code: 'SP70', name: 'Dubréka-Centre', children: [{ code: 'Q70', name: 'Dubréka' }] }] },
              { code: 'PR9', name: 'Forécariah', children: [{ code: 'SP80', name: 'Forécariah-Centre', children: [{ code: 'Q80', name: 'Forécariah' }] }] },
              { code: 'PR10', name: 'Kindia', children: [{ code: 'SP90', name: 'Kindia-Centre', children: [{ code: 'Q90', name: 'Kindia Ville' }] }] },
              { code: 'PR11', name: 'Télimélé', children: [{ code: 'SP100', name: 'Télimélé-Centre', children: [{ code: 'Q100', name: 'Télimélé' }] }] }
            ]
          },
          // 2. Moyenne-Guinée (Fouta-Djallon) - région naturelle
          {
            code: 'R2',
            name: 'Fouta-Djallon',
            children: [
              { code: 'PR12', name: 'Koubia', children: [{ code: 'SP110', name: 'Koubia-Centre', children: [{ code: 'Q110', name: 'Koubia' }] }] },
              { code: 'PR13', name: 'Labé', children: [{ code: 'SP120', name: 'Labé-Centre', children: [{ code: 'Q120', name: 'Labé Ville' }] }] },
              { code: 'PR14', name: 'Lélouma', children: [{ code: 'SP130', name: 'Lélouma-Centre', children: [{ code: 'Q130', name: 'Lélouma' }] }] },
              { code: 'PR15', name: 'Mali', children: [{ code: 'SP140', name: 'Mali-Centre', children: [{ code: 'Q140', name: 'Mali' }] }] },
              { code: 'PR16', name: 'Tougué', children: [{ code: 'SP150', name: 'Tougué-Centre', children: [{ code: 'Q150', name: 'Tougué' }] }] },
              { code: 'PR17', name: 'Dalaba', children: [{ code: 'SP160', name: 'Dalaba-Centre', children: [{ code: 'Q160', name: 'Dalaba' }] }] },
              { code: 'PR18', name: 'Mamou', children: [{ code: 'SP170', name: 'Mamou-Centre', children: [{ code: 'Q170', name: 'Mamou Ville' }] }] },
              { code: 'PR19', name: 'Pita', children: [{ code: 'SP180', name: 'Pita-Centre', children: [{ code: 'Q180', name: 'Pita Ville' }] }] }
            ]
          },
          // 3. Haute-Guinée - région naturelle
          {
            code: 'R3',
            name: 'Haute-Guinée',
            children: [
              { code: 'PR20', name: 'Dabola', children: [{ code: 'SP190', name: 'Dabola-Centre', children: [{ code: 'Q190', name: 'Dabola' }] }] },
              { code: 'PR21', name: 'Dinguiraye', children: [{ code: 'SP200', name: 'Dinguiraye-Centre', children: [{ code: 'Q200', name: 'Dinguiraye' }] }] },
              { code: 'PR22', name: 'Faranah', children: [{ code: 'SP210', name: 'Faranah-Centre', children: [{ code: 'Q210', name: 'Faranah Ville' }] }] },
              { code: 'PR23', name: 'Kissidougou', children: [{ code: 'SP220', name: 'Kissidougou-Centre', children: [{ code: 'Q220', name: 'Kissidougou Ville' }] }] },
              { code: 'PR24', name: 'Kankan', children: [{ code: 'SP230', name: 'Kankan-Centre', children: [{ code: 'Q230', name: 'Kankan Ville' }] }] },
              { code: 'PR25', name: 'Kérouané', children: [{ code: 'SP240', name: 'Kérouané-Centre', children: [{ code: 'Q240', name: 'Kérouané' }] }] },
              { code: 'PR26', name: 'Kouroussa', children: [{ code: 'SP250', name: 'Kouroussa-Centre', children: [{ code: 'Q250', name: 'Kouroussa Ville' }] }] },
              { code: 'PR27', name: 'Mandiana', children: [{ code: 'SP260', name: 'Mandiana-Centre', children: [{ code: 'Q260', name: 'Mandiana' }] }] },
              { code: 'PR28', name: 'Siguiri', children: [{ code: 'SP270', name: 'Siguiri-Centre', children: [{ code: 'Q270', name: 'Siguiri Ville' }] }] }
            ]
          },
          // 4. Guinée forestière - région naturelle
          {
            code: 'R4',
            name: 'Guinée forestière',
            children: [
              { code: 'PR29', name: 'Beyla', children: [{ code: 'SP280', name: 'Beyla-Centre', children: [{ code: 'Q280', name: 'Beyla' }] }] },
              { code: 'PR30', name: 'Guéckédou', children: [{ code: 'SP290', name: 'Guéckédou-Centre', children: [{ code: 'Q290', name: 'Guéckédou Ville' }] }] },
              { code: 'PR31', name: 'Lola', children: [{ code: 'SP300', name: 'Lola-Centre', children: [{ code: 'Q300', name: 'Lola' }] }] },
              { code: 'PR32', name: 'Macenta', children: [{ code: 'SP310', name: 'Macenta-Centre', children: [{ code: 'Q310', name: 'Macenta Ville' }] }] },
              { code: 'PR33', name: 'Nzérékoré', children: [{ code: 'SP320', name: 'Nzérékoré-Centre', children: [{ code: 'Q320', name: 'Nzérékoré Ville' }] }] },
              { code: 'PR34', name: 'Yomou', children: [{ code: 'SP330', name: 'Yomou-Centre', children: [{ code: 'Q330', name: 'Yomou' }] }] }
            ]
          }
        ]
      },
      {
        code: 'P2',
        name: 'Sénégal',
        children: [
          {
            code: 'R1',
            name: 'Dakar',
            children: [
              {
                code: 'PR1',
                name: 'Dakar',
                children: [
                  {
                    code: 'SP1',
                    name: 'Dakar Centre',
                    children: [
                      { code: 'Q1', name: 'Plateau' },
                      { code: 'Q2', name: 'Médina' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        code: 'P3',
        name: 'Mali',
        children: [
          {
            code: 'R1',
            name: 'Bamako',
            children: [
              {
                code: 'PR1',
                name: 'Bamako',
                children: [
                  {
                    code: 'SP1',
                    name: 'Bamako Centre',
                    children: [
                      { code: 'Q1', name: 'Commune I' },
                      { code: 'Q2', name: 'Commune II' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        code: 'P4',
        name: 'Côte d\'Ivoire',
        children: [
          {
            code: 'R1',
            name: 'Abidjan',
            children: [
              {
                code: 'PR1',
                name: 'Abidjan',
                children: [
                  {
                    code: 'SP1',
                    name: 'Abidjan Centre',
                    children: [
                      { code: 'Q1', name: 'Cocody' },
                      { code: 'Q2', name: 'Yopougon' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        code: 'P5',
        name: 'Burkina Faso',
        children: [
          { code: 'R1', name: 'Ouagadougou', children: [{ code: 'PR1', name: 'Ouagadougou', children: [{ code: 'SP1', name: 'Ouagadougou Centre', children: [{ code: 'Q1', name: 'Centre-ville' }] }] }] }
        ]
      },
      {
        code: 'P6',
        name: 'Afrique du Sud',
        children: [
          { code: 'R1', name: 'Gauteng', children: [{ code: 'PR1', name: 'Pretoria', children: [{ code: 'SP1', name: 'Pretoria Centre', children: [{ code: 'Q1', name: 'Pretoria CBD' }] }] }] },
          { code: 'R2', name: 'Western Cape', children: [{ code: 'PR2', name: 'Le Cap', children: [{ code: 'SP2', name: 'Le Cap Centre', children: [{ code: 'Q2', name: 'City Bowl' }] }] }] }
        ]
      },
      {
        code: 'P7',
        name: 'Algérie',
        children: [
          { code: 'R1', name: 'Alger', children: [{ code: 'PR1', name: 'Alger', children: [{ code: 'SP1', name: 'Alger Centre', children: [{ code: 'Q1', name: 'Hussein Dey' }, { code: 'Q2', name: 'Bab El Oued' }] }] }] },
          { code: 'R2', name: 'Oran', children: [{ code: 'PR2', name: 'Oran', children: [{ code: 'SP2', name: 'Oran Centre', children: [{ code: 'Q3', name: 'Es-Sénia' }] }] }] }
        ]
      },
      {
        code: 'P8',
        name: 'Angola',
        children: [
          { code: 'R1', name: 'Luanda', children: [{ code: 'PR1', name: 'Luanda', children: [{ code: 'SP1', name: 'Luanda Centre', children: [{ code: 'Q1', name: 'Luanda Ville' }] }] }] }
        ]
      },
      {
        code: 'P9',
        name: 'Bénin',
        children: [
          { code: 'R1', name: 'Littoral', children: [{ code: 'PR1', name: 'Cotonou', children: [{ code: 'SP1', name: 'Cotonou Centre', children: [{ code: 'Q1', name: 'Cadjehoun' }, { code: 'Q2', name: 'Akpakpa' }] }] }] },
          { code: 'R2', name: 'Ouémé', children: [{ code: 'PR2', name: 'Porto-Novo', children: [{ code: 'SP2', name: 'Porto-Novo Centre', children: [{ code: 'Q3', name: 'Porto-Novo Ville' }] }] }] }
        ]
      },
      {
        code: 'P10',
        name: 'Botswana',
        children: [
          { code: 'R1', name: 'South-East', children: [{ code: 'PR1', name: 'Gaborone', children: [{ code: 'SP1', name: 'Gaborone Centre', children: [{ code: 'Q1', name: 'Gaborone CBD' }] }] }] }
        ]
      },
      {
        code: 'P11',
        name: 'Burundi',
        children: [
          { code: 'R1', name: 'Bujumbura Mairie', children: [{ code: 'PR1', name: 'Bujumbura', children: [{ code: 'SP1', name: 'Bujumbura Centre', children: [{ code: 'Q1', name: 'Ngagara' }, { code: 'Q2', name: 'Rohero' }] }] }] }
        ]
      },
      {
        code: 'P12',
        name: 'Cameroun',
        children: [
          { code: 'R1', name: 'Centre', children: [{ code: 'PR1', name: 'Yaoundé', children: [{ code: 'SP1', name: 'Yaoundé Centre', children: [{ code: 'Q1', name: 'Bastos' }, { code: 'Q2', name: 'Mvan' }] }] }] },
          { code: 'R2', name: 'Littoral', children: [{ code: 'PR2', name: 'Douala', children: [{ code: 'SP2', name: 'Douala Centre', children: [{ code: 'Q3', name: 'Bonanjo' }, { code: 'Q4', name: 'Akwa' }] }] }] }
        ]
      },
      {
        code: 'P13',
        name: 'Cap-Vert',
        children: [
          { code: 'R1', name: 'Santiago', children: [{ code: 'PR1', name: 'Praia', children: [{ code: 'SP1', name: 'Praia Centre', children: [{ code: 'Q1', name: 'Plateau' }] }] }] }
        ]
      },
      {
        code: 'P14',
        name: 'Centrafrique',
        children: [
          { code: 'R1', name: 'Ombella-M\'Poko', children: [{ code: 'PR1', name: 'Bangui', children: [{ code: 'SP1', name: 'Bangui Centre', children: [{ code: 'Q1', name: 'Bangui Ville' }] }] }] }
        ]
      },
      {
        code: 'P15',
        name: 'Comores',
        children: [
          { code: 'R1', name: 'Grande Comore', children: [{ code: 'PR1', name: 'Moroni', children: [{ code: 'SP1', name: 'Moroni Centre', children: [{ code: 'Q1', name: 'Moroni Ville' }] }] }] }
        ]
      },
      {
        code: 'P16',
        name: 'République du Congo',
        children: [
          { code: 'R1', name: 'Brazzaville', children: [{ code: 'PR1', name: 'Brazzaville', children: [{ code: 'SP1', name: 'Brazzaville Centre', children: [{ code: 'Q1', name: 'Poto-Poto' }, { code: 'Q2', name: 'Bacongo' }] }] }] }
        ]
      },
      {
        code: 'P17',
        name: 'République démocratique du Congo',
        children: [
          { code: 'R1', name: 'Kinshasa', children: [{ code: 'PR1', name: 'Kinshasa', children: [{ code: 'SP1', name: 'Kinshasa Centre', children: [{ code: 'Q1', name: 'Gombe' }, { code: 'Q2', name: 'Lingwala' }] }] }] },
          { code: 'R2', name: 'Katanga', children: [{ code: 'PR2', name: 'Lubumbashi', children: [{ code: 'SP2', name: 'Lubumbashi Centre', children: [{ code: 'Q3', name: 'Lubumbashi Ville' }] }] }] }
        ]
      },
      {
        code: 'P18',
        name: 'Djibouti',
        children: [
          { code: 'R1', name: 'Djibouti', children: [{ code: 'PR1', name: 'Djibouti Ville', children: [{ code: 'SP1', name: 'Djibouti Centre', children: [{ code: 'Q1', name: 'Quartier 1' }] }] }] }
        ]
      },
      {
        code: 'P19',
        name: 'Égypte',
        children: [
          { code: 'R1', name: 'Le Caire', children: [{ code: 'PR1', name: 'Le Caire', children: [{ code: 'SP1', name: 'Le Caire Centre', children: [{ code: 'Q1', name: 'Zamalek' }, { code: 'Q2', name: 'Héliopolis' }] }] }] },
          { code: 'R2', name: 'Alexandrie', children: [{ code: 'PR2', name: 'Alexandrie', children: [{ code: 'SP2', name: 'Alexandrie Centre', children: [{ code: 'Q3', name: 'Montaza' }] }] }] }
        ]
      },
      {
        code: 'P20',
        name: 'Érythrée',
        children: [
          { code: 'R1', name: 'Maekel', children: [{ code: 'PR1', name: 'Asmara', children: [{ code: 'SP1', name: 'Asmara Centre', children: [{ code: 'Q1', name: 'Asmara Ville' }] }] }] }
        ]
      },
      {
        code: 'P21',
        name: 'Eswatini',
        children: [
          { code: 'R1', name: 'Hhohho', children: [{ code: 'PR1', name: 'Mbabane', children: [{ code: 'SP1', name: 'Mbabane Centre', children: [{ code: 'Q1', name: 'Mbabane CBD' }] }] }] }
        ]
      },
      {
        code: 'P22',
        name: 'Éthiopie',
        children: [
          { code: 'R1', name: 'Addis-Abeba', children: [{ code: 'PR1', name: 'Addis-Abeba', children: [{ code: 'SP1', name: 'Addis-Abeba Centre', children: [{ code: 'Q1', name: 'Bole' }, { code: 'Q2', name: 'Kirkos' }] }] }] }
        ]
      },
      {
        code: 'P23',
        name: 'Gabon',
        children: [
          { code: 'R1', name: 'Estuaire', children: [{ code: 'PR1', name: 'Libreville', children: [{ code: 'SP1', name: 'Libreville Centre', children: [{ code: 'Q1', name: 'Louis' }, { code: 'Q2', name: 'Nombakélé' }] }] }] }
        ]
      },
      {
        code: 'P24',
        name: 'Gambie',
        children: [
          { code: 'R1', name: 'Banjul', children: [{ code: 'PR1', name: 'Banjul', children: [{ code: 'SP1', name: 'Banjul Centre', children: [{ code: 'Q1', name: 'Banjul Ville' }] }] }] }
        ]
      },
      {
        code: 'P25',
        name: 'Ghana',
        children: [
          { code: 'R1', name: 'Greater Accra', children: [{ code: 'PR1', name: 'Accra', children: [{ code: 'SP1', name: 'Accra Centre', children: [{ code: 'Q1', name: 'Osu' }, { code: 'Q2', name: 'Adabraka' }] }] }] }
        ]
      },
      {
        code: 'P26',
        name: 'Guinée-Bissau',
        children: [
          { code: 'R1', name: 'Bissau', children: [{ code: 'PR1', name: 'Bissau', children: [{ code: 'SP1', name: 'Bissau Centre', children: [{ code: 'Q1', name: 'Bissau Ville' }] }] }] }
        ]
      },
      {
        code: 'P27',
        name: 'Guinée équatoriale',
        children: [
          { code: 'R1', name: 'Bioko Norte', children: [{ code: 'PR1', name: 'Malabo', children: [{ code: 'SP1', name: 'Malabo Centre', children: [{ code: 'Q1', name: 'Malabo Ville' }] }] }] }
        ]
      },
      {
        code: 'P28',
        name: 'Kenya',
        children: [
          { code: 'R1', name: 'Nairobi', children: [{ code: 'PR1', name: 'Nairobi', children: [{ code: 'SP1', name: 'Nairobi Centre', children: [{ code: 'Q1', name: 'Westlands' }, { code: 'Q2', name: 'Kibera' }] }] }] }
        ]
      },
      {
        code: 'P29',
        name: 'Lesotho',
        children: [
          { code: 'R1', name: 'Maseru', children: [{ code: 'PR1', name: 'Maseru', children: [{ code: 'SP1', name: 'Maseru Centre', children: [{ code: 'Q1', name: 'Maseru CBD' }] }] }] }
        ]
      },
      {
        code: 'P30',
        name: 'Liberia',
        children: [
          { code: 'R1', name: 'Montserrado', children: [{ code: 'PR1', name: 'Monrovia', children: [{ code: 'SP1', name: 'Monrovia Centre', children: [{ code: 'Q1', name: 'Sinkor' }, { code: 'Q2', name: 'Congo Town' }] }] }] }
        ]
      },
      {
        code: 'P31',
        name: 'Libye',
        children: [
          { code: 'R1', name: 'Tripoli', children: [{ code: 'PR1', name: 'Tripoli', children: [{ code: 'SP1', name: 'Tripoli Centre', children: [{ code: 'Q1', name: 'Tripoli Ville' }] }] }] }
        ]
      },
      {
        code: 'P32',
        name: 'Madagascar',
        children: [
          { code: 'R1', name: 'Analamanga', children: [{ code: 'PR1', name: 'Antananarivo', children: [{ code: 'SP1', name: 'Antananarivo Centre', children: [{ code: 'Q1', name: 'Analakely' }, { code: 'Q2', name: 'Tsimbazaza' }] }] }] }
        ]
      },
      {
        code: 'P33',
        name: 'Malawi',
        children: [
          { code: 'R1', name: 'Lilongwe', children: [{ code: 'PR1', name: 'Lilongwe', children: [{ code: 'SP1', name: 'Lilongwe Centre', children: [{ code: 'Q1', name: 'Old Town' }] }] }] }
        ]
      },
      {
        code: 'P34',
        name: 'Maroc',
        children: [
          { code: 'R1', name: 'Rabat-Salé-Kénitra', children: [{ code: 'PR1', name: 'Rabat', children: [{ code: 'SP1', name: 'Rabat Centre', children: [{ code: 'Q1', name: 'Agdal' }, { code: 'Q2', name: 'Médina' }] }] }] },
          { code: 'R2', name: 'Casablanca-Settat', children: [{ code: 'PR2', name: 'Casablanca', children: [{ code: 'SP2', name: 'Casablanca Centre', children: [{ code: 'Q3', name: 'Maarif' }, { code: 'Q4', name: 'Ain Diab' }] }] }] }
        ]
      },
      {
        code: 'P35',
        name: 'Maurice',
        children: [
          { code: 'R1', name: 'Port-Louis', children: [{ code: 'PR1', name: 'Port-Louis', children: [{ code: 'SP1', name: 'Port-Louis Centre', children: [{ code: 'Q1', name: 'Port-Louis CBD' }] }] }] }
        ]
      },
      {
        code: 'P36',
        name: 'Mauritanie',
        children: [
          { code: 'R1', name: 'Nouakchott', children: [{ code: 'PR1', name: 'Nouakchott', children: [{ code: 'SP1', name: 'Nouakchott Centre', children: [{ code: 'Q1', name: 'Tevragh-Zeina' }] }] }] }
        ]
      },
      {
        code: 'P37',
        name: 'Mozambique',
        children: [
          { code: 'R1', name: 'Maputo', children: [{ code: 'PR1', name: 'Maputo', children: [{ code: 'SP1', name: 'Maputo Centre', children: [{ code: 'Q1', name: 'Sommerschield' }] }] }] }
        ]
      },
      {
        code: 'P38',
        name: 'Namibie',
        children: [
          { code: 'R1', name: 'Khomas', children: [{ code: 'PR1', name: 'Windhoek', children: [{ code: 'SP1', name: 'Windhoek Centre', children: [{ code: 'Q1', name: 'Klein Windhoek' }] }] }] }
        ]
      },
      {
        code: 'P39',
        name: 'Niger',
        children: [
          { code: 'R1', name: 'Niamey', children: [{ code: 'PR1', name: 'Niamey', children: [{ code: 'SP1', name: 'Niamey Centre', children: [{ code: 'Q1', name: 'Plateau' }, { code: 'Q2', name: 'Wadata' }] }] }] }
        ]
      },
      {
        code: 'P40',
        name: 'Nigeria',
        children: [
          { code: 'R1', name: 'FCT Abuja', children: [{ code: 'PR1', name: 'Abuja', children: [{ code: 'SP1', name: 'Abuja Centre', children: [{ code: 'Q1', name: 'Garki' }, { code: 'Q2', name: 'Wuse' }] }] }] },
          { code: 'R2', name: 'Lagos', children: [{ code: 'PR2', name: 'Lagos', children: [{ code: 'SP2', name: 'Lagos Centre', children: [{ code: 'Q3', name: 'Victoria Island' }, { code: 'Q4', name: 'Ikeja' }] }] }] }
        ]
      },
      {
        code: 'P41',
        name: 'Ouganda',
        children: [
          { code: 'R1', name: 'Kampala', children: [{ code: 'PR1', name: 'Kampala', children: [{ code: 'SP1', name: 'Kampala Centre', children: [{ code: 'Q1', name: 'Nakasero' }, { code: 'Q2', name: 'Kololo' }] }] }] }
        ]
      },
      {
        code: 'P42',
        name: 'Rwanda',
        children: [
          { code: 'R1', name: 'Kigali', children: [{ code: 'PR1', name: 'Kigali', children: [{ code: 'SP1', name: 'Kigali Centre', children: [{ code: 'Q1', name: 'Kacyiru' }, { code: 'Q2', name: 'Kimihurura' }] }] }] }
        ]
      },
      {
        code: 'P43',
        name: 'Sao Tomé-et-Principe',
        children: [
          { code: 'R1', name: 'São Tomé', children: [{ code: 'PR1', name: 'São Tomé', children: [{ code: 'SP1', name: 'São Tomé Centre', children: [{ code: 'Q1', name: 'São Tomé Ville' }] }] }] }
        ]
      },
      {
        code: 'P44',
        name: 'Seychelles',
        children: [
          { code: 'R1', name: 'Mahé', children: [{ code: 'PR1', name: 'Victoria', children: [{ code: 'SP1', name: 'Victoria Centre', children: [{ code: 'Q1', name: 'Victoria Ville' }] }] }] }
        ]
      },
      {
        code: 'P45',
        name: 'Sierra Leone',
        children: [
          { code: 'R1', name: 'Western Area', children: [{ code: 'PR1', name: 'Freetown', children: [{ code: 'SP1', name: 'Freetown Centre', children: [{ code: 'Q1', name: 'Congo Town' }, { code: 'Q2', name: 'Aberdeen' }] }] }] }
        ]
      },
      {
        code: 'P46',
        name: 'Somalie',
        children: [
          { code: 'R1', name: 'Banaadir', children: [{ code: 'PR1', name: 'Mogadiscio', children: [{ code: 'SP1', name: 'Mogadiscio Centre', children: [{ code: 'Q1', name: 'Hamarweyne' }] }] }] }
        ]
      },
      {
        code: 'P47',
        name: 'Soudan',
        children: [
          { code: 'R1', name: 'Khartoum', children: [{ code: 'PR1', name: 'Khartoum', children: [{ code: 'SP1', name: 'Khartoum Centre', children: [{ code: 'Q1', name: 'Khartoum Ville' }] }] }] }
        ]
      },
      {
        code: 'P48',
        name: 'Soudan du Sud',
        children: [
          { code: 'R1', name: 'Jubek', children: [{ code: 'PR1', name: 'Juba', children: [{ code: 'SP1', name: 'Juba Centre', children: [{ code: 'Q1', name: 'Juba Ville' }] }] }] }
        ]
      },
      {
        code: 'P49',
        name: 'Tanzanie',
        children: [
          { code: 'R1', name: 'Dodoma', children: [{ code: 'PR1', name: 'Dodoma', children: [{ code: 'SP1', name: 'Dodoma Centre', children: [{ code: 'Q1', name: 'Dodoma CBD' }] }] }] },
          { code: 'R2', name: 'Dar es Salaam', children: [{ code: 'PR2', name: 'Dar es Salaam', children: [{ code: 'SP2', name: 'Dar es Salaam Centre', children: [{ code: 'Q2', name: 'Kariakoo' }] }] }] }
        ]
      },
      {
        code: 'P50',
        name: 'Tchad',
        children: [
          { code: 'R1', name: 'N\'Djamena', children: [{ code: 'PR1', name: 'N\'Djamena', children: [{ code: 'SP1', name: 'N\'Djamena Centre', children: [{ code: 'Q1', name: 'N\'Djamena Ville' }] }] }] }
        ]
      },
      {
        code: 'P51',
        name: 'Togo',
        children: [
          { code: 'R1', name: 'Maritime', children: [{ code: 'PR1', name: 'Lomé', children: [{ code: 'SP1', name: 'Lomé Centre', children: [{ code: 'Q1', name: 'Tokoin' }, { code: 'Q2', name: 'Bè' }] }] }] }
        ]
      },
      {
        code: 'P52',
        name: 'Tunisie',
        children: [
          { code: 'R1', name: 'Tunis', children: [{ code: 'PR1', name: 'Tunis', children: [{ code: 'SP1', name: 'Tunis Centre', children: [{ code: 'Q1', name: 'Médina' }, { code: 'Q2', name: 'Lafayette' }] }] }] }
        ]
      },
      {
        code: 'P53',
        name: 'Zambie',
        children: [
          { code: 'R1', name: 'Lusaka', children: [{ code: 'PR1', name: 'Lusaka', children: [{ code: 'SP1', name: 'Lusaka Centre', children: [{ code: 'Q1', name: 'Cairo Road' }] }] }] }
        ]
      },
      {
        code: 'P54',
        name: 'Zimbabwe',
        children: [
          { code: 'R1', name: 'Harare', children: [{ code: 'PR1', name: 'Harare', children: [{ code: 'SP1', name: 'Harare Centre', children: [{ code: 'Q1', name: 'CBD' }, { code: 'Q2', name: 'Avondale' }] }] }] }
        ]
      }
    ]
  },
  // ASIE
  {
    code: 'C2',
    name: 'Asie',
    children: [
      {
        code: 'P1',
        name: 'Chine',
        children: [
          { code: 'R1', name: 'Pékin', children: [{ code: 'PR1', name: 'Pékin', children: [{ code: 'SP1', name: 'Pékin Centre', children: [{ code: 'Q1', name: 'Dongcheng' }, { code: 'Q2', name: 'Xicheng' }] }] }] },
          { code: 'R2', name: 'Shanghai', children: [{ code: 'PR2', name: 'Shanghai', children: [{ code: 'SP2', name: 'Shanghai Centre', children: [{ code: 'Q3', name: 'Huangpu' }, { code: 'Q4', name: 'Jing\'an' }] }] }] }
        ]
      },
      {
        code: 'P2',
        name: 'Inde',
        children: [
          { code: 'R1', name: 'Delhi', children: [{ code: 'PR1', name: 'New Delhi', children: [{ code: 'SP1', name: 'New Delhi Centre', children: [{ code: 'Q1', name: 'Connaught Place' }, { code: 'Q2', name: 'Lajpat Nagar' }] }] }] },
          { code: 'R2', name: 'Maharashtra', children: [{ code: 'PR2', name: 'Mumbai', children: [{ code: 'SP2', name: 'Mumbai Centre', children: [{ code: 'Q3', name: 'Bandra' }, { code: 'Q4', name: 'Colaba' }] }] }] }
        ]
      },
      {
        code: 'P3',
        name: 'Arabie saoudite',
        children: [
          { code: 'R1', name: 'Riyad', children: [{ code: 'PR1', name: 'Riyad', children: [{ code: 'SP1', name: 'Riyad Centre', children: [{ code: 'Q1', name: 'Olaya' }, { code: 'Q2', name: 'Al-Malaz' }] }] }] },
          { code: 'R2', name: 'Makkah', children: [{ code: 'PR2', name: 'La Mecque', children: [{ code: 'SP2', name: 'La Mecque Centre', children: [{ code: 'Q3', name: 'Al-Haram' }] }] }] }
        ]
      },
      {
        code: 'P4',
        name: 'Arménie',
        children: [
          { code: 'R1', name: 'Erevan', children: [{ code: 'PR1', name: 'Erevan', children: [{ code: 'SP1', name: 'Erevan Centre', children: [{ code: 'Q1', name: 'Kentron' }] }] }] }
        ]
      },
      {
        code: 'P5',
        name: 'Azerbaïdjan',
        children: [
          { code: 'R1', name: 'Bakou', children: [{ code: 'PR1', name: 'Bakou', children: [{ code: 'SP1', name: 'Bakou Centre', children: [{ code: 'Q1', name: 'Icherisheher' }] }] }] }
        ]
      },
      {
        code: 'P6',
        name: 'Bahreïn',
        children: [
          { code: 'R1', name: 'Manama', children: [{ code: 'PR1', name: 'Manama', children: [{ code: 'SP1', name: 'Manama Centre', children: [{ code: 'Q1', name: 'Manama City' }] }] }] }
        ]
      },
      {
        code: 'P7',
        name: 'Bangladesh',
        children: [
          { code: 'R1', name: 'Dacca', children: [{ code: 'PR1', name: 'Dacca', children: [{ code: 'SP1', name: 'Dacca Centre', children: [{ code: 'Q1', name: 'Dhanmondi' }, { code: 'Q2', name: 'Gulshan' }] }] }] }
        ]
      },
      {
        code: 'P8',
        name: 'Bhoutan',
        children: [
          { code: 'R1', name: 'Thimphou', children: [{ code: 'PR1', name: 'Thimphou', children: [{ code: 'SP1', name: 'Thimphou Centre', children: [{ code: 'Q1', name: 'Thimphou CBD' }] }] }] }
        ]
      },
      {
        code: 'P9',
        name: 'Birmanie',
        children: [
          { code: 'R1', name: 'Naypyidaw', children: [{ code: 'PR1', name: 'Naypyidaw', children: [{ code: 'SP1', name: 'Naypyidaw Centre', children: [{ code: 'Q1', name: 'Naypyidaw CBD' }] }] }] },
          { code: 'R2', name: 'Yangon', children: [{ code: 'PR2', name: 'Yangon', children: [{ code: 'SP2', name: 'Yangon Centre', children: [{ code: 'Q2', name: 'Chinatown' }] }] }] }
        ]
      },
      {
        code: 'P10',
        name: 'Brunei',
        children: [
          { code: 'R1', name: 'Brunei-Muara', children: [{ code: 'PR1', name: 'Bandar Seri Begawan', children: [{ code: 'SP1', name: 'BSB Centre', children: [{ code: 'Q1', name: 'Bandar Seri Begawan CBD' }] }] }] }
        ]
      },
      {
        code: 'P11',
        name: 'Cambodge',
        children: [
          { code: 'R1', name: 'Phnom Penh', children: [{ code: 'PR1', name: 'Phnom Penh', children: [{ code: 'SP1', name: 'Phnom Penh Centre', children: [{ code: 'Q1', name: 'Daun Penh' }, { code: 'Q2', name: 'Chamkarmon' }] }] }] }
        ]
      },
      {
        code: 'P12',
        name: 'Corée du Nord',
        children: [
          { code: 'R1', name: 'Pyongyang', children: [{ code: 'PR1', name: 'Pyongyang', children: [{ code: 'SP1', name: 'Pyongyang Centre', children: [{ code: 'Q1', name: 'Central District' }] }] }] }
        ]
      },
      {
        code: 'P13',
        name: 'Corée du Sud',
        children: [
          { code: 'R1', name: 'Séoul', children: [{ code: 'PR1', name: 'Séoul', children: [{ code: 'SP1', name: 'Séoul Centre', children: [{ code: 'Q1', name: 'Gangnam' }, { code: 'Q2', name: 'Jongno' }] }] }] },
          { code: 'R2', name: 'Gyeonggi', children: [{ code: 'PR2', name: 'Incheon', children: [{ code: 'SP2', name: 'Incheon Centre', children: [{ code: 'Q3', name: 'Jung-gu' }] }] }] }
        ]
      },
      {
        code: 'P14',
        name: 'Émirats arabes unis',
        children: [
          { code: 'R1', name: 'Abou Dhabi', children: [{ code: 'PR1', name: 'Abou Dhabi', children: [{ code: 'SP1', name: 'Abou Dhabi Centre', children: [{ code: 'Q1', name: 'Al Khalidiyah' }] }] }] },
          { code: 'R2', name: 'Dubaï', children: [{ code: 'PR2', name: 'Dubaï', children: [{ code: 'SP2', name: 'Dubaï Centre', children: [{ code: 'Q2', name: 'Deira' }, { code: 'Q3', name: 'Dubai Marina' }] }] }] }
        ]
      },
      {
        code: 'P15',
        name: 'Géorgie',
        children: [
          { code: 'R1', name: 'Tbilissi', children: [{ code: 'PR1', name: 'Tbilissi', children: [{ code: 'SP1', name: 'Tbilissi Centre', children: [{ code: 'Q1', name: 'Vake' }] }] }] }
        ]
      },
      {
        code: 'P16',
        name: 'Indonésie',
        children: [
          { code: 'R1', name: 'Jakarta', children: [{ code: 'PR1', name: 'Jakarta', children: [{ code: 'SP1', name: 'Jakarta Centre', children: [{ code: 'Q1', name: 'Menteng' }, { code: 'Q2', name: 'Kemang' }] }] }] },
          { code: 'R2', name: 'Bali', children: [{ code: 'PR2', name: 'Denpasar', children: [{ code: 'SP2', name: 'Denpasar Centre', children: [{ code: 'Q3', name: 'Kuta' }] }] }] }
        ]
      },
      {
        code: 'P17',
        name: 'Irak',
        children: [
          { code: 'R1', name: 'Bagdad', children: [{ code: 'PR1', name: 'Bagdad', children: [{ code: 'SP1', name: 'Bagdad Centre', children: [{ code: 'Q1', name: 'Al-Karrada' }, { code: 'Q2', name: 'Al-Mansour' }] }] }] }
        ]
      },
      {
        code: 'P18',
        name: 'Iran',
        children: [
          { code: 'R1', name: 'Téhéran', children: [{ code: 'PR1', name: 'Téhéran', children: [{ code: 'SP1', name: 'Téhéran Centre', children: [{ code: 'Q1', name: 'Elahiyeh' }, { code: 'Q2', name: 'Vanak' }] }] }] }
        ]
      },
      {
        code: 'P19',
        name: 'Israël',
        children: [
          { code: 'R1', name: 'Jérusalem', children: [{ code: 'PR1', name: 'Jérusalem', children: [{ code: 'SP1', name: 'Jérusalem Centre', children: [{ code: 'Q1', name: 'Vieille Ville' }] }] }] },
          { code: 'R2', name: 'Tel Aviv', children: [{ code: 'PR2', name: 'Tel Aviv', children: [{ code: 'SP2', name: 'Tel Aviv Centre', children: [{ code: 'Q2', name: 'Dizengoff' }] }] }] }
        ]
      },
      {
        code: 'P20',
        name: 'Japon',
        children: [
          { code: 'R1', name: 'Tokyo', children: [{ code: 'PR1', name: 'Tokyo', children: [{ code: 'SP1', name: 'Tokyo Centre', children: [{ code: 'Q1', name: 'Shinjuku' }, { code: 'Q2', name: 'Shibuya' }] }] }] },
          { code: 'R2', name: 'Osaka', children: [{ code: 'PR2', name: 'Osaka', children: [{ code: 'SP2', name: 'Osaka Centre', children: [{ code: 'Q3', name: 'Namba' }] }] }] }
        ]
      },
      {
        code: 'P21',
        name: 'Jordanie',
        children: [
          { code: 'R1', name: 'Amman', children: [{ code: 'PR1', name: 'Amman', children: [{ code: 'SP1', name: 'Amman Centre', children: [{ code: 'Q1', name: 'Abdoun' }, { code: 'Q2', name: 'Sweifieh' }] }] }] }
        ]
      },
      {
        code: 'P22',
        name: 'Kazakhstan',
        children: [
          { code: 'R1', name: 'Astana', children: [{ code: 'PR1', name: 'Astana', children: [{ code: 'SP1', name: 'Astana Centre', children: [{ code: 'Q1', name: 'Bayterek' }] }] }] },
          { code: 'R2', name: 'Almaty', children: [{ code: 'PR2', name: 'Almaty', children: [{ code: 'SP2', name: 'Almaty Centre', children: [{ code: 'Q2', name: 'Medeu' }] }] }] }
        ]
      },
      {
        code: 'P23',
        name: 'Kirghizistan',
        children: [
          { code: 'R1', name: 'Bichkek', children: [{ code: 'PR1', name: 'Bichkek', children: [{ code: 'SP1', name: 'Bichkek Centre', children: [{ code: 'Q1', name: 'Bichkek CBD' }] }] }] }
        ]
      },
      {
        code: 'P24',
        name: 'Koweït',
        children: [
          { code: 'R1', name: 'Koweït City', children: [{ code: 'PR1', name: 'Koweït City', children: [{ code: 'SP1', name: 'Koweït City Centre', children: [{ code: 'Q1', name: 'Sharq' }] }] }] }
        ]
      },
      {
        code: 'P25',
        name: 'Laos',
        children: [
          { code: 'R1', name: 'Vientiane', children: [{ code: 'PR1', name: 'Vientiane', children: [{ code: 'SP1', name: 'Vientiane Centre', children: [{ code: 'Q1', name: 'Chanthaboury' }] }] }] }
        ]
      },
      {
        code: 'P26',
        name: 'Liban',
        children: [
          { code: 'R1', name: 'Beyrouth', children: [{ code: 'PR1', name: 'Beyrouth', children: [{ code: 'SP1', name: 'Beyrouth Centre', children: [{ code: 'Q1', name: 'Hamra' }, { code: 'Q2', name: 'Achrafieh' }] }] }] }
        ]
      },
      {
        code: 'P27',
        name: 'Malaisie',
        children: [
          { code: 'R1', name: 'Kuala Lumpur', children: [{ code: 'PR1', name: 'Kuala Lumpur', children: [{ code: 'SP1', name: 'KL Centre', children: [{ code: 'Q1', name: 'KLCC' }, { code: 'Q2', name: 'Bukit Bintang' }] }] }] }
        ]
      },
      {
        code: 'P28',
        name: 'Maldives',
        children: [
          { code: 'R1', name: 'Malé', children: [{ code: 'PR1', name: 'Malé', children: [{ code: 'SP1', name: 'Malé Centre', children: [{ code: 'Q1', name: 'Malé City' }] }] }] }
        ]
      },
      {
        code: 'P29',
        name: 'Mongolie',
        children: [
          { code: 'R1', name: 'Oulan-Bator', children: [{ code: 'PR1', name: 'Oulan-Bator', children: [{ code: 'SP1', name: 'Oulan-Bator Centre', children: [{ code: 'Q1', name: 'Sukhbaatar' }] }] }] }
        ]
      },
      {
        code: 'P30',
        name: 'Népal',
        children: [
          { code: 'R1', name: 'Bagmati', children: [{ code: 'PR1', name: 'Katmandou', children: [{ code: 'SP1', name: 'Katmandou Centre', children: [{ code: 'Q1', name: 'Thamel' }, { code: 'Q2', name: 'Patan' }] }] }] }
        ]
      },
      {
        code: 'P31',
        name: 'Oman',
        children: [
          { code: 'R1', name: 'Mascate', children: [{ code: 'PR1', name: 'Mascate', children: [{ code: 'SP1', name: 'Mascate Centre', children: [{ code: 'Q1', name: 'Muttrah' }] }] }] }
        ]
      },
      {
        code: 'P32',
        name: 'Ouzbékistan',
        children: [
          { code: 'R1', name: 'Tachkent', children: [{ code: 'PR1', name: 'Tachkent', children: [{ code: 'SP1', name: 'Tachkent Centre', children: [{ code: 'Q1', name: 'Yunusabad' }] }] }] }
        ]
      },
      {
        code: 'P33',
        name: 'Pakistan',
        children: [
          { code: 'R1', name: 'Islamabad', children: [{ code: 'PR1', name: 'Islamabad', children: [{ code: 'SP1', name: 'Islamabad Centre', children: [{ code: 'Q1', name: 'F-6 Supermarket' }] }] }] },
          { code: 'R2', name: 'Sindh', children: [{ code: 'PR2', name: 'Karachi', children: [{ code: 'SP2', name: 'Karachi Centre', children: [{ code: 'Q2', name: 'Clifton' }, { code: 'Q3', name: 'Defence' }] }] }] }
        ]
      },
      {
        code: 'P34',
        name: 'Palestine',
        children: [
          { code: 'R1', name: 'Ramallah', children: [{ code: 'PR1', name: 'Ramallah', children: [{ code: 'SP1', name: 'Ramallah Centre', children: [{ code: 'Q1', name: 'Al-Bireh' }] }] }] },
          { code: 'R2', name: 'Gaza', children: [{ code: 'PR2', name: 'Gaza', children: [{ code: 'SP2', name: 'Gaza Centre', children: [{ code: 'Q2', name: 'Rimal' }] }] }] }
        ]
      },
      {
        code: 'P35',
        name: 'Philippines',
        children: [
          { code: 'R1', name: 'Région Capitale', children: [{ code: 'PR1', name: 'Manille', children: [{ code: 'SP1', name: 'Manille Centre', children: [{ code: 'Q1', name: 'Makati' }, { code: 'Q2', name: 'Quezon City' }] }] }] }
        ]
      },
      {
        code: 'P36',
        name: 'Qatar',
        children: [
          { code: 'R1', name: 'Doha', children: [{ code: 'PR1', name: 'Doha', children: [{ code: 'SP1', name: 'Doha Centre', children: [{ code: 'Q1', name: 'West Bay' }, { code: 'Q2', name: 'Al Sadd' }] }] }] }
        ]
      },
      {
        code: 'P37',
        name: 'Russie',
        children: [
          { code: 'R1', name: 'Moscou', children: [{ code: 'PR1', name: 'Moscou', children: [{ code: 'SP1', name: 'Moscou Centre', children: [{ code: 'Q1', name: 'Arbat' }, { code: 'Q2', name: 'Zamoskvorechye' }] }] }] },
          { code: 'R2', name: 'Saint-Pétersbourg', children: [{ code: 'PR2', name: 'Saint-Pétersbourg', children: [{ code: 'SP2', name: 'Saint-Pétersbourg Centre', children: [{ code: 'Q3', name: 'Nevsky Prospekt' }] }] }] }
        ]
      },
      {
        code: 'P38',
        name: 'Singapour',
        children: [
          { code: 'R1', name: 'Singapour', children: [{ code: 'PR1', name: 'Singapour', children: [{ code: 'SP1', name: 'Singapour Centre', children: [{ code: 'Q1', name: 'Orchard Road' }, { code: 'Q2', name: 'Marina Bay' }] }] }] }
        ]
      },
      {
        code: 'P39',
        name: 'Sri Lanka',
        children: [
          { code: 'R1', name: 'Colombo', children: [{ code: 'PR1', name: 'Colombo', children: [{ code: 'SP1', name: 'Colombo Centre', children: [{ code: 'Q1', name: 'Colombo 3' }, { code: 'Q2', name: 'Colombo 7' }] }] }] }
        ]
      },
      {
        code: 'P40',
        name: 'Syrie',
        children: [
          { code: 'R1', name: 'Damas', children: [{ code: 'PR1', name: 'Damas', children: [{ code: 'SP1', name: 'Damas Centre', children: [{ code: 'Q1', name: 'Vieille Ville' }, { code: 'Q2', name: 'Mazzeh' }] }] }] }
        ]
      },
      {
        code: 'P41',
        name: 'Tadjikistan',
        children: [
          { code: 'R1', name: 'Douchanbé', children: [{ code: 'PR1', name: 'Douchanbé', children: [{ code: 'SP1', name: 'Douchanbé Centre', children: [{ code: 'Q1', name: 'Douchanbé CBD' }] }] }] }
        ]
      },
      {
        code: 'P42',
        name: 'Thaïlande',
        children: [
          { code: 'R1', name: 'Bangkok', children: [{ code: 'PR1', name: 'Bangkok', children: [{ code: 'SP1', name: 'Bangkok Centre', children: [{ code: 'Q1', name: 'Sukhumvit' }, { code: 'Q2', name: 'Silom' }] }] }] }
        ]
      },
      {
        code: 'P43',
        name: 'Timor oriental',
        children: [
          { code: 'R1', name: 'Dili', children: [{ code: 'PR1', name: 'Dili', children: [{ code: 'SP1', name: 'Dili Centre', children: [{ code: 'Q1', name: 'Dili Ville' }] }] }] }
        ]
      },
      {
        code: 'P44',
        name: 'Turkménistan',
        children: [
          { code: 'R1', name: 'Achgabat', children: [{ code: 'PR1', name: 'Achgabat', children: [{ code: 'SP1', name: 'Achgabat Centre', children: [{ code: 'Q1', name: 'Achgabat CBD' }] }] }] }
        ]
      },
      {
        code: 'P45',
        name: 'Turquie',
        children: [
          { code: 'R1', name: 'Ankara', children: [{ code: 'PR1', name: 'Ankara', children: [{ code: 'SP1', name: 'Ankara Centre', children: [{ code: 'Q1', name: 'Kızılay' }] }] }] },
          { code: 'R2', name: 'Istanbul', children: [{ code: 'PR2', name: 'Istanbul', children: [{ code: 'SP2', name: 'Istanbul Centre', children: [{ code: 'Q2', name: 'Beyoğlu' }, { code: 'Q3', name: 'Beşiktaş' }] }] }] }
        ]
      },
      {
        code: 'P46',
        name: 'Viêt Nam',
        children: [
          { code: 'R1', name: 'Hanoï', children: [{ code: 'PR1', name: 'Hanoï', children: [{ code: 'SP1', name: 'Hanoï Centre', children: [{ code: 'Q1', name: 'Hoàn Kiếm' }, { code: 'Q2', name: 'Ba Đình' }] }] }] },
          { code: 'R2', name: 'Hô-Chi-Minh-Ville', children: [{ code: 'PR2', name: 'Hô-Chi-Minh-Ville', children: [{ code: 'SP2', name: 'HCMV Centre', children: [{ code: 'Q3', name: 'District 1' }, { code: 'Q4', name: 'District 3' }] }] }] }
        ]
      },
      {
        code: 'P47',
        name: 'Yémen',
        children: [
          { code: 'R1', name: 'Sanaa', children: [{ code: 'PR1', name: 'Sanaa', children: [{ code: 'SP1', name: 'Sanaa Centre', children: [{ code: 'Q1', name: 'Vieille Ville' }] }] }] }
        ]
      },
      // ── Territoires et régions spéciales ──
      {
        code: 'P48',
        name: 'Taïwan',
        children: [
          { code: 'R1', name: 'Taipei', children: [{ code: 'PR1', name: 'Taipei', children: [{ code: 'SP1', name: 'Taipei Centre', children: [{ code: 'Q1', name: 'Da\'an' }, { code: 'Q2', name: 'Xinyi' }] }] }] }
        ]
      },
      {
        code: 'P49',
        name: 'Hong Kong',
        children: [
          { code: 'R1', name: 'Hong Kong', children: [{ code: 'PR1', name: 'Hong Kong', children: [{ code: 'SP1', name: 'Hong Kong Centre', children: [{ code: 'Q1', name: 'Central' }, { code: 'Q2', name: 'Kowloon' }] }] }] }
        ]
      },
      {
        code: 'P50',
        name: 'Macao',
        children: [
          { code: 'R1', name: 'Macao', children: [{ code: 'PR1', name: 'Macao', children: [{ code: 'SP1', name: 'Macao Centre', children: [{ code: 'Q1', name: 'Péninsule de Macao' }] }] }] }
        ]
      },
      {
        code: 'P51',
        name: 'Kurdistan',
        children: [
          { code: 'R1', name: 'Erbil', children: [{ code: 'PR1', name: 'Erbil', children: [{ code: 'SP1', name: 'Erbil Centre', children: [{ code: 'Q1', name: 'Citadelle d\'Erbil' }] }] }] }
        ]
      }
    ]
  },
  // EUROPE
  {
    code: 'C3',
    name: 'Europe',
    children: [
      {
        code: 'P1',
        name: 'France',
        children: [
          {
            code: 'R1',
            name: 'Île-de-France',
            children: [
              {
                code: 'PR1',
                name: 'Paris',
                children: [
                  {
                    code: 'SP1',
                    name: 'Paris Centre',
                    children: [
                      { code: 'Q1', name: '1er Arrondissement' },
                      { code: 'Q2', name: '2e Arrondissement' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        code: 'P2',
        name: 'Allemagne',
        children: [
          {
            code: 'R1',
            name: 'Berlin',
            children: [
              {
                code: 'PR1',
                name: 'Berlin',
                children: [
                  {
                    code: 'SP1',
                    name: 'Berlin Centre',
                    children: [
                      { code: 'Q1', name: 'Mitte' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  // AMÉRIQUE
  {
    code: 'C4',
    name: 'Amérique',
    children: [
      // ── Amérique du Nord ──
      {
        code: 'P1',
        name: 'États-Unis',
        children: [
          { code: 'R1', name: 'New York', children: [{ code: 'PR1', name: 'New York', children: [{ code: 'SP1', name: 'Manhattan', children: [{ code: 'Q1', name: 'Downtown' }, { code: 'Q2', name: 'Midtown' }] }] }] },
          { code: 'R2', name: 'Californie', children: [{ code: 'PR2', name: 'Los Angeles', children: [{ code: 'SP2', name: 'LA Centre', children: [{ code: 'Q3', name: 'Hollywood' }, { code: 'Q4', name: 'Downtown LA' }] }] }] },
          { code: 'R3', name: 'District of Columbia', children: [{ code: 'PR3', name: 'Washington DC', children: [{ code: 'SP3', name: 'DC Centre', children: [{ code: 'Q5', name: 'Capitol Hill' }] }] }] }
        ]
      },
      {
        code: 'P2',
        name: 'Canada',
        children: [
          { code: 'R1', name: 'Ontario', children: [{ code: 'PR1', name: 'Toronto', children: [{ code: 'SP1', name: 'Toronto Centre', children: [{ code: 'Q1', name: 'Downtown Toronto' }] }] }] },
          { code: 'R2', name: 'Québec', children: [{ code: 'PR2', name: 'Montréal', children: [{ code: 'SP2', name: 'Montréal Centre', children: [{ code: 'Q2', name: 'Plateau-Mont-Royal' }] }] }] }
        ]
      },
      {
        code: 'P3',
        name: 'Mexique',
        children: [
          { code: 'R1', name: 'Mexico', children: [{ code: 'PR1', name: 'Mexico City', children: [{ code: 'SP1', name: 'Centro Histórico', children: [{ code: 'Q1', name: 'Zócalo' }, { code: 'Q2', name: 'Polanco' }] }] }] },
          { code: 'R2', name: 'Jalisco', children: [{ code: 'PR2', name: 'Guadalajara', children: [{ code: 'SP2', name: 'Guadalajara Centre', children: [{ code: 'Q3', name: 'Centro' }] }] }] }
        ]
      },
      {
        code: 'P4',
        name: 'Bermudes',
        children: [
          { code: 'R1', name: 'Hamilton', children: [{ code: 'PR1', name: 'Hamilton', children: [{ code: 'SP1', name: 'Hamilton Centre', children: [{ code: 'Q1', name: 'Hamilton CBD' }] }] }] }
        ]
      },
      {
        code: 'P5',
        name: 'Groenland',
        children: [
          { code: 'R1', name: 'Sermersooq', children: [{ code: 'PR1', name: 'Nuuk', children: [{ code: 'SP1', name: 'Nuuk Centre', children: [{ code: 'Q1', name: 'Nuuk Ville' }] }] }] }
        ]
      },
      {
        code: 'P6',
        name: 'Saint-Pierre-et-Miquelon',
        children: [
          { code: 'R1', name: 'Saint-Pierre', children: [{ code: 'PR1', name: 'Saint-Pierre', children: [{ code: 'SP1', name: 'Saint-Pierre Centre', children: [{ code: 'Q1', name: 'Saint-Pierre Ville' }] }] }] }
        ]
      },
      // ── Amérique centrale ──
      {
        code: 'P7',
        name: 'Belize',
        children: [
          { code: 'R1', name: 'Belize District', children: [{ code: 'PR1', name: 'Belize City', children: [{ code: 'SP1', name: 'Belize City Centre', children: [{ code: 'Q1', name: 'Fort George' }] }] }] }
        ]
      },
      {
        code: 'P8',
        name: 'Costa Rica',
        children: [
          { code: 'R1', name: 'San José', children: [{ code: 'PR1', name: 'San José', children: [{ code: 'SP1', name: 'San José Centre', children: [{ code: 'Q1', name: 'Carmén' }, { code: 'Q2', name: 'Merced' }] }] }] }
        ]
      },
      {
        code: 'P9',
        name: 'Guatemala',
        children: [
          { code: 'R1', name: 'Guatemala', children: [{ code: 'PR1', name: 'Guatemala City', children: [{ code: 'SP1', name: 'Guatemala City Centre', children: [{ code: 'Q1', name: 'Zone 1' }, { code: 'Q2', name: 'Zone 10' }] }] }] }
        ]
      },
      {
        code: 'P10',
        name: 'Honduras',
        children: [
          { code: 'R1', name: 'Francisco Morazán', children: [{ code: 'PR1', name: 'Tegucigalpa', children: [{ code: 'SP1', name: 'Tegucigalpa Centre', children: [{ code: 'Q1', name: 'Centro' }] }] }] }
        ]
      },
      {
        code: 'P11',
        name: 'Nicaragua',
        children: [
          { code: 'R1', name: 'Managua', children: [{ code: 'PR1', name: 'Managua', children: [{ code: 'SP1', name: 'Managua Centre', children: [{ code: 'Q1', name: 'Bolonia' }] }] }] }
        ]
      },
      {
        code: 'P12',
        name: 'Panama',
        children: [
          { code: 'R1', name: 'Panama', children: [{ code: 'PR1', name: 'Panama City', children: [{ code: 'SP1', name: 'Panama City Centre', children: [{ code: 'Q1', name: 'Casco Viejo' }, { code: 'Q2', name: 'Miraflores' }] }] }] }
        ]
      },
      {
        code: 'P13',
        name: 'Salvador',
        children: [
          { code: 'R1', name: 'San Salvador', children: [{ code: 'PR1', name: 'San Salvador', children: [{ code: 'SP1', name: 'San Salvador Centre', children: [{ code: 'Q1', name: 'Centro Histórico' }] }] }] }
        ]
      },
      // ── Amérique du Sud ──
      {
        code: 'P14',
        name: 'Argentine',
        children: [
          { code: 'R1', name: 'Buenos Aires', children: [{ code: 'PR1', name: 'Buenos Aires', children: [{ code: 'SP1', name: 'Buenos Aires Centre', children: [{ code: 'Q1', name: 'San Telmo' }, { code: 'Q2', name: 'Palermo' }] }] }] },
          { code: 'R2', name: 'Córdoba', children: [{ code: 'PR2', name: 'Córdoba', children: [{ code: 'SP2', name: 'Córdoba Centre', children: [{ code: 'Q3', name: 'Nueva Córdoba' }] }] }] }
        ]
      },
      {
        code: 'P15',
        name: 'Bolivie',
        children: [
          { code: 'R1', name: 'La Paz', children: [{ code: 'PR1', name: 'La Paz', children: [{ code: 'SP1', name: 'La Paz Centre', children: [{ code: 'Q1', name: 'Sopocachi' }] }] }] }
        ]
      },
      {
        code: 'P16',
        name: 'Brésil',
        children: [
          { code: 'R1', name: 'São Paulo', children: [{ code: 'PR1', name: 'São Paulo', children: [{ code: 'SP1', name: 'São Paulo Centre', children: [{ code: 'Q1', name: 'Centro' }, { code: 'Q2', name: 'Paulista' }] }] }] },
          { code: 'R2', name: 'Rio de Janeiro', children: [{ code: 'PR2', name: 'Rio de Janeiro', children: [{ code: 'SP2', name: 'Rio Centre', children: [{ code: 'Q3', name: 'Copacabana' }, { code: 'Q4', name: 'Ipanema' }] }] }] },
          { code: 'R3', name: 'Brasília', children: [{ code: 'PR3', name: 'Brasília', children: [{ code: 'SP3', name: 'Brasília Centre', children: [{ code: 'Q5', name: 'Asa Sul' }] }] }] }
        ]
      },
      {
        code: 'P17',
        name: 'Chili',
        children: [
          { code: 'R1', name: 'Région Métropolitaine', children: [{ code: 'PR1', name: 'Santiago', children: [{ code: 'SP1', name: 'Santiago Centre', children: [{ code: 'Q1', name: 'Providencia' }, { code: 'Q2', name: 'Las Condes' }] }] }] }
        ]
      },
      {
        code: 'P18',
        name: 'Colombie',
        children: [
          { code: 'R1', name: 'Cundinamarca', children: [{ code: 'PR1', name: 'Bogotá', children: [{ code: 'SP1', name: 'Bogotá Centre', children: [{ code: 'Q1', name: 'La Candelaria' }, { code: 'Q2', name: 'Chapinero' }] }] }] },
          { code: 'R2', name: 'Antioquia', children: [{ code: 'PR2', name: 'Medellín', children: [{ code: 'SP2', name: 'Medellín Centre', children: [{ code: 'Q3', name: 'El Poblado' }] }] }] }
        ]
      },
      {
        code: 'P19',
        name: 'Équateur',
        children: [
          { code: 'R1', name: 'Pichincha', children: [{ code: 'PR1', name: 'Quito', children: [{ code: 'SP1', name: 'Quito Centre', children: [{ code: 'Q1', name: 'Centro Histórico' }] }] }] }
        ]
      },
      {
        code: 'P20',
        name: 'Guyana',
        children: [
          { code: 'R1', name: 'Démerara-Mahaica', children: [{ code: 'PR1', name: 'Georgetown', children: [{ code: 'SP1', name: 'Georgetown Centre', children: [{ code: 'Q1', name: 'Queenstown' }] }] }] }
        ]
      },
      {
        code: 'P21',
        name: 'Guyane',
        children: [
          { code: 'R1', name: 'Cayenne', children: [{ code: 'PR1', name: 'Cayenne', children: [{ code: 'SP1', name: 'Cayenne Centre', children: [{ code: 'Q1', name: 'Cayenne Ville' }] }] }] }
        ]
      },
      {
        code: 'P22',
        name: 'Paraguay',
        children: [
          { code: 'R1', name: 'Asunción', children: [{ code: 'PR1', name: 'Asunción', children: [{ code: 'SP1', name: 'Asunción Centre', children: [{ code: 'Q1', name: 'Centro' }] }] }] }
        ]
      },
      {
        code: 'P23',
        name: 'Pérou',
        children: [
          { code: 'R1', name: 'Lima', children: [{ code: 'PR1', name: 'Lima', children: [{ code: 'SP1', name: 'Lima Centre', children: [{ code: 'Q1', name: 'Miraflores' }, { code: 'Q2', name: 'San Isidro' }] }] }] }
        ]
      },
      {
        code: 'P24',
        name: 'Suriname',
        children: [
          { code: 'R1', name: 'Paramaribo', children: [{ code: 'PR1', name: 'Paramaribo', children: [{ code: 'SP1', name: 'Paramaribo Centre', children: [{ code: 'Q1', name: 'Paramaribo Ville' }] }] }] }
        ]
      },
      {
        code: 'P25',
        name: 'Uruguay',
        children: [
          { code: 'R1', name: 'Montevideo', children: [{ code: 'PR1', name: 'Montevideo', children: [{ code: 'SP1', name: 'Montevideo Centre', children: [{ code: 'Q1', name: 'Ciudad Vieja' }] }] }] }
        ]
      },
      {
        code: 'P26',
        name: 'Venezuela',
        children: [
          { code: 'R1', name: 'Distrito Capital', children: [{ code: 'PR1', name: 'Caracas', children: [{ code: 'SP1', name: 'Caracas Centre', children: [{ code: 'Q1', name: 'Altamira' }, { code: 'Q2', name: 'Las Mercedes' }] }] }] }
        ]
      },
      // ── Caraïbes ──
      {
        code: 'P27',
        name: 'Anguilla',
        children: [
          { code: 'R1', name: 'The Valley', children: [{ code: 'PR1', name: 'The Valley', children: [{ code: 'SP1', name: 'The Valley Centre', children: [{ code: 'Q1', name: 'The Valley Ville' }] }] }] }
        ]
      },
      {
        code: 'P28',
        name: 'Antigua-et-Barbuda',
        children: [
          { code: 'R1', name: 'Saint John', children: [{ code: 'PR1', name: 'Saint John\'s', children: [{ code: 'SP1', name: 'Saint John\'s Centre', children: [{ code: 'Q1', name: 'Saint John\'s Ville' }] }] }] }
        ]
      },
      {
        code: 'P29',
        name: 'Aruba',
        children: [
          { code: 'R1', name: 'Oranjestad', children: [{ code: 'PR1', name: 'Oranjestad', children: [{ code: 'SP1', name: 'Oranjestad Centre', children: [{ code: 'Q1', name: 'Downtown' }] }] }] }
        ]
      },
      {
        code: 'P30',
        name: 'Bahamas',
        children: [
          { code: 'R1', name: 'New Providence', children: [{ code: 'PR1', name: 'Nassau', children: [{ code: 'SP1', name: 'Nassau Centre', children: [{ code: 'Q1', name: 'Downtown Nassau' }] }] }] }
        ]
      },
      {
        code: 'P31',
        name: 'Barbade',
        children: [
          { code: 'R1', name: 'Saint Michael', children: [{ code: 'PR1', name: 'Bridgetown', children: [{ code: 'SP1', name: 'Bridgetown Centre', children: [{ code: 'Q1', name: 'Bridgetown CBD' }] }] }] }
        ]
      },
      {
        code: 'P32',
        name: 'Bonaire',
        children: [
          { code: 'R1', name: 'Kralendijk', children: [{ code: 'PR1', name: 'Kralendijk', children: [{ code: 'SP1', name: 'Kralendijk Centre', children: [{ code: 'Q1', name: 'Kralendijk Ville' }] }] }] }
        ]
      },
      {
        code: 'P33',
        name: 'Îles Caïmans',
        children: [
          { code: 'R1', name: 'George Town', children: [{ code: 'PR1', name: 'George Town', children: [{ code: 'SP1', name: 'George Town Centre', children: [{ code: 'Q1', name: 'Seven Mile Beach' }] }] }] }
        ]
      },
      {
        code: 'P34',
        name: 'Cuba',
        children: [
          { code: 'R1', name: 'La Havane', children: [{ code: 'PR1', name: 'La Havane', children: [{ code: 'SP1', name: 'La Havane Centre', children: [{ code: 'Q1', name: 'Habana Vieja' }, { code: 'Q2', name: 'Vedado' }] }] }] }
        ]
      },
      {
        code: 'P35',
        name: 'Curaçao',
        children: [
          { code: 'R1', name: 'Willemstad', children: [{ code: 'PR1', name: 'Willemstad', children: [{ code: 'SP1', name: 'Willemstad Centre', children: [{ code: 'Q1', name: 'Punda' }] }] }] }
        ]
      },
      {
        code: 'P36',
        name: 'Dominique',
        children: [
          { code: 'R1', name: 'Saint George', children: [{ code: 'PR1', name: 'Roseau', children: [{ code: 'SP1', name: 'Roseau Centre', children: [{ code: 'Q1', name: 'Roseau Ville' }] }] }] }
        ]
      },
      {
        code: 'P37',
        name: 'Grenade',
        children: [
          { code: 'R1', name: 'Saint George', children: [{ code: 'PR1', name: 'Saint George\'s', children: [{ code: 'SP1', name: 'Saint George\'s Centre', children: [{ code: 'Q1', name: 'Saint George\'s Ville' }] }] }] }
        ]
      },
      {
        code: 'P38',
        name: 'Guadeloupe',
        children: [
          { code: 'R1', name: 'Basse-Terre', children: [{ code: 'PR1', name: 'Basse-Terre', children: [{ code: 'SP1', name: 'Basse-Terre Centre', children: [{ code: 'Q1', name: 'Basse-Terre Ville' }] }] }] },
          { code: 'R2', name: 'Pointe-à-Pitre', children: [{ code: 'PR2', name: 'Pointe-à-Pitre', children: [{ code: 'SP2', name: 'Pointe-à-Pitre Centre', children: [{ code: 'Q2', name: 'Centre Ville' }] }] }] }
        ]
      },
      {
        code: 'P39',
        name: 'Haïti',
        children: [
          { code: 'R1', name: 'Ouest', children: [{ code: 'PR1', name: 'Port-au-Prince', children: [{ code: 'SP1', name: 'Port-au-Prince Centre', children: [{ code: 'Q1', name: 'Pétion-Ville' }, { code: 'Q2', name: 'Delmas' }] }] }] }
        ]
      },
      {
        code: 'P40',
        name: 'Jamaïque',
        children: [
          { code: 'R1', name: 'Kingston', children: [{ code: 'PR1', name: 'Kingston', children: [{ code: 'SP1', name: 'Kingston Centre', children: [{ code: 'Q1', name: 'New Kingston' }] }] }] }
        ]
      },
      {
        code: 'P41',
        name: 'Martinique',
        children: [
          { code: 'R1', name: 'Fort-de-France', children: [{ code: 'PR1', name: 'Fort-de-France', children: [{ code: 'SP1', name: 'Fort-de-France Centre', children: [{ code: 'Q1', name: 'Centre Ville' }, { code: 'Q2', name: 'Sainte-Thérèse' }] }] }] }
        ]
      },
      {
        code: 'P42',
        name: 'Montserrat',
        children: [
          { code: 'R1', name: 'Saint Peter', children: [{ code: 'PR1', name: 'Brades', children: [{ code: 'SP1', name: 'Brades Centre', children: [{ code: 'Q1', name: 'Brades Ville' }] }] }] }
        ]
      },
      {
        code: 'P43',
        name: 'Porto Rico',
        children: [
          { code: 'R1', name: 'San Juan', children: [{ code: 'PR1', name: 'San Juan', children: [{ code: 'SP1', name: 'San Juan Centre', children: [{ code: 'Q1', name: 'Old San Juan' }, { code: 'Q2', name: 'Condado' }] }] }] }
        ]
      },
      {
        code: 'P44',
        name: 'République dominicaine',
        children: [
          { code: 'R1', name: 'Distrito Nacional', children: [{ code: 'PR1', name: 'Saint-Domingue', children: [{ code: 'SP1', name: 'Saint-Domingue Centre', children: [{ code: 'Q1', name: 'Zona Colonial' }, { code: 'Q2', name: 'Piantini' }] }] }] }
        ]
      },
      {
        code: 'P45',
        name: 'Saint-Barthélemy',
        children: [
          { code: 'R1', name: 'Gustavia', children: [{ code: 'PR1', name: 'Gustavia', children: [{ code: 'SP1', name: 'Gustavia Centre', children: [{ code: 'Q1', name: 'Gustavia Ville' }] }] }] }
        ]
      },
      {
        code: 'P46',
        name: 'Saint-Christophe-et-Niévès',
        children: [
          { code: 'R1', name: 'Saint Kitts', children: [{ code: 'PR1', name: 'Basseterre', children: [{ code: 'SP1', name: 'Basseterre Centre', children: [{ code: 'Q1', name: 'Downtown' }] }] }] }
        ]
      },
      {
        code: 'P47',
        name: 'Sainte-Lucie',
        children: [
          { code: 'R1', name: 'Castries', children: [{ code: 'PR1', name: 'Castries', children: [{ code: 'SP1', name: 'Castries Centre', children: [{ code: 'Q1', name: 'Castries CBD' }] }] }] }
        ]
      },
      {
        code: 'P48',
        name: 'Saint-Martin',
        children: [
          { code: 'R1', name: 'Marigot', children: [{ code: 'PR1', name: 'Marigot', children: [{ code: 'SP1', name: 'Marigot Centre', children: [{ code: 'Q1', name: 'Marigot Ville' }] }] }] }
        ]
      },
      {
        code: 'P49',
        name: 'Sint Maarten',
        children: [
          { code: 'R1', name: 'Philipsburg', children: [{ code: 'PR1', name: 'Philipsburg', children: [{ code: 'SP1', name: 'Philipsburg Centre', children: [{ code: 'Q1', name: 'Front Street' }] }] }] }
        ]
      },
      {
        code: 'P50',
        name: 'Saint-Vincent-et-les-Grenadines',
        children: [
          { code: 'R1', name: 'Saint George', children: [{ code: 'PR1', name: 'Kingstown', children: [{ code: 'SP1', name: 'Kingstown Centre', children: [{ code: 'Q1', name: 'Kingstown Ville' }] }] }] }
        ]
      },
      {
        code: 'P51',
        name: 'Trinité-et-Tobago',
        children: [
          { code: 'R1', name: 'Port of Spain', children: [{ code: 'PR1', name: 'Port of Spain', children: [{ code: 'SP1', name: 'Port of Spain Centre', children: [{ code: 'Q1', name: 'Woodbrook' }] }] }] }
        ]
      },
      {
        code: 'P52',
        name: 'Îles Turques-et-Caïques',
        children: [
          { code: 'R1', name: 'Providenciales', children: [{ code: 'PR1', name: 'Cockburn Town', children: [{ code: 'SP1', name: 'Cockburn Town Centre', children: [{ code: 'Q1', name: 'Grace Bay' }] }] }] }
        ]
      },
      {
        code: 'P53',
        name: 'Îles Vierges britanniques',
        children: [
          { code: 'R1', name: 'Road Town', children: [{ code: 'PR1', name: 'Road Town', children: [{ code: 'SP1', name: 'Road Town Centre', children: [{ code: 'Q1', name: 'Road Town Ville' }] }] }] }
        ]
      },
      {
        code: 'P54',
        name: 'Îles Vierges des États-Unis',
        children: [
          { code: 'R1', name: 'Charlotte Amalie', children: [{ code: 'PR1', name: 'Charlotte Amalie', children: [{ code: 'SP1', name: 'Charlotte Amalie Centre', children: [{ code: 'Q1', name: 'Downtown' }] }] }] }
        ]
      }
    ]
  },
  // OCÉANIE
  {
    code: 'C5',
    name: 'Océanie',
    children: [
      {
        code: 'P1',
        name: 'Australie',
        children: [
          {
            code: 'R1',
            name: 'Nouvelle-Galles du Sud',
            children: [
              {
                code: 'PR1',
                name: 'Sydney',
                children: [
                  {
                    code: 'SP1',
                    name: 'Sydney Centre',
                    children: [
                      { code: 'Q1', name: 'CBD' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

// Fonctions utilitaires pour accéder aux données
export function getContinents(): GeographicLocation[] {
  return WORLD_GEOGRAPHY;
}

export function getCountriesByContinent(continentCode: string): GeographicLocation[] {
  const continent = WORLD_GEOGRAPHY.find(c => c.code === continentCode);
  return continent?.children || [];
}

/** Liste de tous les pays (tous continents). Pour formulaire simplifié Pays → Sous-préfecture → Quartier. */
export function getAllCountries(): (GeographicLocation & { continentCode: string })[] {
  const list: (GeographicLocation & { continentCode: string })[] = [];
  for (const continent of WORLD_GEOGRAPHY) {
    for (const country of continent.children || []) {
      list.push({ ...country, continentCode: continent.code });
    }
  }
  return list;
}

/** Déduit le code continent et le code région (1ère région du pays) à partir du code pays. Pour la génération du NumeroH avec saisie libre sous-préf./quartier. */
export function getContinentAndRegionByCountry(countryCode: string): { continentCode: string; regionCode: string } {
  for (const continent of WORLD_GEOGRAPHY) {
    const country = continent.children?.find((c) => c.code === countryCode);
    if (country) {
      const firstRegion = country.children?.[0];
      return {
        continentCode: continent.code,
        regionCode: firstRegion?.code || 'R1'
      };
    }
  }
  return { continentCode: 'C1', regionCode: 'R1' };
}

/** Toutes les sous-préfectures d’un pays. Pour formulaire simplifié après choix du pays. */
export function getSousPrefecturesByCountry(countryCode: string): GeographicLocation[] {
  const country = WORLD_GEOGRAPHY.flatMap(c => c.children || []).find(p => p.code === countryCode);
  if (!country) return [];
  const list: GeographicLocation[] = [];
  for (const region of country.children || []) {
    for (const prefecture of region.children || []) {
      for (const sp of prefecture.children || []) {
        list.push(sp);
      }
    }
  }
  return list;
}

export function getRegionsByCountry(countryCode: string, continentCode?: string): GeographicLocation[] {
  // Si continentCode est fourni, chercher uniquement dans ce continent
  if (continentCode) {
    const continent = WORLD_GEOGRAPHY.find(c => c.code === continentCode);
    if (continent) {
      const country = continent.children?.find(c => c.code === countryCode);
      if (country) {
        return country.children || [];
      }
    }
    return [];
  }
  
  // Sinon, chercher dans tous les continents (comportement par défaut)
  for (const continent of WORLD_GEOGRAPHY) {
    const country = continent.children?.find(c => c.code === countryCode);
    if (country) {
      return country.children || [];
    }
  }
  return [];
}

export function getPrefecturesByRegion(regionCode: string, countryCode?: string, continentCode?: string): GeographicLocation[] {
  // Si continentCode et countryCode sont fournis, chercher uniquement dans ce contexte
  if (continentCode && countryCode) {
    const continent = WORLD_GEOGRAPHY.find(c => c.code === continentCode);
    if (continent) {
      const country = continent.children?.find(c => c.code === countryCode);
      if (country) {
        const region = country.children?.find(r => r.code === regionCode);
        if (region) {
          return region.children || [];
        }
      }
    }
    return [];
  }
  
  // Sinon, chercher dans tous les continents (comportement par défaut)
  for (const continent of WORLD_GEOGRAPHY) {
    for (const country of continent.children || []) {
      const region = country.children?.find(r => r.code === regionCode);
      if (region) {
        return region.children || [];
      }
    }
  }
  return [];
}

export function getSousPrefecturesByPrefecture(prefectureCode: string, regionCode?: string, countryCode?: string, continentCode?: string): GeographicLocation[] {
  // Si tous les codes sont fournis, chercher uniquement dans ce contexte
  if (continentCode && countryCode && regionCode) {
    const continent = WORLD_GEOGRAPHY.find(c => c.code === continentCode);
    if (continent) {
      const country = continent.children?.find(c => c.code === countryCode);
      if (country) {
        const region = country.children?.find(r => r.code === regionCode);
        if (region) {
          const prefecture = region.children?.find(p => p.code === prefectureCode);
          if (prefecture) {
            return prefecture.children || [];
          }
        }
      }
    }
    return [];
  }
  
  // Sinon, chercher dans tous les continents (comportement par défaut)
  for (const continent of WORLD_GEOGRAPHY) {
    for (const country of continent.children || []) {
      for (const region of country.children || []) {
        const prefecture = region.children?.find(p => p.code === prefectureCode);
        if (prefecture) {
          return prefecture.children || [];
        }
      }
    }
  }
  return [];
}

export function getQuartiersBySousPrefecture(sousPrefectureCode: string, prefectureCode?: string, regionCode?: string, countryCode?: string, continentCode?: string): GeographicLocation[] {
  // Si tous les codes sont fournis, chercher uniquement dans ce contexte
  if (continentCode && countryCode && regionCode && prefectureCode) {
    const continent = WORLD_GEOGRAPHY.find(c => c.code === continentCode);
    if (continent) {
      const country = continent.children?.find(c => c.code === countryCode);
      if (country) {
        const region = country.children?.find(r => r.code === regionCode);
        if (region) {
          const prefecture = region.children?.find(p => p.code === prefectureCode);
          if (prefecture) {
            const sousPrefecture = prefecture.children?.find(sp => sp.code === sousPrefectureCode);
            if (sousPrefecture) {
              return sousPrefecture.children || [];
            }
          }
        }
      }
    }
    return [];
  }
  
  // Sinon, chercher dans tous les continents (comportement par défaut)
  for (const continent of WORLD_GEOGRAPHY) {
    for (const country of continent.children || []) {
      for (const region of country.children || []) {
        for (const prefecture of region.children || []) {
          const sousPrefecture = prefecture.children?.find(sp => sp.code === sousPrefectureCode);
          if (sousPrefecture) {
            return sousPrefecture.children || [];
          }
        }
      }
    }
  }
  return [];
}

// Fonction pour trouver un élément par son code dans toute la hiérarchie
export function findLocationByCode(code: string): GeographicLocation | null {
  for (const continent of WORLD_GEOGRAPHY) {
    if (continent.code === code) return continent;
    for (const country of continent.children || []) {
      if (country.code === code) return country;
      for (const region of country.children || []) {
        if (region.code === code) return region;
        for (const prefecture of region.children || []) {
          if (prefecture.code === code) return prefecture;
          for (const sousPrefecture of prefecture.children || []) {
            if (sousPrefecture.code === code) return sousPrefecture;
            for (const quartier of sousPrefecture.children || []) {
              if (quartier.code === code) return quartier;
            }
          }
        }
      }
    }
  }
  return null;
}

/** Retourne le chemin hiérarchique (continent → … → lieu) pour un code. */
function findPathToCode(nodes: GeographicLocation[], code: string, path: GeographicLocation[]): GeographicLocation[] | null {
  for (const node of nodes) {
    const newPath = [...path, node];
    if (node.code === code) return newPath;
    if (node.children?.length) {
      const found = findPathToCode(node.children, code, newPath);
      if (found) return found;
    }
  }
  return null;
}

export function getLocationPath(code: string): GeographicLocation[] | null {
  if (!code) return null;
  return findPathToCode(WORLD_GEOGRAPHY, code, []);
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Continent',
  1: 'Pays',
  2: 'Région',
  3: 'Préfecture',
  4: 'Sous-préfecture',
  5: 'Quartier'
};

/** Nom court = nom du lieu (ex. Kaloum). */
export function getLocationShortName(code: string): string {
  const loc = findLocationByCode(code);
  return loc ? loc.name : code;
}

/** Chemin des noms uniquement : "Afrique · Guinée · Conakry · Conakry · Conakry Centre · Kaloum". */
export function getLocationPathNames(code: string): string {
  const path = getLocationPath(code);
  if (!path?.length) return code;
  return path.map((n) => n.name).join(' · ');
}

/** Nom complet pour affichage groupe (avec libellés) : "Quartier Kaloum · Sous-préfecture Conakry Centre · …". */
export function getLocationDisplayName(code: string): string {
  const path = getLocationPath(code);
  if (!path?.length) return code;
  const labels = path.map((n, i) => (LEVEL_LABELS[i] ? `${LEVEL_LABELS[i]} ` : '') + n.name);
  return labels.join(' · ');
}

/** Même que getLocationDisplayName mais version courte (noms seuls) pour liste. */
export function getLocationDisplayShort(code: string): string {
  return getLocationPathNames(code);
}

/** Titre suggéré pour un groupe : "Quartier Kaloum" ou "Sous-préfecture Conakry Centre". */
export function getLocationGroupTitle(code: string): string {
  const path = getLocationPath(code);
  if (!path?.length) return code;
  const last = path[path.length - 1];
  const levelLabel = LEVEL_LABELS[path.length - 1];
  return levelLabel ? `${levelLabel} ${last.name}` : last.name;
}

/** Liste plate de tous les lieux (quartiers, sous-préfectures, préfectures…) avec code pour sélection. */
export function getAllLocationsForGroups(): { code: string; name: string; title: string }[] {
  const out: { code: string; name: string; title: string }[] = [];
  for (const continent of WORLD_GEOGRAPHY) {
    for (const country of continent.children || []) {
      for (const region of country.children || []) {
        for (const prefecture of region.children || []) {
          for (const sousPrefecture of prefecture.children || []) {
            for (const quartier of sousPrefecture.children || []) {
              out.push({
                code: quartier.code,
                name: quartier.name,
                title: getLocationGroupTitle(quartier.code)
              });
            }
            out.push({
              code: sousPrefecture.code,
              name: sousPrefecture.name,
              title: getLocationGroupTitle(sousPrefecture.code)
            });
          }
          out.push({
            code: prefecture.code,
            name: prefecture.name,
            title: getLocationGroupTitle(prefecture.code)
          });
        }
        out.push({
          code: region.code,
          name: region.name,
          title: getLocationGroupTitle(region.code)
        });
      }
    }
  }
  return out;
}

// Fonction pour obtenir le code complet d'une localisation
export function getLocationCode(path: {
  continent?: string;
  country?: string;
  region?: string;
  prefecture?: string;
  sousPrefecture?: string;
  quartier?: string;
}): string {
  let code = '';
  if (path.continent) code += path.continent;
  if (path.country) code += path.country;
  if (path.region) code += path.region;
  if (path.prefecture) code += path.prefecture;
  if (path.sousPrefecture) code += path.sousPrefecture;
  if (path.quartier) code += path.quartier;
  return code;
}

// Fonction pour compter les préfectures dans une région
export function countPrefecturesInRegion(regionCode: string, countryCode?: string, continentCode?: string): number {
  const prefectures = getPrefecturesByRegion(regionCode, countryCode, continentCode);
  return prefectures.length;
}

// Fonction pour compter les sous-préfectures dans une préfecture
export function countSousPrefecturesInPrefecture(prefectureCode: string, regionCode?: string, countryCode?: string, continentCode?: string): number {
  const sousPrefectures = getSousPrefecturesByPrefecture(prefectureCode, regionCode, countryCode, continentCode);
  return sousPrefectures.length;
}

// Fonction pour compter les quartiers dans une sous-préfecture
export function countQuartiersInSousPrefecture(sousPrefectureCode: string, prefectureCode?: string, regionCode?: string, countryCode?: string, continentCode?: string): number {
  const quartiers = getQuartiersBySousPrefecture(sousPrefectureCode, prefectureCode, regionCode, countryCode, continentCode);
  return quartiers.length;
}
