/**
 * "Vrid på knapparna" på landningssidan. Hon fyller i några uppgifter och
 * ser sin viktkurva de kommande 12 veckorna, och vad mer eller mindre mat,
 * fler steg och mer träning gör med den. Inget sparas och inget skickas.
 * Vill hon fortsätta följer uppgifterna med till appen ("Din plan").
 */
import {
  Intensitet, Scenario, VECKOR, INTENSITET_NAMN,
  viktkurva, kgPerVecka, veckaForMal, rorelseForExtraKcal, forSnabbt, underskott,
} from './energySimulator';
import { Aktivitet, Kon, Uppgifter, Startplan, startplan, kontrollera, appLank } from './simulatorPlan';

const tal = (n: number) => Math.round(n).toLocaleString('sv-SE');
const kg1 = (n: number) => n.toFixed(1).replace('.', ',');
const plus = (n: number) => (n > 0 ? `+${n}` : String(n));
const lasTal = (s: string) => parseFloat(s.replace(',', '.').trim());

function diagram(nu: number[], ny: number[], malvikt: number): string {
  const B = 320, H = 170, V = 34, Hm = 8, U = 22, O = 10;
  const alla = [...nu, ...ny, malvikt];
  let min = Math.floor(Math.min(...alla) - 0.5), max = Math.ceil(Math.max(...alla) + 0.5);
  if (max - min < 2) { min -= 1; max += 1; }
  const x = (v: number) => V + (v / VECKOR) * (B - V - Hm);
  const y = (w: number) => O + ((max - w) / (max - min)) * (H - O - U);
  const linje = (k: number[]) => k.map((w, v) => `${v ? 'L' : 'M'}${x(v).toFixed(1)},${y(w).toFixed(1)}`).join(' ');
  const yEtiketter = [max, (max + min) / 2, min];
  const malSyns = malvikt >= min && malvikt <= max;
  return `
    <svg viewBox="0 0 ${B} ${H}" role="img" aria-label="Vikten om 12 veckor: ${kg1(nu[VECKOR])} kg med planen, ${kg1(ny[VECKOR])} kg med ändringarna">
      ${yEtiketter.map(w => `
        <line x1="${V}" x2="${B - Hm}" y1="${y(w)}" y2="${y(w)}" stroke="#F1EAE0" />
        <text x="${V - 6}" y="${y(w) + 4}" text-anchor="end" font-size="10" fill="#7A756E">${kg1(w)}</text>`).join('')}
      ${[0, 4, 8, 12].map(v => `<text x="${x(v)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#7A756E">${v === 0 ? 'Nu' : `v ${v}`}</text>`).join('')}
      ${malSyns ? `
        <line x1="${V}" x2="${B - Hm}" y1="${y(malvikt)}" y2="${y(malvikt)}" stroke="#7BA05B" stroke-width="1.5" stroke-dasharray="5 4" />
        <text x="${B - Hm}" y="${y(malvikt) - 4}" text-anchor="end" font-size="10" font-weight="600" fill="#7BA05B">Mål ${kg1(malvikt)} kg</text>` : ''}
      <path d="${linje(nu)}" fill="none" stroke="#B5ADA3" stroke-width="2" stroke-dasharray="4 4" />
      <path d="${linje(ny)}" fill="none" stroke="#D96E4A" stroke-width="3" stroke-linecap="round" />
      <circle cx="${x(VECKOR)}" cy="${y(ny[VECKOR])}" r="4" fill="#D96E4A" />
    </svg>`;
}

export function setupSimulator(): void {
  const form = document.getElementById('sim-form') as HTMLFormElement | null;
  const resultat = document.getElementById('sim-resultat');
  if (!form || !resultat) return;

  const fel = document.getElementById('sim-fel')!;
  const val = (namn: string) => form.querySelector<HTMLButtonElement>(`[data-${namn}][aria-pressed="true"]`);

  // Kön och aktivitetsnivå väljs med knappar.
  form.querySelectorAll<HTMLButtonElement>('[data-kon], [data-aktivitet]').forEach(knapp => {
    knapp.addEventListener('click', () => {
      const grupp = knapp.hasAttribute('data-kon') ? '[data-kon]' : '[data-aktivitet]';
      form.querySelectorAll<HTMLButtonElement>(grupp).forEach(k => k.setAttribute('aria-pressed', String(k === knapp)));
    });
  });

  let u: Uppgifter;
  let plan: Startplan;
  let ny: Scenario;

  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const kalReglage = el<HTMLInputElement>('sim-kal');
  const stegReglage = el<HTMLInputElement>('sim-steg');
  const timReglage = el<HTMLInputElement>('sim-tim');

  const nuScenario = (): Scenario => ({ kalorier: plan.kalorier, stegPerDag: plan.stegPerDag, traning: plan.traning });

  const rita = () => {
    const nu = nuScenario();
    const andrad = ny.kalorier !== nu.kalorier || ny.stegPerDag !== nu.stegPerDag
      || ny.traning.timmarPerVecka !== nu.traning.timmarPerVecka || ny.traning.intensitet !== nu.traning.intensitet;

    el('sim-diagram').innerHTML = diagram(viktkurva(plan.bmr, u.vikt, nu), viktkurva(plan.bmr, u.vikt, ny), u.malvikt);

    const taktText = (t: number) => Math.abs(t) < 0.05 ? 'ungefär oförändrad vikt' : `${t < 0 ? 'ner' : 'upp'} ca ${kg1(Math.abs(t))} kg i veckan`;
    const malText = (v: number | null) => v === null ? 'nås inte i den här takten' : v === 0 ? 'är nådd' : `nås om ca ${v} veckor`;
    const taktNu = kgPerVecka(plan.bmr, u.vikt, nu), taktNy = kgPerVecka(plan.bmr, u.vikt, ny);
    const veckaNu = veckaForMal(plan.bmr, u.vikt, nu, u.malvikt), veckaNy = veckaForMal(plan.bmr, u.vikt, ny, u.malvikt);
    const extraKcal = ny.kalorier - nu.kalorier;
    const behov = rorelseForExtraKcal(extraKcal, u.vikt);

    let text = andrad
      ? `Med ändringarna: <strong>${taktText(taktNy)}</strong>, och målet ${malText(veckaNy)}. Med planen: ${taktText(taktNu)}, målet ${malText(veckaNu)}.`
      : `Med planen: <strong>${taktText(taktNu)}</strong>, och målet ${malText(veckaNu)}. Dra i reglagen för att jämföra.`;
    if (extraKcal > 0) {
      text += `<span class="sim-extra">För att äta ${extraKcal} kcal mer om dagen i samma takt behöver du ungefär <strong>${tal(behov.steg)} steg till per dag</strong>, eller <strong>${String(behov.timmarMedel).replace('.', ',')} timmar medelträning till i veckan</strong>.</span>`;
    }
    el('sim-text').innerHTML = text;

    const underGolv = ny.kalorier < plan.golv && ny.kalorier !== nu.kalorier;
    el('sim-golv').hidden = !underGolv;
    el('sim-golv').textContent = `Det här är under ${tal(plan.golv)} kcal, den lägsta nivå appen räknar fram för dig. Vill du gå lägre, prata gärna med en coach först.`;
    el('sim-snabbt').hidden = !forSnabbt(plan.bmr, u.vikt, ny);

    el('sim-kal-varde').textContent = `${tal(ny.kalorier)} kcal`;
    el('sim-kal-under').textContent = extraKcal !== 0 ? `${plus(extraKcal)} kcal mot planen ${tal(nu.kalorier)}` : 'Din plan';
    el('sim-steg-varde').textContent = tal(ny.stegPerDag);
    el('sim-steg-under').textContent = `Stegmål i planen ${tal(nu.stegPerDag)}`;
    el('sim-tim-varde').textContent = `${String(ny.traning.timmarPerVecka).replace('.', ',')} tim`;
    form.parentElement!.querySelectorAll<HTMLButtonElement>('[data-intensitet]').forEach(k =>
      k.setAttribute('aria-pressed', String(k.dataset.intensitet === ny.traning.intensitet)));

    const balans = Math.round(underskott(plan.bmr, u.vikt, ny));
    el('sim-balans').textContent = `Balans: ${balans >= 0 ? `ca ${balans} kcal underskott` : `ca ${-balans} kcal överskott`} per dag.`;
    el('sim-aterstall').hidden = !andrad;
  };

  const aterstall = () => {
    ny = { ...nuScenario(), traning: { ...plan.traning } };
    kalReglage.value = String(ny.kalorier);
    stegReglage.value = String(ny.stegPerDag);
    timReglage.value = String(ny.traning.timmarPerVecka);
    rita();
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const kandidat = {
      kon: (val('kon')?.dataset.kon || 'female') as Kon,
      alder: lasTal(el<HTMLInputElement>('sim-alder').value),
      langd: lasTal(el<HTMLInputElement>('sim-langd').value),
      vikt: lasTal(el<HTMLInputElement>('sim-vikt').value),
      malvikt: lasTal(el<HTMLInputElement>('sim-malvikt').value),
      aktivitet: (val('aktivitet')?.dataset.aktivitet || 'light') as Aktivitet,
    };
    const problem = kontrollera(kandidat);
    fel.textContent = problem || '';
    fel.hidden = !problem;
    if (problem) return;

    u = kandidat;
    plan = startplan(u);
    // Kaloriereglaget går i steg om 25 kcal räknat från planen, så att +200 blir +200.
    kalReglage.min = String(plan.kalorier - 25 * Math.floor(Math.max(0, plan.kalorier - 1000) / 25));
    kalReglage.max = String(plan.kalorier + 1000);
    el('sim-plan').innerHTML = `Din plan: <strong>${tal(plan.kalorier)} kcal</strong> om dagen, ${tal(plan.stegPerDag)} steg och ${String(plan.traning.timmarPerVecka).replace('.', ',')} timmar ${INTENSITET_NAMN[plan.traning.intensitet].toLowerCase()} träning i veckan.`;
    el<HTMLAnchorElement>('sim-cta').href = appLank(u);

    form.hidden = true;
    resultat.hidden = false;
    aterstall();
    resultat.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  kalReglage.addEventListener('input', () => { ny = { ...ny, kalorier: Number(kalReglage.value) }; rita(); });
  stegReglage.addEventListener('input', () => { ny = { ...ny, stegPerDag: Number(stegReglage.value) }; rita(); });
  timReglage.addEventListener('input', () => { ny = { ...ny, traning: { ...ny.traning, timmarPerVecka: Number(timReglage.value) } }; rita(); });
  resultat.querySelectorAll<HTMLButtonElement>('[data-intensitet]').forEach(k =>
    k.addEventListener('click', () => { ny = { ...ny, traning: { ...ny.traning, intensitet: k.dataset.intensitet as Intensitet } }; rita(); }));
  el('sim-aterstall').addEventListener('click', aterstall);
  el('sim-andra').addEventListener('click', () => {
    resultat.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
