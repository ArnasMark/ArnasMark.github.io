/**
 * custom.js – 11 LD: kontaktų formos apdorojimas, validacija ir formatavimas.
 * Visi šio laboratorinio darbo JavaScript pakeitimai yra tik šiame faile.
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
