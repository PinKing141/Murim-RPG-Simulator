export const SURNAMES = ["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh","Seo","Shin","Kwon","Hwang","Ahn","Song","Yoo","Hong","Baek","Heo","Nam","Moon","Yang","Bae","Ko","No","Sim","Jeon"];
export const CLAN_SURNAMES = ["Namgung","Jegal","Dang","Moyong","Hwangbo","Sima","Dokgo","Seonu"];

/* gendered given-name pools — used when gender is known at birth */
export const GIVEN_MALE = [
  /* single syllable */
  "Cheon","Ho","Jin","Hwi","Gang","Jun","Soo","Woo","Jae","Yul","Cheol","Dae","Ui","Beom","Sang",
  "Hak","Ryong","Gwang","Hwan","Yeong","Jang","Gi","Nam","Pil","Seok","Chan","Bong","Tae","Dok",
  "Gwi","Il","Mun","Ik","Ryun","Bok","Gon","Won","Baek","Do","Geom","Hyo","Seong","Hyun","Hyeok",
  /* two syllable */
  "Mu-jin","Tae-ho","Sa-hyeon","Mu-gak","Cheol-won","Beom-su","Jae-ha","Tae-yang","Seon-ho",
  "Gwon-il","Do-hyeon","Mu-hyeon","Chun-bae","Min-jun","Yeon-jun","Ji-hwan","Ju-won","Hyun-woo",
  "Tae-in","Mu-won","Cheon-ik","Dong-hyun","Sang-ho","So-hwan","Do-jin","Baek-ho","Il-do",
  "Chun-gwang","Mun-hak","Ik-su","Seong-jin","Hyeon-mu","Gang-ho","Woon-cheol","Jae-ryong",
  "Seon-mun","Mu-gang","Cheol-in","Bong-hwan","Nam-il","Tae-geom","Ik-hyeon","Sang-cheol",
  "Ryong-cheon","Hwan-gi","Gwang-cheol","Mu-in","Seok-bong","Cheon-mu","Jae-won","Hyun-gang",
  "Do-beom","Sang-yul","Woo-jin","Beom-ik","Geon-ho","Tae-ryong","Il-gwang","Mu-seok",
  "Cheol-gang","Jae-geom","Hyeon-beom","Seon-gang","Woon-hyuk","Nam-hwan","Gi-ryong","Do-gang"
];
export const GIVEN_FEMALE = [
  /* single syllable */
  "Seol","Yeon","Rin","Ryeon","Eun","Hwa","Dan","Bi","Wol","Ran","So","Ha","Seo","Hyang","Mae",
  "Na","Gyeong","Su","Chae","Hye","Bo","Mi","Ji","Ra","Ok","Ryun","Hyeon","Sam","Ah","Hee",
  /* two syllable */
  "Hye-rin","Yeo-wol","Ha-rin","Seo-rin","Wol-hyang","So-yeon","Chae-rin","Bi-ryeon",
  "Hwa-gyeong","Seo-hwa","Na-hyang","Wol-dan","Gyeong-hwa","Su-ryeon","Ha-eun","Jeong-hwa",
  "Sa-wol","Cheon-hwa","Bi-dam","Na-hee","Seol-ha","Chae-won","Ji-yeon","So-hwa","Hye-won",
  "Wol-mae","Dan-bi","Seol-ryeon","Mi-ryeon","Ji-hwa","Hyang-ran","So-wol","Gyeong-ran",
  "Wol-ryeon","Na-gyeong","Hwa-ran","Eun-hye","Su-hwa","Chae-yeon","Dan-hwa","Rin-wol",
  "Bi-hwa","Seol-wol","Hye-gyeong","So-rin","Seo-yeon","Na-wol","Wol-bi","Hwa-seol",
  "Eun-ran","Chae-wol","So-dan","Ji-rin","Hye-dan","Bi-wol","Na-rin","Seo-dan","Ha-wol",
  "Cheon-ran","Gyeong-bi","Su-wol","Hyang-bi","So-hyang","Eun-wol","Dan-seol","Ryeon-hwa",
  "Bi-seol","Wol-ran","Hye-wol","So-ran","Gyeong-seol","Na-dan","Hwa-bi","Seo-wol","Chae-dan"
];
export const GIVEN_NEUTRAL = ["Min","Baek","Rin","Yul","San","Ha","Ryu","Woon","Hyeon","Do","Su","Ji","Seon","An"];

/* keep legacy export so external code that imported GIVEN still works */
export const GIVEN = [...GIVEN_MALE, ...GIVEN_FEMALE];

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
  },
  itinerant: {
    label: "Itinerant", kr: "개방",
    tagline: "The road is the sect. The world is the dojo.",
    warVerb: "rises from the gutters against",
    warMod: -0.05, killMod: 0, artBonus: 0, talentBonus: +8,
    legitBonus: -4, bloodGrudge: false, noForgive: false, blocResist: false,
    purgeThreshold: 0, c: "#8b6a3e"
  }
};
export const DOCTRINE_KEYS = Object.keys(DOCTRINES);

/* which personalities a given alignment tends to produce — not a hard rule,
   just a weighted bias so demonic houses breed wrathful heads more often */
export const ALIGN_PERSONALITY_BIAS = {
  orthodox:   ["honourable","devout","scholarly","fanatical","reclusive","ambitious"],
  unorthodox: ["scheming","mercenary","ambitious","wrathful","bloodthirsty","honourable","itinerant"],
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

/* ============================================================
   SECT TRADITIONS — succession + recruitment attitudes toward gender
   ============================================================ */

/*
  Each sect is assigned one of three succession traditions at founding.
  Conservative sects prefer male-line heirs and create crises when daughters
  must inherit. Progressive sects care only about merit. Matriarchal sects
  (rare) mirror conservative but inverted — found mainly in palace lineages.
*/
export const SUCCESSION_TRADITIONS = {
  patriarchal:  { key:"patriarchal",  label:"Patriarchal Line",   kr:"부계",  maleBonus: 22, femaleBonus: -18 },
  meritocratic: { key:"meritocratic", label:"Meritocratic",       kr:"능력제", maleBonus:  0, femaleBonus:   0 },
  matriarchal:  { key:"matriarchal",  label:"Matriarchal Line",   kr:"모계",  maleBonus:-18, femaleBonus:  22 }
};

/* probability weights for each tradition per alignment when a sect is founded */
export const TRADITION_BY_ALIGN = {
  orthodox:   ["patriarchal","patriarchal","patriarchal","meritocratic"],
  unorthodox: ["patriarchal","meritocratic","meritocratic","meritocratic"],
  demonic:    ["patriarchal","meritocratic","meritocratic"],
  recluse:    ["meritocratic","meritocratic","meritocratic","matriarchal"]
};

/* recruitment bias: some sects lean toward recruiting one gender */
export const RECRUIT_BIAS = {
  any:    { key:"any",    label:"Open Recruitment",     kr:"무차별" },
  male:   { key:"male",   label:"Male Disciples",       kr:"남제자" },
  female: { key:"female", label:"Female Disciples",     kr:"여제자" }
};

/* ============================================================
   YIN/YANG ART AFFINITY — stacked on top of personality affinity
   Arts carry a polarity; mismatch gives a moderate penalty, not a hard wall.
   ============================================================ */

/*
  polarity: "yin" | "yang" | "balanced"
  Yin arts align more naturally with female cultivators (and recluse/devout);
  yang arts align more with male (and aggressive/fanatical).
  Balanced arts (most manuals) are unaffected.
  A woman of exceptional talent overcomes yang resistance — same gain formula,
  just a softer ceiling before Form Realm, and extra fame when she does.
*/
export const ART_POLARITY_BY_SUF = {
  "Singong":  "balanced", // Divine Art
  "Geombeop": "yang",     // Sword Art
  "Dobeop":   "yang",     // Saber Art
  "Gwonbeop": "yang",     // Fist Art  (external strength)
  "Jangbeop": "balanced", // Palm Art  (internal force)
  "Simbeop":  "yin",      // Heart Method (inner cultivation)
  "Bobeop":   "balanced", // Step Method
  "Jibeop":   "yin",      // Finger Art (precise, internal)
  "Sinbeop":  "balanced"  // Movement Art
};

/* bonus/penalty modifier to cultivation gain based on polarity mismatch */
export function polarityAffinity(f, art) {
  if (!art || !art.polarity || art.polarity === "balanced") return 1.0;
  const isFemale = f.gender === "female";
  if (art.polarity === "yin")  return isFemale ? 1.12 : 0.88;
  if (art.polarity === "yang") return isFemale ? 0.88 : 1.12;
  return 1.0;
}

/* Arts are corruptive based on their alignment, not a raw number.
   "always"      → demonic arts: corruption is inherent, unavoidable
   "conditional" → unorthodox arts: only corrupts the susceptible
   "never"       → orthodox/recluse arts: inert; misuse is the wielder's sin */
export function artCorruptType(art) {
  if (!art) return "never";
  if (art.align === "demonic") return "always";
  /* an art whose practice has darkened enough — regardless of original text —
     can develop corrupting side effects. The lineage is what matters. */
  if (art.currentInterpretation) {
    const agg = art.currentInterpretation.aggression || 0;
    const mer = art.currentInterpretation.mercy     || 100;
    if (art.align === "unorthodox" && agg > 72 && mer < 22) return "always";
    if (art.align === "orthodox"   && agg > 68 && mer < 20 && art.deviationScore > 50) return "conditional";
  }
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
  orthodox:  { verb:"attained",       via:["through disciplined meditation","by tempering the heart against desire","following the righteous canon","after a decade of ascetic refinement"] },
  unorthodox:{ verb:"forced open",    via:["by absorbing a rival's naegong","through ingenious but forbidden shortcuts","at the cost of a shortened life","with a pill of dubious origin"] },
  demonic:   { verb:"seized",         via:["by devouring the energy of the slain","through the blood of a hundred enemies","at the price of their remaining humanity","by feeding the demonic art within"] },
  recluse:   { verb:"quietly reached",via:["in solitude upon a nameless peak","having forgotten the affairs of men","while listening to the mountain rain","after a lifetime of stillness"] }
};

/* ============================================================
   ART TRADITION — principles, interpretation, commentary
   ============================================================ */

/* the five axes of any martial tradition */
export const ART_PRINCIPLES = ["patience","aggression","mercy","discipline","sacrifice"];

/* how a tradition is seeded depending on alignment ([lo, hi] per axis) */
export const ALIGN_PRINCIPLES = {
  orthodox:   { patience:[55,85], aggression:[10,30], mercy:[60,85], discipline:[60,85], sacrifice:[15,35] },
  unorthodox: { patience:[30,60], aggression:[35,65], mercy:[25,55], discipline:[25,55], sacrifice:[35,65] },
  demonic:    { patience:[10,30], aggression:[70,95], mercy:[ 5,20], discipline:[30,65], sacrifice:[55,85] },
  recluse:    { patience:[70,90], aggression:[ 5,20], mercy:[55,80], discipline:[50,75], sacrifice:[20,45] }
};

/* how each personality nudges interpretation when they practice */
export const PERSONALITY_PRINCIPLE_BIAS = {
  bloodthirsty: { patience:-1, aggression:+3, mercy:-3, discipline: 0, sacrifice:+1 },
  wrathful:     { patience:-1, aggression:+2, mercy:-2, discipline:-1, sacrifice:+1 },
  scheming:     { patience:+1, aggression:+1, mercy:-1, discipline:+1, sacrifice: 0 },
  honourable:   { patience:+1, aggression:-2, mercy:+2, discipline:+2, sacrifice: 0 },
  fanatical:    { patience: 0, aggression:+1, mercy:-2, discipline:+3, sacrifice:+1 },
  reclusive:    { patience:+3, aggression:-2, mercy:+1, discipline:+1, sacrifice:-1 },
  ambitious:    { patience:-1, aggression:+1, mercy:-1, discipline:-1, sacrifice:+1 },
  mercenary:    { patience:-1, aggression:+1, mercy:-2, discipline: 0, sacrifice:+2 },
  scholarly:    { patience:+2, aggression:-1, mercy:+1, discipline:+2, sacrifice:-1 },
  devout:       { patience:+1, aggression:-2, mercy:+2, discipline:+2, sacrifice: 0 }
};

/* commentary text pools keyed by which axis drifted most and which direction */
export const ART_COMMENTARY = {
  aggression_up: [
    "The founder's restraint was wisdom for their time. These hands have known blood. I have amended the third form accordingly.",
    "Mercy is a choice. In the killing ground, choice is death. I do not think the founder would disagree, had they lived as I have.",
    "The breathing exercises slow the strike. I have removed them from daily practice."
  ],
  aggression_down: [
    "The lineage has grown too fond of the blade's edge. I am returning to the first principles — patience is the deeper weapon.",
    "What my teacher called aggression, I call desperation. I have written a corrective commentary on the fourth section.",
    "The art was always about flow. Somewhere, we forgot this. I am restoring it."
  ],
  mercy_up: [
    "It is easier to end a life than to spare one wisely. The art should teach the harder path.",
    "I disagreed with my master on the final form. I have recorded my reasoning here.",
    "The killing art need not be killing at every moment. I have added a section on restraint to the third chapter."
  ],
  mercy_down: [
    "Sentiment is a wound that does not close. I have removed the forms designed to disable rather than kill.",
    "My teacher was soft. I love their memory and have corrected their error.",
    "The art asks us to be instruments. An instrument does not hesitate."
  ],
  discipline_up: [
    "Three generations of improvisation have left this art unrecognisable. I have returned to the original scaffold.",
    "Freedom without foundation is chaos. I have codified the twenty-two essential movements.",
    "The variations that entered the lineage are indulgent. I am publishing a standardised form."
  ],
  discipline_down: [
    "The codified form was never the art. It was a map. I am teaching navigation, not memorisation.",
    "Rigidity killed my master's senior disciple. I have rewritten the fourth section to allow for variation.",
    "The old masters were geniuses. Their students should not be required to be."
  ],
  patience_up: [
    "Haste is the enemy of depth. I have restored the meditative components my predecessors discarded.",
    "Speed is a symptom. The cause is stillness. I am correcting the emphasis.",
    "The art contains layers that only reveal themselves after years. I have noted where to look."
  ],
  patience_down: [
    "The old forms assume a lifetime of preparation. The Gangho does not grant lifetimes. I have condensed.",
    "Patience is a luxury of the peaceful. I have adapted the technique for those who do not have it.",
    "My teacher meditated for three years before teaching the second form. I do not have the luxury. Neither do my students."
  ],
  sacrifice_up: [
    "The art will ask everything. That is not a flaw — it is the gate through which mastery passes.",
    "My predecessors softened the cost. I am restoring it. The technique was never meant to be comfortable.",
    "What the founder called foundation, I understand now as surrender. I have added this reading to chapter one."
  ],
  sacrifice_down: [
    "The method does not require you to destroy yourself to use it. I have found a more sustainable path.",
    "The old way burned through practitioners in twenty years. I have rebalanced the inner circulation.",
    "A technique only the suicidally committed can use is not a technique — it is an ordeal. I have simplified it."
  ]
};

/* modifiers for branch variant names */
export const ART_BRANCH_NAMES = [
  ["Void","허"], ["Shadow","영"], ["Broken","파"], ["Storm","풍"], ["Iron","철"],
  ["Hidden","은"], ["Pure","정"], ["Ascendant","승"], ["Fallen","락"], ["Fractured","열"]
];

/* ============================================================
   SUCCESSION — legitimacy, factions, resolutions
   ============================================================ */

/* the sources by which a claimant argues their right to lead. Each carries a
   short claim line for the chronicle. */
export const LEGITIMACY_SOURCES = {
  founderBlood:  { label:"Founder's Blood",   claim:"the founder's own blood runs in their veins" },
  heirDesignate: { label:"Named Heir",        claim:"the late head named them successor" },
  martialMerit:  { label:"Martial Merit",     claim:"none in the house can match their art" },
  elderApproval: { label:"Elders' Assent",    claim:"the council of elders stands behind them" },
  popularSupport:{ label:"Popular Support",   claim:"the disciples' hearts follow them" },
  doctrineAlign: { label:"True to Doctrine",  claim:"they embody what the house was founded to be" }
};

/* internal power blocs that form around a vacant seat, each with what it wants */
export const SECT_FACTIONS = {
  elders:   { label:"the Elders",          kr:"장로회",  wants:"stability and the founding way" },
  youth:    { label:"the Young Disciples", kr:"청년제자", wants:"glory and strength" },
  family:   { label:"the Founding Family",  kr:"종가",    wants:"the bloodline unbroken" },
  military: { label:"the Sect's Blades",    kr:"무력대",  wants:"the strongest hand at the helm" }
};

/* how a succession crisis can end */
export const SUCCESSION_RESOLUTIONS = [
  "peaceful", "elderVote", "ritualDuel", "familyTakeover", "coup", "schism", "civilWar", "outsiderSeizure"
];

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

/* ---------------- legendary titles ---------------- */
/*
  A legendary title is NOT a rank above Nature Realm. It is a historical
  recognition earned by deed. At most one living holder per kind. The title
  persists in the chronicle after death — the world remembers.

  kind        : internal key (also used for the "one seat" check)
  en / kr     : display strings
  pathReq     : which art path(s) qualify (null = any path)
  alignReq    : which alignments qualify (null = any)
  realmMin    : minimum realm index required
  test(f,st)  : additional runtime predicate (receives figure + STATE)
  announce    : function(f) → chronicle text fragment
*/
export const LEGENDARY_TITLES = [
  {
    kind: "sword-saint",
    en: "Sword Saint", kr: "검성",
    pathReq: ["sword"],
    alignReq: ["orthodox","unorthodox","recluse"],
    realmMin: 7,
    test: (f) => f.fame >= 60,
    announce: (f) =>
      `The Murim speaks only one name when it speaks of the sword: ${ref(f)} is declared <b class="leg-title">Sword Saint (검성)</b>. There is no peer.`
  },
  {
    kind: "saber-saint",
    en: "Saber Saint", kr: "도성",
    pathReq: ["saber"],
    alignReq: ["orthodox","unorthodox","recluse"],
    realmMin: 7,
    test: (f) => f.fame >= 60,
    announce: (f) =>
      `No blade in the Murim sings like that of ${ref(f)}, who is hailed as <b class="leg-title">Saber Saint (도성)</b> — peerless among those who walk the blade-path.`
  },
  {
    kind: "fist-saint",
    en: "Fist King", kr: "권왕",
    pathReq: ["fist"],
    alignReq: ["orthodox","unorthodox","recluse"],
    realmMin: 7,
    test: (f) => f.fame >= 55,
    announce: (f) =>
      `Bare-handed, without sword or saber, ${ref(f)} has surpassed them all. The Murim recognises a <b class="leg-title">Fist King (권왕)</b>.`
  },
  {
    kind: "spear-saint",
    en: "Spear Saint", kr: "창성",
    pathReq: ["spear"],
    alignReq: null,
    realmMin: 7,
    test: (f) => f.fame >= 55,
    announce: (f) =>
      `At the end of a spear, ${ref(f)} stands where no rival dares follow. The age names them <b class="leg-title">Spear Saint (창성)</b>.`
  },
  {
    kind: "divine-monk",
    en: "Divine Monk", kr: "신승",
    pathReq: ["inner","fist"],
    alignReq: ["orthodox","recluse"],
    realmMin: 7,
    test: (f) => f.fame >= 55 && (f.personality === "devout" || f.personality === "reclusive" || f.personality === "scholarly"),
    announce: (f) =>
      `Beyond martial power, beyond sect rivalry — ${ref(f)} is called simply <b class="leg-title">Divine Monk (신승)</b>. The orthodox world bows.`
  },
  {
    kind: "poison-king",
    en: "Poison King", kr: "독왕",
    pathReq: ["poison","inner"],
    alignReq: ["unorthodox","demonic"],
    realmMin: 6,
    test: (f) => f.fame >= 50 && f.alignmentDrift >= 55,
    announce: (f) =>
      `From a hundred leagues away, the name of ${ref(f)} empties a room. The Gangho crowns them <b class="leg-title">Poison King (독왕)</b> in whispers.`
  },
  {
    kind: "medicine-king",
    en: "Medicine King", kr: "약왕",
    pathReq: ["inner","medicine"],
    alignReq: ["orthodox","recluse","unorthodox"],
    realmMin: 5,
    test: (f) => f.fame >= 45 && (f.personality === "devout" || f.personality === "scholarly" || f.personality === "reclusive"),
    announce: (f) =>
      `Neither war nor grudge has consumed ${ref(f)}. They are known across the Murim as <b class="leg-title">Medicine King (약왕)</b> — the healer whose hands both armies seek.`
  },
  {
    kind: "martial-emperor",
    en: "Martial Emperor", kr: "무제",
    pathReq: null,
    alignReq: ["orthodox","unorthodox"],
    realmMin: 8,
    test: (f, st) => {
      const s = f.sect;
      return f.fame >= 80 && s && s.headId === f.id && st.blocs.some(b => b.alive && b.members.includes(s.id) && b.members.length >= 3);
    },
    announce: (f) =>
      `One name. One throne. Not of kingdoms but of the Murim entire. ${ref(f)} ascends as <b class="leg-title">Martial Emperor (무제)</b> — the undisputed pinnacle of all who walk the martial path.`
  },
  {
    kind: "martial-king",
    en: "Martial King", kr: "무왕",
    pathReq: null,
    alignReq: ["orthodox","unorthodox"],
    realmMin: 7,
    test: (f, st) => {
      const s = f.sect;
      return f.fame >= 70 && s && s.headId === f.id && st.blocs.some(b => b.alive && b.members.includes(s.id) && b.members.length >= 2);
    },
    announce: (f) =>
      `Through war, trial, and long years, ${ref(f)} has proven supremacy over all contenders. The Murim knows them as <b class="leg-title">Martial King (무왕)</b>.`
  },
  /* Heavenly Demon (천마) is handled by the existing threat system —
     see sysLegendaryTitles() which syncs isThreat → legendaryTitle. */
];

/* art suffix → martial path tag (used to match title pathReq) */
export const ART_PATH_BY_SUF = {
  "Singong":  "inner",   // Divine Art
  "Geombeop": "sword",   // Sword Art
  "Dobeop":   "saber",   // Saber Art
  "Gwonbeop": "fist",    // Fist Art
  "Jangbeop": "fist",    // Palm Art  (unarmed)
  "Simbeop":  "inner",   // Heart Method
  "Bobeop":   "inner",   // Step Method
  "Jibeop":   "fist",    // Finger Art (unarmed)
  "Sinbeop":  "inner"    // Movement Art
};

/* forward-declare ref/aref for use inside announce() — populated at runtime */
let ref = f => f.name;

/* called once by systems.js to inject the real ref() helper */
export function initTitleRef(refFn) { ref = refFn; }

/* ---------------- tournaments ---------------- */

export const TOURNEY_NAMES = [
  ["the Heroes' Assembly","군웅대회"],["the Sword Trial of the Gangho","강호검대회"],
  ["the Grand Martial Gathering","무림대회"],["the Lone Peak Tournament","독봉비무"],
  ["the Beggars' Conclave","개방대회"],["the Hundred Blades Meet","백검회"]
];
