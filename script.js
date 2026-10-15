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
  const pageLoadedAt = Date.now();
  const previewMode = !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(CONFIG.endpoint);

  const form = document.getElementById('signup');
  const button = document.getElementById('submit');
  const formMsg = document.getElementById('form-msg');
  const formView = document.getElementById('form-view');
  const doneView = document.getElementById('done-view');
  const doneTitle = document.getElementById('done-title');
  const doneText = document.getElementById('done-text');

  if (previewMode) document.getElementById('demo-badge').hidden = false;

  // Same rules as the backend (backend/Code.gs) so visitors get instant feedback.
  const NAME_RE = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

  function validate(data) {
    const errors = {};
    if (!data.firstName) errors.firstName = 'Please enter your first name.';
    else if (data.firstName.length > 60 || !NAME_RE.test(data.firstName)) errors.firstName = 'Please use letters only.';
    if (!data.lastName) errors.lastName = 'Please enter your last name.';
    else if (data.lastName.length > 60 || !NAME_RE.test(data.lastName)) errors.lastName = 'Please use letters only.';
    if (!data.email) errors.email = 'Please enter your email address.';
    else if (data.email.length > 254 || !EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
    return errors;
  }

  function showFieldErrors(errors) {
    ['firstName', 'lastName', 'email'].forEach((name) => {
      const input = form.elements[name];
      const msg = errors[name] || '';
      document.getElementById(name + '-err').textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    const first = ['firstName', 'lastName', 'email'].find((n) => errors[n]);
    if (first) form.elements[first].focus();
  }

  function setLoading(on) {
    button.disabled = on;
    button.classList.toggle('is-loading', on);
    button.querySelector('.btn-label').textContent = on ? 'Adding you' : 'Join the list';
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
      return { ok: true, code: 'ok', message: "You're on the list! Check your inbox for the details." };
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

    const data = {
      firstName: clean(form.elements.firstName.value),
      lastName: clean(form.elements.lastName.value),
      email: String(form.elements.email.value || '').trim().toLowerCase()
    };
    const errors = validate(data);
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
        showDone('You’re on the list, ' + data.firstName, 'Your spot is saved. We’ll email the details to ' + data.email + ' soon, so please keep an eye on your inbox, spam and Promotions folders.');
      } else if (result.ok) {
        showDone('You’re on the list, ' + data.firstName, 'We’ve sent the details to ' + data.email + '. If it isn’t in your inbox in a few minutes, check your spam or Promotions folder.');
      } else if (result.code === 'invalid' && Array.isArray(result.fields)) {
        const errs = {};
        result.fields.forEach((f) => { errs[f] = 'Please check this field.'; });
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
