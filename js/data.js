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

/*
  Terrain is the substrate the martial world grows inside. Each region carries
  three scalars — population, prosperity, stability — and no simulated villagers;
  the mortal world exists as the numbers murim bends. Terrain biases those
  scalars, the quality of recruits a region yields, and the alignment of sects
  that take root there.
*/
export const TERRAIN = {
  river:    { kr:"강", label:"River Valley", prosperity:[55,82], stability:[55,78], population:[60,92], talent:[22,68], drift:-2, align:"orthodox" },
  mountain: { kr:"산", label:"Mountain",     prosperity:[24,46], stability:[52,74], population:[24,46], talent:[34,82], drift: 0, align:"recluse"  },
  forest:   { kr:"림", label:"Forest",       prosperity:[34,56], stability:[34,56], population:[30,56], talent:[28,76], drift: 2, align:"unorthodox" },
  frontier: { kr:"새", label:"Frontier",     prosperity:[18,40], stability:[18,40], population:[20,46], talent:[40,92], drift: 6, align:"demonic" }
};

export const REGION_TERRAIN = {
  "the Central Plains (중원)":"river",
  "the Southern Marches":"forest",
  "the Sacheon basin":"river",
  "the Frostbound North":"mountain",
  "the Misted East":"forest",
  "the Demonic Frontier (새외)":"frontier",
  "the Imperial Capital":"river",
  "the Jade Coast":"river",
  "the Ten-Thousand Peaks":"mountain",
  "the Bleak Steppe":"frontier"
};
export const IMPERIAL_REGION = "the Imperial Capital";

/*
  Sect doctrines — the deep personality of a house, set at founding and
  never changed. Colours how it fights, remembers slights, refines its
  arts, and how the chronicle describes its deeds.
*/
export const DOCTRINES = {
  bloodthirsty: {
    label: "Bloodthirsty", kr: "살도",
    tagline: "War is the only sermon it preaches.",
    warVerb: "falls upon",
    warMod: +0.18, killMod: +0.25, artBonus: 0, talentBonus: 0,
    legitBonus: -6, bloodGrudge: true, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "var(--blood)"
  },
  wrathful: {
    label: "Wrathful", kr: "원한",
    tagline: "Forgets nothing. Forgives nothing.",
    warVerb: "descends in fury upon",
    warMod: +0.10, killMod: +0.10, artBonus: 0, talentBonus: 0,
    legitBonus: 0, bloodGrudge: true, noForgive: true, blocResist: false,
    purgeThreshold: 0, c: "#c84040"
  },
  scheming: {
    label: "Scheming", kr: "음모",
    tagline: "Every alliance is a trap half-sprung.",
    warVerb: "springs its trap on",
    warMod: -0.05, killMod: -0.08, artBonus: 0, talentBonus: 0,
    legitBonus: +5, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "#9040c0"
  },
  honourable: {
    label: "Honourable", kr: "의협",
    tagline: "The oath above breathing.",
    warVerb: "draws its blade — with heavy heart — against",
    warMod: -0.08, killMod: -0.25, artBonus: 0, talentBonus: 0,
    legitBonus: +14, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "var(--jade)"
  },
  fanatical: {
    label: "Fanatical", kr: "광신",
    tagline: "Purity or death. No in-between.",
    warVerb: "wages holy war upon",
    warMod: +0.08, killMod: +0.10, artBonus: +0.08, talentBonus: 0,
    legitBonus: +8, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: -8, c: "#e05820"
  },
  reclusive: {
    label: "Reclusive", kr: "은거",
    tagline: "The mountain does not seek the valley.",
    warVerb: "finally driven from its mountain, turns on",
    warMod: -0.15, killMod: 0, artBonus: +0.18, talentBonus: +10,
    legitBonus: +5, bloodGrudge: false, noForgive: false, blocResist: true,
    purgeThreshold: 0, c: "var(--eunja)"
  },
  ambitious: {
    label: "Ambitious", kr: "야망",
    tagline: "Heaven itself is not enough.",
    warVerb: "makes its move against",
    warMod: +0.10, killMod: 0, artBonus: 0, talentBonus: 0,
    legitBonus: 0, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "var(--sapa)"
  },
  mercenary: {
    label: "Mercenary", kr: "용병",
    tagline: "Strength is the only principle.",
    warVerb: "turns its blades against",
    warMod: 0, killMod: 0, artBonus: 0, talentBonus: 0,
    legitBonus: -8, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "#708898"
  },
  scholarly: {
    label: "Scholarly", kr: "학문",
    tagline: "The art outlasts the blade.",
    warVerb: "is forced from its libraries against",
    warMod: -0.12, killMod: -0.15, artBonus: +0.20, talentBonus: +5,
    legitBonus: +6, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "#4080c0"
  },
  devout: {
    label: "Devout", kr: "독실",
    tagline: "The Path is marrow, not opinion.",
    warVerb: "fights for the true Path against",
    warMod: +0.05, killMod: 0, artBonus: +0.10, talentBonus: 0,
    legitBonus: +10, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "#c8a030"
  }
};
export const DOCTRINE_KEYS = Object.keys(DOCTRINES);

/* which personalities a given alignment tends to produce — not a hard rule,
   just a weighted bias so demonic houses breed wrathful heads more often */
export const ALIGN_PERSONALITY_BIAS = {
  orthodox:   ["honourable","devout","scholarly","fanatical","reclusive","ambitious"],
  unorthodox: ["scheming","mercenary","ambitious","wrathful","bloodthirsty","honourable"],
  demonic:    ["bloodthirsty","wrathful","fanatical","ambitious","scheming","mercenary"],
  recluse:    ["reclusive","scholarly","devout","honourable","scheming","wrathful"]
};

/* ---------------- art affinity ---------------- */

/* Which personalities flow naturally with which art alignments.
   "natural"  → cultivation bonus, minimal corruption bleed
   "neutral"  → no modifier
   "resistant"→ cultivation penalty, faster corruption bleed if art is corruptive */
export const ART_AFFINITY = {
  demonic: {
    natural:   ["bloodthirsty","wrathful","fanatical","ambitious"],
    neutral:   ["scheming","mercenary"],
    resistant: ["honourable","devout","scholarly","reclusive"]
  },
  unorthodox: {
    natural:   ["scheming","mercenary","ambitious","wrathful"],
    neutral:   ["bloodthirsty","fanatical","reclusive"],
    resistant: ["honourable","devout","scholarly"]
  },
  orthodox: {
    natural:   ["honourable","devout","scholarly","reclusive","fanatical"],
    neutral:   ["ambitious","scheming"],
    resistant: ["bloodthirsty","wrathful","mercenary"]
  },
  recluse: {
    natural:   ["reclusive","scholarly","devout"],
    neutral:   ["honourable","fanatical","ambitious"],
    resistant: ["bloodthirsty","wrathful","scheming","mercenary"]
  }
};

/* return "natural" | "neutral" | "resistant" for a figure's relationship to an art */
export function artAffinity(f, art) {
  if (!art || !f.personality) return "neutral";
  const tiers = ART_AFFINITY[art.align] || ART_AFFINITY.orthodox;
  if (tiers.natural.includes(f.personality))   return "natural";
  if (tiers.resistant.includes(f.personality)) return "resistant";
  return "neutral";
}

/* Arts are corruptive based on their alignment, not a raw number.
   "always"      → demonic arts: corruption is inherent, unavoidable
   "conditional" → unorthodox arts: only corrupts the susceptible
   "never"       → orthodox/recluse arts: inert; misuse is the wielder's sin */
export function artCorruptType(art) {
  if (!art) return "never";
  if (art.align === "demonic")    return "always";
  if (art.align === "unorthodox") return "conditional";
  return "never";
}

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

/* ---------------- legendary relics ---------------- */

/* Named objects with their own history. Unlike arts (which are practised),
   a relic is an artifact that passes hand to hand and accumulates deeds.
   kind determines flavour; align tints its nature. */
export const RELIC_TYPES = [
  { kind:"sword",   noun:"blade",    kr:"검", verbs:["was forged in","drank deep in","was tempered through"] },
  { kind:"saber",   noun:"saber",    kr:"도", verbs:["was hammered out in","tasted blood in","was quenched in"] },
  { kind:"spear",   noun:"spear",    kr:"창", verbs:["was raised first in","pierced the line at","was blooded in"] },
  { kind:"stele",   noun:"stele",    kr:"비", verbs:["was carved during","recorded the truth of","was raised after"] },
  { kind:"hairpin", noun:"hairpin",  kr:"비녀", verbs:["was gifted during","hid its poison through","passed in silence during"] },
  { kind:"seal",    noun:"seal",     kr:"인", verbs:["was cast in","commanded armies through","sealed the oath of"] },
  { kind:"ring",    noun:"ring",     kr:"환", verbs:["was bound in","never left the hand through","was lost and found in"] },
  { kind:"manualcase", noun:"reliquary", kr:"함", verbs:["was sealed in","kept its secret through","was opened only in"] }
];

export const RELIC_PRE = [
  ["Hyeolryeong","혈령","Blood-Spirit"],["Cheonsa","천사","Heaven-Slaying"],["Manmu","만무","Myriad-Form"],
  ["Bingryong","빙룡","Frost-Dragon"],["Gwimyeon","귀면","Ghost-Face"],["Jeolyeong","절영","Shadowless"],
  ["Paewang","패왕","Tyrant-King"],["Cheongsan","청산","Azure-Mountain"],["Mangwol","만월","Full-Moon"],
  ["Dokso","독소","Venom"],["Geumgang","금강","Diamond"],["Yongcheon","용천","Dragon-Spring"]
];
export const RELIC_SUF = [
  ["geom","검","Blade"],["do","도","Saber"],["chang","창","Spear"],["bi","비","Stele"],
  ["in","인","Seal"],["hwan","환","Ring"],["jam","잠","Hairpin"],["ham","함","Casket"]
];

/* deeds a relic can perform/witness, used to build its history line */
export const RELIC_DEEDS = [
  "turned the tide of",
  "claimed a master's life in",
  "vanished from the world after",
  "was wrested from cooling hands at",
  "passed to a worthier grip during"
];

/* ---------------- tournaments ---------------- */

export const TOURNEY_NAMES = [
  ["the Heroes' Assembly","군웅대회"],["the Sword Trial of the Gangho","강호검대회"],
  ["the Grand Martial Gathering","무림대회"],["the Lone Peak Tournament","독봉비무"],
  ["the Beggars' Conclave","개방대회"],["the Hundred Blades Meet","백검회"]
];
