/* COCO Guest List — form logic.
 *
 * SETUP: paste the owner's Apps Script Web app URL (ends in /exec) below.
 * While it still says PASTE_..., the page runs in "preview mode":
 * nothing is sent or saved, so you can try the design safely.
 * Preview tip: use the email taken@example.com to see the "already registered" message.
 */
const CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbzKyCmxpOo8qKpHxGVzSgVkPkP52TElRNwD5aWWPzhctHq_ag7q6BBbhkylZ6aQmXmLTQ/exec'
};

(function () {
  'use strict';

  const REQUEST_TIMEOUT_MS = 30000;
  const BUTTON_LABEL = 'Claim my free entry →';
  const pageLoadedAt = Date.now();
  const previewMode = !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(CONFIG.endpoint);

  const form = document.getElementById('signup-form');
  const button = document.getElementById('submit');
  const formMsg = document.getElementById('form-msg');
  const formView = document.getElementById('form-view');
  const doneView = document.getElementById('done-view');
  const doneTitle = document.getElementById('done-title');
  const doneText = document.getElementById('done-text');

  if (previewMode) document.getElementById('demo-badge').hidden = false;

  const FIELDS = ['name', 'email', 'phone'];

  // Same rules as the backend (backend/Code.gs) so visitors get instant feedback.
  const NAME_RE = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+[1-9]\d{6,14}$/; // + country code, then the number: 7 to 15 digits

  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const normalizePhone = (v) => String(v || '').replace(/[\s().-]/g, '').replace(/^00/, '+');

  // The form has one "Your name" box. The Sheet keeps two columns, so split at the first space:
  // "Mary Jane Smith" -> first "Mary", last "Jane Smith".
  function splitName(full) {
    const text = clean(full);
    const at = text.indexOf(' ');
    if (at === -1) return { firstName: text, lastName: '' };
    return { firstName: text.slice(0, at), lastName: text.slice(at + 1) };
  }

  // Country picker for the phone field (vendor/intl-tel-input): flag, dial code,
  // search, formatting and Google's phone rules for every country.
  // If it didn't load, the field still works as a plain box that needs the +code.
  const phoneInput = form.elements.phone;
  let iti = null;
  try {
    if (window.intlTelInput) {
      iti = window.intlTelInput(phoneInput, {
        initialCountry: 'es',
        countryOrder: ['es', 'gb', 'fr', 'it', 'de', 'nl', 'us'],
        // WhatsApp needs a mobile. This also accepts "fixed line or mobile" numbers (e.g. the USA).
        allowedNumberTypes: ['MOBILE'],
        uiTranslations: { searchPlaceholder: 'Search country' }
      });
    }
  } catch (err) {
    iti = null;
  }
  if (!iti) phoneInput.placeholder = '+34 600 00 00 00';

  // Returns { number: '+34612345678', error: '' }. The number is only set when it is valid.
  function readPhone() {
    if (!phoneInput.value.trim()) return { number: '', error: 'Please enter your WhatsApp number.' };
    if (iti) {
      if (iti.isValidNumberPrecise()) return { number: iti.getNumber(), error: '' };
      const reason = iti.getValidationError();
      if (reason === 'TOO_SHORT') return { number: '', error: 'This number looks too short.' };
      if (reason === 'TOO_LONG') return { number: '', error: 'This number looks too long.' };
      if (reason === 'INVALID_COUNTRY_CODE') return { number: '', error: 'Please choose your country.' };
      if (iti.getNumberType() === 'FIXED_LINE') return { number: '', error: 'Please use a mobile number, so we can add you on WhatsApp.' };
      return { number: '', error: 'Please enter a valid phone number.' };
    }
    const number = normalizePhone(phoneInput.value);
    if (number[0] !== '+') return { number: '', error: 'Please include your country code, e.g. +34.' };
    if (!PHONE_RE.test(number)) return { number: '', error: 'Please enter a valid phone number.' };
    return { number: number, error: '' };
  }

  function validate(data, phoneError) {
    const errors = {};
    const bad = (s) => !s || s.length > 60 || !NAME_RE.test(s);
    if (!data.firstName) errors.name = 'Please enter your first and last name.';
    else if (!data.lastName) errors.name = 'Please enter your first and last name.';
    else if (bad(data.firstName) || bad(data.lastName)) errors.name = 'Please use letters only.';
    if (!data.email) errors.email = 'Please enter your email address.';
    else if (data.email.length > 254 || !EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
    if (phoneError) errors.phone = phoneError;
    return errors;
  }

  function showFieldErrors(errors) {
    FIELDS.forEach((name) => {
      const input = form.elements[name];
      const msg = errors[name] || '';
      document.getElementById(name + '-err').textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    const first = FIELDS.find((n) => errors[n]);
    if (first) form.elements[first].focus();
  }

  function setLoading(on) {
    button.disabled = on;
    button.classList.toggle('is-loading', on);
    button.querySelector('.btn-label').textContent = on ? 'Adding you' : BUTTON_LABEL;
  }

  function showFormMessage(text, isError) {
    formMsg.textContent = text;
    formMsg.classList.toggle('is-error', !!isError);
  }

  function showDone(title, text) {
    doneTitle.textContent = title;
    doneText.textContent = text;
    formView.hidden = true;
    doneView.hidden = false;
    doneView.focus();
    doneView.scrollIntoView({ block: 'center' });
  }

  // Clear a field's error as soon as the visitor edits it.
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid')) {
      e.target.removeAttribute('aria-invalid');
      document.getElementById(e.target.name + '-err').textContent = '';
    }
  });

  async function send(payload) {
    if (previewMode) {
      await new Promise((r) => setTimeout(r, 900));
      if (payload.email === 'taken@example.com') {
        return { ok: true, code: 'duplicate', message: "You're already registered with this email address." };
      }
      return { ok: true, code: 'ok', message: "You're on the list! Check your inbox for your ticket." };
    }
    // Google can occasionally be slow. Give up after 30 s so the button never hangs forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // text/plain avoids a browser "preflight" request that Apps Script can't answer.
      const res = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFormMessage('');

    const phone = readPhone();
    const name = splitName(form.elements.name.value);
    const data = {
      firstName: name.firstName,
      lastName: name.lastName,
      email: String(form.elements.email.value || '').trim().toLowerCase(),
      phone: phone.number
    };
    const errors = validate(data, phone.error);
    showFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      const result = await send({
        ...data,
        website: form.elements.website.value,
        elapsedMs: Date.now() - pageLoadedAt,
        source: 'website'
      });

      if (result.ok && result.code === 'duplicate') {
        showDone('Already on the list', result.message);
      } else if (result.ok && result.queued) {
        // Saved, but the email is waiting (very busy day, or a temporary problem).
        showDone('You’re on the list!', 'Your spot is saved. We’ll email your ticket to ' + data.email + ' soon, so please keep an eye on your inbox, spam and Promotions folders.');
      } else if (result.ok) {
        showDone('You’re on the list!', 'Check your inbox for your ticket. If it isn’t there in a few minutes, look in your spam or Promotions folder.');
      } else if (result.code === 'invalid' && Array.isArray(result.fields)) {
        const errs = {};
        result.fields.forEach((f) => { errs[f === 'firstName' || f === 'lastName' ? 'name' : f] = 'Please check this field.'; });
        showFieldErrors(errs);
        showFormMessage(result.message, true);
      } else {
        showFormMessage(result.message || 'Something went wrong. Please try again.', true);
      }
    } catch (err) {
      showFormMessage('We couldn’t reach the guest list in time. Please check your connection and try again.', true);
    } finally {
      setLoading(false);
    }
  });
})();
