/* COCO Guest List — the clubs, in one place (used by the home page and the clubs page).
 *
 * The owner's club table (handoff PDF, 2026-10-19). Keep the days and times in sync with
 * WEEK in backend/Code.gs — backend/email.test.js checks that the two agree.
 *
 * Days are numbered like JavaScript: 0 = Sunday ... 6 = Saturday.
 */
const COCO_LINKS = {
  // The "WhatsApp now" button opens a chat with this number (digits only, with country code,
  // e.g. '34600000000'). While it is empty the button opens the group invite instead.
  whatsappChat: '',
  whatsappGroup: 'https://chat.whatsapp.com/KfgHtjkoK3w6QYvV0FWfz9?mode=gi_t',
  instagram: 'https://www.instagram.com/coco.guestlist.bcn/'
};

const COCO_CLUBS = [
  { id: 'ku', name: 'KU', type: 'beach', area: 'Port Olímpic · formerly Pacha',
    nights: [0, 1, 2, 3, 4, 5, 6], until: '1:00', special: {},
    freeLine: 'Free: every night, before 1:00',
    blurb: 'The old Pacha, right on the sand. House in the main room, reggaeton in the second.' },
  { id: 'opium', name: 'Opium', type: 'beach', area: 'Port Olímpic',
    nights: [1, 2, 3, 4, 5, 0], until: '1:00', special: {},
    freeLine: 'Free: Mon–Fri + Sun, before 1:00',
    blurb: 'Barcelona’s best-known beach club, with a huge terrace over the sea.' },
  { id: 'shoko', name: 'Shôko', type: 'beach', area: 'Port Olímpic',
    nights: [1, 2, 3, 4, 0], until: '1:00', special: {},
    freeLine: 'Free: Mon–Thu + Sun, before 1:00',
    blurb: 'Dinner, then Latin and reggaeton on a terrace facing the Mediterranean.' },
  { id: 'cdlc', name: 'CDLC', type: 'beach', area: 'Port Olímpic',
    nights: [5, 6], until: '1:00', special: { 0: '7–11 pm' },
    freeLine: 'Free: Fri–Sat before 1:00 · Sun 7–11 pm',
    blurb: 'Dinner on the beach, then an intimate, glamorous lounge club.' },
  { id: 'sutton', name: 'Sutton', type: 'downtown', area: 'Sant Gervasi',
    nights: [3, 4, 5, 6, 0], until: '1:00', special: {},
    freeLine: 'Free: Wed–Sun, before 1:00',
    blurb: 'Mirrors, velvet and golden light. One of the city’s most stylish rooms.' },
  { id: 'ottozutz', name: 'Otto Zutz', type: 'downtown', area: 'Sant Gervasi',
    nights: [5, 6], until: '1:30', special: {},
    freeLine: 'Free: Fri–Sat, before 1:30',
    blurb: 'Three floors, three sounds, and a crowd of Barcelona locals.' },
  { id: 'labiblio', name: 'La Biblio', type: 'downtown', area: 'Sant Gervasi',
    nights: [4, 5, 6], until: '1:00', special: {},
    freeLine: 'Free: Thu–Sat, before 1:00',
    blurb: 'Smart and elegant, steps from L’Illa Diagonal. Dress up for this one.' },
  { id: 'twenties', name: 'Twenties', type: 'downtown', area: 'Eixample',
    nights: [5, 6], until: '1:30', special: {},
    freeLine: 'Free: Fri–Sat, before 1:30',
    blurb: 'Lasers, confetti and two rooms of high energy.' },
  { id: 'luzdegas', name: 'Luz de Gas', type: 'downtown', area: 'Sant Gervasi',
    nights: [5, 6], until: '1:00', special: {},
    freeLine: 'Free: Fri–Sat, before 1:00',
    blurb: 'A 1940s cinema turned club, with a rococo main room.' },
  { id: 'cityhall', name: 'City Hall', type: 'downtown', area: 'Plaça Catalunya',
    nights: [1, 2], until: '1:00', special: {},
    freeLine: 'Free: Mon–Tue, before 1:00',
    blurb: 'One room, all techno and house, right off Plaça Catalunya.' },
  { id: 'jamboree', name: 'Jamboree', type: 'downtown', area: 'Gothic Quarter',
    nights: [0, 1, 2, 3, 4, 5, 6], until: '1:00', special: {},
    freeLine: 'Free: every night, before 1:00',
    blurb: 'A stone cellar under the arches of Plaça Reial. Small and packed.' },
  { id: 'blingbling', name: 'Bling Bling', type: 'downtown', area: 'Eixample',
    nights: [3, 4, 5, 6, 0], until: '1:00', special: {},
    freeLine: 'Free: Wed–Sun, before 1:00',
    blurb: 'A small, upscale room built around table service.' },
  { id: 'downtown', name: 'Downtown', type: 'downtown', area: 'Eixample',
    nights: [5, 6], until: '1:00', special: {},
    freeLine: 'Free: Fri–Sat, before 1:00',
    blurb: 'A central club with a young local crowd.' }
];

// A "night" runs until 1:30am Barcelona time: 00:45 on Saturday still belongs to Friday night.
// This is the same rule as NIGHT_ENDS_MINUTES in backend/Code.gs.
const COCO_NIGHT_ENDS_MINUTES = 90;

/** Which night (0 = Sunday ... 6 = Saturday) a moment belongs to, in Barcelona time. */
function cocoNightDow(date) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
  }).formatToParts(date).forEach(function (x) { p[x.type] = Number(x.value); });
  // Treat the Barcelona wall clock as UTC and step back 1h30, so summer/winter time can't interfere.
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - COCO_NIGHT_ENDS_MINUTES * 60000).getUTCDay();
}

/** The clubs that are free on one night, in table order. */
function cocoClubsOn(dow) {
  return COCO_CLUBS.filter(function (c) { return c.nights.indexOf(dow) !== -1 || c.special[dow] !== undefined; });
}

/** What the list shows next to a club on one night: "before 1:00", "before 1:30" or "7–11 pm". */
function cocoWhen(club, dow) {
  return club.special[dow] !== undefined ? club.special[dow] : 'before ' + club.until;
}

// Lets the tests load this file with Node.js (ignored in the browser).
if (typeof module !== 'undefined') {
  module.exports = { COCO_LINKS, COCO_CLUBS, cocoNightDow, cocoClubsOn, cocoWhen };
}
