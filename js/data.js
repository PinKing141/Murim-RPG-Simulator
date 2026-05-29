export const SURNAMES = ["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh","Seo","Shin","Kwon","Hwang","Ahn","Song","Yoo","Hong","Baek","Heo","Nam","Moon","Yang","Bae","Ko","No","Sim","Jeon"];
export const CLAN_SURNAMES = ["Namgung","Jegal","Dang","Moyong","Hwangbo","Sima","Dokgo","Seonu"];
export const GIVEN = ["Mu-jin","Cheon","Ho","Jin","Woon","Hyuk","Seol","Yeon","Rin","Hwi","Gang","Tae-ho","Jun","Hye-rin","Soo","Min","Seong","Hyun","Woo","Jae","Yul","Cheol","Baek","Ryeon","Dae","Gyeom","Sa-hyeon","Ui","Beom","Sang","Eun","Yeo-wol","Ha-rin","Mu-gak","Seo-rin"];

export const BH_PRE = [
  ["Hyeol","혈","Blood"],["Geom","검","Sword"],["Do","도","Saber"],["Gwon","권","Fist"],
  ["Bing","빙","Ice"],["Hwa","화","Fire"],["Noe","뇌","Thunder"],["Gwi","귀","Ghost"],
  ["Ma","마","Demon"],["Cheon","천","Heaven"],["Pae","패","Tyrant"],["Gwang","광","Mad"],
  ["Dok","독","Poison"],["Eum","음","Shadow"],["Cheong","청","Azure"],["Baek","백","White"],
  ["Geum","금","Golden"],["Cheol","철","Iron"],["Mu","무","Formless"],["Jeol","절","Severing"]
];
export const BH_SUF = [
  ["sin","신","God"],["wang","왕","King"],["jon","존","Venerable"],["ma","마","Demon"],
  ["gwi","귀","Ghost"],["hyeop","협","Hero"],["gun","군","Lord"],["gaek","객","Wanderer"],
  ["seon","선","Immortal"],["gwon","권","Fist"],["geom","검","Blade"]
];

export const SECT_PRE = [
  ["Cheongun","청운","Azure Cloud"],["Hwasan","화산","Mount Hwa"],["Cheongeom","천검","Heaven Sword"],
  ["Hyeolcheon","혈천","Blood Heaven"],["Mandok","만독","Myriad Poison"],["Irwol","일월","Sun-Moon"],
  ["Cheonryong","천룡","Heaven Dragon"],["Bingbaek","빙백","Frost-White"],["Heukpung","흑풍","Black Wind"],
  ["Jaha","자하","Purple Mist"],["Gwangnoe","광뢰","Roaring Thunder"],["Mugeuk","무극","Limitless"],
  ["Dansim","단심","Crimson Heart"],["Nakseong","낙성","Falling Star"],["Gwigok","귀곡","Ghost Valley"],
  ["Cheolhyeol","철혈","Iron Blood"],["Odok","오독","Five Poison"],["Maehwa","매화","Plum Blossom"],
  ["Sammun","삼문","Triple Gate"],["Geummun","금문","Golden Gate"],["Seolhwa","설화","Snowfire"],
  ["Buljimun","불지","Buddha's Will"]
];
export const SECT_SUF = [
  ["pa","파","Sect"],["sega","세가","Clan"],["sega","세가","Clan"],["mun","문","Gate"],
  ["gyo","교","Cult"],["bang","방","Gang"],["gok","곡","Valley"],["jang","장","Manor"],
  ["seong","성","Fortress"],["gung","궁","Palace"],["dan","단","Order"]
];

export const ART_PRE = [
  ["Cheonma","천마","Heavenly Demon"],["Taegeuk","태극","Supreme Polarity"],["Maehwa","매화","Plum Blossom"],
  ["Guyang","구양","Nine Yang"],["Heupseong","흡성","Star-Devouring"],["Hyeolma","혈마","Blood Demon"],
  ["Jaha","자하","Purple Mist"],["Bukmyeong","북명","Northern Abyss"],["Musang","무상","Formless"],
  ["Pacheon","파천","Heaven-Splitting"],["Myeoljeol","멸절","Annihilation"],["Bingbaek","빙백","Frost-White"],
  ["Cheonnoe","천뢰","Heaven's Thunder"],["Mangeuk","만극","Ten Thousand Ends"],["Geumgang","금강","Adamant"]
];
export const ART_SUF = [
  ["Singong","신공","Divine Art"],["Geombeop","검법","Sword Art"],["Dobeop","도법","Saber Art"],
  ["Gwonbeop","권법","Fist Art"],["Jangbeop","장법","Palm Art"],["Simbeop","심법","Heart Method"],
  ["Bobeop","보법","Step Method"],["Jibeop","지법","Finger Art"],["Sinbeop","신법","Movement Art"]
];

export const REGIONS = ["the Central Plains (중원)","the Southern Marches","the Sacheon basin","the Frostbound North","the Misted East","the Demonic Frontier (새외)","the Imperial Capital","the Jade Coast","the Ten-Thousand Peaks","the Bleak Steppe"];
export const WAR_NAMES = [
  ["the Great Orthodox-Demon War","정마대전"],["the Blood Calamity","무림혈겁"],
  ["the Ten-Year War","십년대전"],["the Struggle for Supremacy","천하쟁패"],
  ["the Demonic Cult Rebellion","마교의 난"],["the Great Unorthodox Chaos","사파대란"],
  ["the War of Drawn Sabers","발도지란"],["the Schism of the Nine Sects","구파분란"]
];

export const ALIGN = {
  orthodox:  { key:"orthodox",   label:"Orthodox",   kr:"정파", c:"var(--jeongpa)" },
  unorthodox:{ key:"unorthodox", label:"Unorthodox", kr:"사파", c:"var(--sapa)" },
  demonic:   { key:"demonic",    label:"Demonic",    kr:"마교", c:"var(--magyo)" },
  recluse:   { key:"recluse",    label:"Recluse",    kr:"은자", c:"var(--eunja)" }
};

export const REALMS    = ["Third-Rate","Second-Rate","First-Rate","Peak","Transcendent","Form Realm","Profound Realm","Life-Death Realm","Nature Realm"];
export const REALM_KR  = ["삼류","이류","일류","절정","초절정","화경","현경","생사경","자연경"];
export const APEX      = REALMS.length - 1;

export const PATH_FLAVOR = {
  orthodox:  { verb:"attained",      via:["through disciplined meditation","by tempering the heart against desire","following the righteous canon","after a decade of ascetic refinement"] },
  unorthodox:{ verb:"forced open",   via:["by absorbing a rival's naegong","through ingenious but forbidden shortcuts","at the cost of a shortened life","with a pill of dubious origin"] },
  demonic:   { verb:"seized",        via:["by devouring the energy of the slain","through the blood of a hundred enemies","at the price of their remaining humanity","by feeding the demonic art within"] },
  recluse:   { verb:"quietly reached",via:["in solitude upon a nameless peak","having forgotten the affairs of men","while listening to the mountain rain","after a lifetime of stillness"] }
};
