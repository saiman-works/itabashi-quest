const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function boot({ search = '', supported = true, secure = true, leaflet = true } = {}) {
  let now = 1000000;
  let timerId = 0;
  const timers = new Map();
  const calls = [];
  const fits = [];
  const layers = [];
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], {
    textContent: '', hidden: false, disabled: false, style: {}, value: 0,
    focus() {}, removeAttribute(name) { delete this[name]; },
    children: [], appendChild(child) {
      if (child.parentElement) child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
  }]));
  const storage = () => {
    const data = new Map();
    return { getItem: (key) => data.get(key) || null,
      setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key), clear: () => data.clear() };
  };
  const map = { setView() { return this; }, fitBounds(bounds, options) { fits.push({ bounds, options }); },
    invalidateSize() {}, removeLayer() {} };
  const makeLayer = () => ({ addTo(parent) { if (parent.layers) parent.layers.push(this); return this; } });
  const L = {
    map: () => map, tileLayer: makeLayer, divIcon: (options) => options, latLngBounds: (points) => points,
    layerGroup: (items = []) => Object.assign(makeLayer(), { layers: items, clearLayers() { this.layers = []; } }),
    polyline: (points, options) => Object.assign(makeLayer(), { points, options }),
    marker: (point, options) => {
      const marker = Object.assign(makeLayer(), { point, options,
        bindPopup() { return this; }, bindTooltip() { return this; } });
      layers.push(marker);
      return marker;
    }
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const context = vm.createContext({ URLSearchParams, Date: Clock, console: { log() {}, error() {} },
    document: { readyState: 'complete', getElementById: (id) => elements[id] || null },
    navigator: supported ? { geolocation: { getCurrentPosition(success, error, options) { calls.push({ success, error, options }); } } } : {},
    localStorage: storage(), sessionStorage: storage(), location: { search, href: '' },
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: (id) => timers.delete(id), isSecureContext: secure
  });
  context.window = context;
  if (leaflet) context.L = L;
  vm.runInContext(fs.readFileSync(path.join(root, 'data/quests.js'), 'utf8'), context);
  // Expose only the pure distance helper to this isolated test context, not to the website.
  vm.runInContext(appSource.replace(/\}\)\(\);\s*$/, 'globalThis.distance = calculateDistanceMeters; })();'), context);
  const click = (id) => {
    elements[id].onclick();
    if (id === 'dialogueStartButton') {
      for (const [key, timer] of timers) {
        if (timer.ms === 550) { timers.delete(key); timer.fn(); }
      }
    }
  };
  const position = (stageIndex = 1, meters = 0, accuracy = 10) => {
    const stage = context.quest.stages[stageIndex];
    return { coords: { latitude: stage.lat + meters / 6371000 * 180 / Math.PI,
      longitude: stage.lng, accuracy }, timestamp: now };
  };
  return { elements, context, click, calls, fits, layers, timers, position, advance: (ms) => { now += ms; } };
}

test('zero-stage conversation is unchanged and GPS never starts automatically', () => {
  const t = boot();
  assert.equal(t.calls.length, 0);
  assert.equal(t.elements.mainButton.hidden, true);
  t.click('dialogueStartButton');
  assert.equal(t.elements.dialogueText.textContent, '見つかった！');
  for (let i = 1; i < t.context.quest.stages[0].introDialogue.length; i++) t.click('dialogueNextButton');
  assert.equal(t.elements.dialogueNextButton.textContent, '会話を終える');
  t.click('dialogueNextButton');
  t.click('mainButton');
  assert.equal(t.elements.progressText.textContent, '1 / 9');
  assert.equal(t.elements.mainButton.hidden, true);
  t.click('mainButton');
  assert.equal(t.elements.progressText.textContent, '1 / 9');
});

test('near destination needs five prayers and an explicit seal; next stage needs a fresh check', () => {
  const t = boot();
  t.click('manualClearButton');
  t.click('locationButton');
  assert.equal(t.elements.locationButton.disabled, true);
  assert.equal(t.elements.gpsStatus.textContent, '現在地を確認中...');
  assert.equal(t.calls[0].options.maximumAge, 0);
  t.calls[0].success(t.position());
  assert.equal(t.elements.prayerPanel.hidden, false);
  assert.equal(t.elements.progressText.textContent, '1 / 9');
  assert.equal(t.layers.at(-1).options.title, '現在地');
  assert.ok(Math.abs(t.fits.at(-1).bounds[0][0] - t.position().coords.latitude) < 1e-10);
  for (let i = 1; i <= 5; i++) {
    t.click('prayButton');
    assert.equal(t.elements.prayerPercent.textContent, `${i * 20}%`);
    assert.equal(t.elements.sealButton.hidden, i < 5);
  }
  assert.match(t.elements.prayerMessage.textContent, /祈りパワーMAX！/);
  t.click('sealButton');
  assert.equal(t.elements.progressText.textContent, '2 / 9');
  assert.equal(t.elements.prayerPanel.hidden, true);
  assert.equal(t.elements.prayerPercent.textContent, '0%');
  t.click('sealButton');
  assert.equal(t.elements.progressText.textContent, '2 / 9');
});

test('radius uses the unrounded distance; far points cannot pray or seal', () => {
  const t = boot();
  t.click('manualClearButton');
  for (const meters of [49.9, 50.1, 1000]) {
    t.click('locationButton');
    t.calls.at(-1).success(t.position(1, meters));
    assert.equal(t.elements.prayerPanel.hidden, meters > 50);
    if (meters > 50) {
      assert.match(t.elements.gpsStatus.textContent, /あと\d+mほど近づいてください/);
      t.click('prayButton');
      t.click('sealButton');
      assert.equal(t.elements.progressText.textContent, '1 / 9');
    }
  }
  assert.equal(t.context.distance(0, 0, 0, 0), 0);
  assert.ok(Math.abs(t.context.distance(0, 0, 0, 1) - 111194.9266) < 0.01);
  assert.ok(Number.isFinite(t.context.distance(0, 0, 0, 180)));
});

test('permission denied, unavailable and timeout recover, allowing retry and manual completion', () => {
  const t = boot();
  t.click('manualClearButton');
  for (const [code, text] of [[1, /許可/], [2, /取得できません/], [3, /タイムアウト/]]) {
    t.click('locationButton');
    t.calls.at(-1).error({ code });
    assert.match(t.elements.gpsStatus.textContent, text);
    assert.equal(t.elements.locationButton.disabled, false);
    assert.equal(t.elements.prayerPanel.hidden, true);
  }
  for (let i = 0; i < 8; i++) t.click('manualClearButton');
  assert.equal(t.elements.progressText.textContent, '9 / 9');
  assert.equal(t.elements.rewardArea.hidden, false);
  t.click('reset-button');
  assert.equal(t.elements.progressText.textContent, '0 / 9');
  assert.equal(t.elements.dialogueStartButton.hidden, false);
});

test('late callbacks cannot authorize a different stage or a reset', () => {
  const t = boot();
  t.click('manualClearButton');
  t.click('locationButton');
  const old = t.calls[0];
  t.click('manualClearButton');
  old.success(t.position(2));
  assert.equal(t.elements.distanceText.textContent, '次の目的地まで：未確認');
  assert.equal(t.elements.prayerPanel.hidden, true);
  t.click('locationButton');
  const beforeReset = t.calls.at(-1);
  t.click('reset-button');
  beforeReset.success(t.position(0));
  assert.equal(t.elements.progressText.textContent, '0 / 9');
  assert.equal(t.elements.distanceText.textContent, '次の目的地まで：未確認');
});

test('old GPS checks expire and unanswered requests have a bounded wait', () => {
  const t = boot();
  t.click('manualClearButton');
  t.click('locationButton');
  t.calls.at(-1).success(t.position());
  for (let i = 0; i < 5; i++) t.click('prayButton');
  t.advance(120001);
  t.click('sealButton');
  assert.equal(t.elements.progressText.textContent, '1 / 9');
  assert.equal(t.elements.prayerPanel.hidden, true);
  t.click('locationButton');
  const pending = t.calls.at(-1);
  [...t.timers.values()].find((timer) => timer.ms === 20000).fn();
  assert.match(t.elements.gpsStatus.textContent, /タイムアウト/);
  pending.success(t.position());
  assert.equal(t.elements.prayerPanel.hidden, true);
});

test('unsupported/insecure GPS and missing Leaflet never stop game progression', () => {
  for (const options of [{ supported: false }, { secure: false }, { leaflet: false }]) {
    const t = boot(options);
    t.click('locationButton');
    if (options.supported === false || options.secure === false) assert.equal(t.calls.length, 0);
    for (let i = 0; i < 9; i++) t.click('manualClearButton');
    assert.equal(t.elements.rewardArea.hidden, false);
  }
});

test('ordinary URLs keep debug empty, and debug=1 shows debug text', () => {
  for (const [search, hidden] of [['', true], ['?debug=0', true], ['?debug=1', false]]) {
    const t = boot({ search });
    t.click('manualClearButton');
    assert.equal(t.elements.debugBar.hidden, hidden);
    assert.equal(t.elements.debugBar.textContent === '', hidden);
  }
});

test('every seal including the shrine can complete with GPS; GPS coordinates are not saved', () => {
  const t = boot();
  t.click('manualClearButton');
  for (let index = 1; index < 9; index++) {
    t.click('locationButton');
    t.calls.at(-1).success(t.position(index));
    for (let taps = 0; taps < 5; taps++) t.click('prayButton');
    t.click('sealButton');
    assert.equal(t.elements.progressText.textContent, `${index + 1} / 9`);
  }
  assert.equal(t.elements.rewardArea.hidden, false);
  const saved = JSON.parse(t.context.localStorage.getItem('itabashiQuestMinimalProgress'));
  assert.equal(saved.completedStageIds.length, 9);
  assert.equal(saved.gpsPosition, undefined);
  assert.equal(saved.checkin, undefined);
  assert.equal(t.calls.length, 8);
});

test('malformed GPS data and synchronous API failures remain recoverable', () => {
  const t = boot();
  t.click('manualClearButton');
  t.click('locationButton');
  t.calls.at(-1).success({ coords: { latitude: NaN, longitude: 139 } });
  assert.equal(t.elements.locationButton.disabled, false);
  assert.equal(t.elements.prayerPanel.hidden, true);
  t.context.navigator.geolocation.getCurrentPosition = () => { throw new Error('blocked'); };
  t.click('locationButton');
  assert.equal(t.elements.locationButton.disabled, false);
  assert.match(t.elements.gpsStatus.textContent, /取得に失敗/);
});

test('gpsTest=1 uses target coordinates without calling Geolocation, and preserves prayer flow', () => {
  const t = boot({ search: '?gpsTest=1', supported: false, secure: false });
  assert.equal(t.elements.gpsTestNotice.hidden, false);
  assert.equal(t.elements.mainButton.hidden, true);
  assert.equal(t.elements.prayerPanel.hidden, true);
  t.click('manualClearButton');
  for (let stage = 1; stage < 9; stage++) {
    t.click('locationButton');
    assert.equal(t.calls.length, 0);
    assert.equal(t.elements.distanceText.textContent, '次の目的地まで：約0m');
    assert.equal(t.elements.prayerPanel.hidden, false);
    assert.equal(t.elements.sealButton.hidden, true);
    for (let taps = 1; taps <= 5; taps++) {
      t.click('prayButton');
      assert.equal(t.elements.prayerPercent.textContent, `${taps * 20}%`);
    }
    assert.match(t.elements.prayerMessage.textContent, /祈りパワーMAX！/);
    t.click('sealButton');
    assert.equal(t.elements.progressText.textContent, `${stage + 1} / 9`);
  }
  assert.equal(t.elements.rewardArea.hidden, false);
});

test('only exact gpsTest=1 enables the mode; debug is independent', () => {
  for (const search of ['', '?gpsTest=0', '?gpsTest=true', '?debug=1']) {
    const t = boot({ search });
    assert.equal(t.elements.gpsTestNotice.hidden, true);
    t.click('manualClearButton');
    t.click('locationButton');
    assert.equal(t.calls.length, 1);
    assert.equal(t.elements.prayerPanel.hidden, true);
  }
  for (const search of ['?gpsTest=1', '?gpsTest=1&debug=1']) {
    const t = boot({ search });
    t.click('manualClearButton');
    t.click('locationButton');
    assert.equal(t.calls.length, 0);
    assert.equal(t.elements.prayerPanel.hidden, false);
    assert.equal(t.elements.debugBar.hidden, !search.includes('debug=1'));
    t.click('reset-button');
    const params = new URLSearchParams(t.context.location.href.split('?')[1]);
    assert.equal(params.get('gpsTest'), '1');
    assert.equal(t.elements.progressText.textContent, '0 / 9');
    assert.equal(t.elements.dialogueStartButton.hidden, false);
    assert.equal(t.elements.prayerPanel.hidden, true);
  }
});

test('visual scenes, arrival, prayer lines, seal result and reward use quest data', () => {
  const t = boot({ search: '?gpsTest=1' });
  assert.equal(t.elements.stageBackground.src, 'assets/bg_start_flowerbed.png');
  assert.equal(t.elements.stageCompanions.hidden, true);
  assert.equal(t.elements.dialogueStartButton.textContent, '花壇をしらべる');
  t.click('dialogueStartButton');
  assert.equal(t.elements.investigateEffect.textContent, 'カサ……カサカサ……');
  assert.equal(t.elements.stageCompanions.hidden, false);
  assert.equal(t.context.quest.stages[0].introDialogue.length, 18);
  t.click('manualClearButton');
  assert.equal(t.elements.stageBackground.src, 'assets/bg_stage_tail_entrance.png');
  t.click('locationButton');
  assert.equal(t.elements.arrivalMessage.hidden, false);
  assert.match(t.elements.arrivalMessage.textContent, /目的地に着いた！/);
  for (let taps = 1; taps <= 5; taps++) {
    t.click('prayButton');
    assert.equal(t.elements.prayerMessage.textContent, t.context.quest.prayerMessages[taps]);
  }
  t.click('sealButton');
  assert.match(t.elements.sealResultText.textContent, /しっぽの札が光った/);
  assert.equal(t.elements.stageVisual.hidden, true);
  t.click('dismissResultButton');
  assert.equal(t.elements.sealResult.hidden, true);
  for (let i = 0; i < 7; i++) t.click('manualClearButton');
  assert.equal(t.elements.rewardTitle.textContent, '暗渠の龍のしるし');
  assert.equal(t.elements.rewardType.textContent, 'タイプ：水の道カード');
  t.click('reset-button');
  assert.equal(t.elements.stageCompanions.hidden, true);
  assert.equal(t.elements.sealResult.hidden, true);
});

test('inspection callback is ignored after manual clear', () => {
  const t = boot();
  t.elements.dialogueStartButton.onclick();
  const timer = [...t.timers.values()].find((entry) => entry.ms === 550);
  assert.equal(t.elements.dialogueStartButton.disabled, true);
  t.click('manualClearButton');
  timer.fn();
  assert.equal(t.elements.progressText.textContent, '1 / 9');
  assert.equal(t.elements.dialogueBox.hidden, true);
});

test('opening keeps visual and story together; GPS and destination layout return after introduction', () => {
  const t = boot({ search: '?gpsTest=1' });
  assert.equal(t.elements.gpsPanel.hidden, true);
  assert.equal(t.elements.destinationCard.hidden, true);
  assert.equal(t.elements.stageVisual.parentElement, t.elements.eventVisualHost);
  t.click('dialogueStartButton');
  assert.equal(t.elements.stageVisual.parentElement, t.elements.eventVisualHost);
  for (let i = 1; i < 18; i++) t.click('dialogueNextButton');
  t.click('dialogueNextButton');
  t.click('mainButton');
  assert.equal(t.elements.gpsPanel.hidden, false);
  assert.equal(t.elements.destinationCard.hidden, false);
  assert.equal(t.elements.stageVisual.parentElement, t.elements.destinationVisualHost);
  t.click('locationButton');
  for (let i = 0; i < 5; i++) t.click('prayButton');
  t.click('sealButton');
  assert.equal(t.elements.progressText.textContent, '2 / 9');
  t.click('reset-button');
  assert.equal(t.elements.stageVisual.parentElement, t.elements.eventVisualHost);
  assert.equal(t.elements.gpsPanel.hidden, true);
});
