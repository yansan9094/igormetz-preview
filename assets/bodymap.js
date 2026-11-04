/* ============================================================
   Igor Metz Tattoo – Body-Map (Körperstellen-Auswahl)
   Grundlage: Igors eigene Körpergrafik (assets/body.svg, bereitgestellt
   als window.IGOR_BODY_SVG durch assets/body-svg.js – erzeugt von
   tools/make_body_js.py). Beide Ansichten in einer Grafik; jede
   Körperzone ist ein benanntes SVG-Element und direkt anklickbar.
   Auswahl als Chips + hidden Input (kommagetrennt).
   Nutzung: <div class="bm" data-target="#koerperstelle"></div>
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // ------------------------------------------------------------------
  // Zonen: SVG-Element-Id -> Chip-Bezeichnung.
  // Elemente mit gleicher Bezeichnung werden gemeinsam ausgewaehlt
  // (z. B. Oberarm Außen + Innen, gleiche Zone in Vorder-/Rückansicht).
  // Igors Namensgebung ist anatomisch korrekt (links/rechts auf den
  // Patienten bezogen, in beiden Ansichten).
  // ------------------------------------------------------------------
  var NAME_RE = /^(Hals|Nacken|Rippen|Brust|Schulter|Oberarm|Unterarm|Schienbein|Oberschenkel|Kniekehle|Knie|Hüfte|Pobacke|Wade|Fuß|Hand|Bauch)/;
  var NAME_MAP = { Pobacke: 'Gesäß' };

  function labelFor(id) {
    if (id === 'Rücken_Unten') return 'Unterer Rücken';
    var base = id.replace(/-2$/, '');
    var m = base.match(NAME_RE);
    if (!m) return null;
    var name = NAME_MAP[m[1]] || m[1];
    var side = /_Rechts/.test(base) ? ' rechts' : (/_Links/.test(base) ? ' links' : '');
    return name + side;
  }

  // Kopf fehlt in Igors Grafik als eigene Zone (nur Kontur) – unsichtbare
  // Trefferflächen über beiden Köpfen ergänzen.
  var KOPF_ELLIPSES = [
    { cx: 216.2, cy: 105, rx: 52.5, ry: 59 },  // Vorderansicht
    { cx: 566.5, cy: 105, rx: 53, ry: 59 }     // Rückansicht
  ];

  // Beschriftungen unter den Figuren (Koordinaten aus dem SVG-Viewport)
  var VIEW_CAPTIONS = [
    { x: 217.7, text: 'Vorderansicht' },
    { x: 566.7, text: 'Rückansicht' }
  ];

  function svgFromEmbed() {
    if (!window.IGOR_BODY_SVG) {
      throw new Error('bodymap: window.IGOR_BODY_SVG fehlt – body-svg.js nicht geladen?');
    }
    var doc = new DOMParser().parseFromString(window.IGOR_BODY_SVG, 'image/svg+xml');
    var svg = doc.getElementsByTagName('svg')[0];
    if (!svg || doc.getElementsByTagName('parsererror').length) {
      throw new Error('bodymap: eingebettete Körpergrafik ungültig');
    }
    return document.importNode(svg, true);
  }

  function makeText(x, y, txt, cls) {
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('class', cls);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('aria-hidden', 'true');
    t.textContent = txt;
    return t;
  }

  function makeRegion(label, attrs) {
    var p = document.createElementNS(NS, 'ellipse');
    for (var k in attrs) p.setAttribute(k, attrs[k]);
    p.setAttribute('class', 'bm-region');
    p.setAttribute('data-label', label);
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'checkbox');
    p.setAttribute('aria-checked', 'false');
    p.setAttribute('aria-label', label);
    var t = document.createElementNS(NS, 'title');
    t.textContent = label;
    p.appendChild(t);
    return p;
  }

  function buildSVG() {
    var svg = svgFromEmbed();
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Körperkarte: Tattoo-Zonen in Vorder- und Rückansicht, anklickbar');
    svg.setAttribute('class', 'bm-svg');

    Array.prototype.forEach.call(svg.querySelectorAll('[id]'), function (el) {
      if (el.tagName.toLowerCase() === 'g') return;
      var label = labelFor(el.id);
      if (!label) return; // nicht zugeordnete Grafik-Elemente bleiben Deko
      el.setAttribute('class', 'bm-region');
      el.setAttribute('data-label', label);
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'checkbox');
      el.setAttribute('aria-checked', 'false');
      el.setAttribute('aria-label', label);
      var t = document.createElementNS(NS, 'title');
      t.textContent = label;
      el.appendChild(t);
    });

    // Silhouetten (ohne id) nie anklickbar
    Array.prototype.forEach.call(svg.querySelectorAll('path, polygon, polyline'), function (el) {
      if (!el.id) el.setAttribute('class', 'bm-base');
    });

    KOPF_ELLIPSES.forEach(function (k) {
      svg.appendChild(makeRegion('Kopf', k));
    });
    VIEW_CAPTIONS.forEach(function (c) {
      svg.appendChild(makeText(c.x, 1010, c.text, 'bm-viewlabel'));
    });
    return svg;
  }

  function init(root) {
    var targetSel = root.getAttribute('data-target');
    var target = targetSel ? document.querySelector(targetSel) : null;
    var chipBox = root.querySelector('.bm-chips');
    var maxSel = parseInt(root.getAttribute('data-max') || '0', 10);
    var selected = [];

    var holder = root.querySelector('[data-bm-canvas]') ||
                 root.querySelector('.bodymap') || root;
    holder.appendChild(buildSVG());

    function regionsByLabel(lab) {
      return root.querySelectorAll('.bm-region[data-label="' + lab + '"]');
    }

    function sync() {
      root.querySelectorAll('.bm-region').forEach(function (el) {
        var on = selected.indexOf(el.getAttribute('data-label')) !== -1;
        el.classList.toggle('sel', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      if (chipBox) {
        chipBox.innerHTML = '';
        selected.forEach(function (lab) {
          var chip = document.createElement('span');
          chip.className = 'bm-chip';
          chip.appendChild(document.createTextNode(lab));
          var x = document.createElement('button');
          x.type = 'button';
          x.setAttribute('aria-label', lab + ' entfernen');
          x.innerHTML = '&times;';
          x.addEventListener('click', function () { toggle(lab); });
          chip.appendChild(x);
          chipBox.appendChild(chip);
        });
      }
      if (target) target.value = selected.join(', ');
      root.dispatchEvent(new CustomEvent('bodymap:change', { detail: { regions: selected.slice() }, bubbles: true }));
    }

    function toggle(label) {
      var i = selected.indexOf(label);
      if (i !== -1) { selected.splice(i, 1); }
      else if (!maxSel || selected.length < maxSel) { selected.push(label); }
      sync();
    }

    function setHov(label, on) {
      regionsByLabel(label).forEach(function (el) {
        el.classList.toggle('hov', on);
      });
    }

    root.addEventListener('click', function (e) {
      var r = e.target.closest ? e.target.closest('.bm-region') : null;
      if (r && root.contains(r)) toggle(r.getAttribute('data-label'));
    });
    root.addEventListener('keydown', function (e) {
      var r = e.target.closest ? e.target.closest('.bm-region') : null;
      if (r && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        toggle(r.getAttribute('data-label'));
      }
    });
    // Hover hebt alle Teilformen derselben Zone gemeinsam hervor
    root.addEventListener('mouseover', function (e) {
      if (e.target.classList && e.target.classList.contains('bm-region')) {
        setHov(e.target.getAttribute('data-label'), true);
      }
    });
    root.addEventListener('mouseout', function (e) {
      if (e.target.classList && e.target.classList.contains('bm-region')) {
        setHov(e.target.getAttribute('data-label'), false);
      }
    });

    root._bmSync = sync;
    root._bmSet = function (labels) { selected = (labels || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); sync(); };
    sync();
  }

  function boot() {
    document.querySelectorAll('.bm').forEach(function (el) {
      if (!el.dataset.bmReady) { el.dataset.bmReady = '1'; init(el); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
  window.IgorBodyMap = { boot: boot };
})();
