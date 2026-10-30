(() => {
  "use strict";
  const STORAGE_KEY = "nexoraStudioProjectV2";
  let history = [], redoStack = [], selectedId = null, idCounter = 0, currentView = "desktop";
  const $ = (id) => document.getElementById(id);
  const stage = () => $("stage");
  const status = (message) => { const el = $("saveStatus"); if (el) el.textContent = message; };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const newId = () => "block-" + Date.now().toString(36) + "-" + (++idCounter).toString(36);
  function snapshot() {
    if (!stage()) return;
    history.push(stage().innerHTML);
    if (history.length > 40) history.shift();
    redoStack = [];
  }
  function blockHTML(type) {
    const id = newId();
    const common = 'class="nb" data-block="' + type + '" data-id="' + id + '" draggable="true"';
    if (type === "Hero") return '<section ' + common + '><p class="eyebrow">NEW EXPERIENCE</p><h2 contenteditable="true">Your headline here</h2><p contenteditable="true">Describe your product, service or idea.</p><button contenteditable="true">Get started</button></section>';
    if (type === "Text") return '<section ' + common + '><h3 contenteditable="true">Section title</h3><p contenteditable="true">Click here and write your content.</p></section>';
    if (type === "Image") return '<section ' + common + '><div class="image-placeholder">IMAGE BLOCK</div><p contenteditable="true">Replace this placeholder with your image in the next iteration.</p></section>';
    if (type === "3D Scene") return '<section ' + common + '><div class="scene3d">3D EMBED</div><p contenteditable="true">Select this block and add a secure HTTPS embed URL in the inspector.</p></section>';
    return '<section ' + common + '><h3 contenteditable="true">Ready for the next step?</h3><button contenteditable="true">Call to action</button></section>';
  }
  function addBlock(type) {
    if (!stage()) return;
    snapshot(); stage().insertAdjacentHTML("beforeend", blockHTML(type)); bindBlocks(); status("Unsaved changes");
  }
  function bindBlocks() {
    document.querySelectorAll("#stage .nb").forEach(el => {
      el.onclick = event => { if (event.target.closest("[contenteditable=true]")) { selectBlock(el); return; } event.stopPropagation(); selectBlock(el); };
      el.ondragstart = event => { event.dataTransfer.setData("text/plain", el.dataset.id || ""); event.dataTransfer.effectAllowed = "move"; };
      el.ondragover = event => { event.preventDefault(); };
      el.ondrop = event => {
        event.preventDefault(); const id = event.dataTransfer.getData("text/plain");
        const moving = [...document.querySelectorAll("#stage .nb")].find(node => node.dataset.id === id);
        if (moving && moving !== el) { snapshot(); el.before(moving); status("Unsaved changes"); }
      };
    });
  }
  function selectBlock(el) {
    if (!el) return;
    selectedId = el.dataset.id || (el.dataset.id = newId());
    document.querySelectorAll("#stage .nb").forEach(node => node.classList.toggle("selected", node === el));
    const panel = $("inspector");
    panel.innerHTML = '<h3>Design inspector</h3><p class="hint">Changes apply to the selected section.</p>' +
      '<label for="bgColor">Background</label><input id="bgColor" type="color" value="' + safeColor(el.style.backgroundColor, "#ffffff") + '">' +
      '<label for="textColor">Text colour</label><input id="textColor" type="color" value="' + safeColor(el.style.color, "#111111") + '">' +
      '<label for="padRange">Padding</label><input id="padRange" type="range" min="8" max="100" value="' + parseInt(el.style.padding, 10 || 28) + '">' +
      '<label for="radiusRange">Corner radius</label><input id="radiusRange" type="range" min="0" max="48" value="' + (parseInt(el.style.borderRadius, 10) || 14) + '">' +
      '<label for="embedUrl">3D / iframe HTTPS URL</label><input id="embedUrl" type="url" placeholder="https://…"><button class="tool" id="applyEmbed">Apply embed</button>' +
      '<div class="inspector-actions"><button class="tool" id="duplicateBlock">Duplicate</button><button class="tool" id="moveUp">Move up</button><button class="tool" id="moveDown">Move down</button><button class="danger" id="deleteBlock">Delete section</button></div>';
    $("bgColor").onchange = e => changeStyle("backgroundColor", e.target.value);
    $("textColor").onchange = e => changeStyle("color", e.target.value);
    $("padRange").onchange = e => changeStyle("padding", e.target.value + "px");
    $("radiusRange").onchange = e => changeStyle("borderRadius", e.target.value + "px");
    $("applyEmbed").onclick = applyEmbed;
    $("duplicateBlock").onclick = duplicateSelected;
    $("deleteBlock").onclick = deleteSelected;
    $("moveUp").onclick = () => moveSelected(-1);
    $("moveDown").onclick = () => moveSelected(1);
  }
  function safeColor(value, fallback) {
    const probe = document.createElement("span"); probe.style.color = value;
    return probe.style.color ? rgbToHex(probe.style.color) : fallback;
  }
  function rgbToHex(value) {
    const m = value.match(/\d+/g); return m && m.length >= 3 ? "#" + m.slice(0,3).map(n => Number(n).toString(16).padStart(2,"0")).join("") : "#ffffff";
  }
  function selectedBlock() { return [...document.querySelectorAll("#stage .nb")].find(el => el.dataset.id === selectedId); }
  function changeStyle(property, value) { const el = selectedBlock(); if (!el) return; snapshot(); el.style[property] = value; status("Unsaved changes"); }
  function deleteSelected() { const el = selectedBlock(); if (!el) return; snapshot(); el.remove(); selectedId = null; $("inspector").innerHTML = '<h3>Design inspector</h3><p class="hint">Choose a section to see its settings.</p>'; status("Unsaved changes"); }
  function duplicateSelected() { const el = selectedBlock(); if (!el) return; snapshot(); const copy = el.cloneNode(true); copy.dataset.id = newId(); el.after(copy); bindBlocks(); selectBlock(copy); status("Unsaved changes"); }
  function moveSelected(direction) {
    const el = selectedBlock(); if (!el) return; const sibling = direction < 0 ? el.previousElementSibling : el.nextElementSibling;
    if (!sibling) return; snapshot(); if (direction < 0) el.parentNode.insertBefore(el, sibling); else el.parentNode.insertBefore(sibling, el); status("Unsaved changes");
  }
  function applyEmbed() {
    const el = selectedBlock(), input = $("embedUrl"); if (!el || !input) return;
    let url; try { url = new URL(input.value.trim()); } catch (_) { alert("Enter a valid HTTPS embed URL."); return; }
    if (url.protocol !== "https:") { alert("Only secure HTTPS embed URLs are allowed."); return; }
    snapshot(); el.innerHTML = '<iframe title="Embedded interactive scene" src="' + escapeHtml(url.href) + '" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" allowfullscreen></iframe>';
    status("Unsaved changes");
  }
  function generate() {
    const input = $("idea"), brief = input ? input.value.trim() : "";
    if (!brief) { alert("Describe the website you want to draft."); return; }
    snapshot();
    const title = brief.replace(/^(build|create|make|design)\s+/i, "").trim();
    stage().innerHTML = '<section class="nb" data-block="Hero" data-id="' + newId() + '"><p class="eyebrow">NEXORA STARTER DRAFT</p><h2 contenteditable="true">' + escapeHtml(title.charAt(0).toUpperCase() + title.slice(1)) + '</h2><p contenteditable="true">A first layout based on your brief. Edit this text and add sections from the left panel.</p><button contenteditable="true">Explore</button></section>' + blockHTML("Text") + (brief.toLowerCase().includes("3d") ? blockHTML("3D Scene") : "") + blockHTML("Button");
    bindBlocks(); selectBlock(stage().querySelector(".nb")); status("Draft created · Unsaved");
  }
  function undo() { if (!history.length) return; redoStack.push(stage().innerHTML); stage().innerHTML = history.pop(); bindBlocks(); selectedId = null; status("Undo · Unsaved"); }
  function redo() { if (!redoStack.length) return; history.push(stage().innerHTML); stage().innerHTML = redoStack.pop(); bindBlocks(); selectedId = null; status("Redo · Unsaved"); }
  function saveProject() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:2, html:stage().innerHTML, savedAt:new Date().toISOString()})); status("Saved on this device ✓"); }
    catch (_) { alert("Could not save. Browser storage may be full or disabled."); }
  }
  function loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("nexoraOwnerProject");
      if (!raw) { alert("No saved project found on this device."); return; }
      const data = JSON.parse(raw), html = typeof data === "string" ? data : (data.html || "");
      if (!html || typeof html !== "string") throw new Error("Invalid project");
      snapshot(); stage().innerHTML = html; bindBlocks(); selectedId = null; status("Project loaded ✓");
    } catch (_) { alert("The saved project could not be opened. It may be damaged or from an incompatible version."); }
  }
  function setView(view) {
    currentView = view; const wrap = document.querySelector(".stage-wrap");
    if (wrap) { wrap.classList.remove("view-tablet","view-mobile"); if (view !== "desktop") wrap.classList.add("view-" + view); }
  }
  function previewProject() {
    const win = window.open("", "_blank");
    if (!win) { alert("Allow pop-ups to open the preview."); return; }
    const doc = makeDocument(stage().innerHTML);
    win.document.open(); win.document.write(doc); win.document.close();
  }
  function makeDocument(content) {
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => '<link rel="stylesheet" href="' + escapeHtml(l.href) + '">').join("");
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexora Project Draft</title>' + css + '<style>body{margin:0;background:#f5f5f2;color:#111}.stage-wrap{max-width:1100px;margin:auto}#stage{min-height:100vh;padding:24px}.selected{outline:0!important}</style></head><body><main id="stage">' + content + '</main></body></html>';
  }
  function exportProject() {
    const blob = new Blob([makeDocument(stage().innerHTML)], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "nexora-studio-draft.html"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500); status("HTML draft exported ✓");
  }
  function openStudio() { $("studio").scrollIntoView({behavior:"smooth",block:"start"}); }
  window.addBlock = addBlock; window.generate = generate; window.undo = undo; window.redo = redo;
  window.saveProject = saveProject; window.loadProject = loadProject; window.setView = setView;
  window.previewProject = previewProject; window.exportProject = exportProject; window.openStudio = openStudio;
  document.addEventListener("DOMContentLoaded", () => { bindBlocks(); });
})();