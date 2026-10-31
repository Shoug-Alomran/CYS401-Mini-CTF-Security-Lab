// On-demand English to Arabic translation for the static CYS401 site.
// Text is sent to Google's public web translation endpoint only after Arabic
// is selected. This endpoint is not a supported production API.
(function () {
  var ROOT = document.documentElement;
  var originalText = new WeakMap();
  var originalAttrs = new WeakMap();
  var cache = Object.create(null);
  var pending = new Set();
  var timer = 0;
  var observer;
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  var IGNORE = "script,style,code,pre,svg,input,textarea,select,option,[data-no-translate],[translate='no'],[data-auth-slot],#sb-rows,#d-rows,#u-rows,#a-rows,#hello-name,.font-mono";

  function eligible(node) {
    if (!node || !node.nodeValue || !node.nodeValue.trim()) return false;
    var parent = node.parentElement;
    return !!parent && !parent.closest(IGNORE);
  }

  function rememberText(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    pending.add(node);
  }

  function collect(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (eligible(root)) rememberText(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(IGNORE)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) if (eligible(node)) rememberText(node);
    var elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
    if (root.nodeType === Node.ELEMENT_NODE) elements = [root].concat(Array.from(elements));
    Array.from(elements).forEach(function (el) {
      if (el.matches(IGNORE)) return;
      ATTRS.forEach(function (name) {
        var value = el.getAttribute(name);
        if (!value || !value.trim()) return;
        var saved = originalAttrs.get(el) || {};
        if (!(name in saved)) saved[name] = value;
        originalAttrs.set(el, saved);
      });
    });
  }

  function applyLanguage(language) {
    var arabic = language === "ar";
    ROOT.lang = arabic ? "ar" : "en";
    ROOT.dir = arabic ? "rtl" : "ltr";
    ROOT.classList.toggle("arabic-mode", arabic);
    try { localStorage.setItem("cys401-language", language); } catch (e) {}
    if (observer) observer.disconnect();
    document.querySelectorAll("body *").forEach(function (el) {
      var attrs = originalAttrs.get(el);
      if (attrs) Object.keys(attrs).forEach(function (name) {
        if (!arabic) el.setAttribute(name, attrs[name]);
      });
    });
    if (!arabic) {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        var original = originalText.get(node);
        if (original !== undefined) node.nodeValue = original;
      }
      if (observer) observe();
      return;
    }
    collect(document.body);
    if (document.title) {
      var titleNode = document.querySelector("title").firstChild;
      if (titleNode && eligible(titleNode)) rememberText(titleNode);
    }
    translatePending();
    observe();
  }

  function translateBatch(nodes) {
    var unique = [];
    var seen = new Set();
    nodes.forEach(function (node) {
      var value = node.__translationValue || originalText.get(node);
      if (!value || cache[value] || seen.has(value)) return;
      seen.add(value);
      unique.push(value);
    });
    if (!unique.length) return Promise.resolve();
    var params = new URLSearchParams({ client: "gtx", sl: "en", tl: "ar", dt: "t" });
    unique.forEach(function (value) { params.append("q", value); });
    return fetch("https://translate.googleapis.com/translate_a/single?" + params.toString())
      .then(function (response) { if (!response.ok) throw new Error("Translation service unavailable"); return response.json(); })
      .then(function (data) {
        unique.forEach(function (value, index) {
          var pieces = data[index] || [];
          cache[value] = pieces.map(function (piece) { return piece[0] || ""; }).join("");
        });
      });
  }

  function translatePending() {
    if (ROOT.lang !== "ar" || !pending.size) return;
    var nodes = Array.from(pending);
    pending.clear();
    var batches = [];
    var batch = [];
    var size = 0;
    nodes.forEach(function (node) {
      var value = originalText.get(node) || "";
      if (size + value.length > 1500 && batch.length) { batches.push(batch); batch = []; size = 0; }
      batch.push(node); size += value.length;
    });
    document.querySelectorAll("body *").forEach(function (el) {
      var attrs = originalAttrs.get(el);
      if (!attrs) return;
      Object.keys(attrs).forEach(function (name) {
        var value = attrs[name];
        if (!cache[value]) {
          if (size + value.length > 1500 && batch.length) { batches.push(batch); batch = []; size = 0; }
          batch.push({ __translationValue: value }); size += value.length;
        }
      });
    });
    if (batch.length) batches.push(batch);
    var status = document.getElementById("translation-status");
    if (status) status.textContent = "Translating…";
    var groups = [];
    for (var i = 0; i < batches.length; i += 3) groups.push(batches.slice(i, i + 3));
    var chain = Promise.resolve();
    groups.forEach(function (group) {
      chain = chain.then(function () {
        return Promise.all(group.map(function (items) {
          return translateBatch(items).then(function () {
            if (ROOT.lang !== "ar") return;
            items.forEach(function (node) {
              if (node.__translationValue) return;
              var original = originalText.get(node);
              if (original !== undefined && cache[original]) node.nodeValue = cache[original];
            });
            applyTranslatedAttributes();
          });
        }));
      });
    });
    chain.then(function () {
      if (status && ROOT.lang === "ar") status.textContent = "";
    }).catch(function () {
      if (ROOT.lang === "ar") {
        var select = document.getElementById("site-language");
        if (select) select.title = "Translation service unavailable. Please try again.";
        if (status) status.textContent = "Translation service unavailable";
      }
    });
  }

  function applyTranslatedAttributes() {
    document.querySelectorAll("body *").forEach(function (el) {
      var attrs = originalAttrs.get(el);
      if (!attrs) return;
      Object.keys(attrs).forEach(function (name) {
        var value = attrs[name];
        if (cache[value]) el.setAttribute(name, cache[value]);
      });
    });
  }

  function observe() {
    observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === "characterData") {
          if (!originalText.has(record.target)) originalText.set(record.target, record.target.nodeValue);
          if (eligible(record.target)) pending.add(record.target);
        }
        record.addedNodes && record.addedNodes.forEach(collect);
      });
      clearTimeout(timer);
      timer = setTimeout(translatePending, 250);
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  window.CYS401Translator = {
    init: function (select) {
      if (!select) {
        var footer = document.createElement("footer");
        footer.style.cssText = "border-top:1px solid #27272a;background:#09090b;padding:24px;display:flex;justify-content:flex-end;color:#a1a1aa;font:12px Arial,sans-serif";
        footer.innerHTML = '<div style="display:flex;align-items:center;gap:12px"><span id="translation-status" role="status" aria-live="polite"></span><label style="display:flex;align-items:center;gap:8px" for="site-language"><span>Language</span><select id="site-language" aria-label="Choose language" style="background:#151518;border:1px solid #3f3f46;border-radius:8px;padding:8px 12px;color:#fafafa"><option value="en">English</option><option value="ar">العربية</option></select></label></div>';
        document.body.appendChild(footer);
        select = footer.querySelector("select");
        try { select.value = localStorage.getItem("cys401-language") || "en"; } catch (e) {}
      }
      if (!document.getElementById("cys401-rtl-style")) {
        var style = document.createElement("style");
        style.id = "cys401-rtl-style";
        style.textContent = 'html[dir="rtl"] body{font-family:Tahoma,Arial,sans-serif}html[dir="rtl"] .text-left{text-align:right!important}html[dir="rtl"] input,html[dir="rtl"] textarea{text-align:right}';
        document.head.appendChild(style);
      }
      select.addEventListener("change", function () { applyLanguage(select.value); });
      applyLanguage(select.value || "en");
    }
  };
})();
