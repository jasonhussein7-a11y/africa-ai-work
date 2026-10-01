'use strict';

var PLATFORMS = ['outlier', 'mercor', 'prolific', 'alignerr', 'remotasks',
  'crowdgen', 'mindrift', 'afterquery', 'oneforma', 'toloka',
  'dataannotation', 'telus', 'clickworker', 'cloudfactory', 'micro1', 'upwork'];

var STATUS = {
  yes: { label: 'Accepted', rank: 0 },
  unclear: { label: 'Unclear', rank: 1 },
  no: { label: 'Not accepted', rank: 2 }
};

var BASIS = {
  official: 'Official source',
  reported: 'Reported',
  worker: 'Worker report',
  note: 'Our note'
};

var REPO = 'https://github.com/jasonhussein7-a11y/africa-ai-work';

var app = document.getElementById('app');
var countries = [];
var platforms = [];
var country = '';

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function safeUrl(u) {
  return /^https:\/\//.test(u) ? esc(u) : '#';
}

function link(url, text) {
  return '<a href="' + safeUrl(url) + '" target="_blank" rel="noopener">' + esc(text) + '</a>';
}

function loadPref(k) {
  try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
}

function savePref(k, v) {
  try { localStorage.setItem(k, v); } catch (e) { }
}

function has(list, code) {
  return (list || []).indexOf(code) !== -1;
}

function statusFor(p, code) {
  var a = p.availability;
  if (has(a.yes, code)) return 'yes';
  if (has(a.no, code)) return 'no';
  if (has(a.unclear, code)) return 'unclear';
  return a.default;
}

function extraLabel(p, code) {
  var a = p.availability;
  if (has(a.worker_confirmed_yes, code) || has(a.worker_confirmed_no, code)) {
    return 'Confirmed by a worker';
  }
  if (has(a.account_opened, code)) {
    return 'A worker opened an account here, not yet paid';
  }
  return '';
}

function evidenceFor(p, code) {
  var ev = p.availability.country_evidence;
  return ev && ev[code] ? ev[code] : null;
}

function countryName(code) {
  for (var i = 0; i < countries.length; i++) {
    if (countries[i].code === code) return countries[i].name;
  }
  return code;
}

function badge(st) {
  var s = STATUS[st] || STATUS.unclear;
  return '<span class="badge ' + (STATUS[st] ? st : 'unclear') + '">' + s.label + '</span>';
}

function fmtDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return esc(iso);
  var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Number(m[3]) + ' ' + names[Number(m[2]) - 1] + ' ' + m[1];
}

function kind(basis) {
  return '<span class="kind ' + esc(basis) + '">' + (BASIS[basis] || esc(basis)) + '</span>';
}

var GROUP_TITLE = { yes: 'Accepted', unclear: 'Unclear', no: 'Not accepted' };

function viewHome() {
  var sorted = countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  var opts = sorted.map(function (c) {
    return '<option value="' + c.code + '"' + (c.code === country ? ' selected' : '') + '>' + esc(c.name) + '</option>';
  }).join('');
  var html = '<h1>Which AI work platforms accept you?</h1>' +
    '<p class="lede">Choose your country to see which AI training and data annotation platforms accept workers there, with the source for each answer.</p>' +
    '<label class="picker"><span>Your country</span><select id="country">' +
    '<option value="">Choose a country</option>' + opts + '</select></label>';
  if (country) {
    var rows = platforms.map(function (p) { return { p: p, st: statusFor(p, country) }; });
    rows.sort(function (a, b) {
      return (STATUS[a.st].rank - STATUS[b.st].rank) || a.p.name.localeCompare(b.p.name);
    });
    var count = function (k) { return rows.filter(function (r) { return r.st === k; }).length; };
    html += '<div class="tally"><div class="bar" aria-hidden="true">' +
      ['yes', 'unclear', 'no'].map(function (k) {
        return count(k) ? '<span class="seg ' + k + '" style="flex:' + count(k) + '"></span>' : '';
      }).join('') + '</div><p>In ' + esc(countryName(country)) + ': <b>' + count('yes') + '</b> accepted, <b>' +
      count('unclear') + '</b> unclear, <b>' + count('no') + '</b> not accepted</p></div>';
    ['yes', 'unclear', 'no'].forEach(function (k) {
      var group = rows.filter(function (r) { return r.st === k; });
      if (!group.length) return;
      html += '<section class="group ' + k + '"><h2 class="group-title">' + GROUP_TITLE[k] +
        ' <span class="count">' + group.length + '</span></h2><ul class="rows">' +
        group.map(function (r) {
          var ex = extraLabel(r.p, country);
          var ev = evidenceFor(r.p, country);
          var basis = ev ? ev.basis : r.p.availability.basis;
          var checked = ev ? ev.checked : r.p.availability.source.checked;
          return '<li><a class="item ' + k + '" href="#/p/' + r.p.id + '"><h2>' + esc(r.p.name) + '</h2>' +
            '<p>' + esc(r.p.work) + '</p><p class="meta">' + kind(basis) + ' Checked ' + fmtDate(checked) +
            (ex ? '<br>' + esc(ex) : '') + '</p></a></li>';
        }).join('') + '</ul></section>';
    });
  }
  app.innerHTML = html;
  document.getElementById('country').addEventListener('change', function (e) {
    country = e.target.value;
    savePref('country', country);
    viewHome();
  });
}

function viewPlatform(id) {
  var p = null;
  for (var i = 0; i < platforms.length; i++) { if (platforms[i].id === id) p = platforms[i]; }
  if (!p) { app.innerHTML = '<p>This platform is not in the guide. <a href="#/">See all platforms</a></p>'; return; }
  var a = p.availability;
  var html = '<a class="back" href="#/">All platforms</a><h1>' + esc(p.name) + '</h1>' +
    '<p class="meta">Run by ' + esc(p.operator) + '. ' + link(p.website, p.website.replace('https://', '')) + '</p>' +
    '<p>' + esc(p.work) + '</p>';
  if (country) {
    var st = statusFor(p, country);
    var ex = extraLabel(p, country);
    var ev = evidenceFor(p, country);
    html += '<div class="status ' + st + '"><strong>' + GROUP_TITLE[st] + ' in ' + esc(countryName(country)) + '</strong>' +
      (ev ? '<p>' + esc(ev.note) + '</p><p class="meta">' + kind(ev.basis) + ' ' + link(ev.url, ev.title) +
        '. Checked ' + fmtDate(ev.checked) + '</p>' : '') +
      (ex ? '<p class="meta">' + esc(ex) + '</p>' : '') + '</div>';
  }
  html += '<section class="box"><h2>Where it accepts workers</h2><p>' + esc(a.note) + '</p><p class="meta">' +
    kind(a.basis) + ' ' + link(a.source.url, a.source.title) + '. Checked ' + fmtDate(a.source.checked) + '</p></section>';
  p.sections.forEach(function (s) {
    html += '<section class="box"><h2>' + esc(s.title) + '</h2><ul class="facts">' + s.items.map(function (it) {
      return '<li>' + esc(it.text) + '<p class="meta">' + kind(it.basis) +
        (it.source ? ' ' + link(it.source, 'View source') : '') + '</p></li>';
    }).join('') + '</ul></section>';
  });
  app.innerHTML = html;
}

var SAFETY = [
  ['Never pay to join', 'Real platforms do not charge you to sign up, take a test or unlock work. Mindrift and DataAnnotation both say they will never ask you for money.'],
  ['Do not buy or rent an account', 'Accounts sold to people in restricted countries break platform rules. Identity checks are designed to catch them, and you can lose everything you earned.'],
  ['Do not hide your location with a VPN', 'Platforms such as Outlier ban using a VPN to appear in another country.'],
  ['Check the web address', 'Fake sites copy popular platforms. Type the address yourself or use the links in this guide.'],
  ['Check the live official page', 'Old country lists keep circulating online. Before applying, confirm on the platform\'s own site.'],
  ['Know how you will get paid first', 'Some payout methods have limits. For example, PayPal withdrawals are restricted in some African countries, and OneForma caps PayPal at 300 US dollars a year.']
];

function viewSafety() {
  app.innerHTML = '<h1>Stay safe</h1><p>These are our own guidelines, based on what the platforms say and on common scams.</p>' +
    SAFETY.map(function (s) {
      return '<section class="box"><h2>' + esc(s[0]) + '</h2><p>' + esc(s[1]) + '</p></section>';
    }).join('');
}

function viewAbout() {
  app.innerHTML = '<h1>About this guide</h1>' +
    '<section class="box"><h2>Independent</h2><p>This guide is not affiliated with, paid by or endorsed by any platform listed.</p></section>' +
    '<section class="box"><h2>What the labels mean</h2><ul class="facts">' +
    '<li><b>Accepted</b>, <b>Not accepted</b> or <b>Unclear</b> is shown for your chosen country. Unclear means we found no solid evidence either way.</li>' +
    '<li><b>Official source</b> means the platform\'s own website or help pages.</li>' +
    '<li><b>Reported</b> means independent reviews, news or job listings.</li>' +
    '<li><b>Confirmed by a worker</b> means a worker in that country told us directly.</li>' +
    '<li><b>Our note</b> is our own explanation, not a claim from a source.</li></ul></section>' +
    '<section class="box"><h2>Always double-check</h2><p>Platform rules change often. Each entry shows the date it was last checked. Confirm on the official site before you apply.</p></section>' +
    '<section class="box"><h2>Privacy</h2><p>This guide collects no personal data. Your country choice is saved only on your own device.</p></section>' +
    '<section class="box"><h2>Corrections</h2><p>Spotted something wrong or out of date? ' + link(REPO + '/issues', 'Report it on GitHub') + '.</p></section>';
}

function route() {
  var h = location.hash || '#/';
  var m = h.match(/^#\/p\/([a-z0-9-]+)$/);
  if (m) viewPlatform(m[1]);
  else if (h === '#/safety') viewSafety();
  else if (h === '#/about') viewAbout();
  else viewHome();
  var here = m ? '#/' : h;
  var links = document.querySelectorAll('.top nav a');
  for (var i = 0; i < links.length; i++) {
    if (links[i].getAttribute('href') === here) links[i].setAttribute('aria-current', 'page');
    else links[i].removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
}

function getJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url);
    return r.json();
  });
}

function start() {
  getJSON('data/countries.json').then(function (c) {
    countries = c;
    return Promise.all(PLATFORMS.map(function (id) { return getJSON('data/platforms/' + id + '.json'); }));
  }).then(function (list) {
    platforms = list;
    country = loadPref('country');
    if (!countries.some(function (c) { return c.code === country; })) country = '';
    window.addEventListener('hashchange', route);
    route();
  }).catch(function () {
    app.innerHTML = '<p>Could not load the data. Check your connection and refresh the page.</p>';
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  });
}

start();

/* Install app button */
(function () {
  var installBtn = document.getElementById('installBtn');
  var installHelp = document.getElementById('installHelp');
  if (!installBtn || !installHelp) return;
  var deferredPrompt = null;

  var isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isInstalled) return;

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  installBtn.hidden = false;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  installBtn.addEventListener('click', function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
      return;
    }
    installHelp.textContent = isIOS
      ? 'On iPhone or iPad: tap the Share button, then "Add to Home Screen".'
      : 'Open your browser menu (\u22EE), then tap "Install app" or "Add to Home screen".';
    installHelp.hidden = false;
  });

  window.addEventListener('appinstalled', function () {
    installBtn.hidden = true;
    installHelp.hidden = true;
    deferredPrompt = null;
  });
})();
