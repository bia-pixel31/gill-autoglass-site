/* ==========================================================================
   GILL AUTO GLASS — main.js
   Sections: CONFIG · helpers · nav · scroll reveals · wizard · chatbot ·
             back-to-top · deferred 3D hero loader
   No build tools; GSAP + ScrollTrigger loaded from CDN (deferred).

   PRIVACY: this script sets NO cookies and uses NO storage (no
   localStorage/sessionStorage), no analytics, no tracking — which is why the
   site needs no cookie consent banner. The chatbot is rule-based and runs
   entirely in the browser; nothing typed into it is recorded or transmitted.
   ========================================================================== */

/* --------------------------------------------------------------------------
   EDIT BUSINESS INFO HERE
   One place for every business fact used by the scripts (mailto, chatbot,
   tel/sms links). The same facts appear as visible text in index.html —
   if a fact changes, update it here AND find-replace it in index.html.
   -------------------------------------------------------------------------- */
const CONFIG = {
  businessName: "Gill Auto Glass",
  legalName: "Gill Auto Glass Ltd.",
  phoneDisplay: "306-914-8760",
  phoneE164: "+13069148760",          // used for tel: and sms: links
  email: "gillautoglassyxe@gmail.com",
  address: "418C 47th Street E, Saskatoon SK",
  addressLandmark: "Same building as Sami's Sunrise Grill, north industrial area",
  hours: "8 AM – 6 PM",           // TODO (OWNER VERIFY): confirm which days
  serviceArea: "Saskatoon and surrounding areas",
  domain: "gillautoglassyxe.ca",
  mapsUrl: "https://maps.google.com/?q=418C+47th+Street+E,+Saskatoon,+SK",
  responsePromise: "Free quotes same-day or as soon as possible — call or text anytime for a time estimate.",
  // TODO: replace with the shop's real Google review link + socials.
  googleReviewUrl: "#",
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
  const yearEl = $("#footerYear");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
      const ok = $("#wzName").value.trim() !== "" && $("#wzPhone").value.trim() !== "";
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

  function buildMailto() {
    const line = (label, value) => label + ": " + (value || "—");
    const body = [
      "Quote request from " + CONFIG.domain,
      "",
      "VEHICLE",
      line("Year", $("#wzYear").value.trim()),
      line("Make", $("#wzMake").value.trim()),
      line("Model", $("#wzModel").value.trim()),
      line("Type", $("#wzType").value),
      line("Rebuilt / salvage title", radioValue("rebuilt")),
      "",
      "GLASS",
      line("Glass needed", radioValue("glass")),
      line("Camera / sensors near mirror (possible ADAS)", radioValue("adas")),
      line("Mobile or in-shop", radioValue("serviceLocation")),
      "",
      "CONTACT",
      line("Name", $("#wzName").value.trim()),
      line("Phone", $("#wzPhone").value.trim()),
      line("Preferred contact", radioValue("preferredContact")),
      line("Email", $("#wzEmail").value.trim()),
      line("Going through SGI", radioValue("sgiClaim")),
      line("Message", $("#wzMessage").value.trim())
    ].join("\n");

    const vehicle = [$("#wzYear").value.trim(), $("#wzMake").value.trim(), $("#wzModel").value.trim()]
      .filter(Boolean).join(" ");
    const subject = "Free quote request — " + vehicle + " (" + (radioValue("glass") || "glass") + ")";

    return "mailto:" + CONFIG.email +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  // Exposed for automated tests (harmless in production).
  window.__gagBuildMailto = buildMailto;

  wizard.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    // Open the user's mail app with everything pre-filled.
    window.location.href = buildMailto();

    // Show the on-page success message with the response promise.
    wizardStepEls().forEach((fs) => { fs.hidden = true; });
    $$(".wp-step", wizard).forEach((li) => li.classList.add("is-done"));
    const success = $("#wizardSuccess");
    success.hidden = false;
    success.focus();
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
     CHATBOT — rule-based keyword answers, no external API
     ------------------------------------------------------------------------ */
  const botRules = [
    {
      keys: ["hour", "open", "close", "when are you", "what time"],
      answer: "We're open " + CONFIG.hours + ". " + CONFIG.responsePromise
    },
    {
      keys: ["where", "location", "address", "find you", "directions", "sami"],
      answer: "We're at " + CONFIG.address + " — " + CONFIG.addressLandmark.toLowerCase() + ". Map: " + CONFIG.mapsUrl
    },
    {
      keys: ["mobile", "come to", "at my", "my house", "my work", "driveway", "on site", "on-site"],
      answer: "Yes — mobile service is one of our specialties. We come to you across " + CONFIG.serviceArea + ": home, work, wherever the vehicle is parked with room to work."
    },
    {
      keys: ["sgi", "claim", "insurance", "deductible", "auto pak", "autopak", "coverage"],
      answer: "We're SGI accredited for glass, so we handle SGI claims directly — paperwork and billing included. Your deductible depends on your coverage (an Auto Pak can lower it). Bring your plate number and policy info and we'll take it from there."
    },
    {
      keys: ["adas", "calibrat", "camera", "sensor", "lane", "braking"],
      answer: "ADAS calibration re-aims the safety cameras (lane assist, automatic braking) that often sit behind your windshield. Many newer vehicles need it after a windshield replacement — and we do it in-house, same visit."
    },
    {
      keys: ["quote", "price", "cost", "how much", "estimate"],
      answer: "Quotes are free — same-day or as soon as possible. Fastest routes: the 3-step wizard on this page (tap Free Quote), or text a photo of the damage to " + CONFIG.phoneDisplay + "."
    },
    {
      keys: ["drive", "how long", "cure", "wait", "ready"],
      answer: "After a windshield replacement, safe drive-away is usually 30–60 minutes, longer in the cold. We confirm the exact time for your vehicle before you go."
    },
    {
      keys: ["chip", "crack", "stone", "rock"],
      answer: "Chips smaller than a quarter (away from edges and your sightline) can usually be repaired in under an hour — often $0 through SGI. Long cracks usually mean replacement. Text a photo to " + CONFIG.phoneDisplay + " and we'll tell you which."
    },
    {
      keys: ["service", "what do you", "offer", "aquapel", "door", "back window", "tint", "windshield"],
      answer: "We do windshield replacement, door glass, back windows, stone chip repair, ADAS calibration, Aquapel rain-repellent treatment, and SGI glass claims handled directly. Glass is all we do."
    },
    {
      keys: ["phone", "call", "text", "contact", "email", "reach"],
      answer: "Call or text " + CONFIG.phoneDisplay + " (texts welcome — we get it, phone calls aren't for everyone), or email " + CONFIG.email + "."
    },
    {
      keys: ["thank", "thanks"],
      answer: "Anytime! If you need anything else, " + CONFIG.phoneDisplay + " — call or text."
    }
  ];
  const botFallback =
    "I'm a simple helper — try asking about hours, location, mobile service, SGI claims, ADAS, chip repair, or quotes. " +
    "For anything else, call or text " + CONFIG.phoneDisplay + " and a human will sort you out.";
  const botGreeting =
    "Hi! Quick answers about " + CONFIG.businessName + " — hours, mobile service, SGI claims, ADAS, quotes. What do you need?";
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
     3D HERO — deferred loader
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
      .catch(() => { /* CDN unreachable — static fallback stays visible */ });
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
