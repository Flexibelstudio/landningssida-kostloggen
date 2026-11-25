/**
 * Startläget för "Vrid på knapparna" på landningssidan: samma kalorimål som
 * "Din plan" i appen räknar fram (utils/planPreview.ts, nutritionalCalculations.ts
 * och calorieFloor.ts i app-repot). Ändras uträkningen där - ändra här också.
 *
 * Inget sparas här. Uppgifterna skickas bara vidare till appen i adressens
 * #-del (som aldrig når någon server) när hon själv klickar på knappen.
 */
import { Traningsplan, TRANING_FRAN_AKTIVITET } from './energySimulator';

export type Kon = 'female' | 'male';
export type Aktivitet = 'sedentary' | 'light' | 'moderate' | 'active';

export interface Uppgifter {
  kon: Kon;
  alder: number;
  langd: number;
  vikt: number;
  malvikt: number;
  aktivitet: Aktivitet;
}

const AKTIVITET_FAKTOR: Record<Aktivitet, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
const STEGMAL: Record<Aktivitet, number> = { sedentary: 4000, light: 7000, moderate: 10000, active: 12000 };
const GOLV: Record<Kon, number> = { female: 1400, male: 1600 };
const MAL_UNDERSKOTT = 500;
const MIN_UNDERSKOTT = 100;
const MAX_UNDERSKOTT = 1000;
const KCAL_PER_KG_PLAN = 7000;
const OVERSKOTT_UPP = 300;

/** Mifflin-St Jeor, med samma dämpning vid högt BMI som appen. */
export function bmrFor(u: Pick<Uppgifter, 'kon' | 'alder' | 'langd' | 'vikt'>): number {
  let bmr = 10 * u.vikt + 6.25 * u.langd - 5 * u.alder + (u.kon === 'male' ? 5 : -161);
  const bmi = u.vikt / Math.pow(u.langd / 100, 2);
  if (bmi > 40) bmr *= 0.85;
  else if (bmi > 30) bmr *= 0.9;
  return bmr;
}

/** Det lägsta appen räknar fram: 1 400/1 600 kcal och aldrig under BMR. */
export const golvFor = (kon: Kon, bmr: number) => Math.max(GOLV[kon], Math.round(bmr));

export interface Startplan {
  bmr: number;
  golv: number;
  kalorier: number;
  stegPerDag: number;
  traning: Traningsplan;
}

export function startplan(u: Uppgifter): Startplan {
  const bmr = bmrFor(u);
  const tdee = bmr * AKTIVITET_FAKTOR[u.aktivitet];
  const golv = golvFor(u.kon, bmr);
  const kg = Math.round(u.vikt - u.malvikt);

  let justering = 0;
  if (kg >= 1) {
    // Ner i vikt: ca ett halvt kilo i veckan, men aldrig under golvet.
    const underskott = Math.min(MAL_UNDERSKOTT, tdee - golv);
    if (underskott >= MIN_UNDERSKOTT) {
      const dagar = Math.ceil((kg * KCAL_PER_KG_PLAN) / underskott);
      justering = -Math.round(Math.min(MAX_UNDERSKOTT, (kg * KCAL_PER_KG_PLAN) / dagar));
    } else {
      justering = -MAL_UNDERSKOTT;
    }
  } else if (kg <= -1) {
    justering = OVERSKOTT_UPP;
  }

  return {
    bmr,
    golv,
    kalorier: Math.round(Math.max(tdee + justering, golv)),
    stegPerDag: STEGMAL[u.aktivitet],
    traning: TRANING_FRAN_AKTIVITET[u.aktivitet],
  };
}

/** Samma gränser som "Din plan" i appen. Felmeddelande, eller null. */
export function kontrollera(u: Partial<Uppgifter>): string | null {
  const ok = (v: number | undefined, min: number, max: number) => v != null && Number.isFinite(v) && v >= min && v <= max;
  if (!ok(u.alder, 16, 100)) return 'Fyll i din ålder (16–100 år).';
  if (!ok(u.langd, 120, 220)) return 'Fyll i din längd i centimeter.';
  if (!ok(u.vikt, 35, 300)) return 'Fyll i din vikt i kilo.';
  if (!ok(u.malvikt, 35, 300)) return 'Fyll i din målvikt i kilo.';
  const skillnad = (u.vikt as number) - (u.malvikt as number);
  if (skillnad > 60) return 'Välj en målvikt högst 60 kilo under din vikt.';
  if (skillnad < -15) return 'Välj en målvikt högst 15 kilo över din vikt.';
  return null;
}

/**
 * Länken till appen. Uppgifterna ligger efter # så att de aldrig skickas till
 * någon server, och appen tar bort dem ur adressen direkt.
 * Format: plan=f_45_168_75.5_70_light (kön_ålder_längd_vikt_målvikt_aktivitet).
 */
export function appLank(u: Uppgifter): string {
  const plan = [u.kon === 'male' ? 'm' : 'f', u.alder, u.langd, u.vikt, u.malvikt, u.aktivitet].join('_');
  return `https://app.kostloggen.se/#plan=${plan}`;
}
