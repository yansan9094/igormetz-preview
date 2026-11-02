/* ============================================================
   Igor Metz Tattoo – Body-Map (Körperstellen-Auswahl)
   Erzeugt Vorder- und Rückansicht als SVG; Regionen anklickbar,
   Auswahl als Chips + hidden Input (kommagetrennt).
   Nutzung: <div class="bm" data-target="#koerperstelle"></div>
   ============================================================ */
(function () {
  'use strict';

  var CX = 120; // Spiegelachse im 240x520 Viewport

  // Basisgeometrie: Formen werden für die rechte Körperseite
  // (Betrachter links in der Vorderansicht) definiert und
  // gespiegelt. Alle Pfade: M/L/Z mit "x y"-Paaren.
  function mirror(d) {
    var m;
    return d.replace(/([ML])\s*([\d.]+)\s+([\d.]+)/g, function (_, c, x, y) {
      return c + ' ' + (2 * CX - parseFloat(x)) + ' ' + y;
    });
  }
  function pathD(points) {
    return 'M ' + points.map(function (p) { return p.join(' '); }).join(' L ') + ' Z';
  }
  function rounded(r) { // kleine Rechtecke als Pfade
    return pathD(r);
  }

  // ------------------------------------------------------------------
  // Regionen-Definitionen. side: 'R' = rechtes Körperhälfte (Basis),
  // 'L' = gespiegelt, null = mittig. views: Ansichten.
  // ------------------------------------------------------------------
  function defs() {
    var D = [];
    function add(id, label, shape, views, side, z) {
      D.push({ id: id, label: label, shape: shape, views: views, side: side, z: z || 0 });
    }

    // Kopf & Hals (mittig, beide Ansichten)
    add('kopf', 'Kopf', 'M 120 12 C 137 12 146 26 146 44 C 146 62 137 74 120 74 C 103 74 94 62 94 44 C 94 26 103 12 120 12 Z',
        ['front', 'back'], null);
    add('hals', 'Hals / Nacken', rounded([[110, 72], [130, 72], [130, 90], [110, 90]]),
        ['front', 'back'], null);

    // Vorderseite: Brust, Bauch, Becken
    add('brust', 'Brust', pathD([[94, 92], [146, 92], [150, 112], [150, 146], [90, 146], [90, 112]]), ['front'], null);
    add('bauch', 'Bauch', pathD([[90, 146], [150, 146], [147, 200], [93, 200]]), ['front'], null);
    add('becken', 'Hüfte / Becken', pathD([[93, 200], [147, 200], [151, 230], [89, 230]]), ['front'], null);

    // Rückseite: oberer/unterer Rücken, Schulterblätter, Gesäß
    add('oberruecken', 'Oberer Rücken', pathD([[93, 92], [147, 92], [150, 150], [90, 150]]), ['back'], null);
    add('underruecken', 'Unterer Rücken', pathD([[90, 150], [150, 150], [148, 202], [92, 202]]), ['back'], null);
    add('gesaess', 'Gesäß', pathD([[92, 202], [148, 202], [151, 234], [89, 234]]), ['back'], null);
    add('schulterblatt', 'Schulterblatt', pathD([[101, 100], [117, 100], [117, 132], [99, 132]]),
        ['back'], 'R', 1);

    // Arme (beide Ansichten)
    add('schulter', 'Schulter', pathD([[100, 90], [74, 98], [64, 126], [88, 132], [100, 114]]),
        ['front', 'back'], 'R');
    add('oberarm', 'Oberarm', pathD([[64, 127], [88, 133], [84, 186], [60, 184]]),
        ['front', 'back'], 'R');
    add('unterarm', 'Unterarm', pathD([[60, 185], [84, 187], [90, 252], [66, 254]]),
        ['front', 'back'], 'R');
    add('hand', 'Hand', pathD([[66, 256], [90, 254], [94, 276], [90, 294], [70, 296], [64, 276]]),
        ['front', 'back'], 'R');

    // Beine
    add('oberschenkel', 'Oberschenkel', pathD([[92, 232], [117, 232], [116, 340], [93, 342]]),
        ['front', 'back'], 'R');
    add('schienbein', 'Schienbein / Wade', pathD([[93, 344], [116, 343], [111, 442], [97, 443]]),
        ['front', 'back'], 'R');
    add('fuss', 'Fuß', pathD([[97, 445], [111, 445], [118, 462], [93, 465], [93, 452]]),
        ['front', 'back'], 'R');

    return D;
  }

  var SIDE_LABEL = { R: 'rechts', L: 'links' };

  function fullLabel(def, side) {
    return side ? def.label + ' ' + side : def.label;
  }

  function buildViewSVG(view) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 490');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', view === 'front' ? 'Vorderansicht' : 'Rückansicht');

    var parts = defs().slice().sort(function (a, b) { return a.z - b.z; });

    function eachShape(cb) {
      parts.forEach(function (def) {
        if (def.views.indexOf(view) === -1) return;
        if (def.side === null) {
          cb(def, def.shape, null);
        } else {
          // Basisgeometrie = rechte Körperseite. In der Vorderansicht
          // erscheint sie links beim Betrachter, in der Rückansicht rechts.
          var shapeR = (view === 'front') ? def.shape : mirror(def.shape);
          cb(def, shapeR, 'rechts');
          cb(def, mirror(shapeR), 'links');
        }
      });
    }

    // Basisschicht: gleiche Formen mit breitem, färbigem Rand,
    // damit die Gelenk-Fugen wie ein durchgehender Körper wirken.
    var base = document.createElementNS(NS, 'g');
    base.setAttribute('class', 'bm-base');
    base.setAttribute('aria-hidden', 'true');
    eachShape(function (def, d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      base.appendChild(p);
    });
    svg.appendChild(base);

    eachShape(function (def, d, sideLabel) {
      svg.appendChild(makeRegion(def, d, sideLabel));
    });

    // Seiten-Orientierung: anatomisch links/rechts eintragen
    var leftOnRight = (view === 'front'); // in der Vorderansicht ist die linke Körperseite beim Betrachter rechts
    svg.appendChild(makeText(leftOnRight ? 218 : 22, 300, 'links'));
    svg.appendChild(makeText(leftOnRight ? 22 : 218, 300, 'rechts'));
    return svg;
  }

  function makeText(x, y, txt) {
    var NS = 'http://www.w3.org/2000/svg';
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('class', 'bm-label');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('aria-hidden', 'true');
    t.textContent = txt;
    return t;
  }

  function makeRegion(def, d, sideLabel) {
    var NS = 'http://www.w3.org/2000/svg';
    var p = document.createElementNS(NS, 'path');
    var label = sideLabel ? def.label + ' ' + sideLabel : def.label;
    p.setAttribute('d', d);
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

  function init(root) {
    var targetSel = root.getAttribute('data-target');
    var target = targetSel ? document.querySelector(targetSel) : null;
    var chipBox = root.querySelector('.bm-chips');
    var maxSel = parseInt(root.getAttribute('data-max') || '0', 10);
    var selected = [];

    ['front', 'back'].forEach(function (view) {
      var holder = root.querySelector('[data-view="' + view + '"] svg') ||
                   root.querySelector('[data-view="' + view + '"]');
      var svg = buildViewSVG(view);
      if (holder && holder.tagName.toLowerCase() === 'div') {
        holder.appendChild(svg);
      } else if (holder) {
        holder.parentNode.replaceChild(svg, holder);
      } else {
        root.appendChild(svg);
      }
    });

    function sync() {
      // Alle SVG-Regionen über Daten-Label synchronisieren
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
          chip.innerHTML = '';
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

    root.addEventListener('click', function (e) {
      var r = e.target.closest ? e.target.closest('.bm-region') : null;
      if (r && root.contains(r)) {
        toggle(r.getAttribute('data-label'));
      }
    });
    root.addEventListener('keydown', function (e) {
      var r = e.target.closest ? e.target.closest('.bm-region') : null;
      if (r && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        toggle(r.getAttribute('data-label'));
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
