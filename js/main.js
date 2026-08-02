/* ==========================================================================
   GILL AUTO GLASS. main.js
   Sections: CONFIG · helpers · nav · scroll reveals · wizard · chatbot ·
             back-to-top · deferred 3D hero loader
   No build tools; GSAP + ScrollTrigger loaded from CDN (deferred).

   PRIVACY: this script sets NO cookies and uses NO storage (no
   localStorage/sessionStorage), no analytics, no tracking, which is why the
   site needs no cookie consent banner. The chatbot is rule-based and runs
   entirely in the browser; nothing typed into it is recorded or transmitted.
   ========================================================================== */

/* --------------------------------------------------------------------------
   EDIT BUSINESS INFO HERE
   One place for every business fact used by the scripts (mailto, chatbot,
   tel/sms links). The same facts appear as visible text in index.html;
   if a fact changes, update it here AND find-replace it in index.html.
   -------------------------------------------------------------------------- */
const CONFIG = {
  businessName: "Gill Auto Glass",
  legalName: "Gill Auto Glass Ltd.",
  phoneDisplay: "306-914-8760",
  phoneE164: "+13069148760",          // used for tel: and sms: links
  email: "gillautoglassyxe@gmail.com",
  address: "418C 47th Street E, Saskatoon SK",
  // HOURS live here and ONLY here. Every visible mention, the chatbot, and the
  // LocalBusiness schema are generated from this on page load. Edit here only.
  hours: {
    // Human-readable lines (rendered in footer + contact)
    lines: [
      { days: "Monday to Friday", time: "9 AM to 6 PM" },
      { days: "Saturday", time: "10 AM to 3 PM" },
      { days: "Sunday", time: "Closed" }
    ],
    // One-line summary for the chatbot
    summary: "Monday to Friday 9 AM to 6 PM, Saturday 10 AM to 3 PM, Sunday closed",
    // Machine hours for JSON-LD openingHoursSpecification (24h clock)
    schema: [
      { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
      { days: ["Saturday"], opens: "10:00", closes: "15:00" }
    ]
  },
  serviceArea: "Saskatoon and surrounding areas",
  domain: "gillautoglassyxe.ca",
  mapsUrl: "https://maps.app.goo.gl/jPs7yCjwYFLKRCR47",
  responsePromise: "Free quotes same-day or as soon as possible. Call or text anytime for a time estimate.",
  googleReviewUrl: "https://share.google/PiUqJ9A77EirJnChJ",
  facebookUrl: "https://www.facebook.com/profile.php?id=61591856556349",
  // TODO: replace # with real Instagram / X profile URLs.
  instagramUrl: "#",
  xUrl: "#"
};

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ------------------------------------------------------------------------
     CONFIG → DOM: keep every tel:/sms:/mailto: link in sync with CONFIG
     ------------------------------------------------------------------------ */
  $$('a[href^="tel:"]').forEach((a) => { a.href = "tel:" + CONFIG.phoneE164; });
  $$('a[href^="sms:"]').forEach((a) => { a.href = "sms:" + CONFIG.phoneE164; });
  $$('a[href^="mailto:"]').forEach((a) => { a.href = "mailto:" + CONFIG.email; });
  // External links carried in CONFIG (maps, Google reviews, socials)
  const linkMap = { maps: CONFIG.mapsUrl, reviews: CONFIG.googleReviewUrl, facebook: CONFIG.facebookUrl };
  $$("[data-link]").forEach((a) => {
    const url = linkMap[a.dataset.link];
    if (url) a.href = url;
  });
  const yearEl = $("#footerYear");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Hide the SGI logo badge if the image is missing (replaces an inline
  // onerror handler, so the CSP script-src needs no 'unsafe-inline').
  const sgiLogo = $("#sgiLogo");
  if (sgiLogo) {
    const hideBadge = () => { const li = sgiLogo.closest("li"); if (li) li.hidden = true; };
    sgiLogo.addEventListener("error", hideBadge);
    if (sgiLogo.complete && sgiLogo.naturalWidth === 0) hideBadge(); // already failed before JS ran
  }

  /* ------------------------------------------------------------------------
     HOURS: render from CONFIG.hours into every [data-hours] element, and
     patch the LocalBusiness JSON-LD so CONFIG is the single source of truth.
     ------------------------------------------------------------------------ */
  (function renderHours() {
    const linesHtml = CONFIG.hours.lines
      .map((l) => '<span class="hours-day">' + l.days + '</span><span class="hours-time">' + l.time + "</span>")
      .join("");
    $$("[data-hours]").forEach((el) => {
      if (el.dataset.hours === "summary") {
        el.textContent = CONFIG.hours.summary;
      } else {
        el.innerHTML = linesHtml;
      }
    });

    // Rewrite openingHoursSpecification in the LocalBusiness JSON-LD block.
    const spec = CONFIG.hours.schema.map((s) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: s.days, opens: s.opens, closes: s.closes
    }));
    $$('script[type="application/ld+json"]').forEach((node) => {
      try {
        const data = JSON.parse(node.textContent);
        if (data && /AutoRepair|LocalBusiness/.test(data["@type"] || "")) {
          data.openingHoursSpecification = spec;
          node.textContent = JSON.stringify(data);
        }
      } catch (err) { /* leave static JSON-LD as-is on parse error */ }
    });
  })();

  /* ------------------------------------------------------------------------
     FAQ deep-links: opening a <details> FAQ item when jumped to via #anchor
     (e.g. the "Can't find your VIN?" link in the quote wizard).
     ------------------------------------------------------------------------ */
  function openFaqTarget(hash) {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el && el.tagName === "DETAILS") {
      el.open = true;
      // Let the browser settle the anchor jump, then nudge it clear of the nav.
      window.setTimeout(() => el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" }), 30);
      // Briefly outline it so the answer is obvious after the jump.
      el.classList.add("faq-flash");
      window.setTimeout(() => el.classList.remove("faq-flash"), 1600);
    }
  }
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#faq-"]');
    if (link) openFaqTarget(link.getAttribute("href"));
  });
  window.addEventListener("hashchange", () => openFaqTarget(window.location.hash));
  if (window.location.hash.indexOf("#faq-") === 0) openFaqTarget(window.location.hash);

  /* ------------------------------------------------------------------------
     NAV: mobile toggle + close-on-navigate
     ------------------------------------------------------------------------ */
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");

  function closeNav() {
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navLinks.classList.contains("is-open")) closeNav();
  });

  /* ------------------------------------------------------------------------
     SCROLL REVEALS (GSAP ScrollTrigger; skipped under reduced motion)
     ------------------------------------------------------------------------ */
  function initReveals() {
    if (prefersReducedMotion) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.batch(".reveal", {
      start: "top 88%",
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.08, overwrite: true }
        );
      }
    });
    // Elements already in view on load reveal immediately via the same batch.

    // Lazy images can nudge layout as they decode, so keep trigger positions fresh.
    $$('img[loading="lazy"]').forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
      }
    });
  }

  /* ------------------------------------------------------------------------
     QUOTE WIZARD (3 steps → mailto)
     TODO: swap buildMailto()/submit for Formspree or Netlify Forms later.
     ------------------------------------------------------------------------ */
  const wizard = $("#quoteWizard");

  function wizardStepEls() { return $$(".wizard-step", wizard); }

  function radioValue(name) {
    const el = wizard.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function showWizardStep(n) {
    wizardStepEls().forEach((fs) => {
      const active = Number(fs.dataset.step) === n;
      fs.hidden = !active;
      fs.classList.toggle("is-active", active);
    });
    $$(".wp-step", wizard).forEach((li) => {
      const num = Number(li.dataset.wp);
      li.classList.toggle("is-active", num === n);
      li.classList.toggle("is-done", num < n);
    });
    const labels = { 1: "Your vehicle", 2: "The glass", 3: "How do we reach you" };
    $("#wizardStepAnnounce").textContent = "Step " + n + " of 3: " + labels[n];
    // Move focus to the step heading for keyboard/screen-reader users.
    const legend = wizard.querySelector('.wizard-step[data-step="' + n + '"] legend');
    if (legend) {
      legend.setAttribute("tabindex", "-1");
      legend.focus({ preventScroll: false });
    }
  }

  function setStepError(n, show) {
    const err = wizard.querySelector('[data-error-for="' + n + '"]');
    if (err) err.hidden = !show;
  }

  function validateStep(n) {
    if (n === 1) {
      const ok = ["#wzYear", "#wzMake", "#wzModel"].every((id) => $(id).value.trim() !== "");
      setStepError(1, !ok);
      return ok;
    }
    if (n === 2) {
      const ok = radioValue("glass") !== "";
      setStepError(2, !ok);
      return ok;
    }
    if (n === 3) {
      // Require a name plus at least one way to reach them (phone OR email).
      const hasName = $("#wzName").value.trim() !== "";
      const hasContact = $("#wzPhone").value.trim() !== "" || $("#wzEmail").value.trim() !== "";
      const ok = hasName && hasContact;
      setStepError(3, !ok);
      return ok;
    }
    return true;
  }

  wizard.addEventListener("click", (e) => {
    const nextBtn = e.target.closest("[data-next]");
    const backBtn = e.target.closest("[data-back]");
    if (nextBtn) {
      const current = Number(nextBtn.dataset.next) - 1;
      if (validateStep(current)) showWizardStep(Number(nextBtn.dataset.next));
    } else if (backBtn) {
      showWizardStep(Number(backBtn.dataset.back));
    }
  });

  // Single source of the answers, keyed by the label used in the email body.
  function collectAnswers() {
    const v = (id) => $(id).value.trim();
    return {
      "Year": v("#wzYear"),
      "Make": v("#wzMake"),
      "Model": v("#wzModel"),
      "Type": $("#wzType").value,
      "VIN": v("#wzVin"),
      "Glass needed": radioValue("glass"),
      "Camera / sensors near mirror (possible ADAS)": radioValue("adas"),
      "Mobile or in-shop": radioValue("serviceLocation"),
      "Name": v("#wzName"),
      "Phone": v("#wzPhone"),
      "Email": v("#wzEmail"),
      "Preferred contact": radioValue("preferredContact"),
      "Going through SGI": radioValue("sgiClaim"),
      "Message": v("#wzMessage")
    };
  }

  function quoteSubject() {
    const a = collectAnswers();
    const vehicle = [a.Year, a.Make, a.Model].filter(Boolean).join(" ");
    return "Free quote request for " + vehicle + " (" + (a["Glass needed"] || "glass") + ")";
  }

  function buildMailto() {
    const a = collectAnswers();
    const line = (label) => label + ": " + (a[label] || "n/a");
    const body = [
      "Quote request from " + CONFIG.domain, "",
      "VEHICLE",
      line("Year"), line("Make"), line("Model"), line("Type"), line("VIN"), "",
      "GLASS",
      line("Glass needed"), line("Camera / sensors near mirror (possible ADAS)"), line("Mobile or in-shop"), "",
      "CONTACT",
      line("Name"), line("Phone"), line("Email"), line("Preferred contact"), line("Going through SGI"), line("Message")
    ].join("\n");
    return "mailto:" + CONFIG.email +
      "?subject=" + encodeURIComponent(quoteSubject()) +
      "&body=" + encodeURIComponent(body);
  }

  // Exposed for automated tests (harmless in production).
  window.__gagBuildMailto = buildMailto;

  function showWizardSuccess(title, body) {
    wizardStepEls().forEach((fs) => { fs.hidden = true; });
    $$(".wp-step", wizard).forEach((li) => li.classList.add("is-done"));
    if (title) $("#wizardSuccessTitle").textContent = title;
    if (body) $("#wizardSuccessBody").innerHTML = body;
    const success = $("#wizardSuccess");
    success.hidden = false;
    success.focus();
  }

  // Fallback: open the visitor's mail app with everything pre-filled.
  function sendViaMailto() {
    showWizardSuccess(
      "Request ready: check your email app",
      "Your pre-filled quote request just opened in your mail app. Hit send and we'll get back to " +
      "you <strong>same-day or as soon as possible</strong>."
    );
    window.location.href = buildMailto();
  }

  wizard.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    const submitBtn = wizard.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

    // Primary path: POST to Netlify Forms (captured server-side, emailed to the
    // shop). Set the notification subject, then serialise the form's own fields.
    const subjectField = $("#wzSubject");
    if (subjectField) subjectField.value = quoteSubject();
    const fd = new FormData(wizard);
    const encoded = new URLSearchParams();
    fd.forEach((value, key) => { encoded.append(key, value); });

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encoded.toString()
    })
      .then((res) => {
        if (!res.ok) throw new Error("Form POST failed: " + res.status);
        showWizardSuccess(
          "Thanks, your request is in",
          "We've got your quote request and we'll get back to you " +
          "<strong>same-day or as soon as possible</strong> with a free quote."
        );
      })
      .catch(() => {
        // Not on Netlify (e.g. local/preview) or offline: fall back to mailto so
        // the request still reaches the shop.
        sendViaMailto();
      })
      .finally(() => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Send My Quote Request"; }
      });
  });

  $("#wizardRestart").addEventListener("click", () => {
    wizard.reset();
    $("#wizardSuccess").hidden = true;
    $$(".wp-step", wizard).forEach((li) => li.classList.remove("is-done", "is-active"));
    showWizardStep(1);
  });

  /* ------------------------------------------------------------------------
     BACK TO TOP (instant jump, appears after one screen)
     ------------------------------------------------------------------------ */
  const backToTop = $("#backToTop");
  let bttVisible = false;
  function updateBtt() {
    const show = window.scrollY > window.innerHeight;
    if (show !== bttVisible) {
      bttVisible = show;
      backToTop.hidden = !show;
    }
  }
  window.addEventListener("scroll", updateBtt, { passive: true });
  updateBtt();
  backToTop.addEventListener("click", () => {
    // behavior: "instant" overrides the page's CSS scroll-behavior: smooth.
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (err) {
      window.scrollTo(0, 0);
    }
  });

  /* ------------------------------------------------------------------------
     CHATBOT: rule-based keyword answers, no external API
     ------------------------------------------------------------------------ */
  const botRules = [
    {
      keys: ["hour", "open", "close", "when are you", "what time"],
      answer: "Our hours: " + CONFIG.hours.summary + ". " + CONFIG.responsePromise
    },
    {
      keys: ["where", "location", "address", "find you", "directions"],
      answer: "We're at " + CONFIG.address + ". Map: " + CONFIG.mapsUrl
    },
    {
      keys: ["mobile", "come to", "at my", "my house", "my work", "driveway", "on site", "on-site"],
      answer: "Yes, mobile service is one of our specialties. We come to you across " + CONFIG.serviceArea + ": home, work, wherever the vehicle is parked with room to work."
    },
    {
      keys: ["sgi", "claim", "insurance", "deductible", "auto pak", "autopak", "coverage"],
      answer: "We're SGI accredited for glass, so we handle SGI claims directly. Paperwork and billing included. Your deductible depends on your coverage (an Auto Pak can lower it). Bring your plate number and policy info and we'll take it from there."
    },
    {
      keys: ["adas", "calibrat", "camera", "sensor", "lane", "braking"],
      answer: "ADAS calibration re-aims the safety cameras (lane assist, automatic braking) that often sit behind your windshield. Many newer vehicles need it after a windshield replacement, and we do it in-shop or at your location, anywhere in " + CONFIG.serviceArea + ", same visit."
    },
    {
      keys: ["quote", "price", "cost", "how much", "estimate"],
      answer: "Quotes are free, same-day or as soon as possible. Fastest routes: the 3-step wizard on this page (tap Free Quote), or text a photo of the damage to " + CONFIG.phoneDisplay + "."
    },
    {
      keys: ["drive", "how long", "cure", "wait", "ready"],
      answer: "After a windshield replacement, safe drive-away is usually 30–60 minutes, longer in the cold. We confirm the exact time for your vehicle before you go."
    },
    {
      keys: ["chip", "crack", "stone", "rock"],
      answer: "Chips smaller than a quarter (away from edges and your sightline) can usually be repaired in under an hour, often $0 through SGI. Long cracks usually mean replacement. Text a photo to " + CONFIG.phoneDisplay + " and we'll tell you which."
    },
    {
      keys: ["service", "what do you", "offer", "aquapel", "door", "back window", "tint", "windshield"],
      answer: "We do windshield replacement, door glass, back windows, stone chip repair, ADAS calibration, Aquapel rain-repellent treatment, and SGI glass claims handled directly. Glass is all we do."
    },
    {
      keys: ["phone", "call", "text", "contact", "email", "reach"],
      answer: "Call or text " + CONFIG.phoneDisplay + " (texts welcome, we get it, phone calls aren't for everyone), or email " + CONFIG.email + "."
    },
    {
      keys: ["thank", "thanks"],
      answer: "Anytime! If you need anything else, " + CONFIG.phoneDisplay + ". Call or text."
    }
  ];
  const botFallback =
    "I'm a simple helper. Try asking about hours, location, mobile service, SGI claims, ADAS, chip repair, or quotes. " +
    "For anything else, call or text " + CONFIG.phoneDisplay + " and a human will sort you out.";
  const botGreeting =
    "Hi! Quick answers about " + CONFIG.businessName + ": hours, mobile service, SGI claims, ADAS, quotes. What do you need?";
  const botChips = ["Hours", "Mobile service", "SGI claims", "ADAS", "Free quote"];

  const chatbotLauncher = $("#chatbotLauncher");
  const chatbotPanel = $("#chatbotPanel");
  const chatbotClose = $("#chatbotClose");
  const chatbotMessages = $("#chatbotMessages");
  const chatbotChips = $("#chatbotChips");
  const chatbotForm = $("#chatbotForm");
  const chatbotText = $("#chatbotText");
  let chatStarted = false;

  function addChatMessage(text, who) {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg-" + who;
    // Split on line breaks; render URLs in bot messages as links.
    text.split("\n").forEach((lineText) => {
      const p = document.createElement("p");
      lineText.split(/(https?:\/\/\S+)/).forEach((part) => {
        if (/^https?:\/\//.test(part)) {
          const a = document.createElement("a");
          a.href = part;
          a.textContent = "open map";
          a.target = "_blank";
          a.rel = "noopener";
          p.appendChild(a);
        } else if (part) {
          p.appendChild(document.createTextNode(part));
        }
      });
      div.appendChild(p);
    });
    chatbotMessages.appendChild(div);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function botAnswer(raw) {
    const q = raw.toLowerCase();
    const rule = botRules.find((r) => r.keys.some((k) => q.includes(k)));
    return rule ? rule.answer : botFallback;
  }

  function askBot(question) {
    addChatMessage(question, "user");
    window.setTimeout(() => addChatMessage(botAnswer(question), "bot"), 250);
  }

  function openChatbot() {
    chatbotPanel.hidden = false;
    chatbotLauncher.setAttribute("aria-expanded", "true");
    if (!chatStarted) {
      chatStarted = true;
      addChatMessage(botGreeting, "bot");
      botChips.forEach((label) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chatbot-chip";
        b.textContent = label;
        b.addEventListener("click", () => askBot(label));
        chatbotChips.appendChild(b);
      });
    }
    chatbotText.focus();
  }
  function closeChatbot() {
    chatbotPanel.hidden = true;
    chatbotLauncher.setAttribute("aria-expanded", "false");
    chatbotLauncher.focus();
  }

  chatbotLauncher.addEventListener("click", () => {
    if (chatbotPanel.hidden) openChatbot(); else closeChatbot();
  });
  chatbotClose.addEventListener("click", closeChatbot);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !chatbotPanel.hidden) closeChatbot();
  });
  chatbotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = chatbotText.value.trim();
    if (!q) return;
    chatbotText.value = "";
    askBot(q);
  });

  /* ------------------------------------------------------------------------
     3D HERO: deferred loader
     Loads Three.js + the glass scene only after first paint, only when
     motion is allowed and WebGL is available. Otherwise the static SVG
     fallback in the hero stays visible.
     ------------------------------------------------------------------------ */
  function webglAvailable() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (err) {
      return false;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function initHero3D() {
    if (prefersReducedMotion || !webglAvailable()) return; // fallback SVG stays
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js")
      .then(() => loadScript("js/hero-glass.js"))
      .then(() => {
        if (window.initHeroGlass) {
          window.initHeroGlass($("#heroCanvasWrap"), {
            fallbackEl: $("#heroGlassFallback"),
            hasScrollTrigger: !!(window.gsap && window.ScrollTrigger)
          });
        }
      })
      .catch(() => { /* CDN unreachable; static fallback stays visible */ });
  }

  /* ------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------ */
  function boot() {
    initReveals();
    // Defer 3D until the browser is idle after first paint.
    if ("requestIdleCallback" in window) {
      requestIdleCallback(initHero3D, { timeout: 2500 });
    } else {
      window.setTimeout(initHero3D, 800);
    }
  }

  if (document.readyState === "complete") {
    boot();
  } else {
    window.addEventListener("load", boot);
  }
})();
