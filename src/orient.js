// ---- ORIENTATION (Harry, 21 Nov): what a blank desk starts with, and the "Start here" paper on every table. Written once,
// here; the blank desk (src/blank.js, desk.html) lays every section out as its own paper with pictures, and a table
// (src/app.js) shows the same words on one paper. Sections: pick a game and edition (right here), bring your rulebook,
// your seat (GM or player), the Turnip Works table, and how to use the desk.
(function () {
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// every game the desk knows, with its editions; a table exists for the ones marked with a slug
const GAMES = [
  { id: 'ssr2', game: 'Simplified Shadowrun', blurb: 'Runners in the sprawl: a four-page homebrew of Shadowrun 2nd edition, with a builder that costs every choice.',
    editions: [{ ed: 'Version 2.2', slug: 'shadowrun', file: 'index.html', print: 'ssr2-v2.2.pdf', get: { url: 'downloads/ssr2-v2.2.pdf', label: 'Download it here (free)' } }] },
  { id: 'brp', game: 'Basic Roleplaying', blurb: 'Chaosium’s percentile engine: skills that improve when you use them, for any setting.',
    editions: [{ ed: 'Universal Game Engine (ORC content document)', slug: 'brp', file: 'brp.html', print: 'brp-orc.pdf', get: { url: 'https://www.chaosium.com/content/orclicense/BasicRoleplaying-ORC-Content-Document.pdf', label: 'Free from Chaosium' } }] },
  { id: 'lb', game: 'Lady Blackbird', blurb: 'Five pregenerated characters on the run in the wild blue yonder; the adventure is built in.',
    editions: [{ ed: 'The free edition', slug: 'lady-blackbird', file: 'lb.html', print: 'lb.pdf', get: { url: 'https://johnharper.itch.io/lady-blackbird', label: 'Free from itch.io' } }] },
  { id: 'srd', game: 'Fifth edition', blurb: 'The open rules of the world’s most played fantasy game: classes, levels, spells.',
    editions: [{ ed: 'SRD 5.2.1 (the 2024 rules)', slug: 'fifth-edition', file: 'srd.html', print: 'srd-5.2.1.pdf', get: { url: 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf', label: 'Free from Wizards of the Coast' } },
      { ed: 'SRD 5.1 (the 2014 rules)', soon: true }] },
  { id: 'ep2', game: 'Eclipse Phase', blurb: 'Transhuman horror: minds and bodies kept apart, resleeving, reputation.',
    editions: [{ ed: 'Second edition', slug: 'eclipse-phase', file: 'ep2.html', print: 'EclipsePhase_SecondEdition_v1.3.pdf', get: { url: 'https://robboyle.info/', label: 'Free from the co-author’s share' } },
      { ed: 'First edition', soon: true }] },
];
const local = () => /\.html$/.test(location.pathname) || /^(localhost|127\.)/.test(location.hostname);
const root = () => local() ? location.pathname.replace(/[^/]*$/, '') : '/';
const tablePage = e => root() + (local() ? e.file : e.slug + '/');
const deskPage = () => root() + (local() ? 'desk.html' : '');
const byPrint = name => { for (const g of GAMES) for (const e of g.editions) if (e.print === name) return { g, e }; return null; };

// how the desk works, in parts: one paper each on the blank desk, one run of text on a table's Start here
const HOW = [
  { id: 'sheet', t: 'One big sheet', body: ctx => `<p>Everything has a place, and keeps it. The <b>map</b> is in the middle. The <b>party</b> stands to its right, one sheet each, with the sessions, the dice tray and the log beside them. The <b>rulebook</b> sits above, chapter by chapter. The <b>history</b> is far off to the left: back in time.</p>
    ${pic(ctx, 'overview.webp', 'A whole table, zoomed all the way out', '', 1200, 737)}` },
  { id: 'zoom', t: 'Zoom to read, zoom out to find', body: ctx => `<p>Things are drawn at the size of their importance: zoomed out you see the shape of the campaign, and zoomed in you read the small print. Big labels fade as you go in.</p>
    <p class="keys"><b>Scroll</b> to pan · <b>pinch</b> or <b>ctrl-scroll</b> to zoom · <b>0</b> shows everything · <b>double-click</b> a thing to fly to it · <b>Alt ←</b> or <b>⌘[</b> goes back.</p>` },
  { id: 'roll', t: 'Every number rolls', body: ctx => `<p>The <b>⚄</b> beside a skill or a stat rolls it, by that game’s rules. The result opens beside the sheet and lands in the log, with its verdict; a small count remembers how often each was rolled. Hover a number to see where it comes from.</p>
    ${pic(ctx, 'sheet.webp', 'A character sheet, a roll open above it', '', 1200, 771)}` },
  { id: 'type', t: 'Type to go anywhere', body: ctx => `<p>Press <b>/</b> (or tap the bar at the top) and type: a name, a place, a rule, or a command. ${ctx.cmds ? `On this table, for instance: ${ctx.cmds}.` : 'For instance <i>tusk guns</i> rolls Tusk’s Guns, <i>roll 45</i> rolls percentile, <i>new runner</i> starts a character, and <i>round order</i> starts the round.'}</p>
    ${pic(ctx, 'quickbar.webp', 'The quickbar, after typing “tusk guns”', '', 1100, 333)}` },
  { id: 'notes', t: 'Notes anywhere, nothing lost', body: ctx => `<p><b>Double-click</b> empty space for a note (a long press on a phone); drop a picture on it, on a portrait, or anywhere. Every change is kept: the <b>History</b> takes you back to any earlier moment of the campaign.</p>` },
];
// the sections. ctx: { where: 'desk'|'table', game, linked: {tableName, seatName, role} | null, role, copy, pics }
const pic = (ctx, src, alt, cls = '', w = 600, h = 400) => ctx.pics ? `<figure class="opic ${cls}"><img src="assets/orient/${src}" alt="${esc(alt)}" width="${w}" height="${h}" draggable="false"><figcaption>${esc(alt)}</figcaption></figure>` : '';
const S = {
  welcome: ctx => `<h1>Turnip Almanac</h1>
    <p class="lede">The desk beside the table. Your rules, your characters, your campaign and its sessions, all on one big sheet that you zoom around.</p>
    <p>It sits next to <b>Turnip Works</b>, where the table itself is: the map, the pawns, the dice and the chat. Linked, the two talk to each other. A roll made here lands at the table, and a button pressed on a pawn there rolls here, by the game’s own rules.</p>
    ${ctx.where === 'desk' ? '<p class="next">Start with a game. Everything else on this sheet is the how and the why; zoom out to see all of it.</p>' : ''}`,
  pick: ctx => `<h2>${ctx.where === 'desk' ? '1 · ' : ''}Pick your game</h2>
    <p>Each game is its own table: its rules laid out by chapter, sample characters, and a builder that knows the rules. Pick the game and edition you play.</p>
    <div class="ogames">${GAMES.map(g => `<div class="ogame${ctx.game === g.id ? ' cur' : ''}"><div class="ogh"><b>${esc(g.game)}</b><span>${esc(g.blurb)}</span></div>
      <div class="oeds">${g.editions.map(e => e.soon ? `<span class="oed soon">${esc(e.ed)} <i>not yet</i></span>`
        : `<button class="btn oed" data-pick="${e.slug}">${esc(e.ed)}${ctx.game === g.id ? ' <i>this table</i>' : ' →'}</button>`).join('')}</div></div>`).join('')}</div>
    ${ctx.where === 'table' ? '' : `<div class="odrop" data-odrop="1"><b>Have the rulebook already?</b> Drop the PDF here, or <label class="btn obtn">choose it<input type="file" accept="application/pdf,.pdf" hidden data-ofile></label>. The desk will tell which game and edition it is, and keep it for that table.<span class="ost" data-ost></span></div>`}`,
  book: ctx => `<h2>${ctx.where === 'desk' ? '2 · ' : ''}Bring your rulebook</h2>
    <p>A table runs on <b>your own copy</b> of the book. Every book here is free from its maker. Download it from them, then open it on the table (or drop it on the game list here).</p>
    <p>The table checks that your file is the exact one it was made for, and keeps it <b>in this browser</b>. It is never sent anywhere: not to us, and not to Turnip Works. Its pages and pictures are drawn from your copy, on your screen.</p>
    <p class="small">What we keep is our own map of the book: page numbers, the names of things, the mechanics in our own structure, and a line or two of summary in our own words. That is how the rules can be searched, linked and rolled without the book ever leaving your hands.</p>
    ${ctx.where === 'table' && ctx.copy ? `<p class="ostate">${esc(ctx.copy)}</p>` : ''}
    <ul class="ogets">${GAMES.flatMap(g => g.editions.filter(e => e.get).map(e => `<li><b>${esc(g.game)}</b> · ${esc(e.ed)}: <a href="${esc(e.get.url.startsWith('http') ? e.get.url : root() + e.get.url)}" target="_blank" rel="noopener">${esc(e.get.label)} ↗</a></li>`)).join('')}</ul>`,
  seat: ctx => { const r = ctx.linked?.role || ctx.role;
    return `<h2>${ctx.where === 'desk' ? '3 · ' : ''}Your seat</h2>
    ${ctx.linked ? `<p class="ostate">At the Turnip Works table you are ${!ctx.linked.seatName || /^gm$/i.test(ctx.linked.seatName) ? (r === 'gm' ? 'the <b>GM</b>' : 'a <b>player</b>') : `<b>${esc(ctx.linked.seatName)}</b>, ${r === 'gm' ? 'the <b>GM</b>' : 'a <b>player</b>'}`}.</p>`
      : `<div class="oroles"><button class="btn orole${r === 'gm' ? ' on' : ''}" data-role="gm">I’m running the game</button><button class="btn orole${r === 'player' ? ' on' : ''}" data-role="player">I’m playing</button></div>`}
    <p><b>Running the game (GM).</b> The desk is yours: every character sheet, the book, the sessions and your notes. Linked to a Turnip Works table, the desk speaks through your GM seat: it puts the party on the table, and answers when a pawn’s button is pressed.</p>
    <p><b>Playing.</b> You will mostly live on your character’s sheet: roll from it, track damage, spend experience. Today the GM’s desk is the one linked to the table, and a pawn’s <i>Open the sheet</i> brings you to that character. A player’s own linked desk (your sheet, plus whatever the GM chooses to show) is the next thing being built.</p>`; },
  tw: ctx => `<h2>${ctx.where === 'desk' ? '4 · ' : ''}The Turnip Works table</h2>
    ${ctx.linked ? `<p class="ostate ok">Linked to <b>${esc(ctx.linked.tableName || 'a table')}</b>${ctx.linked.seatName ? ` as ${esc(ctx.linked.seatName)}` : ''}.</p>`
      : `<p class="ostate">Not linked to a table yet.</p><p><button class="btn obtn" data-twnew="1">Open a Turnip Works table for this campaign</button> or, from a table you already run: <b>Settings ▸ Invites and exports ▸ The desk ▸ Open the desk</b>. Either way the link is made for you; nothing to copy.</p>`}
    <p>Linked, the two halves work as one:</p>
    <ul><li><b>Rolls go both ways</b>, with the game’s own verdict (“3 successes vs TN 4”, “Special success”).</li>
      <li><b>Chat goes both ways</b>; you can speak as a character.</li>
      <li><b>Pawns carry the sheet’s buttons.</b> <i>Put the party on the table</i> gives each character a pawn whose Sheet card holds their skills and attacks. Pressing one there rolls it here.</li>
      <li><b>Everything but the book is kept with the table</b>, on the Turnip Works server: open the desk on another computer and the campaign is there. The book stays in your browser.</li>
      <li>An AI seat at the table can read the party’s numbers and ask the desk to roll.</li></ul>
    ${pic(ctx, 'tw-sheet.webp', 'A pawn’s Sheet card in Turnip Works, holding the desk’s buttons', 'tall', 312, 556)}`,
  how: ctx => HOW.map(h => `<h3>${h.t}</h3>${h.body(ctx)}`).join(''),
};
window.ORIENT = { GAMES, S, HOW, byPrint, tablePage, deskPage, local, esc };
})();
