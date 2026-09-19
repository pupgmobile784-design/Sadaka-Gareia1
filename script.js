(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const KEY = 'sadaqa-khalaf:v1', TKEY = 'sadaqa-khalaf:theme';
  const C = 2 * Math.PI * 46;
  const fmt = (n) => Number(n).toLocaleString('ar-EG');

  /* ---------- الحالة والحفظ ---------- */
  let S = { counts: [0, 0, 0, 0], cur: 0, target: 100, sound: false };
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (r) {
      if (Array.isArray(r.counts) && r.counts.length === 4) S.counts = r.counts.map((n) => Math.max(0, parseInt(n) || 0));
      if ([0, 1, 2, 3].includes(r.cur)) S.cur = r.cur;
      if (Number.isInteger(r.target) && r.target > 0) S.target = r.target;
      S.sound = r.sound === true;
    }
  } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- عناصر ---------- */
  const tap = $('#tap'), num = $('#num'), arc = $('#arc'), ringw = $('.ringwrap');
  const dhs = $$('.dh'), chips = $$('.chip'), custom = $('#custom');
  const done = $('#done'), toastEl = $('#toast'), dlg = $('#dlg');
  let doneT, toastT;

  function render() {
    const n = S.counts[S.cur], name = dhs[S.cur].dataset.name;
    num.textContent = fmt(n);
    tap.setAttribute('aria-label', `سبّح: ${name}. العدد الحالي ${fmt(n)}`);
    const rem = n > 0 && n % S.target === 0 ? S.target : n % S.target;
    arc.style.strokeDashoffset = C * (1 - rem / S.target);
    dhs.forEach((b, i) => {
      b.setAttribute('aria-pressed', i === S.cur);
      b.querySelector('small').textContent = fmt(S.counts[i]);
    });
    chips.forEach((c) => c.setAttribute('aria-pressed', +c.dataset.t === S.target));
    if (![33, 100, 500, 1000].includes(S.target)) custom.value = S.target;
    $('#total').textContent = `مجموع ما سبّحت: ${fmt(S.counts.reduce((a, b) => a + b, 0))}`;
    const snd = $('#sound');
    snd.textContent = S.sound ? '🔊 الصوت مفعّل' : '🔇 الصوت مغلق';
    snd.setAttribute('aria-pressed', S.sound);
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- صوت خفيف (مولَّد بلا ملفات) ---------- */
  let ac;
  function tick() {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = 'sine'; o.frequency.value = 520;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.13);
    } catch (e) {}
  }

  /* ---------- التسبيح ---------- */
  function hideDone() { clearTimeout(doneT); done.classList.remove('show'); }
  tap.addEventListener('click', () => {
    S.counts[S.cur]++;
    save(); render();
    tap.classList.remove('pop'); void tap.offsetWidth; tap.classList.add('pop');
    if (navigator.vibrate) navigator.vibrate(12);
    tick();
    if (S.counts[S.cur] % S.target === 0) {
      ringw.classList.remove('glow'); void ringw.offsetWidth; ringw.classList.add('glow');
      done.classList.add('show');
      clearTimeout(doneT); doneT = setTimeout(hideDone, 9000);
    } else if (done.classList.contains('show')) hideDone();
  });

  dhs.forEach((b) => b.addEventListener('click', () => { S.cur = +b.dataset.i; save(); hideDone(); render(); }));
  chips.forEach((c) => c.addEventListener('click', () => { S.target = +c.dataset.t; custom.value = ''; save(); hideDone(); render(); }));
  custom.addEventListener('input', () => {
    const v = parseInt(custom.value);
    if (v >= 1 && v <= 100000) { S.target = v; save(); hideDone(); render(); }
  });

  $('#sound').addEventListener('click', () => { S.sound = !S.sound; save(); render(); tick(); });

  /* ---------- إعادة العداد بتأكيد ---------- */
  $('#reset').addEventListener('click', () => (dlg.showModal ? dlg.showModal() : (confirm('هل تريد إعادة العداد إلى صفر؟') && doReset())));
  const doReset = () => { S.counts[S.cur] = 0; save(); hideDone(); render(); };
  $('#no').addEventListener('click', () => dlg.close());
  $('#yes').addEventListener('click', () => { doReset(); dlg.close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  /* ---------- النسخ والمشاركة ---------- */
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try {
      const t = document.createElement('textarea');
      t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t);
      t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
    } catch (e) { return false; }
  }
  $$('.copy').forEach((b) => b.addEventListener('click', async () => {
    const ok = await copy(b.parentElement.querySelector('p').textContent);
    toast(ok ? 'تم نسخ الدعاء' : 'تعذّر النسخ، حدّد الدعاء وانسخه يدويًا');
  }));

  async function share() {
    const text = 'صدقة جارية عن روح المرحوم الحاج خلف محمود خلف، رحمه الله. شارك في الدعاء والذكر.';
    const url = location.href.split('#')[0];
    if (navigator.share) {
      try { await navigator.share({ title: document.title, text, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    toast((await copy(url)) ? 'تم نسخ الرابط' : 'تعذّر نسخ الرابط');
  }
  $('#share').addEventListener('click', share);
  $('#share2').addEventListener('click', share);

  /* ---------- الوضع الداكن ---------- */
  const themeBtn = $('#theme');
  function applyTheme(t, persist) {
    document.documentElement.dataset.theme = t;
    themeBtn.setAttribute('aria-pressed', t === 'dark');
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'العودة إلى الوضع الفاتح' : 'تفعيل الوضع الداكن');
    themeBtn.firstElementChild.textContent = t === 'dark' ? '☀' : '☾';
    document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#0D1712' : '#F8F6F0';
    if (persist) try { localStorage.setItem(TKEY, t); } catch (e) {}
  }
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', false);
  themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));

  /* ---------- زر التسبيح العائم ---------- */
  const fab = $('#fab');
  let heroIn = true, tasIn = false;
  const upd = () => fab.classList.toggle('show', !heroIn && !tasIn);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { heroIn = e[0].isIntersecting; upd(); }).observe($('#home'));
    new IntersectionObserver((e) => { tasIn = e[0].isIntersecting; upd(); }, { threshold: 0.3 }).observe($('#tasbeeh'));
  }

  render();
})();
