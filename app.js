(function () {
  "use strict";

  const STORAGE_KEY = "itabashiQuestMinimalProgress";
  const STORAGE_KEYS = [
    STORAGE_KEY,
    "itabashiQuestProgress",
    "currentQuestId",
    "currentStageIndex",
    "completedStageIds",
    "requestAccepted",
    "dragonBodyRevealed",
    "finalCleared",
    "startedAt",
    "clearedAt"
  ];

  let currentQuest = null;
  let state = createInitialState();
  let elements = {};
  let map = null;
  let markerLayer = null;
  let dragonLine = null;
  let dialogueState = { stageId: null, index: -1, completed: false };

  attachEmergencyReset();
  startWhenReady();

  function startWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initApp, { once: true });
      return;
    }
    initApp();
  }

  function initApp() {
    try {
      const debugBar = document.getElementById("debugBar");
      if (debugBar) {
        debugBar.hidden = new URLSearchParams(window.location.search).get("debug") !== "1";
      }
      console.log("app init started");
      setDebugStatus("app init started");

      elements = collectElements();
      attachEmergencyReset();

      if (new URLSearchParams(window.location.search).has("reset")) {
        console.log("reset clicked");
        clearAllStorage();
      }

      currentQuest = window.quest || (Array.isArray(window.quests) ? window.quests[0] : null);
      if (!currentQuest || !Array.isArray(currentQuest.stages)) {
        throw new Error("quest data is missing. data/quests.js を確認してください。");
      }

      console.log("quest loaded", currentQuest);
      setDebugStatus("app init started / quest data loaded");

      state = loadState();
      bindEvents();
      initMapSafely();
      renderApp();
      setDebugStatus("app init started / quest data loaded / render first stage / app init completed");
      console.log("app init completed");
    } catch (error) {
      showInitError(error);
    }
  }

  function collectElements() {
    const ids = [
      "debugBar",
      "appTitle",
      "chapterTitle",
      "questTitle",
      "questSubtitle",
      "stageNumber",
      "stageName",
      "destinationLabel",
      "destinationName",
      "destinationPlace",
      "stageDescription",
      "progressText",
      "progressFill",
      "map",
      "mapStatus",
      "mainButton",
      "dialogueStartButton",
      "dialogueBox",
      "dialogueSpeaker",
      "dialogueText",
      "dialogueNextButton",
      "fairyImage",
      "fairyFallback",
      "reset-button",
      "manualClearButton",
      "rewardArea",
      "rewardTitle",
      "rewardQuest",
      "rewardDescription",
      "clearedAt"
    ];

    const found = {};
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        throw new Error(`missing element: #${id}`);
      }
      const key = id === "reset-button" ? "resetButton" : id;
      found[key] = element;
    });
    return found;
  }

  function bindEvents() {
    elements.mainButton.onclick = () => {
      const stage = currentQuest.stages[state.currentStageIndex];
      if (stage?.introDialogue?.length && !dialogueState.completed) return;
      completeCurrentStage();
    };
    elements.dialogueStartButton.onclick = () => {
      dialogueState.index = 0;
      renderIntroDialogue(currentQuest.stages[state.currentStageIndex], false);
      elements.dialogueNextButton.focus();
      invalidateMapSoon();
    };
    elements.dialogueNextButton.onclick = advanceDialogue;
    elements.manualClearButton.onclick = () => {
      console.log("manual clear clicked");
      completeCurrentStage();
    };
    elements.resetButton.onclick = resetProgress;
  }

  function attachEmergencyReset() {
    const resetButton = document.getElementById("reset-button");
    if (!resetButton) {
      return;
    }
    resetButton.onclick = () => {
      console.log("reset clicked");
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.error("emergency reset storage clear failed", error);
      }
      location.href = "index.html?leaflet=4&reset=" + Date.now();
    };
  }

  function loadState() {
    const fallback = createInitialState();

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) {
        return fallback;
      }

      const currentStageIndex = Number.isInteger(saved.currentStageIndex) ? saved.currentStageIndex : 0;
      return {
        currentStageIndex: Math.max(0, Math.min(currentStageIndex, currentQuest.stages.length)),
        completedStageIds: Array.isArray(saved.completedStageIds) ? saved.completedStageIds : [],
        clearedAt: saved.clearedAt || null,
        finalCleared: Boolean(saved.finalCleared),
        dragonBodyRevealed: Boolean(saved.dragonBodyRevealed)
      };
    } catch (error) {
      console.error("progress load failed", error);
      clearAllStorage();
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("progress save failed", error);
    }
  }

  function renderApp() {
    const total = currentQuest.stages.length;
    const isCleared = state.currentStageIndex >= total;
    const currentStageIndex = Math.min(state.currentStageIndex, total - 1);
    const stage = currentQuest.stages[currentStageIndex];

    console.log("render stage", state.currentStageIndex);

    elements.appTitle.textContent = currentQuest.appTitle;
    elements.chapterTitle.textContent = currentQuest.chapterTitle;
    elements.questTitle.textContent = currentQuest.questTitle;
    elements.questSubtitle.textContent = currentQuest.questSubtitle;

    elements.stageNumber.textContent = isCleared ? `${total} / ${total}` : `${stage.stageNo} / ${total}`;
    elements.stageName.textContent = isCleared ? "成仏完了" : stage.gameName;
    elements.destinationLabel.textContent = isCleared ? "クエスト完了" : "次の目的地";
    elements.destinationName.textContent = isCleared ? "成仏完了" : stage.gameName;
    elements.destinationPlace.textContent = isCleared ? "花たちの願いが届きました。" : stage.realName;
    elements.stageDescription.textContent = isCleared ? stage.afterText : stage.beforeText;

    elements.progressText.textContent = `${state.completedStageIds.length} / ${total}`;
    elements.progressFill.style.width = `${Math.round((state.completedStageIds.length / total) * 100)}%`;

    elements.mainButton.textContent = isCleared ? "クリア済み" : stage.buttonText;
    elements.mainButton.disabled = isCleared;
    elements.manualClearButton.disabled = false;
    renderIntroDialogue(stage, isCleared);

    renderReward(isCleared);
    renderMapSafely();
    renderDebug();
  }

  function completeCurrentStage() {
    const total = currentQuest.stages.length;
    if (state.currentStageIndex >= total) {
      renderApp();
      return;
    }

    const stage = currentQuest.stages[state.currentStageIndex];
    if (!state.completedStageIds.includes(stage.id)) {
      state.completedStageIds.push(stage.id);
    }

    state.currentStageIndex += 1;
    if (state.currentStageIndex >= total && !state.clearedAt) {
      state.clearedAt = new Date().toISOString();
    }

    saveState();
    renderApp();
  }

  function renderIntroDialogue(stage, isCleared) {
    if (dialogueState.stageId !== stage.id) {
      dialogueState = { stageId: stage.id, index: -1, completed: false };
      configureFairyImage(stage.fairyImage);
    }
    const hasDialogue = !isCleared && Array.isArray(stage.introDialogue) && stage.introDialogue.length > 0;
    const isTalking = hasDialogue && dialogueState.index >= 0 && !dialogueState.completed;
    elements.dialogueStartButton.hidden = !hasDialogue || isTalking || dialogueState.completed;
    elements.dialogueBox.hidden = !isTalking;
    elements.mainButton.hidden = hasDialogue && !dialogueState.completed;
    elements.dialogueStartButton.textContent = stage.dialogueStartButtonText || "話しかける";
    if (!isTalking) return;

    const line = stage.introDialogue[dialogueState.index];
    elements.dialogueSpeaker.textContent = line.speaker;
    elements.dialogueText.textContent = line.text;
    elements.dialogueNextButton.textContent = dialogueState.index === stage.introDialogue.length - 1
      ? stage.dialogueEndButtonText || "会話を終える"
      : stage.dialogueNextButtonText || "次へ";
  }

  function advanceDialogue() {
    const stage = currentQuest.stages[state.currentStageIndex];
    if (!stage?.introDialogue?.length || dialogueState.index < 0 || dialogueState.completed) return;
    if (dialogueState.index < stage.introDialogue.length - 1) {
      dialogueState.index += 1;
    } else {
      dialogueState.completed = true;
    }
    renderIntroDialogue(stage, false);
    if (dialogueState.completed) elements.mainButton.focus();
    invalidateMapSoon();
  }

  function configureFairyImage(path) {
    elements.fairyImage.hidden = true;
    elements.fairyFallback.hidden = false;
    elements.fairyImage.onload = () => {
      elements.fairyImage.hidden = false;
      elements.fairyFallback.hidden = true;
    };
    elements.fairyImage.onerror = () => {
      elements.fairyImage.hidden = true;
      elements.fairyFallback.hidden = false;
    };
    if (path) elements.fairyImage.src = path;
    else elements.fairyImage.removeAttribute("src");
  }

  function resetProgress() {
    console.log("reset clicked");
    clearAllStorage();
    state = createInitialState();
    dialogueState = { stageId: null, index: -1, completed: false };
    renderApp();
    location.href = "index.html?leaflet=4&reset=" + Date.now();
  }

  function createInitialState() {
    return {
      currentStageIndex: 0,
      completedStageIds: [],
      clearedAt: null,
      finalCleared: false,
      dragonBodyRevealed: false
    };
  }

  function clearAllStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error("storage clear failed", error);
    }
  }

  function renderReward(isCleared) {
    elements.rewardArea.hidden = !isCleared;
    if (!isCleared) {
      return;
    }

    elements.rewardTitle.textContent = currentQuest.rewardCardTitle;
    elements.rewardQuest.textContent = currentQuest.questTitle;
    elements.rewardDescription.textContent = currentQuest.rewardCardDescription;
    elements.clearedAt.textContent = `クリア日時：${formatDateTime(state.clearedAt)}`;
  }

  function initMapSafely() {
    console.log("map init started");
    if (!elements.map) {
      return;
    }

    if (!window.L) {
      showMapFallback("地図を読み込めませんでした");
      console.error("Leaflet is not available");
      return;
    }

    try {
      const firstStage = currentQuest.stages[0];
      map = L.map(elements.map, {
        zoomControl: true,
        attributionControl: true
      }).setView([firstStage.lat, firstStage.lng], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      markerLayer = L.layerGroup().addTo(map);
      elements.mapStatus.textContent = "地図表示中";
      invalidateMapSoon();
      console.log("map init completed");
    } catch (error) {
      console.error("map init failed", error);
      map = null;
      showMapFallback("地図を読み込めませんでした");
    }
  }

  function renderMapSafely() {
    console.log("render map markers", state.currentStageIndex, state.completedStageIds);
    if (!map || !markerLayer || !window.L) {
      return;
    }

    try {
      const visibleStages = getVisibleStagesForMap();
      markerLayer.clearLayers();

      visibleStages.forEach((stage) => {
        const isCurrent = state.currentStageIndex < currentQuest.stages.length &&
          currentQuest.stages[state.currentStageIndex].id === stage.id;
        const marker = L.marker([stage.lat, stage.lng], {
          icon: createStageIcon(stage),
          title: stage.gameName,
          alt: stage.gameName,
          zIndexOffset: isCurrent ? 1000 : 0
        }).bindPopup(`${escapeHtml(stage.gameName)}<br>${escapeHtml(stage.realName)}`).addTo(markerLayer);
        if (isCurrent) {
          marker.bindTooltip("次の目的地", {
            permanent: true, direction: "top", offset: [0, -18],
            className: "destination-tooltip"
          });
        }
      });

      renderDragonLine();
      updateMapViewport(visibleStages);
      invalidateMapSoon();
      elements.mapStatus.textContent = `表示地点：${visibleStages.length}`;
    } catch (error) {
      console.error("render map failed", error);
      showMapFallback("地図を読み込めませんでした");
    }
  }

  function getVisibleStagesForMap() {
    const stages = currentQuest.stages;
    const completedIds = new Set(state.completedStageIds);
    const bodyStages = stages.filter((stage) => stage.type === "seal");
    const allBodyCleared = bodyStages.every((stage) => completedIds.has(stage.id));

    if (state.currentStageIndex >= stages.length) {
      return stages;
    }

    const visible = stages.filter((stage) => stage.type !== "final");
    if (allBodyCleared || stages[state.currentStageIndex + 1]?.type === "final") {
      visible.push(...stages.filter((stage) => stage.type === "final"));
    }
    return uniqueStages(visible);
  }

  function uniqueStages(stages) {
    return stages.filter((stage, index, array) => array.findIndex((item) => item.id === stage.id) === index);
  }

  function createStageIcon(stage) {
    const isCompleted = state.completedStageIds.includes(stage.id);
    if (isCompleted) {
      return L.divIcon({
        className: "",
        html: '<div class="ofuda-marker">封</div>',
        iconSize: [28, 42],
        iconAnchor: [14, 39],
        popupAnchor: [0, -34]
      });
    }

    const isCurrent = state.currentStageIndex < currentQuest.stages.length &&
      currentQuest.stages[state.currentStageIndex].id === stage.id;
    const label = stage.type === "request" ? "花" : stage.type === "final" ? "結" : "";
    const size = isCurrent ? 30 : stage.type === "seal" ? 18 : 28;
    const typeClass = stage.type === "request" ? "request" : stage.type === "final" ? "final" : "seal";
    const currentClass = isCurrent ? "current" : "";

    return L.divIcon({
      className: "",
      html: `<div class="quest-marker ${typeClass} ${currentClass}">${isCurrent ? '<span class="next-marker-pulse" aria-hidden="true"></span>' : ""}<span class="next-marker-core">${label}</span></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -16]
    });
  }

  function renderDragonLine() {
    if (dragonLine) {
      map.removeLayer(dragonLine);
      dragonLine = null;
    }

    const bodyStages = currentQuest.stages.filter((stage) => stage.type === "seal");
    if (bodyStages.length < 2) {
      return;
    }

    const sealedCount = bodyStages.filter((stage) => state.completedStageIds.includes(stage.id)).length;
    const palette = sealedCount === bodyStages.length
      ? ["#bd3a32", "#e3ad42", "#fff4ba"]
      : sealedCount >= Math.ceil(bodyStages.length / 2)
        ? ["#c47946", "#eac16a", "#fff5ce"]
        : ["#2387b8", "#54c5e3", "#e4fbff"];
    const points = bodyStages.map((stage) => [stage.lat, stage.lng]);
    const isCleared = state.currentStageIndex >= currentQuest.stages.length;
    // One layer group owns the glow, body and bright core, so clearing removes all three.
    dragonLine = L.layerGroup([
      L.polyline(points, { color: palette[0], weight: isCleared ? 40 : 22, opacity: isCleared ? 0.28 : 0.22, interactive: false }),
      L.polyline(points, { color: palette[1], weight: isCleared ? 24 : 12, opacity: isCleared ? 0.6 : 0.65, interactive: false }),
      L.polyline(points, { color: palette[2], weight: 3, opacity: isCleared ? 0.8 : 0.95, interactive: false })
    ]).addTo(map);
  }

  function getVirtualCurrentPoint() {
    // Only completed points can stand in for the player's location.
    const arrivedStage = currentQuest.stages.slice(0, state.currentStageIndex)
      .reverse().find((stage) => state.completedStageIds.includes(stage.id));
    return arrivedStage ? [arrivedStage.lat, arrivedStage.lng] : null;
  }

  function getNextTargetPoint() {
    const target = currentQuest.stages[state.currentStageIndex];
    return target ? [target.lat, target.lng] : null;
  }

  function getViewportPoints(visibleStages, currentPoint) {
    if (state.currentStageIndex >= currentQuest.stages.length) {
      const bodyStages = currentQuest.stages.filter((stage) => stage.type === "seal");
      if (bodyStages.length) {
        return bodyStages.map((stage) => [stage.lat, stage.lng]);
      }
    }
    const target = getNextTargetPoint();
    if (state.currentStageIndex > 0 && currentPoint && target) {
      return [currentPoint, target];
    }
    return visibleStages.map((stage) => [stage.lat, stage.lng]);
  }

  // A future GPS integration can pass [lat, lng]; without it use the last arrival.
  function updateMapViewport(visibleStages, currentPoint = getVirtualCurrentPoint()) {
    const points = getViewportPoints(visibleStages, currentPoint);
    if (!map || !points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }

    const inProgress = state.currentStageIndex > 0 && Boolean(getNextTargetPoint());
    const isCleared = state.currentStageIndex >= currentQuest.stages.length;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      // Leave room above the head's tall ofuda, without including the start or shrine.
      paddingTopLeft: isCleared ? [24, 44] : [52, 68],
      paddingBottomRight: isCleared ? [24, 20] : [52, 56],
      maxZoom: inProgress ? 18 : 17, animate: false
    });
  }

  function showMapFallback(message) {
    elements.map.innerHTML = `<div class="map-fallback">${escapeHtml(message)}</div>`;
    elements.mapStatus.textContent = message;
  }

  function invalidateMapSoon() {
    if (!map) {
      return;
    }
    map.invalidateSize();
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 80);
  }

  function renderDebug() {
    elements.debugBar.textContent = [
      "app init started",
      "quest data loaded",
      state.currentStageIndex === 0 ? "render first stage" : `render stage ${state.currentStageIndex}`,
      "app init completed",
      `currentStageIndex: ${state.currentStageIndex}`,
      `completedStageIds: ${JSON.stringify(state.completedStageIds)}`
    ].join(" / ");
  }

  function setDebugStatus(message) {
    const debugBar = document.getElementById("debugBar");
    if (debugBar) {
      debugBar.textContent = message;
    }
  }

  function showInitError(error) {
    console.error("app init failed", error);
    const message = error && error.message ? error.message : String(error);
    setDebugStatus(`初期化エラー：${message}`);
    const stageName = document.getElementById("stageName");
    const stageDescription = document.getElementById("stageDescription");
    const mainButton = document.getElementById("mainButton");
    if (stageName) {
      stageName.textContent = "初期化エラー";
    }
    if (stageDescription) {
      stageDescription.textContent = `初期化エラー：${message}`;
    }
    if (mainButton) {
      mainButton.textContent = "初期化エラー";
      mainButton.disabled = true;
    }
  }

  function formatDateTime(value) {
    if (!value) {
      return "--";
    }
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
