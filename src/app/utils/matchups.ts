/**
 * Matchup System — Velaris
 * 
 * Central API that provides champion counters, analysis,
 * recommendations, matchup tips and draft intelligence based
 * on the actual champions picked in Champ Select.
 * 
 * Data is sourced from modular files under /src/app/data/.
 * This data is reactive: when a champion changes, the UI recalculates.
 */

import { CHAMPION_TRAITS, type ChampionTraitData } from "../data/champion-traits";
import { CHAMPION_COUNTERS } from "../data/champion-counters";
import { CHAMPION_ANALYSIS, type ChampionAnalysis } from "../data/champion-analysis";
// Re-export types for consumers
export type { ChampionTraitData, ChampionAnalysis };

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_ANALYSIS: ChampionAnalysis = {
  skills: ["Q", "W", "E"],
  maxOrder: "Q > W > E",
  strengths: ["Pendiente de analisis"],
  weaknesses: [],
  tip: "Analisis detallado no disponible para este campeon aun. Juega con precaucion y adapta al enemigo.",
};

const DEFAULT_TRAIT: ChampionTraitData = {
  trait: "Jugador",
  traitColor: "text-muted-foreground",
  traitBg: "bg-secondary/50",
};

// ─── Public API ──────────────────────────────────────────────────────────────

const UNKNOWN_NAMES = ["???", "Desconocido", "Unknown", "알 수 없음", ""];

function isUnknown(name: string | undefined | null): boolean {
  return !name || UNKNOWN_NAMES.includes(name);
}

export function getChampionAnalysis(championName: string): ChampionAnalysis {
  if (isUnknown(championName)) return DEFAULT_ANALYSIS;
  return CHAMPION_ANALYSIS[championName] || DEFAULT_ANALYSIS;
}

export function getChampionCounters(championName: string, limit = 3): string[] {
  if (isUnknown(championName)) return [];
  return (CHAMPION_COUNTERS[championName] || []).slice(0, limit);
}

export function getChampionTrait(championName: string): ChampionTraitData {
  if (isUnknown(championName)) {
    return { trait: "Eligiendo...", traitColor: "text-muted-foreground", traitBg: "bg-secondary/50" };
  }
  return CHAMPION_TRAITS[championName] || DEFAULT_TRAIT;
}

// ─── Matchup Tips ────────────────────────────────────────────────────────────

const SPECIFIC_MATCHUP_TIPS: Record<string, string> = {
  // ── TOP LANE ──────────────────────────────────────────────────────────────
  "Aatrox_vs_Fiora": "Fiora te countera en duelos largos. Busca trades cortos con Q1>Q2 y retira. Nunca uses W de forma predecible — ella lo ripostea.",
  "Aatrox_vs_Malphite": "Malphite construira armadura. Busca trades cortos con Q y retira con E. No pelees extendido post-6.",
  "Aatrox_vs_Irelia": "Irelia gana trades largos con stacks de pasiva. Tradea cuando no tiene stacks y respeta su nivel 2 all-in.",
  "Aatrox_vs_Camille": "Camille es vulnerable antes de Trinity Force. Castiga sus trades con Q sweetspots. Post-6 ella gana si esquiva tus Q.",
  "Aatrox_vs_Riven": "Riven quiere tradear corto y salir. Espacia tus Q para que no pueda esquivarlos todos. Tu sustain es superior en trades largos.",
  "Aatrox_vs_Darius": "Darius gana trades extendidos con stacks de pasiva. Tradea con Q1-Q2 y sal. Nunca dejes que apile 5 stacks.",
  "Aatrox_vs_Renekton": "Renekton es mas fuerte niveles 1-5. Farmea seguro y espera a nivel 6 donde tu sustain es superior.",
  "Aatrox_vs_Garen": "Garen regenera con pasiva — necesitas trades agresivos constantes. Si lo ignoras, volvera a full HP.",
  "Darius_vs_Vayne": "Vayne te kitea sin que puedas hacer nada. Busca Flash + E para acercarla. Pide ganks.",
  "Darius_vs_Camille": "Camille puede escapar con E. Guarda tu E (pull) para cuando ella salte. Pre-Trinity puedes matarla facil.",
  "Darius_vs_Garen": "Garen regenera pasivamente. Manten presion constante con auto-W-Q. Si le dejas respirar, su sustain anula tu ventaja.",
  "Darius_vs_Teemo": "Teemo te kitea pero es fragil. Si llegas con E, lo matas. Compra Doran's Shield y juega alrededor de los minions.",
  "Darius_vs_Malphite": "Malphite te anula con armadura. Trades cortos con W y retira. Post-6 respeta su R — te pone en posicion de ser gankeado.",
  "Fiora_vs_Malphite": "Tu W riposte su R. Si bloqueas la R, ganas el duelo. Poke con vitales temprano.",
  "Fiora_vs_Darius": "Ripostea su W (slow) o su R para invertir el duelo. Tradea corto niveles 1-3 y busca all-in nivel 6.",
  "Fiora_vs_Shen": "Ripostea el taunt de Shen. Sin taunt, Shen no puede tradearte. Splitpushea — el tiene que usar R y pierde torre.",
  "Fiora_vs_Garen": "Ripostea su Q silence o su R execute. Sin su silence, puedes tradearlo libremente. Ganas splitpush.",
  "Camille_vs_Jax": "Jax te gana post-6 con Counter Strike. Tradea corto con W poke y busca ventaja pre-6. Evita all-ins largos.",
  "Camille_vs_Darius": "No tradees cuerpo a cuerpo. Usa W para poke y sal con E. Post-Trinity puedes matarlo si esquivas E.",
  "Camille_vs_Mordekaiser": "Su R te aisla y te destruye. Compra QSS o evita peleas 1v1 post-6. Roamea y splitpushea cuando no tiene R.",
  "Garen_vs_Teemo": "Teemo te hace sufrir. Q para silenciarlo y correr hacia el. Espera nivel 6 para kill potential.",
  "Garen_vs_Darius": "Darius te gana en trades extendidos. Q silencio y retira. Nunca le dejes apilar 5 stacks de pasiva.",
  "Garen_vs_Vayne": "Vayne es tu pesadilla. No puedes alcanzarla. Farmea bajo torre y pide ganks. Flash Q+R es tu unica opcion.",
  "Shen_vs_Fiora": "Fiora ripostea tu taunt. Varia el timing de E y tradea con Q empowered. Tu valor es global — usa R en tu equipo.",
  "Shen_vs_Darius": "No tradees extendido. Bloquea su dano con W y tradea corto. Tu valor real es el R — prioriza ayudar al equipo.",
  "Mordekaiser_vs_Fiora": "Fiora ripostea tu E o R. Usa E de forma impredecible. Tu R aisla pero ella puede outplayarte — ten cuidado.",
  "Mordekaiser_vs_Vayne": "Tu R contra Vayne es letal si puedes alcanzarla. Flashea E para garantizar el pull en tu Death Realm.",
  "Jax_vs_Fiora": "Tu Counter Strike bloquea sus autos pero ella puede ripostear el stun. Varia el timing. Post-2 items ganas splitpush.",
  "Jax_vs_Camille": "Tu E niega su DPS. Tradea cuando ella usa E. Post-Trinity eres mas fuerte en duelos extendidos.",
  "Sett_vs_Aatrox": "Tu W absorbe su burst de Q. Tradea cuerpo a cuerpo y usa W cuando acumules grit. Aatrox no puede ignorar tu damage.",
  "Sett_vs_Darius": "Ambos sois lane bullies. Tu W countera su R. Tradea con auto-Q-auto y retira. No dejes que apile pasiva.",
  "Renekton_vs_Aatrox": "Eres mas fuerte niveles 1-5. Empuje agresivo con W stun y tradea. Cae tu poder mid-game — cierra pronto.",
  "Renekton_vs_Riven": "Tu stun interrumpe sus combos. Tradea con dash-W-Q y sal. Post-6 tu sustain con R te da ventaja.",
  "Irelia_vs_Aatrox": "Stackea pasiva antes de all-in. Con 4 stacks tu DPS es insuperable. Esquiva sus Q sweetspots con tu Q a minions.",
  "Irelia_vs_Fiora": "Ambas sois duelistas. Nunca pelees sin stacks de pasiva. Post-BORK tu sustain y DPS son superiores.",
  "Riven_vs_Renekton": "Renekton te gana en trades cortos. Escala mejor que el. Juega segura pre-6 y busca all-in con R cuando tenga CDs.",

  // ── MID LANE ──────────────────────────────────────────────────────────────
  "Ahri_vs_Syndra": "Esquiva las Q de Syndra con movilidad. Post-6 tu all-in es mejor si acertas la E.",
  "Ahri_vs_Zed": "Guarda tu R para cuando Zed use su R en ti. Tu E charm lo para mid-dash. Juega segura pre-6.",
  "Ahri_vs_Yasuo": "Tu E pasa a traves de su windwall si lo posicionas bien. Pokea con Q y busca catches post-6.",
  "Ahri_vs_LeBlanc": "LeBlanc te gana en burst corto. Juega a distancia y farmea con Q. Post-6 tu sustain y movilidad son superiores.",
  "Ahri_vs_Katarina": "Tu E interrumpe su R. Guarda charm para cuando ella salte. Pre-6 ella es vulnerable a poke.",
  "Ahri_vs_Viktor": "Viktor escala mejor. Presiona pre-6 con E charm. Post-nivel 6 busca roams — Viktor no puede seguirte.",
  "Zed_vs_Malzahar": "Malzahar te anula con R y pasiva. Roamea en vez de intentar matarlo. Compra QSS.",
  "Zed_vs_Lux": "Lux es free kill si esquivas su Q. Salta con R cuando ella falle el root. Snowballea con kills.",
  "Zed_vs_Ahri": "Ahri puede charm tu R shadow. Baita su E antes de all-in. Tu poke con Q es superior pre-6.",
  "Zed_vs_Viktor": "Viktor es fragil pre-upgrade. Pokea con Q y all-in nivel 6. Despues de Crown/Barrier juega picks con jungler.",
  "Zed_vs_Yasuo": "Yasuo windwall bloquea tu Q. Tradea con W-E-Q desde angulos. Post-6 tu burst es superior si acertas triple Q.",
  "Zed_vs_Diana": "Diana te gana post-6 en all-in prolongado. Tradea corto con combo WEQ y sal. Roamea mas que ella.",
  "Katarina_vs_Galio": "Galio countera todo tu kit. No tradees en linea. Roamea a sidelines para buscar kills.",
  "Katarina_vs_Kassadin": "Kassadin te countera post-6. Mata pre-6 o roamea agresivamente. Si no snowballeas, el te supera.",
  "Katarina_vs_Yasuo": "Yasuo windwall bloquea tus dagas. Espera a que lo use. Tu R es mejor en teamfights que su 1v1.",
  "Katarina_vs_Vex": "Vex te countera con Fear pasivo. Cada dash que hagas activa su empowered. Farmea y roamea — no pelees 1v1.",
  "Katarina_vs_Malzahar": "Malzahar R te cancela todo. Pide QSS y roamea. En lane farmea con Q desde distancia.",
  "Syndra_vs_Yasuo": "Yasuo windwall bloquea tus Q y E. Juega alrededor de su windwall CD (26s). Pokea cuando no lo tiene.",
  "Syndra_vs_Zed": "Zed all-in nivel 6 es letal. Guarda E para stun cuando aparezca su sombra R. Barrier/Zhonyas es esencial.",
  "Syndra_vs_Fizz": "Fizz E esquiva tu combo. Pokea niveles 1-3 antes de que tenga E. Post-6 manten distancia y usa E defensivamente.",
  "Viktor_vs_Ahri": "Ahri te roamea mas rapido. Empuja wave y sigue sus roams. Tu scaling es mejor — farmea bien.",
  "Viktor_vs_Zed": "Zed te mata facil post-6. Compra Seekers temprano y juega bajo torre. Tu teamfight es infinitamente superior.",
  "Viktor_vs_Syndra": "Syndra tiene mas burst temprano. Farmea seguro con E laser y escala. Post-2 items tu AoE domina teamfights.",
  "Yasuo_vs_Renekton": "Renekton es tu peor pesadilla. No tradees sin minions. Farmea seguro y escala. Busca roams.",
  "Yasuo_vs_Ahri": "Tu windwall bloquea su E charm. Juega agresivo despues de bloquearlo. Sin charm, Ahri no puede tradearte.",
  "Yasuo_vs_Annie": "Annie stun + R es mortal. Vigila su pasiva (stacks). Si tiene stun, no te acerques. Sin stun, all-in.",
  "Yasuo_vs_Malzahar": "Malzahar R te anula. Tu windwall no bloquea su R. Compra QSS y roamea. En lane empuja y busca kills en el mapa.",
  "Yone_vs_Ahri": "Ahri E interrumpe tu engage. Baita su charm con E3 antes de usar R. Tu scaling es superior.",
  "Yone_vs_Syndra": "Syndra te pokea fuerte. Farmea con Q y busca all-in post-6 con R-E3. Tu sustain te mantiene vivo.",
  "Yone_vs_Viktor": "Viktor te outranges. Usa E3 para acercarte y tradear. Post-BORK tu sustain y DPS lo superan en duelos.",
  "LeBlanc_vs_Ahri": "Tu burst es superior pero Ahri tiene mas sustain. Tradea con W-Q-E y sal. No prolongues peleas.",
  "LeBlanc_vs_Yasuo": "Yasuo windwall bloquea tu E chain. Tradea con W dash sobre el. Post-6 tu burst lo mata antes de que reaccione.",
  "Fizz_vs_Syndra": "Tu E esquiva todo su combo. Espera a que use Q y salta con E. Post-6 tu all-in es letal.",
  "Fizz_vs_Ahri": "Ahri es escurridiza con R. Espera a que la use defensivamente, luego engagea. Tu burst es mas alto.",
  "Vex_vs_Katarina": "Tu pasiva Fear countera cada dash de Katarina. Ella no puede jugar el juego contra ti. Juega agresiva.",
  "Vex_vs_Yasuo": "Cada dash de Yasuo activa tu Fear. Pokea con Q y guarda R para cuando se acerque. Matchup favorable.",

  // ── JUNGLE ────────────────────────────────────────────────────────────────
  "LeeSin_vs_Graves": "Graves te gana en 1v1 temprano. Evita peleas directas y busca ganks. Tu utilidad mid-game es superior.",
  "LeeSin_vs_Viego": "Viego es vulnerable early. Invade su jungla y busca peleas temprano. Tu kick lo saca de posicion en teamfights.",
  "LeeSin_vs_Kayn": "Kayn es debil pre-forma. Invade agresivamente y gankea sus lanes. No dejes que farmee gratis.",
  "LeeSin_vs_KhaZix": "Kha'Zix te gana aislado. Pelea siempre cerca de minions/aliados. Tu utilidad en teamfights es superior.",
  "LeeSin_vs_Elise": "Ambos sois fuertes early. Trackea sus ganks y counter-gankea. Ella cae mas que tu mid-game.",
  "Graves_vs_LeeSin": "Tu DPS en 1v1 es superior. Farmea rapido y invade. Post-6 tu burst con R es letal en peleas de rift.",
  "Graves_vs_Nidalee": "Nidalee te pokea pero pierde all-in. Fuerza peleas cortas. Tu armour stacks de E te protegen.",
  "Viego_vs_LeeSin": "Lee te invade early. Evita peleas 1v1 antes de BORK. Farmea y escala — tu teamfight con resets es infinitamente mejor.",
  "Viego_vs_Graves": "Graves te outfarmea. Busca ganks en lanes faciles para acumular gold. Post-BORK ganas duelos.",
  "Diana_vs_LeeSin": "Lee es mas fuerte early. Farmea segura hasta nivel 6. Tu R en teamfights es 10x mas impactante que su kick.",
  "Diana_vs_Graves": "Graves te kitea. Espera hasta nivel 6 para all-in. En teamfights tu R AoE destruye.",
  "Hecarim_vs_LeeSin": "Lee te invade early pero tu escalas mejor. Evita peleas 1v1 pre-Trinity y enfocate en ganks veloces.",
  "Hecarim_vs_Graves": "Graves es mas fuerte en 1v1. Gankea lanes y acumula ventaja de equipo. Tu engage con R es superior.",
  "Vi_vs_LeeSin": "Lee es mas movil pero tu burst post-6 es mas fiable. Vigila su posicion y gankea cuando tenga CDs usados.",
  "Vi_vs_Viego": "Tu R lockdown mata a Viego antes de que pueda resetear. Focalizalo en teamfights con R.",
  "Amumu_vs_LeeSin": "Lee te invade facil. Pide ayuda a tu equipo y evita invades. Tu R en teamfight vale mas que todo su kit.",
  "KhaZix_vs_LeeSin": "Lee te gana si pelea cerca de aliados. Busca picks aislados. Tu invisible + burst es letal en late.",
  "Kayn_vs_LeeSin": "Eres debil pre-forma. Farmea y evita peleas. Post-forma (Rhaast o Shadow) tu scaling lo supera.",

  // ── ADC ───────────────────────────────────────────────────────────────────
  "Tristana_vs_Jhin": "Nivel 2 agresivo: salta con W sobre Jhin y explota la E. Jhin no puede tradear si te acercas. Post-6 tu all-in es muy superior.",
  "Tristana_vs_Caitlyn": "Respeta el rango de Caitlyn hasta nivel 3. Busca all-in nivel 6 con tu soporte — Caitlyn pierde duelos cortos.",
  "Tristana_vs_Ezreal": "Empuja la oleada con E y tradea agresivo. Ezreal quiere farmear con Q — no le dejes. Tu burst es superior.",
  "Tristana_vs_Draven": "Cuidado con sus hachas nivel 1-2. Espera a nivel 3 para all-in con E bomb. Tu W te da distancia si necesitas huir.",
  "Tristana_vs_Vayne": "Vayne te gana en duelos extendidos post-BORK. Busca burst rapido con E bomb antes de que pueda kitearte.",
  "Tristana_vs_Jinx": "Jinx es mas fuerte en teamfights tardias. Presiona agresivamente en lane con E bomb para snowballear.",
  "Vayne_vs_Caitlyn": "Respeta el rango de Caitlyn. Farmea con Q y espera tu soporte para engage. Post-BORK eres mas fuerte.",
  "Vayne_vs_Draven": "Draven te destroza early. Farmea bajo torre. Post-BORK + 1 item puedes duelearlo con condemn contra pared.",
  "Vayne_vs_Jinx": "Jinx tiene mas rango. Busca trades cortos y condemn contra pared. Tu DPS escalado es comparable al suyo.",
  "Vayne_vs_Tristana": "Tristana te mata con burst rapido. Condemnea cuando salte hacia ti para cancelar su engage.",
  "Vayne_vs_MissFortune": "MF te pokea con Q bounce. Posicionate lejos de minions moribundos. Post-BORK tu true damage la derrite.",
  "Vayne_vs_Kaisa": "Ambas escalais bien. Tu true damage countera su build de armadura. Condemn contra pared es clave.",
  "Jinx_vs_Draven": "Draven te destroza en lane. Juega segura, farmea bajo torre. Post-2 items tu teamfight es muy superior.",
  "Jinx_vs_Caitlyn": "Caitlyn te outranges early. Farmea segura y empuja con rockets. Post-2 items tu AoE y DPS la superan.",
  "Jinx_vs_Lucian": "Lucian domina early con burst corto. Respeta su nivel 2. Post-3 items tu DPS con rockets escala mucho mas.",
  "Jinx_vs_MissFortune": "MF tiene mas burst con R. Manten minions entre vosotras. Tu scaling es mejor — aguanta hasta 2 items.",
  "Jhin_vs_Tristana": "Tristana salta encima. Usa W root cuando salte y manten distancia. Tu utilidad con W-R es superior en mid-game.",
  "Jhin_vs_Vayne": "Vayne te gana en duelo 1v1. Usa rango con Q-W y nunca dejes que se acerque. Tu utilidad es tu fuerza.",
  "Jhin_vs_Draven": "Draven te out-DPSea. Tradea con Q rebote y W slow. Tu 4to disparo es tu mejor herramienta de tradeo.",
  "Caitlyn_vs_Vayne": "Tu rango es tu ventaja. Pokea constantemente y controla con traps. Nunca dejes que Vayne se acerque.",
  "Caitlyn_vs_Tristana": "Tristana all-in nivel 6 es peligroso. Manten traps defensivos y pokea con Q. Si salta, E-headshot y retira.",
  "Caitlyn_vs_Jinx": "Dominas lane pero Jinx escala mejor. Acumula ventaja de torre con trap zone y termina antes de late game.",
  "Draven_vs_Vayne": "Destroza a Vayne early. Tradea con hachas constantemente. Si no snowballeas, ella te supera post-BORK.",
  "Draven_vs_Jinx": "Ganas lane hard. Presiona y acumula stacks de pasiva. Si no cierras pronto, Jinx te outscalea en teamfights.",
  "Draven_vs_Ezreal": "Ezreal juega seguro con E. Empuja wave y busca trades cuando su E esta en CD. Tu DPS early es muy superior.",
  "MissFortune_vs_Vayne": "Pokea con Q bounce a traves de minions. Tu R destruye si Vayne no tiene tumble. No la dejes acercarse.",
  "MissFortune_vs_Jinx": "Tu R burst es superior en teamfight temprana. Juega agresiva pre-3 items. Jinx te supera en ultra-late.",
  "Ezreal_vs_Draven": "Draven te mata si te alcanza. Manten distancia con Q poke y guarda E para su engage. Farmea seguro.",
  "Ezreal_vs_Caitlyn": "Caitlyn te outranges. Farmea con Q y busca trades cuando ella falle abilities. Tu poke es bueno mid-game.",
  "Lucian_vs_Vayne": "Tu burst early es superior. Tradea con pasiva y domina niveles 1-5. Si no sacas ventaja, ella te supera.",
  "Lucian_vs_Jinx": "Dominas lane con burst corto. Presiona agresivamente. Si la partida se extiende, Jinx escala mas.",
  "Kaisa_vs_Caitlyn": "Caitlyn te pokea demasiado. Farmea segura y espera tu soporte para engage. Post-Navori tu burst es letal.",
  "Kaisa_vs_Draven": "Draven te destroza early. Juega defensiva y farmea. Post-2 items tu burst con W-Q aislado lo mata.",
  "Samira_vs_Nautilus": "Nautilus te lockdownea antes de que puedas usar R. Baita su engage antes de ir all-in. Necesitas QSS o Cleanse.",
  "Samira_vs_Vayne": "Vayne te kitea con condemn. Espera a que use condemn y luego engagea. Tu lifesteal con R es masivo.",

  // ── SUPPORT ───────────────────────────────────────────────────────────────
  "Nautilus_vs_Morgana": "Morgana Black Shield bloquea tu Q hook. Espera a que lo use en un aliado y luego hookea al ADC.",
  "Nautilus_vs_Lulu": "Lulu te polymorpha cuando engageas. Baita su W o hookea cuando tiene CD. Tu CC chain es mas larga.",
  "Nautilus_vs_Thresh": "Thresh flay cancela tu engage. Hookea desde angulos donde no espere el flay. Tu CC es mas fiable.",
  "Blitzcrank_vs_Morgana": "Black Shield anula tu hook. Busca hookear a Morgana primero o espera a que Black Shield expire.",
  "Blitzcrank_vs_Sivir": "Sivir spellshield bloquea tu Q. Usa E primero para quemar spellshield, luego hookea.",
  "Blitzcrank_vs_Ezreal": "Ezreal E esquiva tu hook. Espera a que use E y luego Q. Presiona la ventana de 25s sin escape.",
  "Thresh_vs_Nautilus": "Usa flay para cancelar el engage de Nautilus. Tu lantern salva aliados de su lockdown.",
  "Thresh_vs_Leona": "Flay cancela el dash de Leona E. Si cancelas su engage, ella queda expuesta sin defensas.",
  "Leona_vs_Morgana": "Morgana te anula completamente. No engagees sobre alguien con Black Shield. Busca catches cuando no la tenga.",
  "Leona_vs_Lulu": "Lulu te polymorpha mid-engage. Espera a que use W y luego engagea. Sin polymorph, tu lockdown es letal.",
  "Lulu_vs_Leona": "Polymorph a Leona cuando engagee para cancelar su CC chain. Protege a tu ADC con E shield + R.",
  "Lulu_vs_Zed": "Tu polymorph y R countera el all-in de Zed. Cuando Zed use R, polymorpha y ulti a tu ADC.",
  "Morgana_vs_Nautilus": "Tu Black Shield anula todo su engage. Shieldea al objetivo del hook. Tu lane es extremadamente segura.",
  "Morgana_vs_Leona": "Black Shield bloquea todo el CC de Leona. Shieldea proactivamente cuando Leona busque engage.",
  "Pyke_vs_Nautilus": "Nautilus te lockdownea y eres fragil. Busca hooks desde fog of war y juega picks, no peleas frontales.",
  "Pyke_vs_Lulu": "Lulu te polymorpha cuando engageas. Busca flanqueos con E invisible. Tu execute ignora su R shield.",
  "Bard_vs_Thresh": "Tu movilidad con E portales te da control de mapa superior. Roamea y colecta chimes para escalar.",
  "Bard_vs_Leona": "Tu R congela a Leona si engagea. Usa ult defensivamente para salvar aliados del lockdown.",
  "Senna_vs_Nautilus": "Nautilus te mata si te hookea. Manten distancia extrema y pokea con Q. Tu scaling es infinito — sobrevive lane.",
  "Senna_vs_Caitlyn": "Caitlyn te outranges early. Farmea souls y escala. Post-20 min tu rango y dano la superan.",
};

export function getMatchupTip(allyChamp: string, enemyChamp: string): string {
  const allyAnalysis = getChampionAnalysis(allyChamp);
  if (isUnknown(enemyChamp)) return allyAnalysis.tip;

  const key = `${allyChamp}_vs_${enemyChamp}`;
  if (SPECIFIC_MATCHUP_TIPS[key]) return SPECIFIC_MATCHUP_TIPS[key];

  return allyAnalysis.tip;
}

export function getThreatLevel(allyChamp: string, enemyChamp: string): "low" | "medium" | "high" {
  if (isUnknown(enemyChamp)) return "medium";
  const enemyCounters = CHAMPION_COUNTERS[enemyChamp] || [];
  if (enemyCounters.includes(allyChamp)) return "high";
  const allyCounters = CHAMPION_COUNTERS[allyChamp] || [];
  if (allyCounters.includes(enemyChamp)) return "low";
  return "medium";
}

// ─── Champion Recommendations per Role ───────────────────────────────────────

export interface ChampionRecommendation {
  champion: string;
  winrate: number;
  reason: string;
  difficulty: "easy" | "medium" | "hard";
}

const ROLE_PICKS: Record<string, ChampionRecommendation[]> = {
  TOP: [
    { champion: "Garen",       winrate: 53.1, reason: "Simple, solido, escala bien",             difficulty: "easy" },
    { champion: "Malphite",    winrate: 52.4, reason: "Tanque fiable con R imbatible",           difficulty: "easy" },
    { champion: "Shen",        winrate: 52.0, reason: "Protector global, taunt fiable",          difficulty: "medium" },
    { champion: "Sett",        winrate: 51.8, reason: "Brawler simple con W devastador",         difficulty: "easy" },
    { champion: "Mordekaiser", winrate: 51.5, reason: "Aisla carries con R, sustain alto",       difficulty: "easy" },
    { champion: "Camille",     winrate: 51.3, reason: "Duelista precisa, escala fuerte",         difficulty: "hard" },
    { champion: "Jax",         winrate: 51.2, reason: "Escalado fuerte, split push",             difficulty: "medium" },
    { champion: "Fiora",       winrate: 51.0, reason: "Duelista — domina split push",            difficulty: "hard" },
    { champion: "Darius",      winrate: 50.8, reason: "Lane bully, aplasta fase de linea",       difficulty: "medium" },
    { champion: "Aatrox",      winrate: 50.5, reason: "Seguro, buena fase de linea y teamfight", difficulty: "medium" },
  ],
  JGL: [
    { champion: "Amumu",    winrate: 53.2, reason: "Teamfight increible, facil de jugar", difficulty: "easy" },
    { champion: "Diana",    winrate: 52.1, reason: "AoE devastadora en teamfights",      difficulty: "medium" },
    { champion: "Vi",       winrate: 52.0, reason: "Lockdown facil, ganks efectivos",     difficulty: "easy" },
    { champion: "Hecarim",  winrate: 51.5, reason: "Engage rapido, buena limpieza",       difficulty: "medium" },
    { champion: "JarvanIV", winrate: 51.0, reason: "Engage fiable, versatil",             difficulty: "medium" },
    { champion: "Viego",    winrate: 50.8, reason: "Reseteo letal en peleas",             difficulty: "medium" },
    { champion: "Graves",   winrate: 50.2, reason: "Jungla dominante, buen clear",        difficulty: "medium" },
    { champion: "LeeSin",   winrate: 48.5, reason: "Presencia temprana, mecanico",        difficulty: "hard" },
  ],
  MID: [
    { champion: "Ahri",     winrate: 52.3, reason: "Segura, buena roam, escapes",     difficulty: "medium" },
    { champion: "Lux",      winrate: 52.0, reason: "Poke seguro, buen CC",            difficulty: "easy" },
    { champion: "Viktor",   winrate: 51.5, reason: "Control de zona, scaling fuerte",  difficulty: "medium" },
    { champion: "Zed",      winrate: 50.8, reason: "Asesino de sombras, kill pressure", difficulty: "hard" },
    { champion: "Syndra",   winrate: 50.6, reason: "Burst masivo, control de zona",    difficulty: "medium" },
    { champion: "Yone",     winrate: 50.2, reason: "Engage + carry, escala bien",      difficulty: "medium" },
    { champion: "Katarina", winrate: 50.1, reason: "Reseteo letal, roam agresivo",     difficulty: "hard" },
    { champion: "Yasuo",    winrate: 49.5, reason: "Alto techo, necesita practica",    difficulty: "hard" },
  ],
  ADC: [
    { champion: "Tristana",     winrate: 52.8, reason: "All-in agresivo, auto-peel",     difficulty: "medium" },
    { champion: "Vayne",        winrate: 52.1, reason: "Tank shredder, escalado",         difficulty: "hard" },
    { champion: "Jhin",         winrate: 51.9, reason: "Utilidad + dano, seguro",         difficulty: "easy" },
    { champion: "MissFortune",  winrate: 51.8, reason: "R AoE devastadora, facil",        difficulty: "easy" },
    { champion: "Ashe",         winrate: 51.8, reason: "Utilidad global, facil",           difficulty: "easy" },
    { champion: "Jinx",         winrate: 51.5, reason: "Hypercarry, teamfight monster",   difficulty: "medium" },
    { champion: "Caitlyn",      winrate: 51.2, reason: "Domina fase de linea, traps",     difficulty: "medium" },
    { champion: "Lucian",       winrate: 50.8, reason: "Burst ADC, domina early",         difficulty: "medium" },
    { champion: "Kaisa",        winrate: 50.5, reason: "Versatil, burst + DPS",           difficulty: "medium" },
    { champion: "Ezreal",       winrate: 49.8, reason: "Seguro, poke, movilidad",         difficulty: "medium" },
  ],
  SUP: [
    { champion: "Lulu",       winrate: 52.5, reason: "Protege al carry, escala",     difficulty: "easy" },
    { champion: "Bard",       winrate: 52.5, reason: "Roaming, portales, R unica",   difficulty: "hard" },
    { champion: "Leona",      winrate: 52.0, reason: "All-in imparable, tanque",     difficulty: "easy" },
    { champion: "Nautilus",   winrate: 51.8, reason: "Engage agresivo, mucho CC",    difficulty: "easy" },
    { champion: "Morgana",    winrate: 51.5, reason: "Anti-engage, Black Shield",    difficulty: "medium" },
    { champion: "Blitzcrank", winrate: 51.0, reason: "Un hook = kill",               difficulty: "medium" },
    { champion: "Senna",      winrate: 50.8, reason: "Scaling infinito, utilidad",   difficulty: "medium" },
    { champion: "Thresh",     winrate: 50.3, reason: "Playmaker completo",           difficulty: "hard" },
  ],
};

export function getRecommendationsForRole(
  role: string,
  enemyChamp?: string
): ChampionRecommendation[] {
  const picks = [...(ROLE_PICKS[role] || ROLE_PICKS["ADC"])];
  if (!enemyChamp || isUnknown(enemyChamp)) {
    return picks.sort((a, b) => b.winrate - a.winrate);
  }
  return picks.map(p => {
    const counters = CHAMPION_COUNTERS[enemyChamp] || [];
    const isCounter = counters.includes(p.champion);
    return {
      ...p,
      winrate: isCounter ? p.winrate + 3.5 : p.winrate,
      reason: isCounter ? `Counter a ${enemyChamp} — ${p.reason}` : p.reason,
    };
  }).sort((a, b) => b.winrate - a.winrate);
}

// ─── Dynamic Draft Guide Generator ──────────────────────────────────────────

export interface DraftGuide {
  synergy: string;
  winConditions: string[];
  threats: string[];
  strategy: string;
}

export function generateDraftGuide(
  allies: { role: string; champ: string }[],
  enemies: { role: string; champ: string; hidden: boolean }[]
): DraftGuide {
  const pickedAllies = allies.filter(a => !isUnknown(a.champ));
  const pickedEnemies = enemies.filter(e => !e.hidden && !isUnknown(e.champ));

  // Classify allies
  const tanks = pickedAllies.filter(a => {
    const t = CHAMPION_TRAITS[a.champ];
    return t && (t.trait.includes("Tank") || t.trait.includes("Iniciador") || t.trait.includes("Engage") || t.trait.includes("Protector") || t.trait.includes("Wall") || t.trait.includes("Lockdown"));
  });
  const carries = pickedAllies.filter(a => {
    const t = CHAMPION_TRAITS[a.champ];
    return t && (t.trait.includes("Carry") || t.trait.includes("Hypercarry") || t.trait.includes("Monster") || t.trait.includes("Burst") || t.trait.includes("Asesina") || t.trait.includes("DPS") || t.trait.includes("Snowball") || t.trait.includes("Queen"));
  });

  // Synergy
  let synergy = "";
  if (tanks.length >= 2) {
    synergy = `Composicion de engage/pelea: ${tanks.map(t => t.champ).join(" + ")} proveen mucho CC e iniciacion. `;
  } else if (tanks.length === 1) {
    synergy = `${tanks[0].champ} es el unico engage — el equipo depende de sus iniciaciones. `;
  } else {
    synergy = `Composicion sin frontline claro — necesitan ganar por picks individuales o poke. `;
  }
  if (carries.length >= 2) {
    synergy += `${carries.map(c => c.champ).join(" y ")} son las amenazas principales de dano. La composicion escala bien a late game.`;
  } else if (carries.length === 1) {
    synergy += `${carries[0].champ} es el carry principal — todo el equipo debe protegerlo en teamfights.`;
  } else {
    synergy += `El dano esta distribuido — no hay un carry claro, el equipo gana por utilidad y CC.`;
  }

  // Win conditions
  const winConditions: string[] = [];
  const adc = pickedAllies.find(a => a.role === "ADC");
  const sup = pickedAllies.find(a => a.role === "SUP");
  const jgl = pickedAllies.find(a => a.role === "JGL");
  const mid = pickedAllies.find(a => a.role === "MID");
  const top = pickedAllies.find(a => a.role === "TOP");

  if (adc && sup) {
    const adcTrait = CHAMPION_TRAITS[adc.champ];
    if (adcTrait?.trait.includes("Hypercarry") || adcTrait?.trait.includes("Monster") || adcTrait?.trait.includes("Scaler")) {
      winConditions.push(`Proteger a ${adc.champ} hasta 3 items — a partir de ahi gana teamfights solo`);
    } else {
      winConditions.push(`Ganar la linea BOT con ${adc.champ} + ${sup.champ} y acumular ventaja de torres`);
    }
  }
  if (jgl) {
    winConditions.push(`Controlar objetivos (Dragon/Heraldo) con la presion de ${jgl.champ}`);
  }
  if (mid) {
    const midTrait = CHAMPION_TRAITS[mid.champ];
    if (midTrait?.trait.includes("Roam") || midTrait?.trait.includes("Asesina") || midTrait?.trait.includes("Assassin")) {
      winConditions.push(`${mid.champ} debe roamear agresivamente despues del nivel 6`);
    } else {
      winConditions.push(`${mid.champ} debe mantener prioridad mid para facilitar rotaciones`);
    }
  }
  if (top) {
    const topTrait = CHAMPION_TRAITS[top.champ];
    if (topTrait?.trait.includes("Split") || topTrait?.trait.includes("Duelista")) {
      winConditions.push(`${top.champ} debe split push para crear presion lateral`);
    } else if (topTrait?.trait.includes("Global") || topTrait?.trait.includes("Protector")) {
      winConditions.push(`${top.champ} debe usar su presencia global para asistir al equipo`);
    }
  }
  if (winConditions.length === 0) {
    winConditions.push("Farmear de forma segura y escalar hacia teamfights de medio/late game");
  }

  // Threats
  const threats: string[] = [];
  for (const enemy of pickedEnemies) {
    const enemyTrait = CHAMPION_TRAITS[enemy.champ];
    if (enemyTrait) {
      if (enemyTrait.trait.includes("Engage") || enemyTrait.trait.includes("Iniciador") || enemyTrait.trait.includes("Imbatible")) {
        threats.push(`${enemy.champ} (${enemy.role}) tiene engage potente — spread out y vigila sus timings`);
      } else if (enemyTrait.trait.includes("Asesina") || enemyTrait.trait.includes("Asesino") || enemyTrait.trait.includes("Assassin") || enemyTrait.trait.includes("Burst") || enemyTrait.trait.includes("Letal")) {
        const target = adc?.champ || carries[0]?.champ || "tu carry";
        threats.push(`${enemy.champ} puede burstar a ${target} — posicionar con cuidado`);
      } else if (enemyTrait.trait.includes("Hypercarry") || enemyTrait.trait.includes("Monster") || enemyTrait.trait.includes("Infinite") || enemyTrait.trait.includes("Scaler")) {
        threats.push(`${enemy.champ} escala infinitamente — cerrar la partida antes de que llegue a late`);
      }
    }
  }
  const unknowns = enemies.filter(e => e.hidden);
  if (unknowns.length > 0) {
    threats.push(`${unknowns.length} pick(s) enemigo(s) sin revelar — puede haber amenazas ocultas`);
  }
  if (threats.length === 0) {
    threats.push("No se detectan amenazas criticas — jugar con confianza y forzar peleas ventajosas");
  }

  // Strategy
  let strategy = "";
  if (tanks.length >= 2 && carries.length >= 1) {
    strategy = `Composicion de teamfight: agrupense para objetivos y fuercen peleas 5v5 donde ${tanks.map(t => t.champ).join(" y ")} pueden iniciar. ${carries[0]?.champ || "El carry"} debe mantenerse atras y hacer DPS libre.`;
  } else if (carries.length >= 2) {
    strategy = `Doble amenaza: ${carries.map(c => c.champ).join(" y ")} deben acumular recursos. Jugar fase de lineas agresiva y escalar. Evitar peleas desfavorables antes de 2 items core.`;
  } else if (tanks.length >= 1) {
    strategy = `${tanks[0].champ} debe liderar el engage. Jugar alrededor de objetivos y forzar peleas agrupadas cuando ${tanks[0].champ} tiene R disponible.`;
  } else {
    strategy = `Adaptar el juego segun el estado de la partida. Priorizar objetivos y vision. ${pickedAllies.length > 0 ? `${pickedAllies[0].champ} debe liderar las peleas` : "Coordinar engages"}.`;
  }

  return { synergy, winConditions, threats, strategy };
}

// ─── Ban Suggestions ──────────────────────────────────────────────────────────

export interface BanSuggestion {
  champion: string;
  reason: string;
  winrate: number;
  banrate: number;
}

const ROLE_BAN_PRIORITIES: Record<string, BanSuggestion[]> = {
  TOP: [
    { champion: "Ambessa", reason: "Domina trades cortos y escala bien", winrate: 52.8, banrate: 38.2 },
    { champion: "Ksante", reason: "Tanque con demasiado daño y movilidad", winrate: 51.4, banrate: 25.1 },
    { champion: "Yone", reason: "Hypercarry imposible de contener en late", winrate: 50.9, banrate: 31.5 },
    { champion: "Camille", reason: "Split push imparable y true damage", winrate: 51.2, banrate: 18.4 },
    { champion: "Darius", reason: "Lane bully que snowballea fuerte", winrate: 51.7, banrate: 22.3 },
    { champion: "Fiora", reason: "Duelista imbatible en side lane", winrate: 51.5, banrate: 15.8 },
    { champion: "Jax", reason: "Escala infinitamente y gana 1v1 a cualquiera", winrate: 51.1, banrate: 12.4 },
    { champion: "Aurora", reason: "Poke opresivo y roams letales", winrate: 52.1, banrate: 20.6 },
  ],
  JGL: [
    { champion: "LeeSin", reason: "Presión early extrema y picks letales", winrate: 50.5, banrate: 18.7 },
    { champion: "Viego", reason: "Resets en teamfights lo hacen imparable", winrate: 51.8, banrate: 24.3 },
    { champion: "Graves", reason: "Farmeo rápido y duelo 1v1 dominante", winrate: 51.3, banrate: 15.2 },
    { champion: "Elise", reason: "Ganks pre-6 casi imposibles de evitar", winrate: 51.6, banrate: 12.8 },
    { champion: "Nocturne", reason: "R global genera presión de mapa constante", winrate: 52.2, banrate: 14.1 },
    { champion: "Shaco", reason: "Invade y ganks impredecibles frustran", winrate: 51.9, banrate: 28.5 },
    { champion: "Briar", reason: "Engage imparable y lifesteal masivo", winrate: 52.4, banrate: 22.1 },
    { champion: "KhaZix", reason: "Burst letal en picks aislados", winrate: 51.0, banrate: 16.3 },
  ],
  MID: [
    { champion: "Ahri", reason: "Segura, tiene pick potential con E+R", winrate: 52.0, banrate: 16.5 },
    { champion: "Yone", reason: "Hypercarry con engage y sustain absurdo", winrate: 50.9, banrate: 31.5 },
    { champion: "Syndra", reason: "Burst oneshot desde rango seguro", winrate: 51.4, banrate: 13.2 },
    { champion: "Katarina", reason: "Roams y resets en teamfights", winrate: 51.7, banrate: 19.8 },
    { champion: "Zed", reason: "Burst letal en mid game, difícil de pelear", winrate: 51.2, banrate: 25.4 },
    { champion: "Naafiri", reason: "Roams agresivos y burst muy alto", winrate: 52.3, banrate: 14.7 },
    { champion: "Aurora", reason: "Utility y daño opresivos desde rango", winrate: 52.1, banrate: 20.6 },
    { champion: "LeBlanc", reason: "Burst, movilidad y deceive imposibles", winrate: 50.8, banrate: 11.9 },
  ],
  ADC: [
    { champion: "Jinx", reason: "Hypercarry que domina teamfights late", winrate: 52.5, banrate: 15.3 },
    { champion: "Kaisa", reason: "Burst + mobility la hacen inalcanzable", winrate: 51.3, banrate: 14.8 },
    { champion: "Vayne", reason: "True damage % HP destroza frontline", winrate: 51.8, banrate: 18.6 },
    { champion: "Draven", reason: "Lane bully que snowballea con kills", winrate: 52.1, banrate: 16.2 },
    { champion: "Samira", reason: "Engage + lifesteal masivo con R", winrate: 51.6, banrate: 12.7 },
    { champion: "Caitlyn", reason: "Rango superior oprime en lane", winrate: 51.0, banrate: 11.3 },
    { champion: "Jhin", reason: "Utility + burst a distancia segura", winrate: 52.0, banrate: 10.5 },
    { champion: "Smolder", reason: "Escalado infinito, late game monster", winrate: 51.4, banrate: 22.9 },
  ],
  SUP: [
    { champion: "Nautilus", reason: "CC chain que garantiza kills", winrate: 52.3, banrate: 17.4 },
    { champion: "Blitzcrank", reason: "Un hook = kill garantizada", winrate: 52.8, banrate: 32.1 },
    { champion: "Thresh", reason: "Playmaker con CC y utility infinita", winrate: 51.0, banrate: 14.6 },
    { champion: "Lulu", reason: "Polymorph anula assassins y carries", winrate: 52.5, banrate: 21.3 },
    { champion: "Pyke", reason: "Assassin support con execute y gold", winrate: 51.4, banrate: 19.8 },
    { champion: "Milio", reason: "Cleanse AoE y peel excesivo", winrate: 53.1, banrate: 25.7 },
    { champion: "Rell", reason: "Engage tanque con CC masivo", winrate: 52.0, banrate: 12.4 },
    { champion: "Senna", reason: "Escalado infinito como support", winrate: 51.7, banrate: 13.9 },
  ],
};

const GENERIC_BANS: BanSuggestion[] = [
  { champion: "Yone", reason: "Hypercarry con engage y sustain", winrate: 50.9, banrate: 31.5 },
  { champion: "Ambessa", reason: "Domina top con trades y escala", winrate: 52.8, banrate: 38.2 },
  { champion: "Blitzcrank", reason: "Un hook cambia la partida", winrate: 52.8, banrate: 32.1 },
  { champion: "Shaco", reason: "Ganks impredecibles que frustran", winrate: 51.9, banrate: 28.5 },
  { champion: "Viego", reason: "Resets en teamfights lo hacen imparable", winrate: 51.8, banrate: 24.3 },
  { champion: "Milio", reason: "Cleanse AoE invalida engages", winrate: 53.1, banrate: 25.7 },
];

export function getBanSuggestions(role: string, alreadyBanned: string[] = []): BanSuggestion[] {
  const normalizedRole = role.toUpperCase();
  const roleBans = ROLE_BAN_PRIORITIES[normalizedRole] || GENERIC_BANS;

  const filtered = roleBans.filter(
    (ban) => !alreadyBanned.some((b) => b.toLowerCase() === ban.champion.toLowerCase())
  );

  if (filtered.length < 3) {
    const extraBans = GENERIC_BANS.filter(
      (ban) =>
        !alreadyBanned.some((b) => b.toLowerCase() === ban.champion.toLowerCase()) &&
        !filtered.some((f) => f.champion === ban.champion)
    );
    return [...filtered, ...extraBans].slice(0, 8);
  }

  return filtered.slice(0, 8);
}

// ─── Power Spike Timeline ────────────────────────────────────────────────────

export interface PowerSpike {
  phase: "early" | "mid" | "late";
  level: number;
  label: string;
  description: string;
}

export interface PowerCurve {
  early: number;
  mid: number;
  late: number;
  spikes: PowerSpike[];
}

const POWER_CURVES: Record<string, PowerCurve> = {
  // ── TOP ──
  Aatrox:       { early: 55, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "R Sustain", description: "World Ender le da sustain masivo y presion de teamfight" }, { phase: "mid", level: 11, label: "Gore + Cleaver", description: "2 items core completan su build de teamfight" }] },
  Camille:      { early: 40, mid: 75, late: 90, spikes: [{ phase: "mid", level: 6, label: "R Lockdown", description: "Hextech Ultimatum aisla objetivos para duelo" }, { phase: "late", level: 13, label: "Trinity + Ravenous", description: "True damage de Q2 escala brutalmente" }] },
  Darius:       { early: 85, mid: 65, late: 40, spikes: [{ phase: "early", level: 3, label: "All-in", description: "Q+W+E combo con 5 stacks = kill casi garantizada" }, { phase: "mid", level: 6, label: "Noxian Guillotine", description: "Execute con R reseteable en peleas" }] },
  Fiora:        { early: 50, mid: 70, late: 95, spikes: [{ phase: "early", level: 1, label: "Vital Trade", description: "Vitales dan trades favorables desde nivel 1" }, { phase: "late", level: 13, label: "Duelist Queen", description: "Ravenous + 2 items = imbatible en side lane" }] },
  Garen:        { early: 60, mid: 70, late: 55, spikes: [{ phase: "mid", level: 6, label: "Demacian Justice", description: "R execute escala con HP perdida del enemigo" }, { phase: "mid", level: 11, label: "Stridebreaker", description: "Puede alcanzar carries con slow + Q" }] },
  Irelia:       { early: 70, mid: 80, late: 60, spikes: [{ phase: "early", level: 2, label: "4 Stack All-in", description: "Con 4 stacks de pasiva gana casi cualquier trade" }, { phase: "mid", level: 9, label: "BORK Spike", description: "Blade of the Ruined King completa su duelo" }] },
  Jax:          { early: 45, mid: 65, late: 95, spikes: [{ phase: "mid", level: 6, label: "R Resists", description: "Grandmaster's Might da resistencias masivas" }, { phase: "late", level: 16, label: "Late Monster", description: "3+ items con R lo hacen imbatible 1v1" }] },
  Malphite:     { early: 30, mid: 60, late: 80, spikes: [{ phase: "mid", level: 6, label: "Unstoppable R", description: "R engage no se puede parar — teamfight changer" }, { phase: "mid", level: 11, label: "Full Armor", description: "Stack de armadura lo hace inmortal vs AD" }] },
  Mordekaiser:  { early: 55, mid: 75, late: 65, spikes: [{ phase: "mid", level: 6, label: "Death Realm", description: "R aisla a un enemigo en 1v1 forzado" }, { phase: "mid", level: 9, label: "Riftmaker", description: "Sustain + damage omnivamp sostenido" }] },
  Renekton:     { early: 85, mid: 55, late: 30, spikes: [{ phase: "early", level: 3, label: "Triple Combo", description: "E-W-Q con furia es el trade mas fuerte del juego" }, { phase: "mid", level: 6, label: "R Stats", description: "R da HP y damage AoE para all-in" }] },
  Riven:        { early: 60, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Wind Slash", description: "R da AD extra y execute con recast" }, { phase: "mid", level: 11, label: "CDR Build", description: "Con 2 items + CDR sus combos son imparables" }] },
  Sett:         { early: 75, mid: 70, late: 50, spikes: [{ phase: "early", level: 1, label: "Auto Trade", description: "Pasiva de doble golpe gana trades nivel 1" }, { phase: "mid", level: 6, label: "Haymaker + R", description: "W true damage + R reposiciona peleas" }] },
  Shen:         { early: 50, mid: 70, late: 65, spikes: [{ phase: "mid", level: 6, label: "Global Ult", description: "R shield a cualquier aliado en el mapa" }, { phase: "mid", level: 11, label: "Titanic", description: "Titanic Hydra le da split push + teamfight" }] },
  // ── MID ──
  Ahri:         { early: 50, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Triple Dash", description: "R da 3 dashes para outplay y picks" }, { phase: "mid", level: 9, label: "Luden's", description: "Primer item completa su burst combo" }] },
  Fizz:         { early: 35, mid: 90, late: 60, spikes: [{ phase: "mid", level: 6, label: "Shark", description: "R hace posible oneshots desde distancia" }, { phase: "mid", level: 11, label: "Lich + Zhonyas", description: "2 items = puede matar a cualquier carry" }] },
  Katarina:     { early: 40, mid: 85, late: 75, spikes: [{ phase: "mid", level: 6, label: "Death Lotus", description: "R AoE masivo con resets en kills" }, { phase: "mid", level: 11, label: "Nashor's", description: "On-hit build le da DPS sostenido" }] },
  Kassadin:     { early: 15, mid: 50, late: 100, spikes: [{ phase: "mid", level: 6, label: "Riftwalk", description: "R le da movilidad y burst basico" }, { phase: "late", level: 16, label: "God Mode", description: "R nivel 3 + 3 items = nivel 16 nightmare" }] },
  LeBlanc:      { early: 65, mid: 85, late: 45, spikes: [{ phase: "early", level: 3, label: "W Combo", description: "W-Q-E burst temprano es devastador" }, { phase: "mid", level: 6, label: "Mimic", description: "R copia abilities para burst doble" }] },
  Syndra:       { early: 55, mid: 85, late: 70, spikes: [{ phase: "mid", level: 6, label: "Unleashed", description: "R burst con esferas acumuladas" }, { phase: "mid", level: 9, label: "Luden's", description: "Primer item maximiza su burst combo" }] },
  Viktor:       { early: 35, mid: 70, late: 95, spikes: [{ phase: "mid", level: 8, label: "E Upgrade", description: "E upgrade da waveclear instantaneo" }, { phase: "late", level: 16, label: "Full Build", description: "AoE damage + zona de control total" }] },
  Yasuo:        { early: 50, mid: 75, late: 85, spikes: [{ phase: "mid", level: 6, label: "Last Breath", description: "R engage en knocked-up enemies" }, { phase: "mid", level: 13, label: "2 Crit Items", description: "100% crit con 2 items + pasiva" }] },
  Yone:         { early: 40, mid: 70, late: 90, spikes: [{ phase: "mid", level: 6, label: "Fate Sealed", description: "R engage largo que pasa por enemigos" }, { phase: "mid", level: 13, label: "BORK + Crit", description: "Mixed damage con sustain masivo" }] },
  Zed:          { early: 55, mid: 90, late: 50, spikes: [{ phase: "mid", level: 6, label: "Death Mark", description: "R all-in marca para burst letal" }, { phase: "mid", level: 11, label: "Lethality", description: "Duskblade + Youmuus = oneshot carries" }] },
  Vex:          { early: 45, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Shadow Surge", description: "R engage de largo alcance para picks" }, { phase: "mid", level: 9, label: "Fear Reset", description: "Con items su burst + fear es constante" }] },
  // ── JUNGLE ──
  LeeSin:       { early: 90, mid: 65, late: 35, spikes: [{ phase: "early", level: 3, label: "Q Combo", description: "Q-Q + E slow = gank devastador nivel 3" }, { phase: "mid", level: 6, label: "Dragon's Rage", description: "R kick reposiciona peleas enteras" }] },
  Graves:       { early: 70, mid: 80, late: 60, spikes: [{ phase: "early", level: 3, label: "Clear Speed", description: "Clear de jungla mas rapido del juego" }, { phase: "mid", level: 9, label: "Eclipse", description: "Primer item + stacks de E = duelo fuerte" }] },
  Viego:        { early: 40, mid: 75, late: 85, spikes: [{ phase: "mid", level: 9, label: "BORK", description: "Blade of the Ruined King activa su duelo" }, { phase: "late", level: 16, label: "Reset King", description: "Cada kill le da un cuerpo nuevo + heal" }] },
  Diana:        { early: 40, mid: 85, late: 70, spikes: [{ phase: "mid", level: 6, label: "Moonfall", description: "R AoE pull + damage devastador en teamfight" }, { phase: "mid", level: 11, label: "Nashor's + Zhonyas", description: "2 items = engage + invulnerabilidad" }] },
  Hecarim:      { early: 45, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "Onslaught", description: "R fear charge para engage brutal" }, { phase: "mid", level: 11, label: "Trinity", description: "Trinity Force maximiza su burst en ganks" }] },
  Vi:           { early: 55, mid: 75, late: 55, spikes: [{ phase: "mid", level: 6, label: "Assault & Battery", description: "R lockdown imparable sobre un objetivo" }, { phase: "mid", level: 9, label: "Eclipse", description: "Primer item le da burst + shield" }] },
  Amumu:        { early: 30, mid: 75, late: 80, spikes: [{ phase: "mid", level: 6, label: "Curse of Sad Mummy", description: "R AoE stun puede ganar teamfights sola" }, { phase: "mid", level: 11, label: "Tank Items", description: "Tanque completo con R = engage imbatible" }] },
  KhaZix:       { early: 55, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Evolve Q", description: "Q evolucionada maximiza burst aislado" }, { phase: "mid", level: 11, label: "Duskblade + Edge", description: "Lethality stack = oneshot en isolation" }] },
  Kayn:         { early: 25, mid: 70, late: 85, spikes: [{ phase: "mid", level: 10, label: "Form Transform", description: "Transformacion Rhaast/Shadow Assassin" }, { phase: "late", level: 16, label: "3 Items + Form", description: "Full build + forma = campeon completamente diferente" }] },
  // ── ADC ──
  Tristana:     { early: 65, mid: 70, late: 85, spikes: [{ phase: "early", level: 2, label: "W Engage", description: "Nivel 2 all-in con W + E bomb" }, { phase: "late", level: 16, label: "Range + Crit", description: "Rango masivo + crit items = hypercarry" }] },
  Vayne:        { early: 30, mid: 60, late: 100, spikes: [{ phase: "mid", level: 6, label: "Final Hour", description: "R da AD extra + invisibilidad en tumble" }, { phase: "mid", level: 9, label: "BORK", description: "Blade of the Ruined King activa su DPS" }] },
  Jinx:         { early: 35, mid: 60, late: 95, spikes: [{ phase: "mid", level: 9, label: "IE", description: "Infinity Edge amplifica su crit damage" }, { phase: "late", level: 16, label: "Excited!", description: "Pasiva con 3 crit items = teamfight monster" }] },
  Jhin:         { early: 55, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Curtain Call", description: "R snipe desde distancia extrema" }, { phase: "mid", level: 9, label: "Galeforce", description: "Primer item + 4th shot = burst alto" }] },
  Caitlyn:      { early: 75, mid: 55, late: 80, spikes: [{ phase: "early", level: 1, label: "Range Bully", description: "650 rango domina trades tempranos" }, { phase: "late", level: 16, label: "Trap + Headshot", description: "3 items + headshot crit = burst desde rango" }] },
  Draven:       { early: 90, mid: 70, late: 55, spikes: [{ phase: "early", level: 1, label: "Spinning Axes", description: "DPS mas alto nivel 1 de cualquier ADC" }, { phase: "mid", level: 9, label: "BT + Adoration", description: "Bloodthirster + stacks = snowball masivo" }] },
  MissFortune:  { early: 65, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "Bullet Time", description: "R AoE destruye en teamfights agrupadas" }, { phase: "mid", level: 9, label: "Collector", description: "Lethality + R = teamfight burst insano" }] },
  Ezreal:       { early: 40, mid: 75, late: 80, spikes: [{ phase: "mid", level: 6, label: "Trueshot", description: "R global para snipes y waveclear" }, { phase: "mid", level: 11, label: "Muramana + Trinity", description: "2 items core le dan poke y burst" }] },
  Lucian:       { early: 80, mid: 70, late: 45, spikes: [{ phase: "early", level: 2, label: "Passive Burst", description: "Nivel 2 all-in con pasiva es letal" }, { phase: "mid", level: 9, label: "Navori", description: "Primer crit item + pasiva = CDR burst" }] },
  Kaisa:        { early: 35, mid: 75, late: 85, spikes: [{ phase: "mid", level: 9, label: "Q Evolve", description: "Q evolucionada = burst aislado masivo" }, { phase: "mid", level: 11, label: "E Evolve", description: "E evolucionada = invisibilidad + AS" }] },
  Samira:       { early: 55, mid: 85, late: 70, spikes: [{ phase: "mid", level: 6, label: "Inferno Trigger", description: "R con S rank = damage + lifesteal AoE" }, { phase: "mid", level: 9, label: "Shieldbow", description: "Lifesteal + burst hace all-ins imposibles" }] },
  Ashe:         { early: 50, mid: 70, late: 75, spikes: [{ phase: "mid", level: 6, label: "Crystal Arrow", description: "R stun global para picks a cualquier distancia" }, { phase: "mid", level: 11, label: "Slow Build", description: "Slows constantes + vision con E" }] },
  // ── SUPPORT ──
  Nautilus:     { early: 70, mid: 75, late: 60, spikes: [{ phase: "early", level: 2, label: "Hook Engage", description: "Q hook + pasiva root = CC chain mortal" }, { phase: "mid", level: 6, label: "Depth Charge", description: "R knockup imparable" }] },
  Blitzcrank:   { early: 60, mid: 70, late: 55, spikes: [{ phase: "early", level: 1, label: "Rocket Grab", description: "Un hook nivel 1 puede dar first blood" }, { phase: "mid", level: 6, label: "Static Field", description: "R silence AoE + burst" }] },
  Thresh:       { early: 55, mid: 80, late: 75, spikes: [{ phase: "early", level: 2, label: "Hook + Flay", description: "Q-E combo con lantern para ganks" }, { phase: "mid", level: 6, label: "The Box", description: "R zona de control en teamfights" }] },
  Leona:        { early: 75, mid: 80, late: 60, spikes: [{ phase: "early", level: 2, label: "Eclipse Engage", description: "E-Q stun chain nivel 2 = kill" }, { phase: "mid", level: 6, label: "Solar Flare", description: "R AoE stun para teamfight engage" }] },
  Lulu:         { early: 50, mid: 70, late: 85, spikes: [{ phase: "mid", level: 6, label: "Wild Growth", description: "R da HP + knockup en el ADC" }, { phase: "late", level: 16, label: "Full Enchanter", description: "Polymorph + shields protegen al carry" }] },
  Morgana:      { early: 55, mid: 75, late: 65, spikes: [{ phase: "early", level: 1, label: "Dark Binding", description: "Q root de 2s nivel 1 es el CC mas largo" }, { phase: "mid", level: 6, label: "Soul Shackles", description: "R zoning + stun en teamfights" }] },
  Pyke:         { early: 60, mid: 85, late: 45, spikes: [{ phase: "mid", level: 6, label: "Death from Below", description: "R execute que comparte gold con aliados" }, { phase: "mid", level: 11, label: "Lethality", description: "2 lethality items = oneshot squishies" }] },
  Bard:         { early: 45, mid: 70, late: 85, spikes: [{ phase: "mid", level: 6, label: "Tempered Fate", description: "R congela aliados/enemigos a distancia" }, { phase: "late", level: 16, label: "Chime Scaling", description: "Meeps con stun AoE devastador" }] },
  Senna:        { early: 40, mid: 65, late: 95, spikes: [{ phase: "mid", level: 6, label: "Dawning Shadow", description: "R global shield + damage" }, { phase: "late", level: 16, label: "Infinite Range", description: "Rango infinito + crit + heals" }] },

  // ── REMAINING CHAMPIONS (alphabetical) ──────────────────────────────────
  Akali:        { early: 45, mid: 85, late: 65, spikes: [{ phase: "mid", level: 6, label: "Perfect Execution", description: "R doble dash con burst execute masivo" }, { phase: "mid", level: 9, label: "Hextech + Zhonyas", description: "2 items = oneshot + invulnerabilidad" }] },
  Akshan:       { early: 60, mid: 75, late: 55, spikes: [{ phase: "early", level: 2, label: "Swing Trade", description: "E swing + pasiva double shot da trades fuertes" }, { phase: "mid", level: 6, label: "Revive Passive", description: "Matar al scoundrel revive aliados" }] },
  Alistar:      { early: 65, mid: 75, late: 65, spikes: [{ phase: "early", level: 2, label: "W-Q Combo", description: "Headbutt-Pulverize combo garantiza CC chain" }, { phase: "mid", level: 6, label: "Unbreakable Will", description: "R reduce 75% del dano recibido" }] },
  Anivia:       { early: 25, mid: 70, late: 90, spikes: [{ phase: "mid", level: 6, label: "Glacial Storm", description: "R AoE zona de control permanente" }, { phase: "late", level: 16, label: "Zone Control", description: "W + R controlan teamfights enteras" }] },
  Annie:        { early: 50, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "Tibbers Burst", description: "Flash R stun + Tibbers = oneshot AoE" }, { phase: "mid", level: 9, label: "Luden's", description: "Primer item completa su burst combo" }] },
  Aphelios:     { early: 40, mid: 70, late: 90, spikes: [{ phase: "mid", level: 9, label: "IE Spike", description: "Infinity Edge amplifica su DPS con armas" }, { phase: "late", level: 16, label: "5 Weapons", description: "Combinaciones de armas devastadoras" }] },
  AurelionSol:  { early: 30, mid: 65, late: 95, spikes: [{ phase: "mid", level: 6, label: "Falling Star", description: "R burst AoE con stardust stacks" }, { phase: "late", level: 16, label: "Infinite Scale", description: "Stardust infinito = damage sin tope" }] },
  Azir:         { early: 30, mid: 65, late: 95, spikes: [{ phase: "mid", level: 6, label: "Emperor's Divide", description: "R wall que reposiciona peleas enteras" }, { phase: "late", level: 16, label: "Soldier DPS", description: "3 items + soldiers = DPS constante AoE" }] },
  Belveth:      { early: 35, mid: 70, late: 90, spikes: [{ phase: "mid", level: 6, label: "Endless Banquet", description: "R forma verdadera con void remora" }, { phase: "late", level: 16, label: "Infinite Stacks", description: "Attack speed stacks infinitos" }] },
  Brand:        { early: 55, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Pyroclasm", description: "R bounce hace damage masivo en teamfights" }, { phase: "mid", level: 9, label: "Liandry's", description: "Burn + pasiva % HP destroza tanques" }] },
  Braum:        { early: 65, mid: 70, late: 60, spikes: [{ phase: "early", level: 2, label: "Passive Stun", description: "4 autos/abilities aplican stun con pasiva" }, { phase: "mid", level: 6, label: "Glacial Fissure", description: "R knockup line engage" }] },
  Briar:        { early: 55, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Certain Death", description: "R engage global con frenzy" }, { phase: "mid", level: 9, label: "BORK", description: "Lifesteal + attack speed = unkillable" }] },
  Cassiopeia:   { early: 40, mid: 75, late: 95, spikes: [{ phase: "mid", level: 6, label: "Petrifying Gaze", description: "R stun frontal masivo" }, { phase: "late", level: 16, label: "DPS Machine", description: "E spam + no boots = mas AP y DPS" }] },
  Chogath:      { early: 40, mid: 65, late: 80, spikes: [{ phase: "mid", level: 6, label: "Feast", description: "R true damage + HP stacks permanentes" }, { phase: "late", level: 16, label: "Infinite HP", description: "6+ feast stacks = tanque gigante" }] },
  Corki:        { early: 35, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Missile Barrage", description: "R poke constante a distancia" }, { phase: "mid", level: 9, label: "Trinity + Package", description: "Package + Trinity = burst + roam" }] },
  DrMundo:      { early: 35, mid: 60, late: 85, spikes: [{ phase: "mid", level: 6, label: "Maximum Dosage", description: "R regenera HP masivamente" }, { phase: "late", level: 16, label: "Unkillable", description: "Full tank + R = no se puede matar" }] },
  Ekko:         { early: 45, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Chronobreak", description: "R rewind = second chance + burst" }, { phase: "mid", level: 9, label: "Rocketbelt", description: "Gap close + burst combo" }] },
  Elise:        { early: 80, mid: 65, late: 35, spikes: [{ phase: "early", level: 3, label: "Rappel Gank", description: "E rappel + cocoon = gank imparable" }, { phase: "mid", level: 6, label: "Full Combo", description: "Doble forma da acceso a 6 abilities" }] },
  Evelynn:      { early: 25, mid: 85, late: 70, spikes: [{ phase: "mid", level: 6, label: "Camouflage", description: "Pasiva invisible + R execute" }, { phase: "mid", level: 11, label: "Rocketbelt", description: "Burst + invisible = picks letales" }] },
  Fiddlesticks: { early: 30, mid: 80, late: 75, spikes: [{ phase: "mid", level: 6, label: "Crowstorm", description: "R AoE channel desde fog — teamfight winner" }, { phase: "mid", level: 11, label: "Zhonyas", description: "R + Zhonyas = damage AoE imparable" }] },
  Galio:        { early: 50, mid: 80, late: 55, spikes: [{ phase: "mid", level: 6, label: "Hero's Entrance", description: "R semi-global protege aliados + knockup" }, { phase: "mid", level: 9, label: "Anti-Magic", description: "Countera equipos AP completos" }] },
  Gangplank:    { early: 35, mid: 60, late: 95, spikes: [{ phase: "mid", level: 7, label: "Barrel Combo", description: "Triple barrel + Sheen = burst masivo" }, { phase: "late", level: 16, label: "Crit Barrels", description: "Barrels crit ignoran armadura" }] },
  Gnar:         { early: 55, mid: 70, late: 65, spikes: [{ phase: "mid", level: 6, label: "GNAR!", description: "Mega Gnar R stun AoE contra pared" }, { phase: "mid", level: 11, label: "Cleaver", description: "Black Cleaver + transform = teamfight" }] },
  Gragas:       { early: 55, mid: 75, late: 60, spikes: [{ phase: "mid", level: 6, label: "Explosive Cask", description: "R reposiciona enemigos para picks" }, { phase: "mid", level: 9, label: "Tank/AP", description: "Versatil como tanque o AP burst" }] },
  Gwen:         { early: 40, mid: 70, late: 90, spikes: [{ phase: "mid", level: 6, label: "Needlework", description: "R 3 casts de burst + slow" }, { phase: "late", level: 16, label: "True Damage DPS", description: "Q center true damage destroza tanques" }] },
  Heimerdinger: { early: 55, mid: 75, late: 65, spikes: [{ phase: "early", level: 3, label: "Turret Zone", description: "3 torretas controlan la lane completa" }, { phase: "mid", level: 6, label: "UPGRADE!!!", description: "R empowered turret/rocket/grenade" }] },
  Hwei:         { early: 45, mid: 75, late: 80, spikes: [{ phase: "mid", level: 6, label: "Spiraling Despair", description: "R AoE fear que se expande" }, { phase: "mid", level: 11, label: "Full Kit", description: "10 abilities = versatilidad total" }] },
  Illaoi:       { early: 55, mid: 75, late: 60, spikes: [{ phase: "mid", level: 6, label: "Leap of Faith", description: "R spawns tentacles por cada campeon cerca" }, { phase: "mid", level: 9, label: "Gore + Cleaver", description: "1v2 monster con R + tentacles" }] },
  Ivern:        { early: 40, mid: 70, late: 75, spikes: [{ phase: "mid", level: 6, label: "Daisy!", description: "R invoca Daisy para CC y tanqueo" }, { phase: "mid", level: 11, label: "Enchanter Build", description: "Shields + bushes protegen al equipo" }] },
  Janna:        { early: 40, mid: 65, late: 80, spikes: [{ phase: "mid", level: 6, label: "Monsoon", description: "R heal AoE + knockback disengage" }, { phase: "late", level: 16, label: "Peel Queen", description: "Shields + tornado + R protegen todo" }] },
  JarvanIV:     { early: 60, mid: 75, late: 55, spikes: [{ phase: "early", level: 2, label: "E-Q Combo", description: "Flag + drag combo = engage fiable" }, { phase: "mid", level: 6, label: "Cataclysm", description: "R arena traps enemigos" }] },
  Jayce:        { early: 70, mid: 75, late: 50, spikes: [{ phase: "early", level: 3, label: "Gate Q Poke", description: "Acceleration Gate + Q = poke devastador" }, { phase: "mid", level: 6, label: "Full Combo", description: "Forma ranged + melee = burst completo" }] },
  Kalista:      { early: 60, mid: 70, late: 65, spikes: [{ phase: "mid", level: 6, label: "Fate's Call", description: "R salva y engage con el support" }, { phase: "mid", level: 9, label: "BORK", description: "Rend stacks + BORK = objective control" }] },
  Karma:        { early: 65, mid: 70, late: 55, spikes: [{ phase: "early", level: 1, label: "Mantra Q", description: "R+Q poke desde nivel 1 es brutal" }, { phase: "mid", level: 6, label: "Mantra Shield", description: "R+E team-wide shield + speed" }] },
  Karthus:      { early: 30, mid: 65, late: 95, spikes: [{ phase: "mid", level: 6, label: "Requiem", description: "R global damage a todos los enemigos" }, { phase: "late", level: 16, label: "AoE DPS", description: "Q spam + pasiva = damage post-mortem" }] },
  Kayle:        { early: 15, mid: 55, late: 100, spikes: [{ phase: "mid", level: 6, label: "Ranged Autos", description: "Nivel 6 se convierte en ranged" }, { phase: "late", level: 16, label: "Ascended", description: "Nivel 16 = autos AoE + fire waves" }] },
  Kennen:       { early: 50, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Slicing Maelstrom", description: "R AoE stun en teamfights agrupadas" }, { phase: "mid", level: 9, label: "Rocketbelt", description: "Flash R engage devastador" }] },
  Kindred:      { early: 55, mid: 75, late: 80, spikes: [{ phase: "mid", level: 6, label: "Lamb's Respite", description: "R zona de invulnerabilidad" }, { phase: "late", level: 16, label: "Mark Stacks", description: "Stacks de marcas = rango + damage" }] },
  Kled:         { early: 75, mid: 70, late: 50, spikes: [{ phase: "early", level: 2, label: "Mounted All-in", description: "Con Skaarl tiene doble HP bar para trades" }, { phase: "mid", level: 6, label: "Chaaaaarge!!!", description: "R engage de larga distancia" }] },
  KogMaw:       { early: 25, mid: 60, late: 100, spikes: [{ phase: "mid", level: 6, label: "Bio-Arcane", description: "W rango + % HP damage" }, { phase: "late", level: 16, label: "Artillery", description: "3 items + W = DPS imparable" }] },
  KSante:       { early: 50, mid: 70, late: 75, spikes: [{ phase: "mid", level: 6, label: "All Out", description: "R cambia a forma ofensiva con burst" }, { phase: "mid", level: 11, label: "Tank + Damage", description: "Tanque con damage de bruiser" }] },
  Lillia:       { early: 40, mid: 75, late: 70, spikes: [{ phase: "mid", level: 6, label: "Lilting Lullaby", description: "R duerme a todos los afectados por pasiva" }, { phase: "mid", level: 9, label: "Liandry's", description: "Burn + movespeed = kite infinito" }] },
  Lissandra:    { early: 45, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Frozen Tomb", description: "R self-cast = invulnerable, enemy-cast = stun" }, { phase: "mid", level: 9, label: "Luden's + Zhonyas", description: "Engage + burst + invulnerabilidad" }] },
  Lux:          { early: 45, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Final Spark", description: "R laser de largo alcance en bajo CD" }, { phase: "mid", level: 9, label: "Luden's", description: "Burst combo Q-E-R oneshots" }] },
  Malzahar:     { early: 35, mid: 75, late: 70, spikes: [{ phase: "mid", level: 6, label: "Nether Grasp", description: "R suppress que no se puede evitar sin QSS" }, { phase: "mid", level: 9, label: "Liandry's", description: "Space AIDS + voidlings = push y damage" }] },
  Maokai:       { early: 45, mid: 70, late: 75, spikes: [{ phase: "mid", level: 6, label: "Nature's Grasp", description: "R onda de roots masiva" }, { phase: "mid", level: 11, label: "Full Tank", description: "Pasiva heal + tanque = unkillable" }] },
  MasterYi:     { early: 30, mid: 70, late: 95, spikes: [{ phase: "mid", level: 6, label: "Highlander", description: "R inmune a slows + attack speed" }, { phase: "late", level: 16, label: "Reset King", description: "Q resets en kills = pentakill machine" }] },
  Milio:        { early: 50, mid: 70, late: 80, spikes: [{ phase: "mid", level: 6, label: "Breath of Life", description: "R AoE cleanse + heal para todo el equipo" }, { phase: "mid", level: 11, label: "Enchanter", description: "Range buff + heal + shield" }] },
  Naafiri:      { early: 55, mid: 80, late: 50, spikes: [{ phase: "mid", level: 6, label: "The Call of the Pack", description: "R gap close con packmates = burst letal" }, { phase: "mid", level: 9, label: "Lethality", description: "Profane + Youmuus = roam + oneshot" }] },
  Nami:         { early: 55, mid: 70, late: 70, spikes: [{ phase: "early", level: 2, label: "Bubble + W", description: "Q bubble + W bounce trade favorable" }, { phase: "mid", level: 6, label: "Tidal Wave", description: "R engage/disengage de largo alcance" }] },
  Nasus:        { early: 15, mid: 55, late: 95, spikes: [{ phase: "mid", level: 6, label: "Fury of Sands", description: "R da HP + AoE damage + armour shred" }, { phase: "late", level: 16, label: "Infinite Stacks", description: "Q stacks infinitas = oneshot torres" }] },
  Neeko:        { early: 50, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "Pop Blossom", description: "R AoE stun + shield devastadora" }, { phase: "mid", level: 9, label: "Rocketbelt", description: "Engage + R = teamfight winner" }] },
  Nidalee:      { early: 75, mid: 65, late: 40, spikes: [{ phase: "early", level: 3, label: "Spear Poke", description: "Q spear + cougar execute = burst" }, { phase: "mid", level: 6, label: "Full Combo", description: "Spear + cougar form = assassin burst" }] },
  Nilah:        { early: 45, mid: 75, late: 85, spikes: [{ phase: "mid", level: 6, label: "Apotheosis", description: "R AoE pull + burst + heal" }, { phase: "mid", level: 9, label: "IE", description: "Crit + passive share XP = ahead in levels" }] },
  Nocturne:     { early: 55, mid: 80, late: 55, spikes: [{ phase: "mid", level: 6, label: "Paranoia", description: "R global darkness + dash a un objetivo" }, { phase: "mid", level: 9, label: "Stridebreaker", description: "R + auto burst = pick letal" }] },
  Nunu:         { early: 55, mid: 70, late: 55, spikes: [{ phase: "early", level: 3, label: "W Snowball", description: "W ganks son rapidos e inesperados" }, { phase: "mid", level: 6, label: "Absolute Zero", description: "R AoE slow + burst masivo" }] },
  Olaf:         { early: 80, mid: 65, late: 40, spikes: [{ phase: "early", level: 3, label: "Axe Chase", description: "Q slow + W lifesteal + E true damage" }, { phase: "mid", level: 6, label: "Ragnarok", description: "R inmune a CC = run at carries" }] },
  Orianna:      { early: 40, mid: 75, late: 85, spikes: [{ phase: "mid", level: 6, label: "Shockwave", description: "R AoE pull = teamfight winning ability" }, { phase: "late", level: 16, label: "Ball Control", description: "Ball on ally = engage + peel perfecto" }] },
  Ornn:         { early: 45, mid: 70, late: 85, spikes: [{ phase: "mid", level: 6, label: "Call of the Forge God", description: "R doble knockup de largo alcance" }, { phase: "late", level: 14, label: "Masterwork Items", description: "Upgradea items aliados gratuitamente" }] },
  Pantheon:     { early: 85, mid: 65, late: 35, spikes: [{ phase: "early", level: 3, label: "Empowered W", description: "W stun + empowered Q = burst letal" }, { phase: "mid", level: 6, label: "Grand Starfall", description: "R semi-global para roams y flanks" }] },
  Poppy:        { early: 55, mid: 70, late: 60, spikes: [{ phase: "mid", level: 6, label: "Keeper's Verdict", description: "R knockback masivo o hold para stun" }, { phase: "mid", level: 9, label: "Anti-Dash", description: "W bloquea dashes = countera mobilidad" }] },
  Qiyana:       { early: 50, mid: 90, late: 55, spikes: [{ phase: "mid", level: 6, label: "Supreme Display", description: "R AoE stun usando terreno" }, { phase: "mid", level: 11, label: "Lethality", description: "Profane + Youmuus = oneshot en roams" }] },
  Quinn:        { early: 75, mid: 70, late: 50, spikes: [{ phase: "early", level: 2, label: "Blind Trade", description: "Q blind + E disengage gana trades" }, { phase: "mid", level: 6, label: "Behind Enemy Lines", description: "R movespeed global para roams" }] },
  Rakan:        { early: 55, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "The Quickness", description: "R + W = AoE charm + knockup combo" }, { phase: "mid", level: 9, label: "Engage God", description: "Flash R-W engage es imparable" }] },
  Rammus:       { early: 45, mid: 75, late: 70, spikes: [{ phase: "mid", level: 6, label: "Soaring Slam", description: "R AoE slow + damage continuo" }, { phase: "mid", level: 11, label: "Thornmail", description: "Full armor countera AD teams" }] },
  RekSai:       { early: 70, mid: 70, late: 45, spikes: [{ phase: "early", level: 3, label: "Tunnel Gank", description: "E tunnel + unburrow knockup = gank" }, { phase: "mid", level: 6, label: "Void Rush", description: "R dash + true damage execute" }] },
  Rell:         { early: 55, mid: 75, late: 65, spikes: [{ phase: "mid", level: 6, label: "Magnet Storm", description: "R pull + W engage = CC AoE masivo" }, { phase: "mid", level: 9, label: "Tank Engage", description: "E + flash W = engage imparable" }] },
  Renata:       { early: 45, mid: 75, late: 70, spikes: [{ phase: "mid", level: 6, label: "Hostile Takeover", description: "R hace que enemigos ataquen a sus aliados" }, { phase: "mid", level: 9, label: "Bailout", description: "W revive temporal al ADC" }] },
  Rengar:       { early: 65, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "Thrill of the Hunt", description: "R stealth + leap garantizado" }, { phase: "mid", level: 11, label: "Lethality", description: "Oneshot desde invisible" }] },
  Rumble:       { early: 50, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "The Equalizer", description: "R linea de fuego AoE devastadora" }, { phase: "mid", level: 9, label: "Heat Zone", description: "Overheat + items = DPS masivo" }] },
  Ryze:         { early: 35, mid: 70, late: 85, spikes: [{ phase: "mid", level: 6, label: "Realm Warp", description: "R teleporta al equipo entero" }, { phase: "late", level: 16, label: "EQ Machine", description: "E-Q combos constantes con mana" }] },
  Sejuani:      { early: 45, mid: 75, late: 70, spikes: [{ phase: "mid", level: 6, label: "Glacial Prison", description: "R stun de largo alcance + AoE slow" }, { phase: "mid", level: 11, label: "Full Tank", description: "Pasiva frost + CC chain" }] },
  Seraphine:    { early: 40, mid: 75, late: 80, spikes: [{ phase: "mid", level: 6, label: "Encore", description: "R charm que se extiende con cada campeon" }, { phase: "mid", level: 11, label: "Echo Notes", description: "Pasiva empowered cada 3 abilities" }] },
  Shaco:        { early: 65, mid: 75, late: 50, spikes: [{ phase: "early", level: 2, label: "Box Trap", description: "Cajas + invisible = invade/gank letal" }, { phase: "mid", level: 6, label: "Hallucinate", description: "R clone para confusion y outplay" }] },
  Shyvana:      { early: 40, mid: 70, late: 75, spikes: [{ phase: "mid", level: 6, label: "Dragon's Descent", description: "R transforma en dragon + AoE" }, { phase: "mid", level: 11, label: "AP Build", description: "E fireball en dragon form = nuke" }] },
  Singed:       { early: 35, mid: 65, late: 75, spikes: [{ phase: "mid", level: 6, label: "Insanity Potion", description: "R da stats masivos + tenacity" }, { phase: "mid", level: 11, label: "Proxy King", description: "2 items + proxy farm = presion constante" }] },
  Sion:         { early: 40, mid: 65, late: 80, spikes: [{ phase: "mid", level: 6, label: "Unstoppable Onslaught", description: "R charge knockup de larga distancia" }, { phase: "late", level: 16, label: "Infinite HP", description: "W pasiva HP stacks = tanque gigante" }] },
  Sivir:        { early: 45, mid: 70, late: 80, spikes: [{ phase: "mid", level: 6, label: "On The Hunt", description: "R team-wide movespeed" }, { phase: "mid", level: 9, label: "W Ricochet", description: "Crit items + W bounces = AoE DPS" }] },
  Skarner:      { early: 55, mid: 75, late: 65, spikes: [{ phase: "mid", level: 6, label: "Impale", description: "R arrastra a un enemigo a tu equipo" }, { phase: "mid", level: 9, label: "Trinity Tank", description: "Engage + drag priority target" }] },
  Smolder:      { early: 20, mid: 55, late: 100, spikes: [{ phase: "mid", level: 9, label: "25 Stacks", description: "Q empowered con AoE" }, { phase: "late", level: 16, label: "225 Stacks", description: "Q explota en AoE + true damage burn" }] },
  Sona:         { early: 35, mid: 65, late: 85, spikes: [{ phase: "mid", level: 6, label: "Crescendo", description: "R stun AoE linea" }, { phase: "late", level: 16, label: "Aura Queen", description: "Habilidades en CD bajo buffean todo el equipo" }] },
  Soraka:       { early: 40, mid: 65, late: 80, spikes: [{ phase: "mid", level: 6, label: "Wish", description: "R global heal a todos los aliados" }, { phase: "late", level: 16, label: "Heal Bot", description: "W heal constante mantiene al equipo vivo" }] },
  Swain:        { early: 45, mid: 75, late: 75, spikes: [{ phase: "mid", level: 6, label: "Demonic Ascension", description: "R drain tank + AoE damage sostenido" }, { phase: "mid", level: 11, label: "Liandry's", description: "Burn + drain = pelea de frente" }] },
  Sylas:        { early: 50, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Hijack", description: "R roba ultimates enemigas" }, { phase: "mid", level: 9, label: "Everfrost", description: "Burst + CC + enemy R robada" }] },
  TahmKench:    { early: 60, mid: 65, late: 55, spikes: [{ phase: "early", level: 3, label: "Tongue Lash", description: "Q slow + 3 stacks devour = trade ganado" }, { phase: "mid", level: 6, label: "Abyssal Dive", description: "R semi-global engage/escape" }] },
  Taliyah:      { early: 45, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Weaver's Wall", description: "R wall que cruza el mapa" }, { phase: "mid", level: 9, label: "Luden's", description: "W-E combo burst es letal con items" }] },
  Talon:        { early: 60, mid: 85, late: 50, spikes: [{ phase: "early", level: 2, label: "Level 2 All-in", description: "Primer campeon en llegar a nivel 2 mid = first blood" }, { phase: "mid", level: 6, label: "Shadow Assault", description: "R invisible + burst AoE" }] },
  Taric:        { early: 40, mid: 70, late: 80, spikes: [{ phase: "mid", level: 6, label: "Cosmic Radiance", description: "R invulnerabilidad AoE para aliados" }, { phase: "mid", level: 11, label: "Tank Enchanter", description: "Heal + stun + invulnerabilidad" }] },
  Teemo:        { early: 55, mid: 65, late: 60, spikes: [{ phase: "mid", level: 6, label: "Noxious Trap", description: "R shrooms de vision + damage + slow" }, { phase: "mid", level: 11, label: "Shroom Field", description: "Mapa lleno de shrooms = vision + control" }] },
  Trundle:      { early: 60, mid: 70, late: 65, spikes: [{ phase: "mid", level: 6, label: "Subjugate", description: "R roba stats del tanque enemigo" }, { phase: "mid", level: 9, label: "BORK", description: "1v1 monster contra tanques" }] },
  Tryndamere:   { early: 50, mid: 65, late: 90, spikes: [{ phase: "mid", level: 6, label: "Undying Rage", description: "R 5 segundos de invulnerabilidad" }, { phase: "late", level: 16, label: "Crit Monster", description: "Full crit + R = split push imbatible" }] },
  TwistedFate:  { early: 40, mid: 80, late: 60, spikes: [{ phase: "mid", level: 6, label: "Destiny", description: "R teleport global para ganks" }, { phase: "mid", level: 9, label: "Lich Bane", description: "Gold card + Lich = burst + stun fiable" }] },
  Twitch:       { early: 40, mid: 70, late: 90, spikes: [{ phase: "mid", level: 6, label: "Spray and Pray", description: "R pierce AoE auto attacks" }, { phase: "late", level: 16, label: "Stealth ADC", description: "Q invisible + R = teamfight desde stealth" }] },
  Udyr:         { early: 60, mid: 70, late: 55, spikes: [{ phase: "early", level: 3, label: "Stance Dance", description: "Alternando stances gana trades" }, { phase: "mid", level: 6, label: "Awakened Stance", description: "R empowered stance con burst/shield" }] },
  Urgot:        { early: 50, mid: 70, late: 75, spikes: [{ phase: "mid", level: 6, label: "Fear Beyond Death", description: "R execute + fear a enemigos cercanos" }, { phase: "mid", level: 9, label: "Shotgun Knees", description: "Pasiva activada en 6 piernas = DPS" }] },
  Varus:        { early: 50, mid: 75, late: 75, spikes: [{ phase: "mid", level: 6, label: "Chain of Corruption", description: "R root que se expande a otros enemigos" }, { phase: "mid", level: 9, label: "Lethality/On-hit", description: "Q poke o W on-hit segun build" }] },
  Veigar:       { early: 20, mid: 65, late: 100, spikes: [{ phase: "mid", level: 6, label: "Primordial Burst", description: "R execute que escala con AP enemigo" }, { phase: "late", level: 16, label: "Infinite AP", description: "Q stacks = AP infinita + oneshots" }] },
  Velkoz:       { early: 45, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Lifeform Disintegration", description: "R laser con true damage por pasiva" }, { phase: "mid", level: 9, label: "Luden's", description: "Poke combo Q-W + R burst" }] },
  Vladimir:     { early: 25, mid: 65, late: 95, spikes: [{ phase: "mid", level: 6, label: "Hemoplague", description: "R amplifica damage + AoE burst" }, { phase: "late", level: 16, label: "Late Nightmare", description: "E charge + R + pool = imbatible" }] },
  Volibear:     { early: 65, mid: 70, late: 55, spikes: [{ phase: "mid", level: 6, label: "Stormbringer", description: "R salto que desactiva torres" }, { phase: "mid", level: 9, label: "Dives", description: "Tower dive impune con R" }] },
  Warwick:      { early: 65, mid: 70, late: 50, spikes: [{ phase: "mid", level: 6, label: "Infinite Duress", description: "R suppress + gap close largo" }, { phase: "mid", level: 9, label: "BORK + Hunt", description: "W blood hunt + sustain = 1v1 king" }] },
  Xayah:        { early: 50, mid: 75, late: 80, spikes: [{ phase: "mid", level: 6, label: "Featherstorm", description: "R invulnerabilidad + feather burst" }, { phase: "mid", level: 9, label: "Navori", description: "Crit + feathers = AoE burst + root" }] },
  Xerath:       { early: 40, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Rite of the Arcane", description: "R artillery de largo alcance" }, { phase: "mid", level: 9, label: "Luden's", description: "Poke constante desde rango seguro" }] },
  XinZhao:      { early: 75, mid: 70, late: 40, spikes: [{ phase: "early", level: 3, label: "E Dash Gank", description: "E dash + Q knockup = gank facil" }, { phase: "mid", level: 6, label: "Crescent Guard", description: "R invulnerabilidad a ranged + knockback" }] },
  Yorick:       { early: 40, mid: 70, late: 85, spikes: [{ phase: "mid", level: 6, label: "Maiden of the Mist", description: "R maiden pushea lanes sola" }, { phase: "late", level: 16, label: "Split King", description: "Maiden + ghouls destruyen torres" }] },
  Yuumi:        { early: 35, mid: 60, late: 80, spikes: [{ phase: "mid", level: 6, label: "Final Chapter", description: "R waves de root desde el carry" }, { phase: "late", level: 16, label: "Attached Carry", description: "Stats + heals constantes al carry" }] },
  Zac:          { early: 40, mid: 75, late: 70, spikes: [{ phase: "mid", level: 6, label: "Let's Bounce!", description: "R AoE knockback + engage" }, { phase: "mid", level: 9, label: "E Engage", description: "E slingshot de largo alcance" }] },
  Zeri:         { early: 35, mid: 70, late: 85, spikes: [{ phase: "mid", level: 6, label: "Lightning Crash", description: "R AoE damage + movespeed stacks" }, { phase: "late", level: 16, label: "Overcharge", description: "R stacks = movespeed + damage imparable" }] },
  Ziggs:        { early: 40, mid: 80, late: 70, spikes: [{ phase: "mid", level: 6, label: "Mega Inferno Bomb", description: "R AoE global burst" }, { phase: "mid", level: 9, label: "Luden's", description: "Poke constante + torre execute con W" }] },
  Zilean:       { early: 35, mid: 75, late: 85, spikes: [{ phase: "mid", level: 6, label: "Chronoshift", description: "R revive a un aliado en full" }, { phase: "late", level: 16, label: "Double Bomb", description: "Q-W-Q stun + revive cambia teamfights" }] },
  Zoe:          { early: 40, mid: 85, late: 65, spikes: [{ phase: "mid", level: 6, label: "Portal Jump", description: "R reposiciona para bubble + Q snipes" }, { phase: "mid", level: 9, label: "Luden's", description: "Q de larga distancia = oneshot squishies" }] },
  Zyra:         { early: 50, mid: 80, late: 65, spikes: [{ phase: "mid", level: 6, label: "Stranglethorns", description: "R empowered plants + knockup AoE" }, { phase: "mid", level: 9, label: "Liandry's", description: "Plants + burn = zone control constante" }] },
};

const DEFAULT_CURVE: PowerCurve = {
  early: 50, mid: 50, late: 50,
  spikes: [{ phase: "mid", level: 6, label: "Ultimate", description: "R disponible" }],
};

export function getChampionPowerCurve(championName: string): PowerCurve {
  if (isUnknown(championName)) return DEFAULT_CURVE;
  return POWER_CURVES[championName] || DEFAULT_CURVE;
}