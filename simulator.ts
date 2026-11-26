/**
 * "Vrid på knapparna" på landningssidan. Hon fyller i några uppgifter och
 * ser när hon når sin målvikt, och vad mer eller mindre mat,
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

/** Hur långt diagrammet går: minst 12 veckor, och så långt att målet syns (högst ett år). */
function horisont(...veckor: (number | null)[]): number {
  const langst = Math.max(VECKOR, ...veckor.map(v => (v != null && v <= 52 ? v + 2 : 0)));
  return Math.min(52, Math.ceil(langst / 4) * 4);
}

function diagram(nu: number[], ny: number[], malvikt: number, veckaNu: number | null, veckaNy: number | null): string {
  const B = 320, H = 180, V = 34, Hm = 10, U = 22, O = 16;
  const sista = nu.length - 1;
  const alla = [...nu, ...ny, malvikt];
  let min = Math.floor(Math.min(...alla) - 0.5), max = Math.ceil(Math.max(...alla) + 0.5);
  if (max - min < 2) { min -= 1; max += 1; }
  const x = (v: number) => V + (v / sista) * (B - V - Hm);
  const y = (w: number) => O + ((max - w) / (max - min)) * (H - O - U);
  const linje = (k: number[]) => k.map((w, v) => `${v ? 'L' : 'M'}${x(v).toFixed(1)},${y(w).toFixed(1)}`).join(' ');
  const yEtiketter = [max, (max + min) / 2, min];
  const xEtiketter = [0, Math.round(sista / 3), Math.round((2 * sista) / 3), sista];
  const malSyns = malvikt >= min && malvikt <= max;
  // Punkten där kurvan når målet, med veckan utskriven.
  const malpunkt = (v: number | null, farg: string, ovan: boolean) => (v != null && v > 0 && v <= sista && malSyns ? `
      <circle cx="${x(v)}" cy="${y(malvikt)}" r="5" fill="#fff" stroke="${farg}" stroke-width="2.5" />
      <text x="${x(v)}" y="${y(malvikt) + (ovan ? -9 : 17)}" text-anchor="middle" font-size="10" font-weight="700" fill="${farg}">v ${v}</text>` : '');
  return `
    <svg viewBox="0 0 ${B} ${H}" role="img" aria-label="Viktkurvor ${sista} veckor fram mot målet ${kg1(malvikt)} kg">
      ${yEtiketter.map(w => `
        <line x1="${V}" x2="${B - Hm}" y1="${y(w)}" y2="${y(w)}" stroke="#F1EAE0" />
        <text x="${V - 6}" y="${y(w) + 4}" text-anchor="end" font-size="10" fill="#7A756E">${kg1(w)}</text>`).join('')}
      ${xEtiketter.map(v => `<text x="${x(v)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#7A756E">${v === 0 ? 'Nu' : `v ${v}`}</text>`).join('')}
      ${malSyns ? `
        <line x1="${V}" x2="${B - Hm}" y1="${y(malvikt)}" y2="${y(malvikt)}" stroke="#7BA05B" stroke-width="1.5" stroke-dasharray="5 4" />
        <text x="${V + 4}" y="${y(malvikt) - 5}" text-anchor="start" font-size="10" font-weight="600" fill="#7BA05B">Mål ${kg1(malvikt)} kg</text>` : ''}
      <path d="${linje(nu)}" fill="none" stroke="#B5ADA3" stroke-width="2" stroke-dasharray="4 4" />
      <path d="${linje(ny)}" fill="none" stroke="#D96E4A" stroke-width="3" stroke-linecap="round" />
      ${veckaNu !== veckaNy ? malpunkt(veckaNu, '#9A9188', false) : ''}
      ${malpunkt(veckaNy, '#D96E4A', true)}
    </svg>`;
}

const manad = (veckor: number) => {
  const d = new Date();
  d.setDate(d.getDate() + veckor * 7);
  return d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
};
const veckorText = (n: number) => `${n} ${n === 1 ? 'vecka' : 'veckor'}`;

/** Den stora raden om målet, och jämförelsen med planen. */
function malRuta(vikt: number, malvikt: number, veckaNu: number | null, veckaNy: number | null, taktNy: number, andrad: boolean): string {
  const mal = `${kg1(malvikt)} kg`;
  let rubrik: string;
  if (Math.abs(vikt - malvikt) < 0.5) {
    rubrik = `Du håller vikten runt <strong>${kg1(vikt)} kg</strong>.`;
  } else if (veckaNy != null) {
    rubrik = `Du når <strong>${mal}</strong> om ca <strong>${veckorText(veckaNy)}</strong> – runt ${manad(veckaNy)}.`;
  } else {
    const felHall = Math.abs(taktNy) < 0.05 || Math.sign(taktNy) !== Math.sign(malvikt - vikt);
    rubrik = felHall
      ? `Så här når du <strong>inte ${mal}</strong> – vikten ${Math.abs(taktNy) < 0.05 ? 'står still' : malvikt < vikt ? 'går upp' : 'går ner'}.`
      : `Så här tar det <strong>mer än två år</strong> att nå ${mal}.`;
  }

  let jmf = '';
  if (andrad) {
    if (veckaNy != null && veckaNu != null) {
      const skillnad = veckaNy - veckaNu;
      jmf = skillnad < 0 ? `<span class="sim-jmf sim-jmf-bra">${veckorText(-skillnad)} snabbare än planen</span>`
        : skillnad > 0 ? `<span class="sim-jmf sim-jmf-varn">${veckorText(skillnad)} långsammare än planen</span>`
        : `<span class="sim-jmf">Samma tid som planen</span>`;
    } else if (veckaNy == null && veckaNu != null) {
      jmf = `<span class="sim-jmf sim-jmf-stopp">Med planen når du målet om ${veckorText(veckaNu)}</span>`;
    } else if (veckaNy != null && veckaNu == null) {
      jmf = `<span class="sim-jmf sim-jmf-bra">Nu når du målet – det gjorde du inte med planen</span>`;
    }
  }
  const klass = veckaNy == null && Math.abs(vikt - malvikt) >= 0.5 ? ' sim-mal-nas-inte' : '';
  return `<div class="sim-mal${klass}"><p>${rubrik}</p>${jmf}</div>`;
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

    const taktText = (t: number) => Math.abs(t) < 0.05 ? 'ungefär oförändrad vikt' : `${t < 0 ? 'ner' : 'upp'} ca ${kg1(Math.abs(t))} kg i veckan`;
    const taktNu = kgPerVecka(plan.bmr, u.vikt, nu), taktNy = kgPerVecka(plan.bmr, u.vikt, ny);
    const veckaNu = veckaForMal(plan.bmr, u.vikt, nu, u.malvikt), veckaNy = veckaForMal(plan.bmr, u.vikt, ny, u.malvikt);
    const veckor = horisont(veckaNu, veckaNy);
    const extraKcal = ny.kalorier - nu.kalorier;
    const behov = rorelseForExtraKcal(extraKcal, u.vikt);

    el('sim-mal').innerHTML = malRuta(u.vikt, u.malvikt, veckaNu, veckaNy, taktNy, andrad);
    el('sim-diagram').innerHTML = diagram(viktkurva(plan.bmr, u.vikt, nu, veckor), viktkurva(plan.bmr, u.vikt, ny, veckor), u.malvikt, veckaNu, veckaNy);

    let text = andrad
      ? `Takt med ändringarna: <strong>${taktText(taktNy)}</strong>. Med planen: ${taktText(taktNu)}.`
      : `Takt: <strong>${taktText(taktNu)}</strong>. Dra i reglagen och se vad som händer med målet.`;
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
