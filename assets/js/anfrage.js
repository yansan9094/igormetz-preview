/* ============================================================
   Igor Metz Tattoo – Anfrageformular: Datei-Upload mit
   Vorschau, Client-Validierung, Demo-Modus für die Vorschau.
   ============================================================ */
(function () {
  'use strict';

  var MAX_FILES = parseInt(window.IGOR_ANFRAGE && window.IGOR_ANFRAGE.maxFiles, 10) || 6;
  var MAX_MB = parseInt(window.IGOR_ANFRAGE && window.IGOR_ANFRAGE.maxMb, 10) || 8;
  var OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function initForm(form) {
    var input = form.querySelector('input[type="file"]');
    var zone = form.querySelector('.upload-zone');
    var list = form.querySelector('.upload-list');
    if (!input || !zone || !list) return;
    var files = [];

    function render() {
      list.innerHTML = '';
      var counter = form.querySelector('.upload-count');
      if (counter) counter.textContent = files.length + '/' + MAX_FILES;
      files.forEach(function (f, i) {
        var li = document.createElement('li');
        var img = document.createElement('img');
        img.alt = '';
        var url = URL.createObjectURL(f);
        img.src = url;
        var span = document.createElement('span');
        span.textContent = f.name.length > 26 ? f.name.slice(0, 23) + '…' : f.name;
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.setAttribute('aria-label', f.name + ' entfernen');
        rm.innerHTML = '&times;';
        rm.addEventListener('click', function () {
          files.splice(i, 1);
          transfer();
          render();
        });
        li.appendChild(img); li.appendChild(span); li.appendChild(rm);
        list.appendChild(li);
      });
    }

    // Files in ein verstecktes Input-Transfer-Input spiegeln
    function transfer() {
      var dt = new DataTransfer();
      files.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
    }

    function add(list2) {
      Array.prototype.forEach.call(list2, function (f) {
        if (files.length >= MAX_FILES) return;
        if (OK_TYPES.indexOf(f.type) === -1) { alert(f.name + ': nur JPG, PNG oder WebP erlaubt.'); return; }
        if (f.size > MAX_MB * 1024 * 1024) { alert(f.name + ': maximal ' + MAX_MB + ' MB.'); return; }
        var dup = files.some(function (x) { return x.name === f.name && x.size === f.size; });
        if (!dup) files.push(f);
      });
      transfer();
      render();
    }

    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    ['dragover', 'dragenter'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files);
    });
    input.addEventListener('change', function () { add(input.files); });

    // ---------------- Validierung ----------------
    form.addEventListener('submit', function (e) {
      var firstErr = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        var field = el.closest('.field') || el.closest('.consent') || el;
        field.classList.remove('field--err');
        var val = (el.type === 'checkbox') ? el.checked : el.value.trim();
        if (!val) {
          field.classList.add('field--err');
          if (!firstErr) firstErr = (el.type === 'hidden') ? (field.querySelector('.bodymap') || field) : el;
        }
        if (el.type === 'email' && el.value && !/^\S+@\S+\.\S+$/.test(el.value)) {
          field.classList.add('field--err');
          if (!firstErr) firstErr = el;
        }
      });
      if (firstErr) {
        e.preventDefault();
        if (firstErr.focus) { try { firstErr.focus({ preventScroll: true }); } catch (err) { firstErr.focus(); } }
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      // Demo-Modus der design-Vorschau: kein echter Versand
      if (form.hasAttribute('data-demo')) {
        e.preventDefault();
        var box = document.querySelector('.js-demo-success');
        if (box) {
          box.hidden = false;
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  function boot() {
    document.querySelectorAll('form.tatoo-anfrage').forEach(function (f) {
      if (!f.dataset.ready) { f.dataset.ready = '1'; initForm(f); }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
