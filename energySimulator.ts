/**
 * KOPIA av utils/energySimulator.ts i app-repot (test-kostkollen), så att
 * landningssidan och appen räknar exakt likadant. Ändras den ena - ändra båda.
 *
 * "Vrid på knapparna" (Mål & Framsteg): vad händer med vikten om man äter mer
 * eller mindre, går mer eller tränar mer?
 *
 * Förbrukningen räknas fram ur fyra delar, samma sätt för "din plan nu" och
 * "med ändringarna", så att kurvorna går att jämföra:
 *
 *   BMR × 1,2           vila och vardag, inklusive ca 3 000 steg
 * + steg utöver 3 000   ≈ 0,45 kcal per kg och 1 000 steg
 * + träning             timmar/vecka × netto-MET × kg / 7
 *
 * Underskott = förbrukning − kalorier. 7 700 kcal ≈ 1 kg.
 *
 * Allt är uppskattningar - förbränningen varierar 20-30 % mellan personer.
 * Inget golv: den som väljer under appens lägsta nivå får en varning, inget stopp.
 */

export type Intensitet = 'latt' | 'medel' | 'hard';

export interface Traningsplan {
  timmarPerVecka: number;
  intensitet: Intensitet;
}

export interface Scenario {
  kalorier: number;
  stegPerDag: number;
  traning: Traningsplan;
}

export const KCAL_PER_KG = 7700;
export const STEG_I_VARDAGEN = 3000;
const KCAL_PER_KG_OCH_1000_STEG = 0.45;
/** Netto-MET (utöver vila): lätt = promenad/yoga, medel = styrka/gruppträning, hård = intervaller/löpning. */
export const NETTO_MET: Record<Intensitet, number> = { latt: 2, medel: 4, hard: 7 };
export const INTENSITET_NAMN: Record<Intensitet, string> = { latt: 'Lätt', medel: 'Medel', hard: 'Hård' };
export const VECKOR = 12;

/** Utgångsläge för träningen om hon inte valt något, utifrån aktivitetsnivån. */
export const TRANING_FRAN_AKTIVITET: Record<string, Traningsplan> = {
  sedentary: { timmarPerVecka: 0, intensitet: 'latt' },
  light: { timmarPerVecka: 2, intensitet: 'latt' },
  moderate: { timmarPerVecka: 3, intensitet: 'medel' },
  active: { timmarPerVecka: 5, intensitet: 'medel' },
  very_active: { timmarPerVecka: 8, intensitet: 'hard' },
};

export const kcalPerSteg = (kg: number) => (KCAL_PER_KG_OCH_1000_STEG * kg) / 1000;

/** Träningens förbränning per dag (kcal). */
export const traningKcalPerDag = (t: Traningsplan, kg: number) =>
  (Math.max(0, t.timmarPerVecka) * NETTO_MET[t.intensitet] * kg) / 7;

/** Förbrukning per dag (kcal). */
export function forbrukning(bmr: number, kg: number, s: Pick<Scenario, 'stegPerDag' | 'traning'>): number {
  const steg = Math.max(0, s.stegPerDag - STEG_I_VARDAGEN) * kcalPerSteg(kg);
  return bmr * 1.2 + steg + traningKcalPerDag(s.traning, kg);
}

/** Underskott per dag (positivt = går ner). */
export const underskott = (bmr: number, kg: number, s: Scenario) => forbrukning(bmr, kg, s) - s.kalorier;

/** Ändring i kg per vecka (negativt = går ner). */
export const kgPerVecka = (bmr: number, kg: number, s: Scenario) => -(underskott(bmr, kg, s) * 7) / KCAL_PER_KG;

/** Vikten vecka för vecka, vecka 0 = i dag. */
export function viktkurva(bmr: number, kg: number, s: Scenario, veckor = VECKOR): number[] {
  const perVecka = kgPerVecka(bmr, kg, s);
  return Array.from({ length: veckor + 1 }, (_, v) => Math.round((kg + perVecka * v) * 100) / 100);
}

/** Vecka då målvikten nås, eller null om inte inom `max` veckor / åt fel håll. */
export function veckaForMal(bmr: number, kg: number, s: Scenario, malvikt: number | null | undefined, max = 104): number | null {
  if (malvikt == null || !Number.isFinite(malvikt)) return null;
  const perVecka = kgPerVecka(bmr, kg, s);
  const kvar = malvikt - kg;
  if (Math.abs(kvar) < 0.05) return 0;
  if (perVecka === 0 || Math.sign(perVecka) !== Math.sign(kvar)) return null;
  const v = Math.ceil(kvar / perVecka);
  return v <= max ? v : null;
}

/**
 * Hur mycket mer rörelse som behövs för att äta `extraKcal` mer om dagen
 * i samma takt: antingen steg per dag eller medelträning i timmar per vecka.
 */
export function rorelseForExtraKcal(extraKcal: number, kg: number): { steg: number; timmarMedel: number } {
  if (extraKcal <= 0 || kg <= 0) return { steg: 0, timmarMedel: 0 };
  return {
    steg: Math.round(extraKcal / kcalPerSteg(kg) / 100) * 100,
    timmarMedel: Math.round(((extraKcal * 7) / (NETTO_MET.medel * kg)) * 2) / 2,
  };
}

/** Snabbare än 1 % av kroppsvikten i veckan är tufft att hålla och kan kosta muskler. */
export const forSnabbt = (bmr: number, kg: number, s: Scenario) => kgPerVecka(bmr, kg, s) < -0.01 * kg;
