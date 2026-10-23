/* ==========================================================================
   Personal Website — Shared Scripts
   - Mobile nav toggle
   - Friendly contact form handler (no backend; demo only)
   ========================================================================== */

(function () {
  "use strict";

  /* ----- Mobile navigation toggle --------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var links = document.getElementById("navLinks");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close the menu when a link is clicked (nice on phones)
    links.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      // The Projects trigger toggles its submenu; it should not close the panel
      if (!link || link.classList.contains("nav__menu-trigger")) return;
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      var submenu = links.querySelector(".nav__menu");
      if (submenu) {
        submenu.classList.remove("is-open");
        var subTrigger = submenu.querySelector(".nav__menu-trigger");
        if (subTrigger) subTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ----- Contact form (demo handler) ------------------------------------ */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");

  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = (form.querySelector("#name") || {}).value || "";
      name = name.trim();

      // Simple validation — keep it friendly
      var email = (form.querySelector("#email") || {}).value || "";
      var message = (form.querySelector("#message") || {}).value || "";

      if (!name || !email || !message) {
        note.hidden = false;
        note.textContent = "Oops — please fill in your name, email, and a message.";
        note.style.color = "#C45B3D";
        return;
      }

      // Demo: pretend we sent it
      note.hidden = false;
      note.textContent =
        "Thank you, " + name + "! Your message is on its way. 💌 I'll be in touch soon.";
      note.style.color = "#3a7a3a";
      form.reset();
    });
  }
})();

/* ==========================================================================
   To-Do app (Projects page)
   - Add tasks with a date
   - Check to mark done (strikethrough)
   - X to delete
   - Persists in Supabase
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("todoForm");
  if (!form) return; // not on the projects page

  var dateInput = document.getElementById("todoDate");
  var textInput = document.getElementById("todoText");
  var listEl = document.getElementById("todoList");
  var emptyEl = document.getElementById("todoEmpty");
  var errorEl = document.getElementById("todoError");
  var countEl = document.getElementById("todoCount");
  var clearBtn = document.getElementById("todoClear");
  var prioGroup = document.getElementById("todoPrio");
  var menuEl = document.getElementById("todoMenu");
  var menuTaskId = null; // id of the task whose menu is open
  var charCountEl = document.getElementById("todoCharCount");

  // --- Supabase client ---
  var SUPABASE_URL = "https://gatgsbcloimmfwfmyfsm.supabase.co";
  var SUPABASE_KEY = "sb_publishable_5_04v-F4K0tBr5NVwPH-aw_pN7YC4y9";
  var supa = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
  var PRIO_EMOJI = { iu: "🔴", in: "🟡", nu: "🔵", nn: "🟢" };
  var PRIO_LABEL = {
    iu: "Important and urgent",
    in: "Important but not urgent",
    nu: "Urgent but not important",
    nn: "Not important and not urgent"
  };
  var selectedPrio = "in";

  var tasks = [];

  // Default to today's date for convenience
  dateInput.value = new Date().toISOString().split("T")[0];

  // Load tasks from Supabase ordered by created_at
  loadTasks().then(function (loaded) {
    tasks = loaded;
    render();
  });

  // Live character counter + auto-resize for the task input
  var MAX_CHARS = 300;
  function updateCharCount() {
    if (!charCountEl) return;
    var len = textInput.value.length;
    charCountEl.textContent = len + "/" + MAX_CHARS;
    charCountEl.classList.toggle("is-near", len >= MAX_CHARS * 0.75 && len < MAX_CHARS);
    charCountEl.classList.toggle("is-max", len >= MAX_CHARS);
  }
  function autoResize() {
    textInput.style.height = "auto";
    textInput.style.height = textInput.scrollHeight + "px";
  }
  textInput.addEventListener("input", function () {
    updateCharCount();
    autoResize();
  });
  updateCharCount();
  autoResize();

  // Priority picker — toggle which button is active
  if (prioGroup) {
    prioGroup.addEventListener("click", function (e) {
      var btn = e.target.closest(".todo__prio-btn");
      if (!btn) return;
      selectedPrio = btn.dataset.prio;
      prioGroup.querySelectorAll(".todo__prio-btn").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var date = dateInput.value;
    var text = textInput.value.trim();

    if (!date || !text) {
      errorEl.hidden = false;
      errorEl.textContent = "Please pick a date and write a task.";
      return;
    }
    if (!supa) {
      errorEl.hidden = false;
      errorEl.textContent = "Supabase library failed to load. Check your internet connection and refresh.";
      return;
    }
    errorEl.hidden = true;

    // Insert into Supabase and get the new row back
    var res = await supa
      .from("todos")
      .insert({ task: text, date: date, is_completed: false, priority: selectedPrio })
      .select()
      .single();

    if (res.error) {
      errorEl.hidden = false;
      errorEl.textContent = "Could not save: " + (res.error.message || "database error");
      return;
    }

    tasks.push({
      id: String(res.data.id),
      text: res.data.task,
      date: res.data.date,
      done: res.data.is_completed,
      prio: res.data.priority || "in"
    });

    textInput.value = "";
    updateCharCount();
    autoResize();
    textInput.focus();

    render();
  });

  clearBtn.addEventListener("click", async function () {
    if (!tasks.length) return;
    if (!confirm("Remove all tasks?")) return;
    await Promise.all(
      tasks.map(function (t) {
        return supa.from("todos").delete().eq("id", t.id);
      })
    );
    tasks = [];
    render();
  });

  // Allow toggling done / deleting / opening category menu / editing date via event delegation
  listEl.addEventListener("click", function (e) {
    var item = e.target.closest(".todo__item");
    if (!item) return;
    var id = item.dataset.id;

    if (e.target.classList.contains("todo__check")) {
      toggleDone(id);
    } else if (e.target.classList.contains("todo__del")) {
      deleteTask(id);
    } else if (e.target.closest(".todo__prio-badge")) {
      openMenu(e.target.closest(".todo__prio-badge"), id);
    } else {
      var dateBadge = e.target.closest(".todo__date");
      if (dateBadge && !dateBadge.classList.contains("todo__date--edit")) {
        editDate(id, dateBadge);
      }
    }
  });

  async function toggleDone(id) {
    var t = tasks.find(function (x) { return String(x.id) === id; });
    if (!t) return;
    var newDone = !t.done;
    var res = await supa.from("todos").update({ is_completed: newDone }).eq("id", t.id);
    if (res.error) { console.error(res.error); return; }
    t.done = newDone;
    render();
  }

  async function deleteTask(id) {
    var t = tasks.find(function (x) { return String(x.id) === id; });
    if (!t) return;
    var res = await supa.from("todos").delete().eq("id", t.id);
    if (res.error) { console.error(res.error); return; }
    tasks = tasks.filter(function (x) { return String(x.id) !== id; });
    render();
  }

  async function setCategory(id, prio) {
    var t = tasks.find(function (x) { return String(x.id) === id; });
    if (!t || !PRIO_EMOJI[prio]) return;
    var res = await supa.from("todos").update({ priority: prio }).eq("id", t.id);
    if (res.error) { console.error(res.error); return; }
    t.prio = prio;
    render();
  }

  function editDate(id, badgeEl) {
    var t = tasks.find(function (x) { return String(x.id) === id; });
    if (!t || !badgeEl) return;

    var input = document.createElement("input");
    input.type = "date";
    input.className = "todo__date todo__date--edit";
    input.value = t.date;
    input.setAttribute("aria-label", "Edit date");

    badgeEl.replaceWith(input);
    input.focus();

    var done = false;
    async function save() {
      if (done) return;
      done = true;
      if (input.value && input.value !== t.date) {
        var res = await supa.from("todos").update({ date: input.value }).eq("id", t.id);
        if (res.error) { console.error(res.error); render(); return; }
        t.date = input.value;
      }
      render();
    }
    input.addEventListener("change", save);
    input.addEventListener("blur", save);
  }

  // --- Category dropdown menu ---
  function openMenu(badgeEl, taskId) {
    if (!menuEl || !badgeEl) return;
    menuTaskId = taskId;

    // Highlight the current category with a checkmark
    var task = tasks.find(function (x) { return String(x.id) === taskId; });
    var current = (task && task.prio) || "in";
    menuEl.querySelectorAll(".todo__menu-item").forEach(function (btn) {
      btn.classList.toggle("is-current", btn.dataset.prio === current);
    });

    // Position the menu below the badge using document coordinates
    // so it scrolls with the page instead of staying fixed in the viewport
    var rect = badgeEl.getBoundingClientRect();
    var scrollX = window.scrollX || window.pageXOffset;
    var scrollY = window.scrollY || window.pageYOffset;
    menuEl.hidden = false;
    var menuH = menuEl.offsetHeight;
    var top = rect.bottom + scrollY + 6;
    // Flip above if it would overflow the bottom of the viewport
    if (rect.bottom + 6 + menuH > window.innerHeight) {
      top = Math.max(scrollY + 8, rect.top + scrollY - menuH - 6);
    }
    menuEl.style.top = top + "px";
    menuEl.style.left = (rect.left + scrollX) + "px";
  }

  function closeMenu() {
    if (menuEl) menuEl.hidden = true;
    menuTaskId = null;
  }

  // Menu item click — set the category and close
  if (menuEl) {
    menuEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".todo__menu-item");
      if (!btn || !menuTaskId) return;
      setCategory(menuTaskId, btn.dataset.prio);
      closeMenu();
    });
  }

  // Click outside or Escape closes the menu
  document.addEventListener("click", function (e) {
    if (!menuEl || menuEl.hidden) return;
    if (!e.target.closest(".todo__menu") && !e.target.closest(".todo__prio-badge")) {
      closeMenu();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  // Keyboard support — open the menu with Enter/Space on a focused badge
  listEl.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var badge = e.target.closest(".todo__prio-badge");
    if (!badge) return;
    var item = badge.closest(".todo__item");
    if (!item) return;
    e.preventDefault();
    openMenu(badge, item.dataset.id);
  });

  function render() {
    listEl.innerHTML = "";

    // Sort by date, then by done state (incomplete first)
    tasks.sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });

    tasks.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "todo__item" + (t.done ? " todo__item--done" : "");
      li.dataset.id = t.id;

      var check = document.createElement("input");
      check.type = "checkbox";
      check.className = "todo__check";
      check.setAttribute("aria-label", "Mark task done");
      if (t.done) check.checked = true;

      var prio = t.prio || "in";
      var prioBadge = document.createElement("span");
      prioBadge.className = "todo__prio-badge";
      prioBadge.dataset.prio = prio;
      prioBadge.title = (PRIO_LABEL[prio] || PRIO_LABEL.in) + " — click to change";
      prioBadge.setAttribute("role", "button");
      prioBadge.setAttribute("tabindex", "0");
      prioBadge.setAttribute("aria-label", "Category: " + (PRIO_LABEL[prio] || PRIO_LABEL.in) + ". Click to change.");
      prioBadge.textContent = PRIO_EMOJI[prio] || PRIO_EMOJI.in;

      var span = document.createElement("span");
      span.className = "todo__text";
      span.textContent = t.text;

      var dateBadge = document.createElement("span");
      dateBadge.className = "todo__date";
      dateBadge.textContent = formatDate(t.date);
      dateBadge.title = "Click to change date";
      dateBadge.setAttribute("role", "button");
      dateBadge.setAttribute("tabindex", "0");
      dateBadge.setAttribute("aria-label", "Date: " + formatDate(t.date) + ". Click to change.");

      var del = document.createElement("button");
      del.type = "button";
      del.className = "todo__del";
      del.setAttribute("aria-label", "Delete task");
      del.textContent = "×";

      li.appendChild(check);
      li.appendChild(prioBadge);
      li.appendChild(span);
      li.appendChild(dateBadge);
      li.appendChild(del);

      listEl.appendChild(li);
    });

    emptyEl.hidden = tasks.length > 0;
    var doneCount = tasks.filter(function (t) { return t.done; }).length;
    countEl.textContent =
      doneCount + " of " + tasks.length + " tasks completed";
  }

  function formatDate(iso) {
    // Convert YYYY-MM-DD into a friendly "Mon DD" label
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10);
  }

  async function loadTasks() {
    if (!supa) return [];
    var res = await supa
      .from("todos")
      .select("id, task, date, is_completed, priority")
      .order("created_at", { ascending: true });
    if (res.error) {
      console.error("Supabase load error:", res.error);
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = "Could not load tasks: " + (res.error.message || "database error");
      }
      return [];
    }
    // Migrate old priority levels (low/medium/high) to the 4-quadrant keys
    var migrate = { low: "nn", medium: "in", high: "iu" };
    return (res.data || []).map(function (row) {
      var prio = row.priority;
      if (!prio) prio = "in";
      else if (migrate[prio]) prio = migrate[prio];
      return {
        id: String(row.id),
        text: row.task,
        date: row.date,
        done: row.is_completed,
        prio: prio
      };
    });
  }
})();

/* ==========================================================================
   Weather app (Projects page)
   - Enter a city, press Search
   - Fetch current weather from the UAPI Weather API and show it
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("weatherForm");
  if (!form) return; // not on the projects page

  var cityInput = document.getElementById("weatherCity");
  var listEl = document.getElementById("weatherSuggestions");
  var msgEl = document.getElementById("weatherMessage");
  var cardEl = document.getElementById("weatherCard");
  var iconEl = document.getElementById("weatherIcon");
  var cityEl = document.getElementById("weatherCityName");
  var tempEl = document.getElementById("weatherTemp");
  var condEl = document.getElementById("weatherCond");
  var unitsEl = document.getElementById("weatherUnits");
  var forecastEl = document.getElementById("weatherForecast");

  var API_URL = "https://uapis.cn/api/v1/misc/weather";

  // Bundled real dataset (weather-cities.js is loaded before this script)
  var CITIES = Array.isArray(window.WEATHER_CITIES) ? window.WEATHER_CITIES : [];

  var requestSeq = 0;    // ignores responses from superseded searches
  var controller = null; // aborts the previous in-flight request

  var unit = "C";         // active temperature unit: "C" or "F"
  var lastCelsius = null; // last reading, so switching units is instant
  var lastForecast = [];  // up to 3 upcoming days, in Celsius

  // UAPI returns a numeric weather icon code — map it to a friendly emoji
  var ICON_BY_CODE = {
    "100": "☀️", "150": "🌙",
    "101": "⛅", "102": "⛅", "103": "⛅",
    "104": "☁️", "151": "☁️", "152": "☁️", "153": "☁️",
    "300": "🌦️", "305": "🌦️", "309": "🌦️",
    "301": "🌧️", "306": "🌧️", "307": "🌧️", "308": "🌧️",
    "310": "🌧️", "311": "🌧️", "312": "🌧️", "313": "🌧️",
    "314": "🌧️", "315": "🌧️", "316": "🌧️", "317": "🌧️",
    "318": "🌧️", "350": "🌧️", "351": "🌧️", "399": "🌧️",
    "302": "⛈️", "303": "⛈️", "304": "⛈️",
    "400": "🌨️", "401": "🌨️", "402": "🌨️", "403": "🌨️",
    "404": "🌨️", "405": "🌨️", "406": "🌨️", "407": "🌨️",
    "408": "🌨️", "409": "🌨️", "410": "🌨️", "456": "🌨️",
    "457": "🌨️", "499": "❄️",
    "500": "🌫️", "501": "🌫️", "504": "🌫️", "509": "🌫️",
    "510": "🌫️", "514": "🌫️", "515": "🌫️",
    "502": "😷", "511": "😷", "512": "😷", "513": "😷",
    "503": "🌪️", "507": "🌪️", "508": "🌪️",
    "900": "🥵", "901": "🥶"
  };

  function iconForWeather(code, text) {
    var key = String(code === null || code === undefined ? "" : code).trim();
    if (ICON_BY_CODE[key]) return ICON_BY_CODE[key];

    // Fall back to the condition text when the code is unknown
    var t = String(text || "");
    if (/雷/.test(t)) return "⛈️";
    if (/雪|冰雹/.test(t)) return "🌨️";
    if (/雨/.test(t)) return "🌧️";
    if (/雾/.test(t)) return "🌫️";
    if (/霾|沙|尘/.test(t)) return "😷";
    if (/风|台风/.test(t)) return "💨";
    if (/阴|overcast|cloudy/i.test(t) && !/晴/.test(t)) return "☁️";
    if (/多云|少云|晴间|partly/i.test(t)) return "⛅";
    if (/晴|clear|sun/i.test(t)) return "☀️";
    return "🌡️";
  }

  /* ----- Fuzzy matching over the bundled dataset ------------------------ */
  // Trailing administrative suffixes are dropped so "苏州市" and "Suzhou"
  // collapse to the same key.
  var DROP_SUFFIX = /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|地区|盟|市|县|区|族)$/;

  function normalizeName(value) {
    var s = String(value || "").toLowerCase().trim();
    if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/[\s'’.,()（）\-]/g, "");
    var prev;
    do { prev = s; s = s.replace(DROP_SUFFIX, ""); } while (s !== prev);
    return s;
  }

  function levenshtein(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [];
    var curr = [];
    var i;
    var j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
  }

  // 0..1 similarity; a shared prefix is treated as a strong hint so that
  // incomplete input ("suz") still surfaces the right cities.
  function similarity(query, key) {
    if (!query || !key) return 0;
    if (query === key) return 1;
    var longer = Math.max(query.length, key.length);
    var score = 1 - levenshtein(query, key) / longer;
    if (key.indexOf(query) === 0 || query.indexOf(key) === 0) {
      score = Math.max(score, 0.85);
    }
    return score;
  }

  function entryKeys(entry) {
    return [normalizeName(entry.zh), normalizeName(entry.py), normalizeName(entry.name)]
      .filter(function (k) { return !!k; });
  }

  function scoreEntry(entry, query) {
    var keys = entryKeys(entry);
    var best = 0;
    for (var i = 0; i < keys.length; i++) {
      var s = similarity(query, keys[i]);
      if (s > best) best = s;
    }
    return best;
  }

  function exactMatches(query) {
    return CITIES.filter(function (entry) {
      return entryKeys(entry).indexOf(query) !== -1;
    });
  }

  function rankedMatches(query) {
    var scored = [];
    for (var i = 0; i < CITIES.length; i++) {
      var s = scoreEntry(CITIES[i], query);
      if (s >= 0.55) scored.push({ entry: CITIES[i], score: s });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 8).map(function (item) { return item.entry; });
  }

  /* ----- Suggestion list ------------------------------------------------ */
  function clearSuggestions() {
    listEl.innerHTML = "";
    listEl.hidden = true;
    cityInput.setAttribute("aria-expanded", "false");
  }

  // Secondary line: province/state + country. Chinese cities show 省份, 中国.
  function optionLabel(entry) {
    if (entry.cc === "CN") {
      return (entry.adminZh || entry.admin || "") + ", 中国";
    }
    return [entry.admin, entry.country].filter(function (x) { return !!x; }).join(", ");
  }

  function renderSuggestions(entries) {
    msgEl.hidden = true;
    msgEl.classList.remove("is-error");
    cardEl.hidden = true;
    lastForecast = [];
    renderForecast();

    listEl.innerHTML = "";
    entries.forEach(function (entry, index) {
      var li = document.createElement("li");
      li.setAttribute("role", "presentation");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "weather__suggestion";
      btn.id = "weatherOption" + index;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", "false");
      btn.tabIndex = -1;

      // Primary line: Chinese name + English/pinyin name, e.g. "苏州市 · Suzhou"
      var main = document.createElement("span");
      main.className = "weather__suggestion-main";
      main.textContent = entry.cc === "CN" && entry.fullZh
        ? entry.fullZh + " · " + entry.name
        : entry.name;

      var sub = document.createElement("span");
      sub.className = "weather__suggestion-sub";
      sub.textContent = optionLabel(entry);

      btn.appendChild(main);
      btn.appendChild(sub);
      btn.addEventListener("click", function () { selectCity(entry); });

      li.appendChild(btn);
      listEl.appendChild(li);
    });

    listEl.hidden = false;
    cityInput.setAttribute("aria-expanded", "true");
  }

  function focusOption(index) {
    var opts = listEl.querySelectorAll(".weather__suggestion");
    if (!opts.length) return;
    var i = Math.max(0, Math.min(index, opts.length - 1));
    opts[i].focus();
  }

  listEl.addEventListener("keydown", function (e) {
    var opts = Array.prototype.slice.call(listEl.querySelectorAll(".weather__suggestion"));
    var idx = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusOption(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx <= 0) cityInput.focus();
      else focusOption(idx - 1);
    } else if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (idx >= 0) opts[idx].click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      clearSuggestions();
      cityInput.focus();
    }
  });

  // Arrow keys / Escape work whenever the cursor sits anywhere in the form
  // (the input or the Search button), so the list is reachable by keyboard.
  form.addEventListener("keydown", function (e) {
    if (listEl.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusOption(0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      clearSuggestions();
    }
  });

  // Any edit invalidates older suggestions and pending results.
  cityInput.addEventListener("input", function () {
    clearSuggestions();
    if (controller) {
      controller.abort();
      controller = null;
    }
    requestSeq++;
    msgEl.hidden = true;
    msgEl.classList.remove("is-error");
    cardEl.hidden = true;
    lastForecast = [];
    renderForecast();
  });

  function selectCity(entry) {
    clearSuggestions();
    cityInput.value = entry.cc === "CN" && entry.fullZh ? entry.fullZh : entry.name;
    fetchWeather(entry);
  }

  function showMessage(text, isError) {
    cardEl.hidden = true;
    lastForecast = [];
    renderForecast();
    msgEl.hidden = false;
    msgEl.textContent = text;
    msgEl.classList.toggle("is-error", !!isError);
  }

  /* ----- Temperature unit (°C / °F) -------------------------------------- */
  // The API returns Celsius; switching units recomputes from the stored
  // readings so both the current temperature and the forecast update
  // instantly without another request.
  function convertTemp(celsius) {
    if (celsius === null || !isFinite(celsius)) return null;
    return unit === "F" ? celsius * 9 / 5 + 32 : celsius;
  }

  function formatTemp(celsius) {
    var value = convertTemp(celsius);
    if (value === null) return "—";
    return Math.round(value) + (unit === "F" ? "°F" : "°C");
  }

  function renderTemp() {
    tempEl.textContent = formatTemp(lastCelsius);
  }

  /* ----- 3-day forecast -------------------------------------------------- */
  // Each cell shows the weekday, a short date, an icon and the high/low.
  function renderForecast() {
    if (!forecastEl) return;
    forecastEl.innerHTML = "";

    if (!lastForecast.length) {
      forecastEl.hidden = true;
      return;
    }

    lastForecast.forEach(function (day) {
      var cell = document.createElement("div");
      cell.className = "weather__day";

      var name = document.createElement("span");
      name.className = "weather__day-name";
      name.textContent = day.week || "";

      var date = document.createElement("span");
      date.className = "weather__day-date";
      date.textContent = day.date || "";

      var icon = document.createElement("span");
      icon.className = "weather__day-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = iconForWeather(null, day.weather);

      var range = document.createElement("span");
      range.className = "weather__day-range";
      range.textContent = formatTemp(day.max) + " / ";
      var min = document.createElement("span");
      min.className = "weather__day-min";
      min.textContent = formatTemp(day.min);
      range.appendChild(min);

      cell.appendChild(name);
      cell.appendChild(date);
      cell.appendChild(icon);
      cell.appendChild(range);
      forecastEl.appendChild(cell);
    });

    forecastEl.hidden = false;
  }

  if (unitsEl) {
    unitsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".weather__unit-btn");
      if (!btn) return;
      var next = btn.dataset.unit;
      if (next !== "C" && next !== "F") return;

      unit = next;
      unitsEl.querySelectorAll(".weather__unit-btn").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      renderTemp();     // update the current number and unit label
      renderForecast(); // and the forecast highs/lows, immediately
    });
  }

  function showWeather(data, entry) {
    msgEl.hidden = true;
    msgEl.classList.remove("is-error");

    var name = data.city || (entry ? entry.name : "") || "";
    var region = data.province || (entry ? entry.admin : "") || "";
    cityEl.textContent = region && region !== name ? name + " · " + region : name;

    var temp = Number(data.temperature);
    lastCelsius = isFinite(temp) ? temp : null;
    renderTemp();
    condEl.textContent = data.weather || "";
    iconEl.textContent = iconForWeather(data.weather_icon, data.weather);

    // Upcoming days from the same response (the API returns them as Celsius)
    var days = Array.isArray(data.forecast) ? data.forecast.slice(0, 3) : [];
    lastForecast = days.map(function (d) {
      return {
        week: d.week || "",
        date: String(d.date || "").slice(5), // "2026-10-16" → "10-16"
        weather: d.weather_day || "",
        max: Number(d.temp_max),
        min: Number(d.temp_min)
      };
    });
    renderForecast();

    cardEl.hidden = false;
  }

  /* ----- Fetching ------------------------------------------------------- */
  // Resolves to the parsed JSON, `null` for "not found" (400/404), or throws
  // for a genuine service failure (5xx / network / unreadable response).
  async function requestJson(url, signal) {
    var res = await fetch(url, { signal: signal });
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) {
      var err = new Error("weather service error");
      err.service = true;
      throw err;
    }
    try {
      return await res.json();
    } catch (parseErr) {
      var err2 = new Error("weather service error");
      err2.service = true;
      throw err2;
    }
  }

  async function fetchWeather(entry) {
    var seq = ++requestSeq;
    if (controller) controller.abort();
    controller = new AbortController();

    showMessage("Loading…", false);
    cardEl.hidden = true;

    var url = entry.adcode
      ? API_URL + "?adcode=" + encodeURIComponent(entry.adcode) + "&forecast=true"
      : API_URL + "?city=" + encodeURIComponent(entry.name) + "&forecast=true";

    try {
      var data = await requestJson(url, controller.signal);
      if (seq !== requestSeq) return;

      // adcode lookup failed → retry once with the Chinese name
      if ((!data || !data.city) && entry.adcode && entry.zh) {
        data = await requestJson(
          API_URL + "?city=" + encodeURIComponent(entry.zh) + "&forecast=true",
          controller.signal
        );
        if (seq !== requestSeq) return;
      }

      if (!data || !data.city) {
        showMessage("Couldn’t find that city — check the spelling.", true);
        return;
      }
      showWeather(data, entry);
    } catch (err) {
      if (seq !== requestSeq) return;
      if (err && err.name === "AbortError") return;
      showMessage("Couldn’t reach the weather service. Please try again.", true);
    }
  }

  function runSearch(raw) {
    var query = normalizeName(raw);
    if (!query) {
      clearSuggestions();
      showMessage("Enter a city first.", true);
      return; // empty input → no API call
    }

    var exact = exactMatches(query);
    if (exact.length === 1) {
      clearSuggestions();
      fetchWeather(exact[0]); // unambiguous → straight to the weather
      return;
    }

    var list = exact.length > 1 ? exact : rankedMatches(query);
    if (!list.length) {
      clearSuggestions();
      showMessage("Couldn’t find that city — check the spelling.", true);
      return; // decided locally → no API call
    }
    renderSuggestions(list); // several cities match → never auto-choose
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    runSearch(cityInput.value);
  });
})();

/* ==========================================================================
   World Time app (Projects page)
   - Look up a city's current time via the UAPI World Time API
   - Then tick locally so the clock stays live without extra requests
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("worldtimeForm");
  if (!form) return; // not on the projects page

  var cityInput = document.getElementById("worldtimeCity");
  var presetsEl = document.getElementById("worldtimePresets");
  var msgEl = document.getElementById("worldtimeMessage");
  var cardEl = document.getElementById("worldtimeCard");
  var cityEl = document.getElementById("worldtimeCityName");
  var clockEl = document.getElementById("worldtimeClock");
  var metaEl = document.getElementById("worldtimeMeta");

  var API_URL = "https://uapis.cn/api/v1/misc/worldtime";

  // Bundled real city dataset (weather-cities.js is loaded before this script)
  var CITIES = Array.isArray(window.WEATHER_CITIES) ? window.WEATHER_CITIES : [];

  var requestSeq = 0;    // ignores responses from superseded lookups
  var controller = null; // aborts the previous in-flight request
  var timerId = null;    // 1s interval driving the live clock

  // Anchor for the local clock: the server's UTC time at fetch, plus how long
  // ago we received it, plus the city's offset from UTC.
  var anchorServerMs = null;
  var anchorLocalMs = null;
  var offsetMs = 0;
  var tzLabel = "";

  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // The API keys cities by a no-space, lower-case name ("New York" → "newyork")
  function queryKey(raw) {
    return String(raw || "").trim().toLowerCase().replace(/[\s'’._\-]/g, "");
  }

  // "America/New_York" → "New York"
  function cityFromTimezone(tz) {
    var part = String(tz || "").split("/").pop() || "";
    return part.replace(/_/g, " ").trim();
  }

  // Major world cities in both Chinese and English, each with its IANA timezone.
  // The API accepts an IANA zone ID as the `city` parameter, so any of these
  // can be looked up in either language. Chinese cities (from the bundled
  // dataset) are handled separately, since all of China shares Asia/Shanghai.
  var WORLD_TZ = [
    { zh: "东京", en: "Tokyo", tz: "Asia/Tokyo" },
    { zh: "大阪", en: "Osaka", tz: "Asia/Tokyo" },
    { zh: "首尔", en: "Seoul", tz: "Asia/Seoul" },
    { zh: "釜山", en: "Busan", tz: "Asia/Seoul" },
    { zh: "新加坡", en: "Singapore", tz: "Asia/Singapore" },
    { zh: "曼谷", en: "Bangkok", tz: "Asia/Bangkok" },
    { zh: "雅加达", en: "Jakarta", tz: "Asia/Jakarta" },
    { zh: "吉隆坡", en: "Kuala Lumpur", tz: "Asia/Kuala_Lumpur" },
    { zh: "马尼拉", en: "Manila", tz: "Asia/Manila" },
    { zh: "河内", en: "Hanoi", tz: "Asia/Ho_Chi_Minh" },
    { zh: "胡志明市", en: "Ho Chi Minh City", tz: "Asia/Ho_Chi_Minh" },
    { zh: "新德里", en: "New Delhi", tz: "Asia/Kolkata" },
    { zh: "孟买", en: "Mumbai", tz: "Asia/Kolkata" },
    { zh: "迪拜", en: "Dubai", tz: "Asia/Dubai" },
    { zh: "台北", en: "Taipei", tz: "Asia/Taipei" },
    { zh: "香港", en: "Hong Kong", tz: "Asia/Hong_Kong" },
    { zh: "澳门", en: "Macau", tz: "Asia/Macau" },
    { zh: "利雅得", en: "Riyadh", tz: "Asia/Riyadh" },
    { zh: "德黑兰", en: "Tehran", tz: "Asia/Tehran" },
    { zh: "卡拉奇", en: "Karachi", tz: "Asia/Karachi" },
    { zh: "达卡", en: "Dhaka", tz: "Asia/Dhaka" },
    { zh: "加德满都", en: "Kathmandu", tz: "Asia/Kathmandu" },
    { zh: "伦敦", en: "London", tz: "Europe/London" },
    { zh: "巴黎", en: "Paris", tz: "Europe/Paris" },
    { zh: "柏林", en: "Berlin", tz: "Europe/Berlin" },
    { zh: "慕尼黑", en: "Munich", tz: "Europe/Berlin" },
    { zh: "罗马", en: "Rome", tz: "Europe/Rome" },
    { zh: "米兰", en: "Milan", tz: "Europe/Rome" },
    { zh: "马德里", en: "Madrid", tz: "Europe/Madrid" },
    { zh: "巴塞罗那", en: "Barcelona", tz: "Europe/Madrid" },
    { zh: "阿姆斯特丹", en: "Amsterdam", tz: "Europe/Amsterdam" },
    { zh: "布鲁塞尔", en: "Brussels", tz: "Europe/Brussels" },
    { zh: "维也纳", en: "Vienna", tz: "Europe/Vienna" },
    { zh: "布拉格", en: "Prague", tz: "Europe/Prague" },
    { zh: "布达佩斯", en: "Budapest", tz: "Europe/Budapest" },
    { zh: "华沙", en: "Warsaw", tz: "Europe/Warsaw" },
    { zh: "斯德哥尔摩", en: "Stockholm", tz: "Europe/Stockholm" },
    { zh: "奥斯陆", en: "Oslo", tz: "Europe/Oslo" },
    { zh: "哥本哈根", en: "Copenhagen", tz: "Europe/Copenhagen" },
    { zh: "赫尔辛基", en: "Helsinki", tz: "Europe/Helsinki" },
    { zh: "都柏林", en: "Dublin", tz: "Europe/Dublin" },
    { zh: "里斯本", en: "Lisbon", tz: "Europe/Lisbon" },
    { zh: "雅典", en: "Athens", tz: "Europe/Athens" },
    { zh: "苏黎世", en: "Zurich", tz: "Europe/Zurich" },
    { zh: "日内瓦", en: "Geneva", tz: "Europe/Zurich" },
    { zh: "莫斯科", en: "Moscow", tz: "Europe/Moscow" },
    { zh: "圣彼得堡", en: "Saint Petersburg", tz: "Europe/Moscow" },
    { zh: "伊斯坦布尔", en: "Istanbul", tz: "Europe/Istanbul" },
    { zh: "纽约", en: "New York", tz: "America/New_York" },
    { zh: "华盛顿", en: "Washington", tz: "America/New_York" },
    { zh: "波士顿", en: "Boston", tz: "America/New_York" },
    { zh: "迈阿密", en: "Miami", tz: "America/New_York" },
    { zh: "洛杉矶", en: "Los Angeles", tz: "America/Los_Angeles" },
    { zh: "旧金山", en: "San Francisco", tz: "America/Los_Angeles" },
    { zh: "西雅图", en: "Seattle", tz: "America/Los_Angeles" },
    { zh: "拉斯维加斯", en: "Las Vegas", tz: "America/Los_Angeles" },
    { zh: "芝加哥", en: "Chicago", tz: "America/Chicago" },
    { zh: "休斯顿", en: "Houston", tz: "America/Chicago" },
    { zh: "多伦多", en: "Toronto", tz: "America/Toronto" },
    { zh: "蒙特利尔", en: "Montreal", tz: "America/Toronto" },
    { zh: "温哥华", en: "Vancouver", tz: "America/Vancouver" },
    { zh: "墨西哥城", en: "Mexico City", tz: "America/Mexico_City" },
    { zh: "圣保罗", en: "Sao Paulo", tz: "America/Sao_Paulo" },
    { zh: "里约热内卢", en: "Rio de Janeiro", tz: "America/Sao_Paulo" },
    { zh: "布宜诺斯艾利斯", en: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },
    { zh: "利马", en: "Lima", tz: "America/Lima" },
    { zh: "波哥大", en: "Bogota", tz: "America/Bogota" },
    { zh: "圣地亚哥", en: "Santiago", tz: "America/Santiago" },
    { zh: "悉尼", en: "Sydney", tz: "Australia/Sydney" },
    { zh: "墨尔本", en: "Melbourne", tz: "Australia/Melbourne" },
    { zh: "布里斯班", en: "Brisbane", tz: "Australia/Brisbane" },
    { zh: "珀斯", en: "Perth", tz: "Australia/Perth" },
    { zh: "奥克兰", en: "Auckland", tz: "Pacific/Auckland" },
    { zh: "惠灵顿", en: "Wellington", tz: "Pacific/Auckland" },
    { zh: "檀香山", en: "Honolulu", tz: "Pacific/Honolulu" },
    { zh: "开罗", en: "Cairo", tz: "Africa/Cairo" },
    { zh: "约翰内斯堡", en: "Johannesburg", tz: "Africa/Johannesburg" },
    { zh: "开普敦", en: "Cape Town", tz: "Africa/Johannesburg" },
    { zh: "内罗毕", en: "Nairobi", tz: "Africa/Nairobi" },
    { zh: "卡萨布兰卡", en: "Casablanca", tz: "Africa/Casablanca" },
    { zh: "拉各斯", en: "Lagos", tz: "Africa/Lagos" }
  ];

  // Trailing administrative suffixes are dropped so "广州市" and "Guangzhou"
  // collapse to the same key (same rule as the weather app).
  var DROP_SUFFIX = /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|地区|盟|市|县|区|族)$/;

  function norm(value) {
    var s = String(value || "").toLowerCase().trim();
    if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/[\s'’.,()（）\-]/g, "");
    var prev;
    do { prev = s; s = s.replace(DROP_SUFFIX, ""); } while (s !== prev);
    return s;
  }

  // Turn any user input (Chinese, pinyin or English) into an API `city` value
  // plus an optional friendly display name. Returns null for empty input.
  function resolveTarget(raw) {
    var s = String(raw || "").trim();
    if (!s) return null;

    // A full IANA zone ID (e.g. "Asia/Seoul") is passed through as-is
    if (s.indexOf("/") !== -1) {
      return { query: s, display: cityFromTimezone(s) };
    }

    var n = norm(s);
    if (!n) return null;

    // 1. Curated bilingual table of major world cities
    for (var i = 0; i < WORLD_TZ.length; i++) {
      var w = WORLD_TZ[i];
      if (norm(w.zh) === n || norm(w.en) === n) {
        return { query: w.tz, display: w.zh + " · " + w.en };
      }
    }

    // 2. Bundled dataset — every Chinese city shares China Standard Time
    for (var j = 0; j < CITIES.length; j++) {
      var c = CITIES[j];
      if (norm(c.zh) === n || norm(c.fullZh) === n || norm(c.py) === n || norm(c.name) === n) {
        if (c.cc === "CN") {
          return { query: "Asia/Shanghai", display: (c.fullZh || c.zh) + " · " + c.name };
        }
        return { query: queryKey(c.name), display: null };
      }
    }

    // 3. Fall back to the API's own no-space city key (e.g. "Shanghai")
    return { query: queryKey(s), display: null };
  }

  function formatOffset(ms) {
    var totalMin = Math.round(ms / 60000);
    var sign = totalMin < 0 ? "-" : "+";
    totalMin = Math.abs(totalMin);
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return "UTC" + sign + h + (m ? ":" + pad(m) : "");
  }

  function stopClock() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function renderClock() {
    if (anchorServerMs === null) return;
    var localMs = anchorServerMs + (Date.now() - anchorLocalMs) + offsetMs;
    var d = new Date(localMs);
    clockEl.textContent =
      pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
    metaEl.textContent =
      (tzLabel ? tzLabel + " · " : "") +
      WEEKDAYS[d.getUTCDay()] + " · " +
      d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " · " +
      formatOffset(offsetMs);
  }

  function showMessage(text, isError) {
    stopClock();
    cardEl.hidden = true;
    msgEl.hidden = false;
    msgEl.textContent = text;
    msgEl.classList.toggle("is-error", !!isError);
  }

  function showTime(data, display) {
    var offset = Number(data.offset_seconds);
    offsetMs = isFinite(offset) ? offset * 1000 : 0;

    var serverUnix = Number(data.timestamp_unix);
    anchorLocalMs = Date.now();
    anchorServerMs = isFinite(serverUnix) ? serverUnix * 1000 : anchorLocalMs;

    tzLabel = data.timezone || "";
    cityEl.textContent = display || cityFromTimezone(data.timezone) || data.query || "";

    msgEl.hidden = true;
    msgEl.classList.remove("is-error");
    cardEl.hidden = false;

    stopClock();
    renderClock();
    timerId = setInterval(renderClock, 1000); // keep the clock ticking locally
  }

  // Resolves to the parsed JSON, `null` for "not found" (400/404), or throws
  // for a genuine service failure (5xx / network / unreadable response).
  async function requestJson(url, signal) {
    var res = await fetch(url, { signal: signal });
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) {
      var err = new Error("world time service error");
      err.service = true;
      throw err;
    }
    try {
      return await res.json();
    } catch (parseErr) {
      var err2 = new Error("world time service error");
      err2.service = true;
      throw err2;
    }
  }

  async function fetchTime(raw) {
    var target = resolveTarget(raw);
    if (!target) {
      showMessage("Enter a city first.", true);
      return; // empty input → no API call
    }

    var seq = ++requestSeq;
    if (controller) controller.abort();
    controller = new AbortController();

    showMessage("Loading…", false);

    try {
      var data = await requestJson(
        API_URL + "?city=" + encodeURIComponent(target.query),
        controller.signal
      );
      if (seq !== requestSeq) return;
      if (!data || !data.timezone) {
        showMessage("Couldn’t find that city — try a city name or an IANA timezone like Asia/Tokyo.", true);
        return;
      }
      showTime(data, target.display);
    } catch (err) {
      if (seq !== requestSeq) return;
      if (err && err.name === "AbortError") return;
      showMessage("Couldn’t reach the time service. Please try again.", true);
    }
  }

  // Editing the input invalidates any in-flight lookup and clears the message,
  // but the current clock keeps ticking until a new search replaces it.
  cityInput.addEventListener("input", function () {
    if (controller) {
      controller.abort();
      controller = null;
    }
    requestSeq++;
    msgEl.hidden = true;
    msgEl.classList.remove("is-error");
  });

  if (presetsEl) {
    presetsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".worldtime__preset");
      if (!btn) return;
      cityInput.value = btn.textContent.trim();
      fetchTime(btn.dataset.city || btn.textContent);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    fetchTime(cityInput.value);
  });
})();
