// trailing-core-v3.js – هسته تریلینگ استاپ با پنل مینیمال و شیک
// این فایل توسط Node سرور روی آدرس /js سرو می‌شود
// و لودر Tampermonkey آن را روی farazgold لود می‌کند.

(function () {
  'use strict';

  console.log('[TRAILING-CORE] loaded from local Node server');

  // ---------- تنظیمات ذخیره‌شونده ----------
  const LS_ENABLED_KEY     = 'trailingCore_enabled';
  const LS_GAP_KEY         = 'trailingCore_gap';
  const LS_MIN_DIST_KEY    = 'trailingCore_minDistFromOpen'; // حداقل فاصله از قیمت شروع

  let GAP = parseInt(localStorage.getItem(LS_GAP_KEY) || '5', 10);
  if (!GAP || GAP <= 0) GAP = 5;

  // حداقل فاصله از قیمت شروع معامله برای فعال شدن تریلینگ
  let MIN_DIST_FROM_OPEN = parseInt(localStorage.getItem(LS_MIN_DIST_KEY) || '5', 10);
  if (!MIN_DIST_FROM_OPEN || MIN_DIST_FROM_OPEN <= 0) MIN_DIST_FROM_OPEN = 5;

  let enabledLocal = localStorage.getItem(LS_ENABLED_KEY) === '1';

  const LOOP_INTERVAL = 2000;   // هر چند میلی‌ثانیه یک‌بار تریلینگ
  const INPUT_DELAY   = 120;
  const MODAL_DELAY   = 200;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------- پنل مینیمال و شیک ----------
  function createControlPanel() {
    if (!document.body) return;
    let panel = document.getElementById('trailing-core-panel');
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'trailing-core-panel';

    Object.assign(panel.style, {
      position: 'fixed',
      top: '80px',
      left: '20px',
      zIndex: '9999999',
      background: 'rgba(10,10,15,0.96)',
      backdropFilter: 'blur(6px)',
      color: '#f5f5f5',
      padding: '14px 16px',
      borderRadius: '14px',
      fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
      border: '1px solid rgba(0,255,150,0.35)',
      minWidth: '230px',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });

    // هدر
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });

    const title = document.createElement('div');
    title.textContent = 'تریلینگ استاپ';
    Object.assign(title.style, {
      fontWeight: '600',
      fontSize: '14px'
    });

    const dot = document.createElement('div');
    Object.assign(dot.style, {
      width: '9px',
      height: '9px',
      borderRadius: '50%'
    });

    header.appendChild(title);
    header.appendChild(dot);
    panel.appendChild(header);

    // توضیح کوچک
    const sub = document.createElement('div');
    //sub.textContent = 'استاپ فقط در جهت سود و بعد از فاصله مشخص جابجا می‌شود.';
    Object.assign(sub.style, {
      fontSize: '11px',
      opacity: '0.7'
    });
    panel.appendChild(sub);

    // جداکننده
    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: 'rgba(255,255,255,0.1)'
    });
    panel.appendChild(divider);

    // ردیف وضعیت + سوئیچ
    const rowStatus = document.createElement('div');
    Object.assign(rowStatus.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });

    const lblStatus = document.createElement('span');
    lblStatus.textContent = 'وضعیت محلی';
    lblStatus.style.opacity = '0.85';

    const switchWrap = document.createElement('div');
    Object.assign(switchWrap.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    });

    const switchLabel = document.createElement('label');
    Object.assign(switchLabel.style, {
      position: 'relative',
      display: 'inline-block',
      width: '40px',
      height: '20px',
      cursor: 'pointer'
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = enabledLocal;
    Object.assign(checkbox.style, {
      opacity: '0',
      width: '0',
      height: '0'
    });

    const slider = document.createElement('span');
    Object.assign(slider.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      borderRadius: '999px',
      background: '#555',
      transition: '0.25s'
    });

    const knob = document.createElement('span');
    Object.assign(knob.style, {
      position: 'absolute',
      height: '16px',
      width: '16px',
      left: '2px',
      top: '2px',
      background: '#fff',
      borderRadius: '50%',
      transition: '0.25s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
    });

    slider.appendChild(knob);
    switchLabel.appendChild(checkbox);
    switchLabel.appendChild(slider);

    switchWrap.appendChild(switchLabel);
    rowStatus.appendChild(lblStatus);
    rowStatus.appendChild(switchWrap);
    panel.appendChild(rowStatus);

    // ردیف GAP
    const rowGap = document.createElement('div');
    Object.assign(rowGap.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });

    const lblGap = document.createElement('span');
    lblGap.textContent = 'GAP استاپ (خط)';
    lblGap.style.opacity = '0.85';

    const gapInput = document.createElement('input');
    gapInput.type = 'number';
    gapInput.min  = '1';
    gapInput.max  = '500';
    gapInput.value = String(GAP);
    Object.assign(gapInput.style, {
      width: '70px',
      padding: '4px 6px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.04)',
      color: '#fff',
      fontSize: '12px',
      textAlign: 'center',
      outline: 'none'
    });

    rowGap.appendChild(lblGap);
    rowGap.appendChild(gapInput);
    panel.appendChild(rowGap);

    // فاصله از قیمت معامله
    const rowMinDist = document.createElement('div');
    Object.assign(rowMinDist.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });

    const lblMinDist = document.createElement('span');
    lblMinDist.textContent = 'مین فاصله از قیمت شروع';
    lblMinDist.style.opacity = '0.85';

    const minDistInput = document.createElement('input');
    minDistInput.type = 'number';
    minDistInput.min  = '1';
    minDistInput.max  = '1000';
    minDistInput.value = String(MIN_DIST_FROM_OPEN);
    Object.assign(minDistInput.style, {
      width: '70px',
      padding: '4px 6px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.04)',
      color: '#fff',
      fontSize: '12px',
      textAlign: 'center',
      outline: 'none'
    });

    rowMinDist.appendChild(lblMinDist);
    rowMinDist.appendChild(minDistInput);
    panel.appendChild(rowMinDist);

    document.body.appendChild(panel);

    function refreshUI() {
      const effective = enabledLocal;
      dot.style.backgroundColor = effective ? '#00e676' : '#f44336';
      dot.style.boxShadow = effective
        ? '0 0 8px rgba(0,230,118,0.9)'
        : '0 0 6px rgba(244,67,54,0.8)';
      slider.style.background = enabledLocal ? '#00c853' : '#555';
      knob.style.left         = enabledLocal ? '22px' : '2px';
      panel.style.borderColor = effective
        ? 'rgba(0,255,150,0.6)'
        : 'rgba(255,255,255,0.18)';
      panel.style.opacity     = effective ? '1' : '0.92';
    }

    refreshUI();

    checkbox.addEventListener('change', () => {
      enabledLocal = checkbox.checked;
      localStorage.setItem(LS_ENABLED_KEY, enabledLocal ? '1' : '0');
      console.log('[TRAILING-CORE] enabledLocal =', enabledLocal);
      refreshUI();
    });

    gapInput.addEventListener('change', () => {
      let val = parseInt(gapInput.value, 10);
      if (!val || val <= 0) {
        gapInput.value = String(GAP);
        return;
      }
      GAP = val;
      localStorage.setItem(LS_GAP_KEY, String(GAP));
      console.log('[TRAILING-CORE] GAP updated =', GAP);
    });

    minDistInput.addEventListener('change', () => {
      let val = parseInt(minDistInput.value, 10);
      if (!val || val <= 0) {
        minDistInput.value = String(MIN_DIST_FROM_OPEN);
        return;
      }
      MIN_DIST_FROM_OPEN = val;
      localStorage.setItem(LS_MIN_DIST_KEY, String(MIN_DIST_FROM_OPEN));
      console.log('[TRAILING-CORE] MIN_DIST_FROM_OPEN updated =', MIN_DIST_FROM_OPEN);
    });
  }

  function ensurePanel() {
    createControlPanel();
    // اگر کسی دستی پاک کرد، دوباره بسازیم
    setInterval(() => {
      if (!document.getElementById('trailing-core-panel') && document.body) {
        console.log('[TRAILING-CORE] panel missing, recreating...');
        createControlPanel();
      }
    }, 5000);
  }

  // ---------- کمک برای اعداد ----------
  function normalizeDigits(str) {
    if (!str) return "";
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    const ar = "٠١٢٣٤٥٦٧٨٩";
    let out = "";
    for (let ch of String(str)) {
      let i = fa.indexOf(ch); if (i >= 0) { out += i; continue; }
      i = ar.indexOf(ch); if (i >= 0) { out += i; continue; }
      if (ch >= "0" && ch <= "9") out += ch;
    }
    return out;
  }

  function toNumber(str) {
    const n = normalizeDigits(str);
    if (!n) return null;
    const v = parseInt(n, 10);
    return isNaN(v) ? null : v;
  }

  function formatWithComma(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // ---------- پیدا کردن قیمت و ردیف‌ها ----------
  function getLivePrice() {
    const el =
      document.querySelector("#current-price-value") ||
      document.querySelector("#header_price");
    if (!el) return null;
    return toNumber(el.textContent);
  }

  function getRows() {
    return [...document.querySelectorAll("#open-trades-body tr[data-position-id]")];
  }

  function getRowInfo(tr) {
    const t = tr.querySelectorAll("td");
    if (!t[1]) return null;

    const side =
      t[1].innerText.includes("خرید") ? "buy" :
      t[1].innerText.includes("فروش") ? "sell" : null;

    const pnlCell = t[4];
    const isProfit = pnlCell && pnlCell.classList.contains("_transaction-pnl-positive_1x9dg_31");

    const slBtn = t[6]?.querySelector("button") || null;
    const id = tr.getAttribute("data-position-id") || null;

    // قیمت باز شدن معامله از ستون سوم
    const openPriceCell = t[2];
    const openPrice = toNumber(openPriceCell?.innerText);

    return { side, isProfit, slBtn, id, openPrice };
  }

  // ---------- مودال / فرم ----------
  async function waitForModalRoot(timeout = 4000) {
    let t = 0;
    while (t < timeout) {
      const byId = document.querySelector("#tpSlModal");
      if (byId) return byId;

      const content = document.querySelector("div._transactionModalContent_rysxb_21");
      if (content) return content;

      await sleep(50);
      t += 50;
    }
    console.warn("[TRAILING-CORE] modal root not found");
    return null;
  }

  async function waitForModalContent(root, timeout = 4000) {
    let t = 0;
    while (t < timeout) {
      if (!root) return null;

      if (root.matches && root.matches("div._transactionModalContent_rysxb_21")) {
        return root;
      }

      const content =
        root.querySelector("div._transactionModalContent_rysxb_21") ||
        root.querySelector("div._transactionModalBody_rysxb_58") ||
        root.querySelector("div");
      if (content) return content;

      await sleep(50);
      t += 50;
    }
    console.warn("[TRAILING-CORE] modal content not found");
    return null;
  }

  async function waitForForm(container, timeout = 4000) {
    let t = 0;
    while (t < timeout) {
      const form = container.querySelector("#tpSlForm");
      if (form) return form;
      await sleep(50);
      t += 50;
    }
    console.warn("[TRAILING-CORE] tpSlForm not found");
    return null;
  }

  async function waitForSubmitButton(form, timeout = 4000) {
    let t = 0;
    while (t < timeout) {
      const btn = form.querySelector("button[type='submit']");
      if (btn) return btn;
      await sleep(50);
      t += 50;
    }
    console.warn("[TRAILING-CORE] submit button not found");
    return null;
  }

  function clickSubmit(btn, form) {
    if (!btn) return false;

    console.log("[TRAILING-CORE] submit button click");

    ["mouseover", "mousedown", "mouseup", "click"].forEach(ev => {
      btn.dispatchEvent(
        new MouseEvent(ev, { bubbles: true, cancelable: true, view: window })
      );
    });

    btn.click();
    if (form && typeof form.requestSubmit === "function") {
      form.requestSubmit();
      console.log("[TRAILING-CORE] form.requestSubmit() called");
    }
    return true;
  }

  async function writeSL(rawValue, form, submitBtn) {
    if (!form) return false;

    const input = form.querySelector("#tpSlFormInput");
    if (!input) {
      console.warn("[TRAILING-CORE] tpSlFormInput not found");
      return false;
    }

    await sleep(INPUT_DELAY);

    const formatted = formatWithComma(rawValue);
    console.log("[TRAILING-CORE] setting input value =", formatted);

    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && typeof desc.set === "function") {
      desc.set.call(input, formatted);
    } else {
      input.value = formatted;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await sleep(INPUT_DELAY);

    clickSubmit(submitBtn, form);
    return true;
  }

  // ---------- منطق تریلینگ یک‌طرفه ----------
  const lastSLByPosition = {};
  let busy = false;

  async function processTrailingForRow(tr, currentPrice) {
    const info = getRowInfo(tr);
    if (!info || !info.side || !info.slBtn || !info.isProfit || !info.id) return;
    if (info.openPrice == null) {
      console.warn("[TRAILING-CORE] openPrice is null, skip position", info.id);
      return;
    }

    // شرط فعال‌سازی تریلینگ: فاصله از قیمت باز شدن حداقل MIN_DIST_FROM_OPEN خط باشد
    if (info.side === "buy") {
      if ((currentPrice - info.openPrice) < MIN_DIST_FROM_OPEN) {
        console.log(`[TRAILING-CORE] BUY pos ${info.id} فاصله از قیمت شروع (${currentPrice - info.openPrice}) < MIN_DIST (${MIN_DIST_FROM_OPEN}) → هیچ اقدامی نمی‌شود.`);
        return;
      }
    } else if (info.side === "sell") {
      if ((info.openPrice - currentPrice) < MIN_DIST_FROM_OPEN) {
        console.log(`[TRAILING-CORE] SELL pos ${info.id} فاصله از قیمت شروع (${info.openPrice - currentPrice}) < MIN_DIST (${MIN_DIST_FROM_OPEN}) → هیچ اقدامی نمی‌شود.`);
        return;
      }
    }

    let desiredSL = null;
    if (info.side === "buy") {
      desiredSL = currentPrice - GAP;
    } else if (info.side === "sell") {
      desiredSL = currentPrice + GAP;
    }

    if (desiredSL == null) return;

    const last = lastSLByPosition[info.id];

    if (last != null) {
      if (info.side === "buy") {
        // فقط اگر استاپ جدید بالاتر از قبلی باشد
        if (desiredSL <= last) return;
      } else if (info.side === "sell") {
        // فقط اگر استاپ جدید پایین‌تر از قبلی باشد
        if (desiredSL >= last) return;
      }

      if (Math.abs(desiredSL - last) < 1) return;
    }

    lastSLByPosition[info.id] = desiredSL;

    console.log(`[TRAILING-CORE] pos ${info.id} side ${info.side} SL => ${desiredSL}`);

    info.slBtn.click();
    await sleep(MODAL_DELAY);

    const modalRoot = await waitForModalRoot();
    if (!modalRoot) return;

    const modalContent = await waitForModalContent(modalRoot);
    if (!modalContent) return;

    const form = await waitForForm(modalContent);
    if (!form) return;

    const submitBtn = await waitForSubmitButton(form);
    if (!submitBtn) return;

    await writeSL(desiredSL, form, submitBtn);
  }

  async function trailingLoop() {
    while (true) {
      try {
        if (enabledLocal && !busy) {
          const price = getLivePrice();
          if (price) {
            const rows = getRows();
            for (const tr of rows) {
              const info = getRowInfo(tr);
              if (!info || !info.isProfit) continue;

              busy = true;
              await processTrailingForRow(tr, price);
              busy = false;
              break; // هر دور فقط یک پوزیشن
            }
          }
        }
      } catch (e) {
        console.error("[TRAILING-CORE] error in loop:", e);
        busy = false;
      }

      await sleep(LOOP_INTERVAL);
    }
  }

  // ---------- راه‌اندازی ----------
  function init() {
    ensurePanel();
    setTimeout(() => {
      trailingLoop();
    }, 1500);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    window.addEventListener('load', init);
  }

})();
