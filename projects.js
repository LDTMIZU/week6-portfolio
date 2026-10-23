/* ==========================================================================
   Projects — one shared list
   --------------------------------------------------------------------------
   Add a project once to PROJECTS below and it automatically appears in
   both the "Projects" navigation dropdown and the overview gallery.
   Keep `href` relative to the site root (e.g. "projects/todo.html") and
   make sure the page itself exists.
   ========================================================================== */
(function () {
  "use strict";

  var PROJECTS = [
    {
      id: "physics",
      name: "Mechanics Phenomena Visualized",
      href: "projects/physics.html",
      emoji: "🪐",
      summary:
        "An interactive gravity sandbox for the mechanics lesson — slingshot planets, " +
        "merge them on impact, and watch orbits form under a live N-body simulation.",
      tags: ["Canvas", "JavaScript", "Physics"]
    },
    {
      id: "history",
      name: "Two Histories, One Axis",
      href: "projects/history.html",
      emoji: "📜",
      summary:
        "A comparative timeline for the history lesson — European periods above the " +
        "line and Chinese dynasties below, each block set by its years with no collisions.",
      tags: ["Timeline", "CSS", "History"]
    },
    {
      id: "todo",
      name: "To-Do List",
      href: "projects/todo.html",
      emoji: "🗒️",
      summary:
        "A date-aware to-do list that sorts tasks into four priority quadrants, " +
        "lets you edit dates inline, and saves everything to Supabase.",
      tags: ["JavaScript", "Supabase", "CSS"]
    },
    {
      id: "weather",
      name: "Weather Now",
      href: "projects/weather.html",
      emoji: "⛅",
      summary:
        "Search any city in Chinese or English for its current weather and a " +
        "three-day forecast, with instant °C / °F switching.",
      tags: ["JavaScript", "REST API", "CSS"]
    },
    {
      id: "worldtime",
      name: "World Time",
      href: "projects/worldtime.html",
      emoji: "🕒",
      summary:
        "Look up the local time in any major city and watch the clock tick live, " +
        "using a bilingual city table and IANA time zones.",
      tags: ["JavaScript", "REST API", "CSS"]
    }
  ];

  // Detail pages live one level down, so they set data-root="../"
  var root = document.body.getAttribute("data-root") || "";

  function url(href) {
    return root + href;
  }

  function isCurrentPage(href) {
    var path = window.location.pathname.replace(/\\/g, "/");
    return path.slice(-href.length) === href;
  }

  /* ----- Navigation dropdown -------------------------------------------- */
  var menu = document.querySelector(".nav__menu");
  var trigger = menu && menu.querySelector(".nav__menu-trigger");
  var dropdown = menu && menu.querySelector(".nav__dropdown");
  var mq = window.matchMedia("(max-width: 720px)");

  function menuItem(name, href, emoji) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = url(href);
    a.textContent = (emoji ? emoji + " " : "") + name;
    if (isCurrentPage(href)) {
      a.classList.add("is-current");
      a.setAttribute("aria-current", "page");
    }
    li.appendChild(a);
    return li;
  }

  if (dropdown) {
    dropdown.appendChild(menuItem("All Projects", "projects.html", "🧭"));
    PROJECTS.forEach(function (p) {
      dropdown.appendChild(menuItem(p.name, p.href, p.emoji));
    });
  }

  if (menu && trigger) {
    var closeTimer = null;

    function isOpen() {
      return menu.classList.contains("is-open");
    }

    function setOpen(open) {
      menu.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    // Desktop: hovering opens the menu, leaving closes it after a short grace
    menu.addEventListener("mouseenter", function () {
      if (mq.matches) return;
      clearTimeout(closeTimer);
      setOpen(true);
    });

    menu.addEventListener("mouseleave", function () {
      if (mq.matches) return;
      closeTimer = setTimeout(function () { setOpen(false); }, 140);
    });

    // Click toggles the submenu on phones; on desktop it opens it when closed
    // and follows the link to the overview page when already open.
    trigger.addEventListener("click", function (e) {
      if (mq.matches) {
        e.preventDefault();
        setOpen(!isOpen());
        return;
      }
      if (!isOpen()) {
        e.preventDefault();
        setOpen(true);
      }
    });

    // Keyboard: ArrowDown opens and steps through the items, Escape closes
    menu.addEventListener("keydown", function (e) {
      var links = dropdown ? dropdown.querySelectorAll("a") : [];

      if (e.key === "Escape" && isOpen()) {
        setOpen(false);
        trigger.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      var active = document.activeElement;
      if (active === trigger) {
        if (e.key !== "ArrowDown" || !links.length) return;
        e.preventDefault();
        setOpen(true);
        links[0].focus();
        return;
      }

      var idx = Array.prototype.indexOf.call(links, active);
      if (idx === -1) return;
      e.preventDefault();
      var next = e.key === "ArrowDown" ? Math.min(idx + 1, links.length - 1) : Math.max(idx - 1, 0);
      links[next].focus();
    });

    // Close when focus or the pointer moves elsewhere
    menu.addEventListener("focusout", function (e) {
      if (mq.matches) return;
      if (e.relatedTarget && menu.contains(e.relatedTarget)) return;
      setOpen(false);
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target)) setOpen(false);
    });

    if (mq.addEventListener) {
      mq.addEventListener("change", function () { setOpen(false); });
    }
  }

  /* ----- Overview gallery ------------------------------------------------ */
  var grid = document.getElementById("projectGrid");

  if (grid) {
    PROJECTS.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "project";

      var media = document.createElement("div");
      media.className = "project__media";
      media.setAttribute("aria-hidden", "true");
      media.textContent = p.emoji;

      var body = document.createElement("div");
      body.className = "project__body";

      var title = document.createElement("h3");
      title.textContent = p.name;

      var desc = document.createElement("p");
      desc.textContent = p.summary;

      var tags = document.createElement("div");
      tags.className = "project__tags";
      p.tags.forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = tag;
        tags.appendChild(chip);
      });

      var link = document.createElement("a");
      link.className = "project__link";
      link.href = url(p.href);
      link.setAttribute("aria-label", "Open " + p.name);
      link.textContent = "Open project →";

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(tags);
      body.appendChild(link);

      card.appendChild(media);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }
})();
