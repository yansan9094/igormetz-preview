/* ============================================================
   Igor Metz Tattoo – Portfolio: Endlos-Marquee + Lightbox
   Erwartet: .marquee > .marquee__track > button.marquee__item > img
   ============================================================ */
(function () {
  'use strict';

  function buildMarquees() {
    var globalIdx = 0;
    document.querySelectorAll('.marquee').forEach(function (mq) {
      if (mq.dataset.ready) return;
      mq.dataset.ready = '1';
      var track = mq.querySelector('.marquee__track');
      if (!track) return;
      var speed = parseInt(mq.getAttribute('data-speed') || '70', 10);
      track.style.setProperty('--speed', speed + 's');
      // Originale durchnummerieren (globale Galerie-Reihenfolge) und
      // Inhalte für die nahtlose Endlosschleife verdoppeln.
      var originals = Array.prototype.slice.call(track.children);
      originals.forEach(function (el) {
        if (el.hasAttribute('data-lb')) el.setAttribute('data-idx', globalIdx++);
      });
      originals.forEach(function (el) {
        var c = el.cloneNode(true);
        c.classList.add('dupe');
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('tabindex', '-1');
        // data-lb bleibt erhalten: Klone sind sichtbar und müssen
        // dieselbe Aufnahme öffnen wie ihr Original (data-idx zeigt darauf)
        track.appendChild(c);
      });
      // Zufälliger Startversatz, damit Reihen nicht synchron wirken
      var offset = Math.random() * -50;
      track.style.animationDelay = (offset / 100 * speed) + 's';
    });
  }

  // ---------------- Lightbox ----------------
  var lb, figImg, figCap, idx = 0, group = [];

  function ensureLb() {
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Bildansicht');
    lb.innerHTML =
      '<button class="lb__btn lb__close" aria-label="Schließen">&times;</button>' +
      '<button class="lb__btn lb__prev" aria-label="Vorheriges Bild">&#8249;</button>' +
      '<figure class="lb__fig"><img alt=""><figcaption class="lb__cap"></figcaption></figure>' +
      '<button class="lb__btn lb__next" aria-label="Nächstes Bild">&#8250;</button>';
    document.body.appendChild(lb);
    figImg = lb.querySelector('img');
    figCap = lb.querySelector('.lb__cap');
    lb.querySelector('.lb__close').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', function () { go(-1); });
    lb.querySelector('.lb__next').addEventListener('click', function () { go(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
  }

  function fullSrc(btn) {
    var img = btn.querySelector('img');
    var full = btn.getAttribute('data-full');
    if (full) return full;
    // Bestes Bild aus der WordPress-Bildgröße ableiten (-300x450 -> Original)
    return img ? img.currentSrc.replace(/-\d+x\d+(\.\w+)$/, '$1') : '';
  }

  function show(i) {
    idx = (i + group.length) % group.length;
    var btn = group[idx];
    var img = btn.querySelector('img');
    figImg.src = fullSrc(btn);
    figImg.alt = img ? (img.alt || '') : '';
    var cap = btn.getAttribute('data-caption') || (img && img.alt ? img.alt : '');
    figCap.textContent = cap ? cap + ' — Igor Metz Tattoo, München' : 'Igor Metz Tattoo, München';
  }
  function go(d) { show(idx + d); }
  function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }
  function open(btn) {
    ensureLb();
    group = Array.prototype.filter.call(
      document.querySelectorAll('.marquee__item[data-lb]'),
      function (el) { return !el.classList.contains('dupe'); });
    // data-idx: bei Originalen gesetzt, bei Klonen zeigt er auf ihr Original
    var idxAttr = btn.getAttribute('data-idx');
    var start = idxAttr !== null ? parseInt(idxAttr, 10) : group.indexOf(btn);
    show(isNaN(start) ? 0 : start);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.marquee__item[data-lb]') : null;
    if (btn) { e.preventDefault(); open(btn); }
  });

  function boot() { buildMarquees(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
