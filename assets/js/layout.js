// Universal header + footer. Every page includes:
//   <div id="site-header"></div> ... <div id="site-footer"></div>
//   <script src="assets/js/layout.js"></script>
// Links are relative so the site works on GitHub Pages project URLs (/cys401/) and locally.
(function () {
  var NAV = [
    { href: 'index.html', label: 'Home' },
    { href: 'about.html', label: 'About' },
    { href: 'threats.html', label: 'Threats' },
    { href: 'cia-triad.html', label: 'CIA Triad' },
    { href: 'access-control.html', label: 'Access Control' },
    { href: 'protection.html', label: 'Protection' }
  ];

  var LOGO =
    '<span class="w-8 h-8 rounded-lg bg-pred flex items-center justify-center shadow-[0_0_16px_rgba(220,38,38,0.35)]">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></span>';

  function pageKey(path) {
    var name = (path || '').split('/').pop().replace(/\.html$/, '');
    return name === '' ? 'index' : name;
  }
  var current = pageKey(location.pathname);

  function current_(item) {
    return pageKey(item.href) === current ? ' aria-current="page"' : '';
  }

  var desktopLinks = NAV.map(function (item) {
    return '<a href="' + item.href + '" class="nav-link text-stext hover:text-ptext"' + current_(item) + '>' + item.label + '</a>';
  }).join('');

  var mobileLinks = NAV.map(function (item) {
    return '<a href="' + item.href + '" class="mobile-link block px-4 py-3 rounded-btn border border-transparent text-stext hover:text-ptext hover:bg-elevated"' + current_(item) + '>' + item.label + '</a>';
  }).join('');

  var header =
    '<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] bg-pred text-white px-4 py-2 rounded-btn">Skip to content</a>' +
    '<header class="fixed top-0 inset-x-0 h-[72px] bg-main/90 backdrop-blur-md border-b border-brder z-50">' +
      '<div class="max-w-content mx-auto h-full px-6 flex items-center justify-between gap-6">' +
        '<a href="index.html" class="flex items-center gap-3 shrink-0" aria-label="CYS401 home">' + LOGO +
          '<span class="font-display font-semibold text-lg tracking-wide">CYS401</span></a>' +
        '<nav class="hidden lg:flex items-center gap-8 text-[14px] font-medium h-full" aria-label="Primary">' + desktopLinks + '</nav>' +
        '<div class="flex items-center gap-3">' +
          '<a href="threats.html" class="hidden sm:inline-flex bg-pred hover:bg-bred text-white text-[14px] font-semibold px-5 py-2.5 rounded-btn transition-colors">Get Started</a>' +
          '<button type="button" id="nav-toggle" class="lg:hidden w-10 h-10 rounded-btn border border-brder flex items-center justify-center text-ptext hover:bg-elevated" aria-controls="mobile-nav" aria-expanded="false" aria-label="Open menu">' +
            '<svg id="nav-icon-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
            '<svg id="nav-icon-close" class="hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav id="mobile-nav" class="lg:hidden hidden border-b border-brder bg-main/95 backdrop-blur-md" aria-label="Mobile">' +
        '<div class="max-w-content mx-auto px-6 py-4 flex flex-col gap-1 text-[15px] font-medium">' + mobileLinks +
          '<a href="threats.html" class="sm:hidden mt-2 text-center bg-pred hover:bg-bred text-white font-semibold px-5 py-3 rounded-btn">Get Started</a>' +
        '</div>' +
      '</nav>' +
    '</header>';

  function footerCol(title, links) {
    return '<div><h3 class="text-[13px] font-semibold text-ptext mb-4">' + title + '</h3><ul class="space-y-3 text-[13px] text-mtext">' +
      links.map(function (l) { return '<li><a href="' + l[1] + '" class="hover:text-stext transition-colors">' + l[0] + '</a></li>'; }).join('') +
      '</ul></div>';
  }

  var footer =
    '<footer class="border-t border-brder bg-main">' +
      '<div class="max-w-content mx-auto px-6 pt-16 pb-10">' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">' +
          '<div class="sm:col-span-2">' +
            '<a href="index.html" class="flex items-center gap-3 mb-4">' + LOGO + '<span class="font-display font-semibold">CYS401</span></a>' +
            '<p class="text-[13px] text-mtext leading-relaxed max-w-xs">Foundational cybersecurity education. Protect your data, your network, and your people.</p>' +
          '</div>' +
          footerCol('Course Modules', [['Threat Landscape', 'threats.html'], ['CIA Triad', 'cia-triad.html'], ['Access Control', 'access-control.html'], ['Protection Mechanisms', 'protection.html']]) +
          footerCol('Platform', [['Home', 'index.html'], ['About', 'about.html'], ['Back to top', '#main']]) +
        '</div>' +
        '<div class="mt-12 pt-6 border-t border-brder flex flex-col sm:flex-row gap-4 justify-between text-[12px] text-mtext">' +
          '<p>&copy; ' + new Date().getFullYear() + ' CYS401 Cybersecurity Fundamentals. Educational content purposes only.</p>' +
          '<p>Built for learning &mdash; not a commercial product.</p>' +
        '</div>' +
      '</div>' +
    '</footer>';

  function mount() {
    var h = document.getElementById('site-header');
    var f = document.getElementById('site-footer');
    if (h) h.outerHTML = header;
    if (f) f.outerHTML = footer;

    var toggle = document.getElementById('nav-toggle');
    var menu = document.getElementById('mobile-nav');
    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.getElementById('nav-icon-open').classList.toggle('hidden', open);
      document.getElementById('nav-icon-close').classList.toggle('hidden', !open);
    }
    if (toggle && menu) {
      toggle.addEventListener('click', function () { setOpen(menu.classList.contains('hidden')); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
      window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
    }

    var items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
