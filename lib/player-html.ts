export function buildPlayerHtml(
  supabaseUrl: string,
  anonKey: string,
  version: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Crystagrid Player</title>
<style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
body { font-family: Arial, Helvetica, sans-serif; color: #fff; cursor: none; }
#pairScreen, #emptyScreen { display: none; position: absolute; top: 50%; left: 50%; width: 90%; text-align: center; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); }
#stage { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; }
#layerA, #layerB { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; opacity: 0; -webkit-transition: opacity 0.6s; transition: opacity 0.6s; }
#debug { display: none; position: fixed; top: 0; left: 0; z-index: 9999; background: rgba(0, 0, 0, 0.85); color: #fff; font-family: monospace; font-size: 12px; line-height: 1.35; padding: 8px; margin: 0; max-width: 95%; white-space: pre-wrap; pointer-events: none; }
#debugHit { position: fixed; right: 0; bottom: 0; width: 100px; height: 100px; z-index: 9998; background: transparent; }
</style>
</head>
<body>
<div id="pairScreen">
  <div style="color: #ffffff; font-size: 5vmin; font-weight: 700; margin-bottom: 2vmin;">Crystagrid</div>
  <div style="color: #ffffff; font-size: 4vmin; margin-bottom: 3vmin;">Pair this screen</div>
  <div id="codeText" style="color: #ffffff; font-weight: 700; font-size: 20vmin; letter-spacing: 0.08em; white-space: nowrap; line-height: 1.1; margin-bottom: 2vmin;"></div>
  <div id="countdown" style="color: #9ca3af; font-size: 3.5vmin; margin-bottom: 3vmin;">--:--</div>
  <div style="color: #d1d5db; font-size: 3vmin; max-width: 90%; margin: 0 auto;">Open your Crystagrid dashboard, go to Screens, click Pair Screen and enter this code.</div>
  <div id="pairError" style="display: none; color: #6b7280; font-size: 2.5vmin; margin-top: 2vmin;"></div>
</div>
<div id="emptyScreen">
  <div id="emptyName" style="color: #ffffff; font-size: 5vmin; font-weight: 700; margin-bottom: 2vmin;">Crystagrid screen</div>
  <div style="color: #ffffff; font-size: 4vmin;">No playlist assigned yet</div>
  <div id="emptyError" style="display: none; color: #6b7280; font-size: 2.5vmin; margin-top: 2vmin;"></div>
</div>
<div id="stage">
  <div id="layerA"></div>
  <div id="layerB"></div>
</div>
<div id="debug"></div>
<div id="debugHit"></div>
<script>
(function () {
  "use strict";

  var SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
  var ANON_KEY = ${JSON.stringify(anonKey)};
  var PLAYER_VERSION = ${JSON.stringify(version)};
  var TOKEN_KEY = "crystagrid_device_token";
  var CODE_KEY = "crystagrid_player_code";
  var EXPIRES_KEY = "crystagrid_player_expires_at";
  var PLAYLIST_KEY = "crystagrid_last_playlist";
  var VERSION_RELOAD_KEY = "crystagrid_player_version_reload";
  var VERSION_CHECK_INTERVAL_MS = 60000;
  var VERSION_RELOAD_COOLDOWN_MS = 300000;
  var versionReloadAt = 0;
  var NEWLINE = String.fromCharCode(10);

  var pairScreen = document.getElementById("pairScreen");
  var emptyScreen = document.getElementById("emptyScreen");
  var emptyName = document.getElementById("emptyName");
  var stage = document.getElementById("stage");
  var codeText = document.getElementById("codeText");
  var countdown = document.getElementById("countdown");
  var pairError = document.getElementById("pairError");
  var emptyError = document.getElementById("emptyError");
  var debugPanel = document.getElementById("debug");
  var debugHit = document.getElementById("debugHit");
  var layerA = document.getElementById("layerA");
  var layerB = document.getElementById("layerB");

  var token = null;
  var code = null;
  var expiresAt = null;
  var screenName = null;
  var state = "boot";
  var items = [];
  var lastItems = [];
  var signature = "";
  var currentIndex = 0;
  var currentElement = null;
  var playing = false;
  var transitionPending = false;
  var playToken = 0;
  var activeLayer = layerA;
  var idleLayer = layerB;
  var itemTimer = null;
  var safetyTimer = null;
  var pollTimer = null;
  var pollIntervalMs = 0;
  var pollInFlight = false;
  var requesting = false;
  var lastPollTime = "--";
  var lastPollResult = "--";
  var lastError = null;
  var debugOn = false;
  var tapTimes = [];

  function storageGet(key) {
    try {
      if (!window.localStorage) {
        return null;
      }
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (!window.localStorage) {
        return;
      }
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function storageRemove(key) {
    try {
      if (!window.localStorage) {
        return;
      }
      window.localStorage.removeItem(key);
    } catch (e) {}
  }

  function sessionStorageGet(key) {
    try {
      if (!window.sessionStorage) {
        return null;
      }
      return window.sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function sessionStorageSet(key, value) {
    try {
      if (!window.sessionStorage) {
        return;
      }
      window.sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function pad2(value) {
    var text = String(value);
    while (text.length < 2) {
      text = "0" + text;
    }
    return text;
  }

  function timeString() {
    var now = new Date();
    return pad2(now.getHours()) + ":" + pad2(now.getMinutes()) + ":" + pad2(now.getSeconds());
  }

  function formatRemaining(milliseconds) {
    var total = Math.ceil(milliseconds / 1000);
    if (total < 0) {
      total = 0;
    }
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;
    return pad2(minutes) + ":" + pad2(seconds);
  }

  function firstRow(data) {
    if (!data) {
      return null;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return null;
      }
      data = data[0];
    }
    if (data && typeof data === "object") {
      return data;
    }
    return null;
  }

  function codeToString(value) {
    if (typeof value === "number") {
      var text = String(value);
      while (text.length < 6) {
        text = "0" + text;
      }
      return text;
    }
    if (typeof value === "string") {
      return value;
    }
    return "";
  }

  function parseCodeResponse(data) {
    var row = firstRow(data);
    if (!row) {
      return null;
    }
    var parsedCode = codeToString(row.code);
    var deviceToken = typeof row.device_token === "string" ? row.device_token : null;
    var expires = typeof row.expires_at === "string" ? row.expires_at : null;
    if (!parsedCode || !deviceToken || !expires) {
      return null;
    }
    return { code: parsedCode, device_token: deviceToken, expires_at: expires };
  }

  function parseItem(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    var type = value.type === "image" || value.type === "video" ? value.type : null;
    var id = typeof value.id === "string" ? value.id : typeof value.id === "number" ? String(value.id) : null;
    var filePath = typeof value.file_path === "string" ? value.file_path : null;
    if (!type || !id || !filePath) {
      return null;
    }
    var duration = null;
    if (typeof value.duration === "number" && isFinite(value.duration)) {
      duration = value.duration;
    } else if (typeof value.duration === "string" && value.duration !== "") {
      var parsed = Number(value.duration);
      if (isFinite(parsed)) {
        duration = parsed;
      }
    }
    var clipStart = 0;
    if (typeof value.clip_start === "number" && isFinite(value.clip_start)) {
      clipStart = value.clip_start;
    } else if (typeof value.clip_start === "string" && value.clip_start !== "") {
      var parsedClipStart = Number(value.clip_start);
      if (isFinite(parsedClipStart)) {
        clipStart = parsedClipStart;
      }
    }
    if (clipStart < 0) {
      clipStart = 0;
    }
    return {
      id: id,
      type: type,
      file_path: filePath,
      duration: duration,
      clip_start: clipStart,
    };
  }

  function parsePollResponse(data) {
    var row = firstRow(data);
    if (!row) {
      return null;
    }
    var status = row.status;
    if (status !== "waiting" && status !== "expired" && status !== "invalid" && status !== "paired") {
      return null;
    }
    var parsedItems = [];
    if (Array.isArray(row.items)) {
      for (var i = 0; i < row.items.length; i++) {
        var item = parseItem(row.items[i]);
        if (item) {
          parsedItems.push(item);
        }
      }
    }
    return {
      status: status,
      expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
      screen_id: typeof row.screen_id === "string" ? row.screen_id : null,
      screen_name: typeof row.screen_name === "string" ? row.screen_name : null,
      playlist_id: typeof row.playlist_id === "string" ? row.playlist_id : null,
      items: parsedItems
    };
  }

  function makeSignature(list) {
    var parts = [];
    for (var i = 0; i < list.length; i++) {
      parts.push(
        String(list[i].id) +
          "|" +
          String(list[i].file_path) +
          "|" +
          String(list[i].duration) +
          "|" +
          String(list[i].clip_start)
      );
    }
    return "n=" + list.length + ";" + parts.join(";");
  }

  function clampDuration(value) {
    var seconds = typeof value === "number" && isFinite(value) ? value : 10;
    if (seconds < 1) {
      seconds = 1;
    }
    if (seconds > 10) {
      seconds = 10;
    }
    return seconds;
  }

  function clampClipStart(value) {
    var start = typeof value === "number" && isFinite(value) ? value : 0;
    if (start < 0) {
      start = 0;
    }
    return start;
  }

  function formatSeconds(value) {
    if (typeof value !== "number" || !isFinite(value)) {
      return "--";
    }
    return value.toFixed(2);
  }

  function mediaUrl(filePath) {
    var parts = String(filePath || "").split("/");
    var encoded = [];
    for (var i = 0; i < parts.length; i++) {
      encoded.push(encodeURIComponent(parts[i]));
    }
    return SUPABASE_URL + "/storage/v1/object/public/media/" + encoded.join("/");
  }

  function rpc(name, body, cb) {
    var xhr = new XMLHttpRequest();
    var finished = false;

    function finish(err, data) {
      if (finished) {
        return;
      }
      finished = true;
      cb(err, data);
    }

    try {
      xhr.open("POST", SUPABASE_URL + "/rest/v1/rpc/" + name, true);
      xhr.setRequestHeader("apikey", ANON_KEY);
      xhr.setRequestHeader("Authorization", "Bearer " + ANON_KEY);
      xhr.setRequestHeader("Content-Type", "application/json");
    } catch (e) {
      finish(e, null);
      return;
    }

    xhr.timeout = 15000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        var data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          data = null;
        }
        finish(null, data);
      } else {
        finish(new Error("HTTP " + xhr.status), null);
      }
    };

    xhr.ontimeout = function () {
      finish(new Error("timeout"), null);
    };

    xhr.onerror = function () {
      finish(new Error("network"), null);
    };

    try {
      xhr.send(JSON.stringify(body || {}));
    } catch (e2) {
      finish(e2, null);
    }
  }

  function showPairing() {
    pairScreen.style.display = "block";
    emptyScreen.style.display = "none";
    stage.style.display = "none";
  }

  function showEmpty() {
    pairScreen.style.display = "none";
    emptyScreen.style.display = "block";
    stage.style.display = "none";
  }

  function showStage() {
    pairScreen.style.display = "none";
    emptyScreen.style.display = "none";
    stage.style.display = "block";
  }

  function setCodeText(value) {
    if (value && value.length >= 6) {
      codeText.textContent = value.substring(0, 3) + " " + value.substring(3, 6);
    } else {
      codeText.textContent = "------";
    }
  }

  function updateCountdown() {
    if (!expiresAt) {
      countdown.textContent = "--:--";
      return;
    }
    var target = new Date(expiresAt).getTime();
    if (!isFinite(target)) {
      countdown.textContent = "--:--";
      return;
    }
    countdown.textContent = formatRemaining(target - new Date().getTime());
  }

  function updateEmptyName() {
    emptyName.textContent = screenName ? screenName : "Crystagrid screen";
  }

  function updateErrorText() {
    var message = "";
    if (lastError) {
      message = "JS error: " + lastError.message + " (line " + lastError.line + ")";
    }
    if (debugOn && lastError) {
      pairError.style.display = "block";
      emptyError.style.display = "block";
      pairError.textContent = message;
      emptyError.textContent = message;
    } else {
      pairError.style.display = "none";
      emptyError.style.display = "none";
      pairError.textContent = "";
      emptyError.textContent = "";
    }
  }

  function shortName(path) {
    if (!path) {
      return "--";
    }
    var parts = String(path).split("/");
    return parts[parts.length - 1];
  }

  function mediaSize() {
    if (!currentElement) {
      return "--";
    }
    var natural = "--";
    var tag = currentElement.tagName ? currentElement.tagName.toLowerCase() : "";
    if (tag === "video") {
      natural = currentElement.videoWidth + "x" + currentElement.videoHeight;
    } else {
      natural = currentElement.naturalWidth + "x" + currentElement.naturalHeight;
    }
    return natural + " (rendered " + currentElement.offsetWidth + "x" + currentElement.offsetHeight + ")";
  }

  function refreshDebug() {
    if (!debugOn) {
      return;
    }
    var item = items.length > 0 ? items[currentIndex % items.length] : null;
    var clipStart = item ? clampClipStart(item.clip_start) : 0;
    var slotDuration = item ? clampDuration(item.duration) : 0;
    var videoTime = "--";
    if (currentElement) {
      var currentTag = currentElement.tagName ? currentElement.tagName.toLowerCase() : "";
      if (currentTag === "video") {
        videoTime = formatSeconds(currentElement.currentTime);
      }
    }
    var lines = [];
    lines.push("version: " + PLAYER_VERSION);
    lines.push("state: " + state);
    lines.push("screen: " + (screenName ? screenName : "--"));
    lines.push("token: " + (token ? token.substring(0, 6) : "--"));
    lines.push("last poll: " + lastPollTime + " / " + lastPollResult);
    lines.push("item: " + (items.length > 0 ? (currentIndex % items.length) + 1 : 0) + "/" + items.length);
    lines.push("type: " + (item ? item.type : "--"));
    lines.push("file: " + (item ? shortName(item.file_path) : "--"));
    lines.push("clip start: " + (item ? formatSeconds(clipStart) : "--"));
    lines.push("video time: " + videoTime);
    lines.push("end at: " + (item ? formatSeconds(clipStart + slotDuration) : "--"));
    lines.push("media: " + mediaSize());
    lines.push("window: " + window.innerWidth + "x" + window.innerHeight);
    lines.push("dpr: " + (window.devicePixelRatio || 1));
    lines.push("ua: " + navigator.userAgent);
    lines.push("error: " + (lastError ? lastError.message + " @ " + lastError.line : "--"));
    debugPanel.textContent = lines.join(NEWLINE);
  }

  function toggleDebug() {
    debugOn = !debugOn;
    debugPanel.style.display = debugOn ? "block" : "none";
    updateErrorText();
    refreshDebug();
  }

  function disposeMedia(node) {
    if (!node) {
      return;
    }
    try {
      node.onload = null;
      node.onerror = null;
      node.oncanplay = null;
      node.onended = null;
      node.ontimeupdate = null;
      node.onloadedmetadata = null;
      node.onseeked = null;
    } catch (e) {}
    try {
      var tag = node.tagName ? node.tagName.toLowerCase() : "";
      if (tag === "video") {
        node.pause();
        node.src = "";
      } else if (tag === "img") {
        node.src = "";
      }
    } catch (e2) {}
  }

  function clearNode(node) {
    while (node.firstChild) {
      var child = node.firstChild;
      disposeMedia(child);
      node.removeChild(child);
    }
  }

  function setOpacity(node, value) {
    node.style.opacity = String(value);
  }

  function clearItemTimers() {
    if (itemTimer) {
      clearTimeout(itemTimer);
      itemTimer = null;
    }
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
  }

  function stopPlayback() {
    playToken = playToken + 1;
    transitionPending = false;
    clearItemTimers();
    if (currentElement) {
      disposeMedia(currentElement);
      currentElement = null;
    }
    playing = false;
    clearNode(layerA);
    clearNode(layerB);
    setOpacity(layerA, 0);
    setOpacity(layerB, 0);
    activeLayer = layerA;
    idleLayer = layerB;
    currentIndex = 0;
  }

  function preloadNext() {
    if (items.length <= 1) {
      return;
    }
    var next = items[(currentIndex + 1) % items.length];
    if (next && next.type === "image") {
      try {
        var image = new Image();
        image.src = mediaUrl(next.file_path);
      } catch (e) {}
    }
  }

  function advance(tokenValue) {
    if (tokenValue !== playToken) {
      return;
    }
    if (transitionPending) {
      return;
    }
    if (items.length === 0) {
      return;
    }
    currentIndex = (currentIndex + 1) % items.length;
    playCurrent(playToken);
  }

  function restartVideo(element, clipStart) {
    if (!element) {
      return;
    }
    try {
      element.currentTime = clipStart;
    } catch (e) {
      return;
    }
    try {
      var playResult = element.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(function () {});
      }
    } catch (e2) {}
  }

  function scheduleVideoSafety(item, element, tokenValue, isSingle) {
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    safetyTimer = setTimeout(function () {
      if (tokenValue !== playToken || currentElement !== element) {
        return;
      }
      handleVideoEnd(item, element, tokenValue, isSingle);
    }, (clampDuration(item.duration) + 6) * 1000);
  }

  function handleVideoEnd(item, element, tokenValue, isSingle) {
    if (tokenValue !== playToken) {
      return;
    }
    if (currentElement !== element) {
      return;
    }
    if (isSingle) {
      restartVideo(element, clampClipStart(item.clip_start));
      scheduleVideoSafety(item, element, tokenValue, isSingle);
      return;
    }
    advance(tokenValue);
  }

  function scheduleItemTimers(item, element, tokenValue, isSingle) {
    clearItemTimers();

    if (item.type === "image") {
      if (isSingle) {
        return;
      }
      var seconds = clampDuration(item.duration);
      itemTimer = setTimeout(function () {
        if (tokenValue !== playToken) {
          return;
        }
        advance(tokenValue);
      }, seconds * 1000);
      return;
    }

    if (item.type === "video") {
      if (element.ended) {
        setTimeout(function () {
          handleVideoEnd(item, element, tokenValue, isSingle);
        }, 0);
        return;
      }
      scheduleVideoSafety(item, element, tokenValue, isSingle);
    }
  }

  function playCurrent(tokenValue) {
    if (tokenValue !== playToken || items.length === 0) {
      return;
    }

    clearItemTimers();

    var item = items[currentIndex % items.length];
    var isSingle = items.length === 1;
    var clipStart = clampClipStart(item.clip_start);
    var slotDuration = clampDuration(item.duration);
    var endAt = clipStart + slotDuration;
    var wrapping = false;
    var nextLayer = idleLayer;
    var element = null;
    var transitioned = false;
    var failed = false;
    var readyTimer = null;

    clearNode(nextLayer);
    setOpacity(nextLayer, 0);
    transitionPending = true;
    preloadNext();

    function cleanupReady() {
      if (readyTimer) {
        clearTimeout(readyTimer);
        readyTimer = null;
      }
    }

    function scheduleFailure() {
      if (tokenValue === playToken) {
        transitionPending = false;
      }
      setTimeout(function () {
        if (tokenValue !== playToken) {
          return;
        }
        advance(tokenValue);
      }, 2000);
    }

    function handleError() {
      if (failed) {
        return;
      }
      if (tokenValue !== playToken) {
        return;
      }
      failed = true;
      cleanupReady();
      if (!transitioned) {
        setOpacity(nextLayer, 0);
        clearNode(nextLayer);
      }
      scheduleFailure();
    }

    function doTransition() {
      if (transitioned || failed) {
        return;
      }
      if (tokenValue !== playToken) {
        return;
      }
      transitioned = true;
      cleanupReady();
      transitionPending = false;

      var oldLayer = activeLayer;
      setOpacity(nextLayer, 1);
      setOpacity(oldLayer, 0);
      activeLayer = nextLayer;
      idleLayer = oldLayer;
      currentElement = element;
      playing = true;

      scheduleItemTimers(item, element, tokenValue, isSingle);

      setTimeout(function () {
        if (oldLayer !== activeLayer) {
          clearNode(oldLayer);
          setOpacity(oldLayer, 0);
        }
      }, 700);
    }

    if (item.type === "image") {
      element = document.createElement("img");
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "contain";
      element.setAttribute("draggable", "false");
      element.onload = function () {
        doTransition();
      };
      element.onerror = function () {
        handleError();
      };
      element.src = mediaUrl(item.file_path);
      nextLayer.appendChild(element);
      readyTimer = setTimeout(function () {
        if (!failed) {
          doTransition();
        }
      }, 6000);
      return;
    }

    if (item.type === "video") {
      element = document.createElement("video");
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "contain";
      element.muted = true;
      element.autoplay = true;
      element.setAttribute("muted", "muted");
      element.setAttribute("autoplay", "autoplay");
      element.setAttribute("playsinline", "");
      element.setAttribute("webkit-playsinline", "");
      element.setAttribute("preload", "auto");
      element.onloadedmetadata = function () {
        if (clipStart > 0) {
          try {
            element.currentTime = clipStart;
          } catch (e) {}
        }
      };
      element.oncanplay = function () {
        if (clipStart > 0 && element.currentTime < clipStart) {
          try {
            element.currentTime = clipStart;
          } catch (e) {}
        }
        doTransition();
      };
      element.onerror = function () {
        handleError();
      };
      element.onended = function () {
        handleVideoEnd(item, element, tokenValue, isSingle);
      };
      element.ontimeupdate = function () {
        if (tokenValue !== playToken || currentElement !== element) {
          return;
        }
        if (element.currentTime < endAt - 0.15) {
          return;
        }
        if (isSingle) {
          if (wrapping) {
            return;
          }
          wrapping = true;
          restartVideo(element, clipStart);
          scheduleVideoSafety(item, element, tokenValue, isSingle);
          return;
        }
        advance(tokenValue);
      };
      element.onseeked = function () {
        wrapping = false;
      };
      element.src = mediaUrl(item.file_path);
      nextLayer.appendChild(element);
      try {
        var playResult = element.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(function () {});
        }
      } catch (e) {}
      readyTimer = setTimeout(function () {
        if (!failed) {
          doTransition();
        }
      }, 6000);
      return;
    }

    handleError();
  }

  function startPlaylist(list) {
    stopPlayback();
    items = [];
    for (var i = 0; i < list.length; i++) {
      items.push(list[i]);
    }
    currentIndex = 0;
    if (items.length === 0) {
      playing = false;
      showEmpty();
      updateEmptyName();
      return;
    }
    state = "paired";
    showStage();
    setOpacity(layerA, 0);
    setOpacity(layerB, 0);
    activeLayer = layerA;
    idleLayer = layerB;
    playToken = playToken + 1;
    playCurrent(playToken);
  }

  function loadSavedPlaylist() {
    var raw = storageGet(PLAYLIST_KEY);
    if (!raw) {
      return [];
    }
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      var list = [];
      for (var i = 0; i < parsed.length; i++) {
        var item = parseItem(parsed[i]);
        if (item) {
          list.push(item);
        }
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  function playFallback() {
    if (playing) {
      return;
    }
    var source = lastItems;
    if (!source || source.length === 0) {
      source = loadSavedPlaylist();
      lastItems = source;
    }
    if (source && source.length > 0) {
      signature = makeSignature(source);
      startPlaylist(source);
    }
  }

  function clearAuthState() {
    token = null;
    code = null;
    expiresAt = null;
    storageRemove(TOKEN_KEY);
    storageRemove(CODE_KEY);
    storageRemove(EXPIRES_KEY);
  }

  function setPollInterval(milliseconds) {
    if (pollTimer && pollIntervalMs === milliseconds) {
      return;
    }
    pollIntervalMs = milliseconds;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    pollTimer = setInterval(function () {
      pollOnce();
    }, milliseconds);
  }

  function requestCode() {
    if (requesting) {
      return;
    }
    requesting = true;
    clearAuthState();
    stopPlayback();
    items = [];
    signature = "";
    state = "pairing";
    showPairing();
    setCodeText("");
    countdown.textContent = "--:--";
    lastPollResult = "requesting";

    rpc("player_request_code", {}, function (err, data) {
      requesting = false;
      if (err) {
        lastPollResult = "code error";
        setPollInterval(3000);
        return;
      }
      var payload = parseCodeResponse(data);
      if (!payload) {
        lastPollResult = "code malformed";
        setPollInterval(3000);
        return;
      }
      token = payload.device_token;
      code = payload.code;
      expiresAt = payload.expires_at;
      signature = "";
      storageSet(TOKEN_KEY, token);
      storageSet(CODE_KEY, code);
      storageSet(EXPIRES_KEY, expiresAt);
      state = "pairing";
      showPairing();
      setCodeText(code);
      updateCountdown();
      setPollInterval(3000);
    });

    setPollInterval(3000);
  }

  function handleWaiting(response) {
    stopPlayback();
    items = [];
    signature = "";
    state = "pairing";
    if (response.screen_name) {
      screenName = response.screen_name;
    }
    if (response.expires_at) {
      expiresAt = response.expires_at;
      storageSet(EXPIRES_KEY, expiresAt);
    } else if (!expiresAt) {
      expiresAt = storageGet(EXPIRES_KEY);
    }
    if (!code) {
      code = storageGet(CODE_KEY);
    }
    if (!code) {
      requestCode();
      return;
    }
    showPairing();
    setCodeText(code);
    updateCountdown();
    setPollInterval(3000);
  }

  function handlePaired(response) {
    if (response.screen_name) {
      screenName = response.screen_name;
    }
    updateEmptyName();
    code = null;
    expiresAt = null;
    storageRemove(CODE_KEY);
    storageRemove(EXPIRES_KEY);

    var nextItems = response.items || [];
    lastItems = [];
    for (var i = 0; i < nextItems.length; i++) {
      lastItems.push(nextItems[i]);
    }
    try {
      storageSet(PLAYLIST_KEY, JSON.stringify(lastItems));
    } catch (e) {}

    var nextSignature = makeSignature(lastItems);
    state = "paired";

    if (lastItems.length === 0) {
      if (signature !== nextSignature || playing) {
        signature = nextSignature;
        stopPlayback();
        items = [];
      } else {
        signature = nextSignature;
        items = [];
      }
      showEmpty();
      updateEmptyName();
      setPollInterval(10000);
      return;
    }

    if (signature !== nextSignature) {
      signature = nextSignature;
      startPlaylist(lastItems);
    } else if (!playing) {
      startPlaylist(lastItems);
    } else {
      showStage();
    }
    setPollInterval(10000);
  }

  function handlePoll(response) {
    if (response.status === "paired") {
      handlePaired(response);
      return;
    }
    if (response.status === "waiting") {
      handleWaiting(response);
      return;
    }
    requestCode();
  }

  function handlePollFailure() {
    if (state === "pairing") {
      setPollInterval(3000);
    } else {
      setPollInterval(10000);
    }
    if (!playing) {
      playFallback();
    }
  }

  function pollOnce() {
    if (pollInFlight) {
      return;
    }
    if (!token) {
      requestCode();
      return;
    }

    pollInFlight = true;
    lastPollTime = timeString();
    var activeToken = token;

    rpc("player_poll", { p_token: activeToken }, function (err, data) {
      pollInFlight = false;
      if (token !== activeToken) {
        return;
      }
      if (err) {
        lastPollResult = "error";
        handlePollFailure();
        return;
      }
      var response = parsePollResponse(data);
      if (!response) {
        lastPollResult = "malformed";
        handlePollFailure();
        return;
      }
      lastPollResult = response.status;
      handlePoll(response);
    });
  }

  function readVersionReloadAt() {
    var raw = sessionStorageGet(VERSION_RELOAD_KEY);
    var value = raw ? Number(raw) : 0;
    if (!isFinite(value) || value < 0) {
      value = 0;
    }
    if (versionReloadAt > value) {
      value = versionReloadAt;
    }
    return value;
  }

  function checkVersion() {
    var xhr = new XMLHttpRequest();
    try {
      xhr.open("GET", "/player/version?ts=" + new Date().getTime(), true);
    } catch (e) {
      return;
    }
    xhr.timeout = 15000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        return;
      }
      var data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        return;
      }
      if (!data || typeof data.v !== "string" || data.v === PLAYER_VERSION) {
        return;
      }
      var now = new Date().getTime();
      var lastReload = readVersionReloadAt();
      if (lastReload && now - lastReload < VERSION_RELOAD_COOLDOWN_MS) {
        return;
      }
      versionReloadAt = now;
      sessionStorageSet(VERSION_RELOAD_KEY, String(now));
      try {
        window.location.reload();
      } catch (e2) {}
    };
    xhr.onerror = function () {};
    xhr.ontimeout = function () {};
    try {
      xhr.send();
    } catch (e3) {}
  }

  function boot() {
    token = storageGet(TOKEN_KEY);
    code = storageGet(CODE_KEY);
    expiresAt = storageGet(EXPIRES_KEY);
    lastItems = loadSavedPlaylist();
    updateEmptyName();

    if (token) {
      pollOnce();
      setPollInterval(3000);
    } else {
      requestCode();
    }

    setInterval(function () {
      if (state === "pairing") {
        updateCountdown();
      }
    }, 1000);

    setInterval(function () {
      refreshDebug();
    }, 1000);

    setInterval(checkVersion, VERSION_CHECK_INTERVAL_MS);
  }

  window.onerror = function (message, source, line) {
    lastError = { message: String(message), line: line };
    updateErrorText();
    return false;
  };

  debugHit.onclick = function () {
    var now = new Date().getTime();
    var recent = [];
    for (var i = 0; i < tapTimes.length; i++) {
      if (now - tapTimes[i] <= 4000) {
        recent.push(tapTimes[i]);
      }
    }
    recent.push(now);
    tapTimes = recent;
    if (recent.length >= 5) {
      tapTimes = [];
      toggleDebug();
    }
  };

  boot();
})();
</script>
</body>
</html>`;
}
