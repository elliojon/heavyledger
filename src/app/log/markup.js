// Shell markup the tracker renders into. "embedded" drops the brand row because
// the profile page already carries the site header.
const FULL = `<header class="top">
  <div class="top-inner">
    <div class="brand"><a href="/" class="brandlink"><b>Heavy Ledger</b></a><span>Training log</span><span id="savestate" class="saved" style="margin-left:auto"></span><span id="acct" class="acct"></span></div>
    <div id="timerSlot"></div>
    <nav id="nav">
      <a href="#log" data-v="log">Log</a>
      <a href="#plan" data-v="plan">Plan</a>
      <a href="#history" data-v="history">History</a>
      <a href="#lifts" data-v="lifts">Lifts</a>
      <a href="#settings" data-v="settings">Settings</a>
    </nav>
  </div>
</header>
<main class="wrap" id="app"><div class="empty">Loading your ledger…</div></main>
<div id="modal"></div>`;
const EMBED = `<header class="top">
  <div class="top-inner">
    <div class="brand brand-embed"><span id="savestate" class="saved" style="margin-left:auto"></span><span id="acct" class="acct"></span></div>
    <div id="timerSlot"></div>
    <nav id="nav">
      <a href="#log" data-v="log">Log</a>
      <a href="#plan" data-v="plan">Plan</a>
      <a href="#history" data-v="history">History</a>
      <a href="#lifts" data-v="lifts">Lifts</a>
      <a href="#settings" data-v="settings">Settings</a>
    </nav>
  </div>
</header>
<main class="wrap" id="app"><div class="empty">Loading your ledger…</div></main>
<div id="modal"></div>`;
export const trackerMarkup = (embedded) => (embedded ? EMBED : FULL);
