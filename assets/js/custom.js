/**
 * custom.js – visas asmeninio CV svetainės JavaScript kodas:
 *   1) 11 LD: kontaktų formos apdorojimas, validacija ir formatavimas;
 *   2) 12 LD: kompetencijų pažangos modulis (progress.html) – dinamiškos kortelės,
 *      būsenų keitimas, XP / lygio / rango / progreso / statistikos perskaičiavimas
 *      ir būsenų saugojimas naršyklės vietinėje saugykloje (Local Storage).
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;                         // kituose puslapiuose nieko nedarome

  const submitBtn = document.getElementById('submit-btn');
  const clearBtn = document.getElementById('clear-btn');
  const resultBox = document.getElementById('form-result');

  const inputs = Array.from(form.querySelectorAll('input.form-control'));
  const ratingInputs = inputs.filter((el) => /^q\d$/.test(el.id));
  const touched = new Set();                 // laukai, su kuriais vartotojas jau sąveikavo

  /* ------------------------------------------------------------
     VALIDACIJOS TAISYKLĖS (grąžina klaidos tekstą arba '')
  ------------------------------------------------------------ */
  const NAME_RE = /^\p{L}+$/u;               // tik raidės (įskaitant lietuviškas)
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_LENGTH = '+370 6xx xxxxx'.length;   // 14 simbolių

  const validators = {
    firstName: (v) =>
      !v ? 'Vardas yra privalomas.'
        : !NAME_RE.test(v) ? 'Vardą gali sudaryti tik raidės.' : '',

    lastName: (v) =>
      !v ? 'Pavardė yra privaloma.'
        : !NAME_RE.test(v) ? 'Pavardę gali sudaryti tik raidės.' : '',

    email: (v) =>
      !v ? 'El. paštas yra privalomas.'
        : !EMAIL_RE.test(v) ? 'Įveskite teisingą el. pašto adresą (pvz., vardas@pastas.lt).' : '',

    phone: (v) =>
      !v ? 'Telefono numeris yra privalomas.'
        : v.length < PHONE_LENGTH ? 'Numeris turi būti formatu +370 6xx xxxxx.' : '',

    address: (v) =>
      !v ? 'Adresas yra privalomas.' : '',
  };

  const ratingValidator = (v, input) => {
    if (v === '') {
      return input.validity.badInput
        ? 'Įveskite skaičių nuo 1 iki 10.'
        : 'Įvertinimas yra privalomas.';
    }
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 10
      ? ''
      : 'Įvertinimas turi būti sveikasis skaičius nuo 1 iki 10.';
  };

  /** Grąžina lauko klaidos tekstą (be jokio poveikio DOM). */
  const getError = (input) => {
    const value = input.value.trim();
    const validator = validators[input.id] || ratingValidator;
    return validator(value, input);
  };

  /* ------------------------------------------------------------
     KLAIDŲ RODYMAS IR MYGTUKO BŪSENA
  ------------------------------------------------------------ */
  const showFieldState = (input) => {
    const error = getError(input);
    const errorBox = document.getElementById(`${input.id}-error`);
    input.classList.toggle('field-invalid', Boolean(error));
    input.classList.toggle('field-valid', !error);
    input.setAttribute('aria-invalid', error ? 'true' : 'false');
    errorBox.textContent = error;
  };

  /** „Siųsti“ aktyvus tik tada, kai visi laukai užpildyti ir be klaidų. */
  const updateSubmitState = () => {
    submitBtn.disabled = !inputs.every((input) => getError(input) === '');
  };

  const handleChange = (input) => {
    touched.add(input);
    showFieldState(input);
    updateSubmitState();
  };

  /* ------------------------------------------------------------
     TELEFONO NUMERIO FORMATAVIMAS REALIUOJU LAIKU
     Leidžiami tik skaitmenys, formatas: +370 6xx xxxxx
  ------------------------------------------------------------ */
  const formatPhone = (raw) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('370')) digits = digits.slice(3);      // šalies kodas jau pridedamas automatiškai
    else if (digits.startsWith('8')) digits = digits.slice(1);   // nacionalinis priešdėlis 8 6xx xxxxx
    if (digits && digits[0] !== '6') digits = '';                // Lietuvos mobilieji prasideda 6
    digits = digits.slice(0, 8);                                 // apribojame ilgį: 8 skaitmenys po +370
    if (!digits) return '';
    return digits.length > 3
      ? `+370 ${digits.slice(0, 3)} ${digits.slice(3)}`
      : `+370 ${digits}`;
  };

  const phoneInput = document.getElementById('phone');
  phoneInput.addEventListener('keydown', (e) => {
    // neleidžiame rašyti raidžių ir simbolių (valdymo klavišai ir spartieji klavišai lieka)
    if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  });
  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  /* Vertinimo laukuose neleidžiame e, +, -, . simbolių */
  ratingInputs.forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
    });
  });

  /* ------------------------------------------------------------
     ĮVYKIAI: validacija realiu laiku
  ------------------------------------------------------------ */
  inputs.forEach((input) => {
    input.addEventListener('input', () => handleChange(input));
    input.addEventListener('blur', () => handleChange(input));
  });

  /* ------------------------------------------------------------
     FORMOS PATEIKIMAS
  ------------------------------------------------------------ */
  const addLine = (parent, text, className) => {
    const p = document.createElement('p');
    p.textContent = text;                    // textContent – saugu, nevykdo vartotojo HTML
    if (className) p.className = className;
    parent.appendChild(p);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();                  // 4a. puslapis neperkraunamas

    inputs.forEach(showFieldState);          // dar kartą patikriname viską
    updateSubmitState();
    if (submitBtn.disabled) return;

    // 4b. visos reikšmės JavaScript objekte
    const val = (id) => document.getElementById(id).value.trim();
    const data = {
      vardas: val('firstName'),
      pavarde: val('lastName'),
      elPastas: val('email'),
      telefonas: val('phone'),
      adresas: val('address'),
      klausimas1: Number(val('q1')),
      klausimas2: Number(val('q2')),
      klausimas3: Number(val('q3')),
    };

    // 4c. išvedimas į naršyklės konsolę
    console.log(data);

    // 5. trijų įvertinimų vidurkis
    const average = (data.klausimas1 + data.klausimas2 + data.klausimas3) / 3;

    // 4d. rezultatas svetainėje, formos apačioje
    resultBox.replaceChildren();
    const title = document.createElement('h4');
    title.textContent = 'Jūsų pateikti duomenys';
    resultBox.appendChild(title);

    addLine(resultBox, `Vardas: ${data.vardas}`);
    addLine(resultBox, `Pavardė: ${data.pavarde}`);
    addLine(resultBox, `El. paštas: ${data.elPastas}`);
    addLine(resultBox, `Tel. Numeris: ${data.telefonas}`);
    addLine(resultBox, `Adresas: ${data.adresas}`);
    addLine(resultBox, `1 klausimo įvertinimas: ${data.klausimas1}`);
    addLine(resultBox, `2 klausimo įvertinimas: ${data.klausimas2}`);
    addLine(resultBox, `3 klausimo įvertinimas: ${data.klausimas3}`);
    addLine(resultBox, `${data.vardas} ${data.pavarde}: ${average.toFixed(2)}`, 'result-average');

    resultBox.hidden = false;
  });

  /* ------------------------------------------------------------
     „IŠVALYTI“ – forma grąžinama į pradinę būseną be perkrovimo
  ------------------------------------------------------------ */
  clearBtn.addEventListener('click', () => {
    form.reset();                            // išvalo visus laukus
    touched.clear();
    inputs.forEach((input) => {
      input.classList.remove('field-invalid', 'field-valid');
      input.removeAttribute('aria-invalid');
      document.getElementById(`${input.id}-error`).textContent = '';   // klaidų pranešimai
    });
    resultBox.replaceChildren();             // pateikti duomenys ir vidurkis
    resultBox.hidden = true;
    submitBtn.disabled = true;               // „Siųsti“ vėl neaktyvus
  });

  updateSubmitState();                       // pradžioje mygtukas neaktyvus
});


/* ================================================================
   12 LD – KOMPETENCIJŲ PAŽANGOS MODULIS (progress.html)
================================================================ */

/* ---------- 1. DUOMENYS ---------- */

// Trys galimos įgūdžių būsenos (+ CSS klasė ir stulpelio identifikatorius)
const STATUS_PLANNED = 'Planuojama';
const STATUS_LEARNING = 'Mokomasi';
const STATUS_DONE = 'Atlikta';

const STATUSES = [
  { name: STATUS_PLANNED, key: 'planned' },
  { name: STATUS_LEARNING, key: 'learning' },
  { name: STATUS_DONE, key: 'done' },
];

// Pradinis įgūdžių masyvas (objektai: pavadinimas, būsena, XP). Bendra suma: 360 XP
const DEFAULT_SKILLS = [
  { id: 'simulink',   name: 'Simulink modeliavimas',      icon: 'bi-diagram-3',        status: STATUS_PLANNED,  xp: 40 },
  { id: 'python',     name: 'Python duomenų analizei',    icon: 'bi-filetype-py',      status: STATUS_PLANNED,  xp: 30 },
  { id: 'javascript', name: 'JavaScript pagrindai',       icon: 'bi-filetype-js',      status: STATUS_LEARNING, xp: 30 },
  { id: 'grids',      name: 'Elektros tinklų analizė',    icon: 'bi-lightning-charge', status: STATUS_LEARNING, xp: 50 },
  { id: 'html-css',   name: 'HTML ir CSS',                icon: 'bi-filetype-html',    status: STATUS_DONE,     xp: 40 },
  { id: 'matlab',     name: 'MATLAB grafikai',            icon: 'bi-graph-up',         status: STATUS_DONE,     xp: 60 },
  { id: 'git',        name: 'Git ir GitHub',              icon: 'bi-github',           status: STATUS_DONE,     xp: 30 },
  { id: 'circuits',   name: 'Elektros grandinių analizė', icon: 'bi-cpu',              status: STATUS_DONE,     xp: 80 },
];

// Lygių ir rangų lentelė (min – nuo kiek XP prasideda lygis)
const LEVELS = [
  { level: 1, min: 0,   rank: 'Pradedantysis' },
  { level: 2, min: 50,  rank: 'Praktikantas' },
  { level: 3, min: 150, rank: 'Specialistas' },
  { level: 4, min: 300, rank: 'Profesionalas' },
];

const STORAGE_KEY = 'skillProgress.statuses.v1';

/* ---------- 2. LOCAL STORAGE ---------- */

/** Išsaugo esamas įgūdžių būsenas ({ id: būsena }) vietinėje saugykloje. */
function saveSkills(skills) {
  const statuses = {};
  skills.forEach((skill) => { statuses[skill.id] = skill.status; });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.warn('Nepavyko išsaugoti būsenų vietinėje saugykloje:', error);
  }
}

/**
 * Sukuria įgūdžių sąrašą: jei vietinėje saugykloje yra išsaugotų būsenų – jos
 * pritaikomos, kitu atveju naudojamos pradinės būsenos iš DEFAULT_SKILLS.
 */
function loadSkills() {
  const skills = DEFAULT_SKILLS.map((skill) => ({ ...skill }));   // kopija, kad originalas nesikeistų
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      skills.forEach((skill) => {
        if (STATUSES.some((s) => s.name === saved[skill.id])) {    // priimame tik žinomas būsenas
          skill.status = saved[skill.id];
        }
      });
    }
  } catch (error) {
    console.warn('Nepavyko nuskaityti vietinės saugyklos, naudojamos pradinės būsenos:', error);
  }
  return skills;
}

/* ---------- 3. SKAIČIAVIMO FUNKCIJOS ---------- */

/** Bendras XP – sudedami TIK „Atlikta“ būsenos įgūdžių taškai. */
function calculateTotalXp(skills) {
  return skills
    .filter((skill) => skill.status === STATUS_DONE)
    .reduce((sum, skill) => sum + skill.xp, 0);
}

/** Pagal XP grąžina lygio objektą, kitą lygį ir progresą (%) nuo einamo lygio pradžios iki kito lygio ribos. */
function getLevelInfo(xp) {
  let index = 0;
  LEVELS.forEach((lvl, i) => { if (xp >= lvl.min) index = i; });

  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;

  // aukščiausiame (4) lygyje juosta rodo 100 %
  const percent = next
    ? Math.round(((xp - current.min) / (next.min - current.min)) * 100)
    : 100;

  return { current, next, percent };
}

/** Bendras įgūdžių skaičius, atliktų skaičius ir atliktų procentas. */
function calculateStats(skills) {
  const total = skills.length;
  const done = skills.filter((skill) => skill.status === STATUS_DONE).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}

/* ---------- 4. ATVAIZDAVIMO FUNKCIJOS ---------- */

/** Sukuria vienos įgūdžio kortelės DOM elementą. */
function createSkillCard(skill) {
  const meta = STATUSES.find((s) => s.name === skill.status);

  const li = document.createElement('li');
  const card = document.createElement('article');
  card.className = `skill-card ${meta.key}`;
  card.dataset.skillId = skill.id;

  const icon = document.createElement('span');
  icon.className = 'skill-icon';
  icon.setAttribute('aria-hidden', 'true');
  const i = document.createElement('i');
  i.className = `bi ${skill.icon}`;
  icon.appendChild(i);

  const info = document.createElement('div');
  info.className = 'skill-info';
  const name = document.createElement('h4');
  name.className = 'skill-name';
  name.textContent = skill.name;
  const status = document.createElement('span');
  status.className = 'skill-status';
  status.textContent = `Būsena: ${skill.status}`;
  info.append(name, status);

  const xp = document.createElement('span');
  xp.className = 'skill-xp';
  xp.textContent = `XP: ${skill.xp}`;

  // būsenos keitimo sąrašas
  const select = document.createElement('select');
  select.className = 'skill-select';
  select.id = `status-${skill.id}`;
  select.dataset.skillId = skill.id;
  select.setAttribute('aria-label', `Keisti įgūdžio „${skill.name}“ būseną`);
  STATUSES.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.name;
    option.textContent = s.name;
    option.selected = s.name === skill.status;
    select.appendChild(option);
  });

  card.append(icon, info, xp, select);
  li.appendChild(card);
  return li;
}

/** Sugeneruoja korteles pagal masyvą ir išdėsto jas atitinkamuose stulpeliuose. */
function renderSkills(skills) {
  STATUSES.forEach(({ name, key }) => {
    const list = document.getElementById(`list-${key}`);
    const inColumn = skills.filter((skill) => skill.status === name);

    list.replaceChildren();
    inColumn.forEach((skill) => list.appendChild(createSkillCard(skill)));

    if (inColumn.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'kanban-empty';
      empty.textContent = 'Šiame stulpelyje įgūdžių nėra';
      list.appendChild(empty);
    }
    document.getElementById(`count-${key}`).textContent = inColumn.length;
  });
}

/** Atnaujina bendrą XP, lygį, rangą ir progreso juostą. */
function renderProgress(skills) {
  const totalXp = calculateTotalXp(skills);
  const { current, next, percent } = getLevelInfo(totalXp);

  document.getElementById('xp-total').textContent = `${totalXp} XP`;
  document.getElementById('level-value').textContent = current.level;
  document.getElementById('rank-value').textContent = current.rank;

  const bar = document.getElementById('xp-bar');
  bar.setAttribute('aria-valuenow', percent);
  document.getElementById('xp-bar-fill').style.setProperty('--value', `${percent}%`);
  document.getElementById('xp-bar-text').textContent = `${percent}%`;

  const label = document.getElementById('xp-progress-label');
  const note = document.getElementById('xp-progress-note');
  if (next) {
    label.textContent = 'Progresas iki kito lygio';
    note.textContent = `${totalXp} / ${next.min} XP · liko ${next.min - totalXp} XP iki ${next.level} lygio`;
  } else {
    label.textContent = 'Pasiektas aukščiausias lygis';
    note.textContent = `${totalXp} XP · maksimalus progresas`;
  }
}

/** Atnaujina statistiką: viso įgūdžių, atlikta, procentas. */
function renderStats(skills) {
  const { total, done, percent } = calculateStats(skills);
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-percent').textContent = `${percent}%`;
}

/** Perpiešia visą modulį pagal dabartinę įgūdžių masyvo būseną. */
function updateModule(skills) {
  renderSkills(skills);
  renderProgress(skills);
  renderStats(skills);
}

/* ---------- 5. INICIALIZACIJA ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const kanban = document.getElementById('kanban');
  if (!kanban) return;                       // kituose puslapiuose modulio nėra

  const skills = loadSkills();               // iš Local Storage arba pradinės būsenos
  updateModule(skills);

  // Būsenos keitimas (event delegation – vienas klausytojas visai lentai)
  kanban.addEventListener('change', (event) => {
    const select = event.target.closest('.skill-select');
    if (!select) return;

    const skill = skills.find((item) => item.id === select.dataset.skillId);
    if (!skill) return;

    skill.status = select.value;             // pakeičiama būsena masyve
    saveSkills(skills);                      // išsaugoma Local Storage
    updateModule(skills);                    // kortelė perkeliama, viskas perskaičiuojama

    // grąžiname fokusą į perkeltą kortelę (patogu valdant klaviatūra)
    const moved = kanban.querySelector(`.skill-select[data-skill-id="${skill.id}"]`);
    if (moved) moved.focus();
  });
});
