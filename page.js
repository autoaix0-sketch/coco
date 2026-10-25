/* COCO Guest List — what both pages share: links, "tonight", the night picker and the club tabs.
 * Needs clubs-data.js to load first. */
(function () {
  'use strict';

  const LINKS = COCO_LINKS;
  const CLUBS = COCO_CLUBS;
  const DAYS = [
    { dow: 1, short: 'Mon', long: 'Monday' }, { dow: 2, short: 'Tue', long: 'Tuesday' },
    { dow: 3, short: 'Wed', long: 'Wednesday' }, { dow: 4, short: 'Thu', long: 'Thursday' },
    { dow: 5, short: 'Fri', long: 'Friday' }, { dow: 6, short: 'Sat', long: 'Saturday' },
    { dow: 0, short: 'Sun', long: 'Sunday' }
  ];

  const clubsWord = (n) => n + (n === 1 ? ' club' : ' clubs');

  /* ---------- Links: every [data-link] gets its address, or hides if it has none ---------- */
  document.querySelectorAll('[data-link]').forEach((el) => {
    const key = el.getAttribute('data-link');
    let url = '';
    if (key === 'whatsapp') {
      // A chat with the owner's number when we have one, otherwise the group invite.
      const digits = String(LINKS.whatsappChat || '').replace(/\D/g, '');
      url = digits ? 'https://wa.me/' + digits : LINKS.whatsappGroup;
    } else if (key === 'group') {
      url = LINKS.whatsappGroup;
    } else {
      url = LINKS[key] || '';
    }
    if (!url) { el.hidden = true; return; }
    el.href = url;
    el.target = '_blank';
    el.rel = 'noopener';
  });

  const tonight = cocoNightDow(new Date());

  /* ---------- Home page: badge + "Where are you going tonight?" ---------- */
  const badge = document.getElementById('badge');
  if (badge) {
    document.getElementById('badge-text').textContent = clubsWord(cocoClubsOn(tonight).length) + ' free tonight';
    badge.hidden = false;
  }

  const dayBar = document.getElementById('days');
  if (dayBar) {
    const list = document.getElementById('club-list');
    const count = document.getElementById('night-count');
    const buttons = [];

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };

    function show(dow) {
      const clubs = cocoClubsOn(dow);
      const day = DAYS.find((d) => d.dow === dow);
      count.textContent = dow === tonight
        ? clubsWord(clubs.length) + ' free tonight'
        : clubsWord(clubs.length) + ' free on ' + day.short;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.dow) === dow)));
      list.replaceChildren.apply(list, clubs.map((club) => {
        const row = el('li', 'row');
        const name = el('span', 'row-name');
        name.appendChild(el('span', 'row-club', club.name));
        if (club.type === 'beach') name.appendChild(el('span', 'tag tag-beach', 'Beach'));
        const right = el('span', 'row-right');
        right.appendChild(el('span', 'row-when', cocoWhen(club, dow)));
        right.appendChild(el('span', 'pill', 'Free'));
        row.append(name, right);
        return row;
      }));
    }

    DAYS.forEach((d) => {
      const b = el('button', 'day', d.dow === tonight ? 'Today' : d.short);
      b.type = 'button';
      b.dataset.dow = String(d.dow);
      b.setAttribute('aria-label', d.long + (d.dow === tonight ? ' (today)' : ''));
      b.addEventListener('click', () => show(d.dow));
      buttons.push(b);
      dayBar.appendChild(b);
    });
    show(tonight);
  }

  /* ---------- Home page: the ‹ › buttons move the event photos two cards at a time ---------- */
  const shots = document.getElementById('shots');
  if (shots) {
    document.querySelectorAll('.shots-btn').forEach((b) => b.addEventListener('click', () => {
      const card = shots.querySelector('.shot');
      const step = card ? card.getBoundingClientRect().width + 8 : shots.clientWidth / 2;
      shots.scrollBy({ left: Number(b.dataset.dir) * step * 2 }); // smooth unless the visitor asked for less motion (CSS)
    }));
  }

  /* ---------- Clubs page: All / Beach / Downtown ---------- */
  const tabs = document.querySelectorAll('[data-tab]');
  if (tabs.length) {
    const cards = document.querySelectorAll('.club-card');
    const count = document.getElementById('club-count');
    const beach = CLUBS.filter((c) => c.type === 'beach').length;
    const downtown = CLUBS.length - beach;
    const COUNT_TEXT = {
      all: CLUBS.length + ' clubs with free entry',
      beach: beach + ' beach clubs with free entry',
      downtown: downtown + ' downtown clubs with free entry'
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const which = tab.dataset.tab;
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
      cards.forEach((card) => { card.hidden = which !== 'all' && card.dataset.type !== which; });
      count.textContent = COUNT_TEXT[which];
    }));
  }
})();
