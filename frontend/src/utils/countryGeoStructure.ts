// Structure géographique par pays
// Chaque pays a ses propres labels pour les 4 niveaux administratifs

export interface GeoLevel {
  label: string
  placeholder: string
}

export interface CountryGeoLabels {
  level1: GeoLevel  // Grande zone : Région / Province / State / Wilaya...
  level2: GeoLevel  // Zone intermédiaire : Préfecture / Département / County / District...
  level3: GeoLevel  // Commune / Ville / Arrondissement...
  level4: GeoLevel  // Quartier / Village / Neighborhood...
}

const DEFAULT_LABELS: CountryGeoLabels = {
  level1: { label: 'Région / Province', placeholder: 'Votre région ou province...' },
  level2: { label: 'Département / District', placeholder: 'Votre département ou district...' },
  level3: { label: 'Commune / Ville', placeholder: 'Votre commune ou ville...' },
  level4: { label: 'Quartier / Village', placeholder: 'Votre quartier ou village...' },
}

const COUNTRY_GEO_LABELS: Record<string, CountryGeoLabels> = {

  // ═══════════════════════════════
  // AFRIQUE FRANCOPHONE
  // ═══════════════════════════════

  'Guinée': {
    level1: { label: 'Région', placeholder: 'Ex: Basse-Guinée, Fouta-Djallon, Haute-Guinée, Guinée Forestière' },
    level2: { label: 'Préfecture', placeholder: 'Ex: Conakry, Kindia, Labé, Kankan, Faranah, N\'Zérékoré...' },
    level3: { label: 'Sous-préfecture / Commune', placeholder: 'Ex: Kaloum, Dixinn, Kindia-Centre, Labé-Centre, Mamou-Centre...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Almamya, Bambeto, Hafia, Dogomet, Simbaya...' },
  },

  'Sénégal': {
    level1: { label: 'Région', placeholder: 'Ex: Dakar, Thiès, Ziguinchor, Saint-Louis, Kaolack...' },
    level2: { label: 'Département', placeholder: 'Ex: Dakar, Pikine, Guédiawaye, Rufisque, Thiès...' },
    level3: { label: 'Commune / Arrondissement', placeholder: 'Ex: Plateau, Médina, HLM, Grand Dakar, Guédiawaye...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Almadies, Fann, Point E, Liberté 6, Parcelles Assainies...' },
  },

  'Mali': {
    level1: { label: 'Région', placeholder: 'Ex: Bamako, Kayes, Koulikoro, Sikasso, Ségou, Mopti...' },
    level2: { label: 'Cercle', placeholder: 'Ex: Bamako, Kayes, Koutiala, Bougouni, San...' },
    level3: { label: 'Commune', placeholder: 'Ex: Commune I, Commune IV, Kalaban-Coro, Sangarébougou...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Lafiabougou, Niarela, Badalabougou, Djicoroni...' },
  },

  "Côte d'Ivoire": {
    level1: { label: 'District', placeholder: 'Ex: Abidjan, Yamoussoukro, Savanes, Lagunes...' },
    level2: { label: 'Région', placeholder: 'Ex: Lagunes, Agnéby-Tiassa, Haut-Sassandra, Zanzan...' },
    level3: { label: 'Commune', placeholder: 'Ex: Cocody, Plateau, Yopougon, Abobo, Adjamé...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Riviera, Marcory, Angré, Koumassi, Treichville...' },
  },

  'Burkina Faso': {
    level1: { label: 'Région', placeholder: 'Ex: Centre, Hauts-Bassins, Sahel, Nord, Boucle du Mouhoun...' },
    level2: { label: 'Province', placeholder: 'Ex: Kadiogo, Houet, Soum, Yatenga, Kossi...' },
    level3: { label: 'Commune', placeholder: 'Ex: Ouagadougou, Bobo-Dioulasso, Koudougou, Banfora...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Tampouy, Gounghin, Dafra, Bolomakoté...' },
  },

  'Niger': {
    level1: { label: 'Région', placeholder: 'Ex: Niamey, Agadez, Diffa, Dosso, Maradi, Tahoua, Tillabéri, Zinder...' },
    level2: { label: 'Département', placeholder: 'Ex: Niamey, Agadez, Diffa, Dosso, Maradi...' },
    level3: { label: 'Commune', placeholder: 'Ex: Niamey 1, Niamey 2, Agadez Ville, Dosso...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Plateau, Yantala, Harobanda, Gamkallé...' },
  },

  'Cameroun': {
    level1: { label: 'Région', placeholder: 'Ex: Centre, Littoral, Nord, Adamaoua, Ouest, Est...' },
    level2: { label: 'Département', placeholder: 'Ex: Mfoundi, Wouri, Bénoué, Mezam, Mifi...' },
    level3: { label: 'Arrondissement / Commune', placeholder: 'Ex: Yaoundé I, Douala V, Bafoussam I, Garoua I...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Bastos, Biyem-Assi, Akwa, Bonanjo, Ngoa-Ékellé...' },
  },

  'Guinée-Bissau': {
    level1: { label: 'Région', placeholder: 'Ex: Bissau, Bafatá, Gabú, Cacheu, Biombo...' },
    level2: { label: 'Secteur', placeholder: 'Ex: Bissau, Bafatá, Gabú, Mansoa, Cacheu...' },
    level3: { label: 'Localité / Tabanka', placeholder: 'Ex: Bandim, Bor, Bairro Militar, Quelelé...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: votre quartier ou village...' },
  },

  'Mauritanie': {
    level1: { label: 'Wilaya', placeholder: 'Ex: Nouakchott-Nord, Hodh El Chargui, Assaba, Guidimaka...' },
    level2: { label: 'Moughataa', placeholder: 'Ex: Tevragh Zeina, Ksar, Toujounine, Dar Naïm...' },
    level3: { label: 'Commune', placeholder: 'Ex: Nouakchott, Néma, Sélibaby, Kiffa...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Dar Naïm, Arafat, Sebkha, Teyarett...' },
  },

  'Togo': {
    level1: { label: 'Région', placeholder: 'Ex: Maritime, Plateaux, Centrale, Kara, Savanes...' },
    level2: { label: 'Préfecture', placeholder: 'Ex: Golfe, Kloto, Tchaoudjo, Kozah, Tône...' },
    level3: { label: 'Commune', placeholder: 'Ex: Lomé, Kpalimé, Sokodé, Kara, Dapaong...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Bè, Adidogomé, Nyékonakpoè, Hédzranawoé...' },
  },

  'Bénin': {
    level1: { label: 'Département', placeholder: 'Ex: Littoral, Atlantique, Borgou, Ouémé, Zou...' },
    level2: { label: 'Commune', placeholder: 'Ex: Cotonou, Porto-Novo, Parakou, Abomey-Calavi...' },
    level3: { label: 'Arrondissement', placeholder: 'Ex: 1er arr., Cadjèhoun, Fifadji, Akpakpa...' },
    level4: { label: 'Quartier / Village', placeholder: 'Ex: Cadjèhoun, Gbégamey, Akpakpa, Dantokpa...' },
  },

  'Gabon': {
    level1: { label: 'Province', placeholder: 'Ex: Estuaire, Haut-Ogooué, Ogooué-Maritime, Woleu-Ntem...' },
    level2: { label: 'Département', placeholder: 'Ex: Libreville, Owendo, Port-Gentil, Franceville...' },
    level3: { label: 'Commune', placeholder: 'Ex: Libreville, Port-Gentil, Franceville, Oyem...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Louis, Batterie IV, Glass, Nombakélé, Nzeng-Ayong...' },
  },

  'République du Congo': {
    level1: { label: 'Département', placeholder: 'Ex: Brazzaville, Pointe-Noire, Bouenza, Kouilou...' },
    level2: { label: 'District / Arrondissement', placeholder: 'Ex: Poto-Poto, Bacongo, Makélékélé...' },
    level3: { label: 'Commune', placeholder: 'Ex: Brazzaville, Pointe-Noire, Dolisie, Nkayi...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Ouenzé, Talangaï, Moungali, Mfilou...' },
  },

  'République démocratique du Congo': {
    level1: { label: 'Province', placeholder: 'Ex: Kinshasa, Katanga, Kasaï, Nord-Kivu, Ituri...' },
    level2: { label: 'Territoire / Ville', placeholder: 'Ex: Kinshasa, Lubumbashi, Mbuji-Mayi, Goma...' },
    level3: { label: 'Commune', placeholder: 'Ex: Gombe, Lemba, Kasa-Vubu, Barumbu, Ngaliema...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Ma Campagne, Cité Verte, Masina, Bandal...' },
  },

  'Madagascar': {
    level1: { label: 'Région', placeholder: 'Ex: Analamanga, Vakinankaratra, Atsinanana, Boeny...' },
    level2: { label: 'District', placeholder: 'Ex: Antananarivo Renivohitra, Toamasina I, Mahajanga I...' },
    level3: { label: 'Commune', placeholder: 'Ex: Antananarivo, Fianarantsoa, Toamasina, Mahajanga...' },
    level4: { label: 'Fokontany / Quartier', placeholder: 'Ex: Isotry, Ambohijatovo, Mahamasina, Analakely...' },
  },

  // ═══════════════════════════════
  // AFRIQUE DU NORD
  // ═══════════════════════════════

  'Maroc': {
    level1: { label: 'Région', placeholder: 'Ex: Casablanca-Settat, Rabat-Salé-Kénitra, Marrakech-Safi...' },
    level2: { label: 'Province / Préfecture', placeholder: 'Ex: Casablanca, Rabat, Marrakech, Fès, Tanger...' },
    level3: { label: 'Commune', placeholder: 'Ex: Ain Chock, Hay Hassani, Sidi Bernoussi, Agdal...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Maarif, Hay Mohammadi, Guéliz, Médina, Gueliz...' },
  },

  'Algérie': {
    level1: { label: 'Wilaya', placeholder: 'Ex: Alger, Oran, Constantine, Sétif, Annaba, Tlemcen...' },
    level2: { label: 'Daïra', placeholder: 'Ex: Alger-Centre, Bir Mourad Raïs, Hussein Dey, Rouiba...' },
    level3: { label: 'Commune', placeholder: 'Ex: El Biar, Hydra, Ben Aknoun, Chéraga, Kouba...' },
    level4: { label: 'Quartier / Cité', placeholder: 'Ex: Telemly, Belcourt, Bab El Oued, Casbah...' },
  },

  'Tunisie': {
    level1: { label: 'Gouvernorat', placeholder: 'Ex: Tunis, Sfax, Sousse, Nabeul, Ariana, Ben Arous...' },
    level2: { label: 'Délégation', placeholder: 'Ex: Tunis Ville, La Marsa, Carthage, Ariana Ville...' },
    level3: { label: 'Commune', placeholder: 'Ex: Tunis, Sfax, Sousse, La Marsa, Nabeul...' },
    level4: { label: 'Quartier / Cité', placeholder: 'Ex: Bab Souika, Lafayette, Belvédère, Montplaisir...' },
  },

  'Égypte': {
    level1: { label: 'Gouvernorat', placeholder: 'Ex: Le Caire, Alexandrie, Giza, Assouan, Louxor...' },
    level2: { label: 'Markaz / District', placeholder: 'Ex: Le Caire, Alexandrie, Giza, Maadi...' },
    level3: { label: 'Qism / Ville', placeholder: 'Ex: Garden City, Zamalek, Heliopolis, Dokki...' },
    level4: { label: 'Quartier / Hayy', placeholder: 'Ex: Mohandessin, Nasr City, Shubra, Imbaba...' },
  },

  // ═══════════════════════════════
  // AFRIQUE ANGLOPHONE
  // ═══════════════════════════════

  'Nigeria': {
    level1: { label: 'State', placeholder: 'Ex: Lagos, Abuja FCT, Kano, Rivers, Oyo, Delta...' },
    level2: { label: "Local Gov't Area (LGA)", placeholder: 'Ex: Lagos Island, Ikeja, Surulere, Eti-Osa...' },
    level3: { label: 'City / Town', placeholder: 'Ex: Lagos, Abuja, Kano, Ibadan, Port Harcourt...' },
    level4: { label: 'Neighborhood', placeholder: 'Ex: Lekki, Victoria Island, Ikoyi, Surulere, Yaba...' },
  },

  'Ghana': {
    level1: { label: 'Region', placeholder: 'Ex: Greater Accra, Ashanti, Western, Northern, Eastern...' },
    level2: { label: 'District', placeholder: 'Ex: Accra Metro, Kumasi Metro, Tema, Cape Coast...' },
    level3: { label: 'City / Town', placeholder: 'Ex: Accra, Kumasi, Tema, Tamale, Cape Coast, Takoradi...' },
    level4: { label: 'Neighborhood', placeholder: 'Ex: Osu, Labone, Cantonments, Airport City, Adabraka...' },
  },

  'Kenya': {
    level1: { label: 'County', placeholder: 'Ex: Nairobi, Mombasa, Kisumu, Nakuru, Kiambu...' },
    level2: { label: 'Sub-County', placeholder: 'Ex: Westlands, Langata, Kibra, Kajiado, Thika Town...' },
    level3: { label: 'Ward', placeholder: 'Ex: Kilimani, Lavington, Parklands, Karen, Kasarani...' },
    level4: { label: 'Village / Neighborhood', placeholder: 'Ex: Karen, Gigiri, Kileleshwa, Langata, Runda...' },
  },

  'Afrique du Sud': {
    level1: { label: 'Province', placeholder: 'Ex: Gauteng, Western Cape, KwaZulu-Natal, Eastern Cape...' },
    level2: { label: 'District / Metro', placeholder: 'Ex: City of Johannesburg, Cape Town Metro, eThekwini...' },
    level3: { label: 'City / Town', placeholder: 'Ex: Johannesburg, Cape Town, Durban, Pretoria, Port Elizabeth...' },
    level4: { label: 'Suburb / Township', placeholder: 'Ex: Sandton, Soweto, Sea Point, Khayelitsha, Alexandra...' },
  },

  'Tanzanie': {
    level1: { label: 'Region', placeholder: 'Ex: Dar es Salaam, Mwanza, Arusha, Dodoma, Mbeya...' },
    level2: { label: 'District', placeholder: 'Ex: Ilala, Kinondoni, Temeke, Arusha, Dodoma Urban...' },
    level3: { label: 'Ward', placeholder: 'Ex: Kariakoo, Oyster Bay, Msasani, Sinza, Mwenge...' },
    level4: { label: 'Village / Neighborhood', placeholder: 'Ex: votre village ou quartier...' },
  },

  'Éthiopie': {
    level1: { label: 'Région', placeholder: 'Ex: Addis Abeba, Oromia, Amhara, Tigray, SNNPR...' },
    level2: { label: 'Zone', placeholder: 'Ex: Addis Abeba, Shewa, Welega, Arsi, Jimma...' },
    level3: { label: 'Woreda', placeholder: 'Ex: Bole, Kirkos, Arada, Yeka, Kolfe Keranio...' },
    level4: { label: 'Kebele / Quartier', placeholder: 'Ex: votre kebele ou quartier...' },
  },

  // ═══════════════════════════════
  // EUROPE
  // ═══════════════════════════════

  'France': {
    level1: { label: 'Région', placeholder: 'Ex: Île-de-France, Occitanie, Bretagne, PACA, Nouvelle-Aquitaine...' },
    level2: { label: 'Département', placeholder: 'Ex: Paris (75), Gironde (33), Rhône (69), Nord (59)...' },
    level3: { label: 'Commune', placeholder: 'Ex: Paris, Bordeaux, Lyon, Marseille, Nantes, Toulouse...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Montmartre, Bastille, Belleville, Vieux-Lyon, Bacalan...' },
  },

  'Belgique': {
    level1: { label: 'Région', placeholder: 'Ex: Bruxelles-Capitale, Wallonie, Flandre...' },
    level2: { label: 'Province', placeholder: 'Ex: Bruxelles, Liège, Hainaut, Namur, Anvers...' },
    level3: { label: 'Commune', placeholder: 'Ex: Bruxelles, Liège, Charleroi, Gand, Anvers...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Ixelles, Molenbeek, Anderlecht, Saint-Gilles...' },
  },

  'Suisse': {
    level1: { label: 'Canton', placeholder: 'Ex: Genève, Vaud, Zurich, Berne, Valais, Fribourg...' },
    level2: { label: 'District', placeholder: 'Ex: Genève, Lausanne, Zurich, Berne, Sion...' },
    level3: { label: 'Commune', placeholder: 'Ex: Genève, Lausanne, Berne, Zurich, Sion...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Plainpalais, Les Pâquis, Jonction, Eaux-Vives...' },
  },

  'Allemagne': {
    level1: { label: 'Bundesland', placeholder: 'Ex: Bayern, Berlin, NRW, Hessen, Baden-Württemberg...' },
    level2: { label: 'Kreis / Landkreis', placeholder: 'Ex: München, Köln, Hamburg, Frankfurt, Stuttgart...' },
    level3: { label: 'Stadt / Gemeinde', placeholder: 'Ex: München, Köln, Frankfurt, Hamburg, Berlin...' },
    level4: { label: 'Stadtteil', placeholder: 'Ex: Schwabing, Mitte, Altona, Sachsenhausen, Prenzlauer Berg...' },
  },

  'Espagne': {
    level1: { label: 'Comunidad autónoma', placeholder: 'Ex: Cataluña, Madrid, Andalucía, Valencia, País Vasco...' },
    level2: { label: 'Provincia', placeholder: 'Ex: Barcelona, Madrid, Sevilla, Valencia, Málaga...' },
    level3: { label: 'Municipio', placeholder: 'Ex: Barcelona, Madrid, Sevilla, Valencia, Zaragoza...' },
    level4: { label: 'Barrio', placeholder: 'Ex: Gracia, Barrio Gótico, Lavapiés, Triana, El Born...' },
  },

  'Italie': {
    level1: { label: 'Regione', placeholder: 'Ex: Lombardia, Lazio, Sicilia, Campania, Veneto...' },
    level2: { label: 'Provincia', placeholder: 'Ex: Milano, Roma, Napoli, Torino, Venezia...' },
    level3: { label: 'Comune', placeholder: 'Ex: Milano, Roma, Napoli, Firenze, Torino, Venezia...' },
    level4: { label: 'Quartiere', placeholder: 'Ex: Navigli, Trastevere, Pigneto, Parioli, Testaccio...' },
  },

  'Portugal': {
    level1: { label: 'Região', placeholder: 'Ex: Lisboa, Norte, Centro, Alentejo, Algarve...' },
    level2: { label: 'Distrito', placeholder: 'Ex: Lisboa, Porto, Braga, Setúbal, Faro...' },
    level3: { label: 'Município', placeholder: 'Ex: Lisboa, Porto, Braga, Loures, Sintra, Coimbra...' },
    level4: { label: 'Bairro / Freguesia', placeholder: 'Ex: Alfama, Bairro Alto, Mouraria, Chiado...' },
  },

  'Royaume-Uni': {
    level1: { label: 'Region / Nation', placeholder: 'Ex: England, Scotland, Wales, Northern Ireland...' },
    level2: { label: 'County / Council', placeholder: 'Ex: Greater London, West Yorkshire, Kent, Strathclyde...' },
    level3: { label: 'City / Town', placeholder: 'Ex: London, Manchester, Birmingham, Glasgow, Edinburgh...' },
    level4: { label: 'Neighborhood', placeholder: 'Ex: Soho, Notting Hill, Brixton, Shoreditch, Hackney...' },
  },

  'Pays-Bas': {
    level1: { label: 'Provincie', placeholder: 'Ex: Noord-Holland, Zuid-Holland, Utrecht, Gelderland...' },
    level2: { label: 'Gemeente (grote)', placeholder: 'Ex: Amsterdam, Rotterdam, Den Haag, Utrecht...' },
    level3: { label: 'Gemeente', placeholder: 'Ex: Amsterdam, Rotterdam, Den Haag, Utrecht, Eindhoven...' },
    level4: { label: 'Wijk / Buurt', placeholder: 'Ex: Jordaan, De Pijp, Centrum, Noord, Oud-West...' },
  },

  // ═══════════════════════════════
  // AMÉRIQUES
  // ═══════════════════════════════

  'États-Unis': {
    level1: { label: 'State', placeholder: 'Ex: California, New York, Texas, Florida, Illinois...' },
    level2: { label: 'County', placeholder: 'Ex: LA County, New York County, Harris County, Cook County...' },
    level3: { label: 'City / Town', placeholder: 'Ex: Los Angeles, New York, Houston, Chicago, Phoenix...' },
    level4: { label: 'Neighborhood', placeholder: 'Ex: Hollywood, Brooklyn, Harlem, Midtown, The Loop...' },
  },

  'Canada': {
    level1: { label: 'Province / Territoire', placeholder: 'Ex: Ontario, Québec, Colombie-Britannique, Alberta...' },
    level2: { label: 'Comté / MRC / Région', placeholder: 'Ex: Toronto, Montréal, Vancouver, Ottawa, Calgary...' },
    level3: { label: 'Ville / Municipalité', placeholder: 'Ex: Toronto, Montréal, Vancouver, Ottawa, Calgary...' },
    level4: { label: 'Quartier', placeholder: 'Ex: Plateau-Mont-Royal, Outremont, Rosedale, Kitsilano...' },
  },

  'Brésil': {
    level1: { label: 'Estado', placeholder: 'Ex: São Paulo, Rio de Janeiro, Bahia, Minas Gerais, Pará...' },
    level2: { label: 'Mesorregião', placeholder: 'Ex: Metropolitana de São Paulo, Grande Rio de Janeiro...' },
    level3: { label: 'Município', placeholder: 'Ex: São Paulo, Rio de Janeiro, Salvador, Fortaleza, Brasília...' },
    level4: { label: 'Bairro', placeholder: 'Ex: Pinheiros, Ipanema, Pelourinho, Meireles, Lapa...' },
  },

  'Mexique': {
    level1: { label: 'Estado', placeholder: 'Ex: Ciudad de México, Jalisco, Nuevo León, Puebla, Veracruz...' },
    level2: { label: 'Municipio / Alcaldía', placeholder: 'Ex: Cuauhtémoc, Guadalajara, Monterrey, Puebla...' },
    level3: { label: 'Colonia', placeholder: 'Ex: Polanco, Roma Norte, Condesa, Doctores, Del Valle...' },
    level4: { label: 'Manzana / Quartier', placeholder: 'Ex: votre quartier ou manzana...' },
  },

  // ═══════════════════════════════
  // ASIE
  // ═══════════════════════════════

  'Inde': {
    level1: { label: 'State / UT', placeholder: 'Ex: Maharashtra, Delhi, Karnataka, Tamil Nadu, UP...' },
    level2: { label: 'District', placeholder: 'Ex: Mumbai, Delhi, Bangalore, Chennai, Hyderabad...' },
    level3: { label: 'City / Tehsil', placeholder: 'Ex: Mumbai, New Delhi, Bangalore, Chennai, Hyderabad...' },
    level4: { label: 'Neighborhood', placeholder: 'Ex: Bandra, Connaught Place, Koramangala, Andheri...' },
  },

  'Chine': {
    level1: { label: '省 Province', placeholder: 'Ex: Guangdong, Beijing, Shanghai, Sichuan, Zhejiang...' },
    level2: { label: '地级市 Préfecture', placeholder: 'Ex: Guangzhou, Shenzhen, Beijing, Wuhan, Chengdu...' },
    level3: { label: '区 District', placeholder: 'Ex: Tianhe, Chaoyang, Pudong, Yuzhong, Jianghan...' },
    level4: { label: '街道 Quartier', placeholder: 'Ex: votre rue ou quartier...' },
  },

  'Japon': {
    level1: { label: '都道府県 Préfecture', placeholder: 'Ex: Tokyo, Osaka, Kanagawa, Aichi, Hokkaido...' },
    level2: { label: '市 Ville', placeholder: 'Ex: Shinjuku, Shibuya, Yokohama, Osaka, Nagoya...' },
    level3: { label: '区 Arrondissement', placeholder: 'Ex: Nakameguro, Harajuku, Namba, Umeda...' },
    level4: { label: '丁目 Quartier', placeholder: 'Ex: votre quartier ou chō...' },
  },

  'Arabie saoudite': {
    level1: { label: 'Région (Mintaqah)', placeholder: 'Ex: Riyad, La Mecque, Médine, Dammam...' },
    level2: { label: 'Gouvernorat', placeholder: 'Ex: Riyad, Djeddah, La Mecque, Dammam, Médine...' },
    level3: { label: 'Ville / Muhafazah', placeholder: 'Ex: Riyad, Djeddah, La Mecque, Médine, Dammam...' },
    level4: { label: 'Quartier / Hayy', placeholder: 'Ex: Al Malaz, Al Murabba, Al Olaya, Al Hamra...' },
  },

  // ═══════════════════════════════
  // OCÉANIE
  // ═══════════════════════════════

  'Australie': {
    level1: { label: 'State / Territory', placeholder: 'Ex: New South Wales, Victoria, Queensland, WA, SA...' },
    level2: { label: "Local Gov't Area", placeholder: 'Ex: Sydney, Melbourne, Brisbane, Perth, Adelaide...' },
    level3: { label: 'City / Suburb', placeholder: 'Ex: Sydney, Melbourne, Brisbane, Perth, Adelaide...' },
    level4: { label: 'Neighborhood', placeholder: 'Ex: Bondi, Fitzroy, South Bank, Fremantle, Glenelg...' },
  },
}

/**
 * Retourne les labels géographiques pour un pays donné.
 * Utilise le DEFAULT si le pays n'est pas dans la liste.
 */
export function getCountryGeoLabels(countryName: string): CountryGeoLabels {
  return COUNTRY_GEO_LABELS[countryName] || DEFAULT_LABELS
}
