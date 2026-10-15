// Universal header + footer. Every page includes:
//   <div id="site-header"></div> ... <div id="site-footer"></div>
//   <script src="assets/js/layout.js"></script>
// Links are relative so the site works on GitHub Pages project URLs (/cys401/) and locally.
(function () {
  // Top-level links, and dropdown groups ({ label, items }).
  // Full file names (not built by joining strings) so the deploy's link check can verify them.
  var TRACKS = [
    {
      label: "Web Security",
      workshop: "web-security.html",
      challenges: "web-security-challenges.html",
    },
    {
      label: "Cryptography",
      workshop: "cryptography.html",
      challenges: "cryptography-challenges.html",
    },
    {
      label: "Security Awareness",
      workshop: "security-awareness.html",
      challenges: "security-awareness-challenges.html",
    },
    {
      label: "Cybersecurity Ethics",
      workshop: "ethics.html",
      challenges: "ethics-challenges.html",
    },
  ];
  var NAV = [
    { href: "index.html", label: "Home" },
    {
      label: "Workshops",
      note: "Learn the concepts behind each track",
      items: TRACKS.map(function (t) {
        return { href: t.workshop, label: t.label };
      }),
    },
    {
      label: "Challenges",
      note: "Capture flags and score points",
      items: [{ href: "challenges.html", label: "All challenges" }].concat(
        TRACKS.map(function (t) {
          return { href: t.challenges, label: t.label };
        }),
      ),
    },
    { href: "scoreboard.html", label: "Scoreboard" },
    {
      label: "About",
      items: [
        { href: "about.html", label: "About the Lab" },
        { href: "project.html", label: "Project" },
        { href: "report.html", label: "Report" },
        { href: "team.html", label: "Team" },
      ],
    },
  ];

  var LOGO =
    '<span class="w-8 h-8 rounded-lg bg-pred flex items-center justify-center shadow-[0_0_16px_rgba(220,38,38,0.35)]">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></span>';

  function pageKey(path) {
    var name = (path || "")
      .split("/")
      .pop()
      .replace(/\.html$/, "");
    return name === "" ? "index" : name;
  }
  var current = pageKey(location.pathname);

  function isCurrent(href) {
    return pageKey(href) === current;
  }
  function current_(item) {
    return isCurrent(item.href) ? ' aria-current="page"' : "";
  }
  function groupActive(group) {
    return group.items.some(function (i) {
      return isCurrent(i.href);
    });
  }

  var CHEVRON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  var desktopLinks = NAV.map(function (item, n) {
    if (!item.items) {
      return (
        '<a href="' +
        item.href +
        '" class="nav-link text-stext hover:text-ptext"' +
        current_(item) +
        ">" +
        item.label +
        "</a>"
      );
    }
    return (
      '<div class="relative h-full flex items-center" data-nav-group>' +
      '<button type="button" class="nav-link inline-flex items-center gap-1 text-stext hover:text-ptext" aria-haspopup="true" aria-expanded="false" aria-controls="nav-group-' +
      n +
      '"' +
      (groupActive(item) ? ' aria-current="page"' : "") +
      ">" +
      item.label +
      CHEVRON +
      "</button>" +
      '<div id="nav-group-' +
      n +
      '" class="hidden absolute top-full left-1/2 -translate-x-1/2 -mt-2 w-64 bg-card border border-brder rounded-xl shadow-2xl p-2" data-nav-panel>' +
      (item.note
        ? '<p class="px-3 pt-2 pb-2 text-[11px] uppercase tracking-wider text-mtext">' +
          item.note +
          "</p>"
        : "") +
      item.items
        .map(function (i) {
          return (
            '<a href="' +
            i.href +
            '" class="block px-3 py-2.5 rounded-lg text-[14px] ' +
            (isCurrent(i.href)
              ? "bg-sred text-bred"
              : "text-stext hover:text-ptext hover:bg-elevated") +
            '"' +
            current_(i) +
            ">" +
            i.label +
            "</a>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }).join("");

  var mobileLinks = NAV.map(function (item) {
    if (!item.items) {
      return (
        '<a href="' +
        item.href +
        '" class="mobile-link block px-4 py-3 rounded-btn border border-transparent text-stext hover:text-ptext hover:bg-elevated"' +
        current_(item) +
        ">" +
        item.label +
        "</a>"
      );
    }
    return (
      '<p class="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-mtext">' +
      item.label +
      "</p>" +
      '<div class="grid grid-cols-2 gap-1">' +
      item.items
        .map(function (i) {
          return (
            '<a href="' +
            i.href +
            '" class="mobile-link block px-4 py-2.5 rounded-btn border border-transparent text-[14px] text-stext hover:text-ptext hover:bg-elevated"' +
            current_(i) +
            ">" +
            i.label +
            "</a>"
          );
        })
        .join("") +
      "</div>"
    );
  }).join("");

  var header =
    '<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] bg-pred text-white px-4 py-2 rounded-btn">Skip to content</a>' +
    '<header class="fixed top-0 inset-x-0 h-[72px] bg-main/90 backdrop-blur-md border-b border-brder z-50">' +
    '<div class="max-w-content mx-auto h-full px-6 flex items-center justify-between gap-6">' +
    '<a href="index.html" class="flex items-center gap-3 shrink-0" aria-label="CYS401 home">' +
    LOGO +
    '<span class="font-display font-semibold text-lg tracking-wide">CYS401</span></a>' +
    '<nav class="hidden lg:flex items-center gap-6 xl:gap-8 text-[14px] font-medium h-full" aria-label="Primary">' +
    desktopLinks +
    "</nav>" +
    '<div class="flex items-center gap-3">' +
    // Account area: filled by firebase.js (Log in / Sign up, or the signed-in user).
    '<div data-auth-slot class="hidden sm:flex items-center gap-2"></div>' +
    '<button type="button" id="nav-toggle" class="lg:hidden w-10 h-10 rounded-btn border border-brder flex items-center justify-center text-ptext hover:bg-elevated" aria-controls="mobile-nav" aria-expanded="false" aria-label="Open menu">' +
    '<svg id="nav-icon-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
    '<svg id="nav-icon-close" class="hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    "</button>" +
    "</div>" +
    "</div>" +
    '<nav id="mobile-nav" class="lg:hidden hidden max-h-[calc(100vh-72px)] overflow-y-auto border-b border-brder bg-main/95 backdrop-blur-md" aria-label="Mobile">' +
    '<div class="max-w-content mx-auto px-6 py-4 flex flex-col gap-1 text-[15px] font-medium">' +
    mobileLinks +
    '<div data-auth-slot="mobile" class="sm:hidden mt-2 flex flex-wrap items-center gap-2"></div>' +
    "</div>" +
    "</nav>" +
    "</header>";

  function footerCol(title, links) {
    return (
      '<div><h3 class="text-[13px] font-semibold text-ptext mb-4">' +
      title +
      '</h3><ul class="space-y-3 text-[13px] text-mtext">' +
      links
        .map(function (l) {
          var ext = l[2] ? ' target="_blank" rel="noopener"' : "";
          return (
            '<li><a href="' +
            l[1] +
            '"' +
            ext +
            ' class="hover:text-stext transition-colors">' +
            l[0] +
            "</a></li>"
          );
        })
        .join("") +
      "</ul></div>"
    );
  }

  var footer =
    '<footer class="border-t border-brder bg-main">' +
    '<div class="max-w-content mx-auto px-6 pt-16 pb-28 lg:pb-24">' +
    '<div class="grid grid-cols-2 lg:grid-cols-5 gap-10">' +
    '<div class="col-span-2">' +
    '<a href="index.html" class="flex items-center gap-3 mb-4">' +
    LOGO +
    '<span class="font-display font-semibold">CYS401</span></a>' +
    '<p class="text-[13px] text-mtext leading-relaxed max-w-xs">The Mini Capture-the-Flag (CTF) Security Lab Platform &mdash; a CYS401 group project at Prince Sultan University. Solve challenges, capture flags, and learn by doing.</p>' +
    "</div>" +
    footerCol(
      "Challenges",
      [["All challenges", "challenges.html"]]
        .concat(
          TRACKS.map(function (t) {
            return [t.label, t.challenges];
          }),
        )
        .concat([["Scoreboard", "scoreboard.html"]]),
    ) +
    footerCol(
      "Workshops",
      TRACKS.map(function (t) {
        return [t.label, t.workshop];
      }),
    ) +
    footerCol("The Project", [
      ["About the Lab", "about.html"],
      ["Project Overview", "project.html"],
      ["Project Plan (PDF)", "ctf-plan.pdf", 1],
      ["Report", "report.html"],
      ["Team", "team.html"],
    ]) +
    "</div>" +
    '<div class="mt-12 pt-6 border-t border-brder flex flex-col sm:flex-row gap-4 justify-between text-[12px] text-mtext">' +
    "<p>&copy; " +
    new Date().getFullYear() +
    " CYS401 Semester Project Group. Educational content purposes only.</p>" +
    '<p>Prince Sultan University &middot; Semester 261 &middot; Project plan PDF made with <a href="https://blueprint.shoug-tech.com/" target="_blank" rel="noopener" class="text-stext hover:text-ptext underline underline-offset-2 transition-colors">Blueprint</a></p>' +
    "</div>" +
    "</div>" +
    "</footer>";

  function mount() {
    var h = document.getElementById("site-header");
    var f = document.getElementById("site-footer");
    if (h) h.outerHTML = header;
    if (f) f.outerHTML = footer;
    document.dispatchEvent(new Event("layout:ready"));

    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("mobile-nav");
    function setOpen(open) {
      menu.classList.toggle("hidden", !open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.getElementById("nav-icon-open").classList.toggle("hidden", open);
      document
        .getElementById("nav-icon-close")
        .classList.toggle("hidden", !open);
    }
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        setOpen(menu.classList.contains("hidden"));
      });
      menu.addEventListener("click", function (e) {
        if (e.target.closest("a")) setOpen(false);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setOpen(false);
      });
      window
        .matchMedia("(min-width: 1024px)")
        .addEventListener("change", function (e) {
          if (e.matches) setOpen(false);
        });
    }

    // Header dropdowns: click to open, one at a time; outside click or Escape closes.
    var groups = Array.prototype.slice.call(
      document.querySelectorAll("[data-nav-group]"),
    );
    function closeGroups(except) {
      groups.forEach(function (g) {
        if (g === except) return;
        g.querySelector("[data-nav-panel]").classList.add("hidden");
        g.querySelector("button").setAttribute("aria-expanded", "false");
      });
    }
    groups.forEach(function (g) {
      var btn = g.querySelector("button");
      var panel = g.querySelector("[data-nav-panel]");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = panel.classList.contains("hidden");
        closeGroups(g);
        panel.classList.toggle("hidden", !open);
        btn.setAttribute("aria-expanded", String(open));
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-nav-group]")) closeGroups();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeGroups();
    });

    var items = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("is-visible");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.12 },
      );
      items.forEach(function (el) {
        io.observe(el);
      });
    } else {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }
  }

  // Accounts, progress, and the header account area (a module, so it loads once per page).
  var fb = document.createElement("script");
  fb.type = "module";
  fb.src = "assets/js/firebase.js";
  document.head.appendChild(fb);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
