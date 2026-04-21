/* ============================================================
   CYBER BACKGROUND · animated home-page hero backdrop
   ------------------------------------------------------------
   Loads a low-res equirectangular world silhouette and samples
   its alpha channel into a dotted continent map, then overlays
   a handful of slowly-pulsing city nodes and occasional curved
   link tracers. Tuned for the background — muted palette, slow
   pacing, no high-contrast flashes.

   Pauses when the tab is hidden; recomputes on resize.
   No dependencies.
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('cyberBgCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var running = true;

  /* ------------------------------------------------------------
     Pre-render the world silhouette onto a small offscreen
     canvas once the image loads. We then sample its alpha
     channel at an even grid to get the dotted continent
     pattern. The sampling grid is sized to the image's native
     aspect ratio and chosen to yield ~400 dots across — dense
     enough to show islands (UK, Japan, Indonesia, Madagascar)
     without turning into a solid fill.
     ------------------------------------------------------------ */
  var SAMPLE_W = 400;
  var SAMPLE_H = 150;             // set from the image aspect on load
  var landMask = null;
  var mapReady = false;

  var worldImg = new Image();
  worldImg.onload = function () {
    SAMPLE_H = Math.round(SAMPLE_W * worldImg.height / worldImg.width);
    var off = document.createElement('canvas');
    off.width = SAMPLE_W;
    off.height = SAMPLE_H;
    var octx = off.getContext('2d');
    octx.drawImage(worldImg, 0, 0, SAMPLE_W, SAMPLE_H);
    var data = octx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    landMask = new Uint8Array(SAMPLE_W * SAMPLE_H);
    for (var i = 0; i < landMask.length; i++) {
      landMask[i] = data[i * 4 + 3] > 96 ? 1 : 0;
    }
    mapReady = true;
  };
  worldImg.src = '/static/img/world.png';

  /* ------------------------------------------------------------
     Hotspots in normalized (x, y) where x = (lng + 180) / 360
     and y = (78 - lat) / 136 — matching the cropped-lat range
     of the rasterized map so pings sit on real continents.
     SF, NYC, Mexico City, São Paulo, London, Lagos, Nairobi,
     Cape Town, Moscow, Mumbai, Singapore, Beijing, Tokyo,
     Sydney.
     ------------------------------------------------------------ */
  var cities = [
    { x: 0.161, y: 0.296 },
    { x: 0.294, y: 0.274 },
    { x: 0.226, y: 0.437 },
    { x: 0.370, y: 0.747 },
    { x: 0.500, y: 0.195 },
    { x: 0.509, y: 0.526 },
    { x: 0.602, y: 0.583 },
    { x: 0.551, y: 0.822 },
    { x: 0.604, y: 0.169 },
    { x: 0.702, y: 0.434 },
    { x: 0.788, y: 0.564 },
    { x: 0.823, y: 0.280 },
    { x: 0.888, y: 0.311 },
    { x: 0.920, y: 0.822 }
  ];

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  /* Per-city pings (slow, subtle rings) */
  var pings = cities.map(function (c, i) {
    return { x: c.x, y: c.y, phase: (i / cities.length) };
  });

  /* Occasional link arcs between two cities */
  var arcs = [];
  function spawnArc() {
    if (!running || arcs.length > 2) return;
    var a = cities[(Math.random() * cities.length) | 0];
    var b = cities[(Math.random() * cities.length) | 0];
    if (a === b) return;
    var dx = b.x - a.x, dy = b.y - a.y;
    if (Math.sqrt(dx * dx + dy * dy) < 0.18) return;
    arcs.push({ from: a, to: b, t: 0, speed: 0.0032 + Math.random() * 0.004 });
  }
  setInterval(spawnArc, 2400);

  /* ------------------------------------------------------------
     Render loop
     ------------------------------------------------------------
     We convert each sample-grid cell into a pixel position
     using the current canvas size, so the map is perfectly
     aligned with the container — the continent silhouette
     scales with the hero box.

     To read as "world map" regardless of hero aspect ratio,
     we letterbox the map inside the hero: fit SAMPLE_W/SAMPLE_H
     (2:1) centered horizontally, leaving top/bottom bands for
     the rest of the animation (pings, arcs).
     ------------------------------------------------------------ */
  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    if (mapReady && landMask) {
      drawMap();
    }
    drawPings();
    drawArcs();

    requestAnimationFrame(tick);
  }

  /* Geometry of the currently-rendered map box, so pings can
     line up with it. Recomputed each frame based on canvas size. */
  var mapBox = { x: 0, y: 0, w: 0, h: 0 };

  function computeMapBox() {
    var mapAspect = SAMPLE_W / SAMPLE_H;
    var heroAspect = W / H;
    var mapW, mapH;
    if (heroAspect > mapAspect) {
      mapW = W * 0.96;
      mapH = mapW / mapAspect;
    } else {
      mapH = H * 0.90;
      mapW = mapH * mapAspect;
    }
    mapBox.x = (W - mapW) / 2;
    mapBox.y = (H - mapH) / 2;
    mapBox.w = mapW;
    mapBox.h = mapH;
  }

  function drawMap() {
    computeMapBox();
    var cellW = mapBox.w / SAMPLE_W;
    var cellH = mapBox.h / SAMPLE_H;
    // Dot size scales with cell size but stays just under cell spacing so
    // dots stay visibly separate even on small islands.
    var dot = Math.max(1.0, Math.min(cellW, cellH) * 0.6);

    ctx.fillStyle = 'rgba(130,180,245,0.55)';
    for (var y = 0; y < SAMPLE_H; y++) {
      for (var x = 0; x < SAMPLE_W; x++) {
        if (landMask[y * SAMPLE_W + x]) {
          ctx.fillRect(
            mapBox.x + x * cellW,
            mapBox.y + y * cellH,
            dot, dot
          );
        }
      }
    }
  }

  function drawPings() {
    for (var j = 0; j < pings.length; j++) {
      var p = pings[j];
      p.phase = (p.phase + 0.0028) % 1;
      var pos = mapPointToCanvas(p.x, p.y);
      var radius = p.phase * 22;
      ctx.strokeStyle = 'rgba(0,200,255,' + (1 - p.phase) * 0.32 + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,200,255,0.8)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawArcs() {
    for (var k = arcs.length - 1; k >= 0; k--) {
      var arc = arcs[k];
      arc.t += arc.speed;
      if (arc.t > 1.3) { arcs.splice(k, 1); continue; }
      drawArc(arc);
    }
  }

  /* Convert a normalized (x, y) to pixel coords inside the
     letterboxed map area so pings line up with the dot map. */
  function mapPointToCanvas(nx, ny) {
    return { x: mapBox.x + nx * mapBox.w, y: mapBox.y + ny * mapBox.h };
  }

  function drawArc(arc) {
    var a = mapPointToCanvas(arc.from.x, arc.from.y);
    var b = mapPointToCanvas(arc.to.x,   arc.to.y);
    var ax = a.x, ay = a.y, bx = b.x, by = b.y;
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy);
    var mx = (ax + bx) / 2;
    var my = (ay + by) / 2 - len * 0.32;

    var visT = Math.min(arc.t, 1);
    var tailT = Math.max(0, arc.t - 0.4);
    var segs = 36;

    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= segs; i++) {
      var t = tailT + (visT - tailT) * (i / segs);
      if (t < 0) continue;
      var u = 1 - t;
      var px = u * u * ax + 2 * u * t * mx + t * t * bx;
      var py = u * u * ay + 2 * u * t * my + t * t * by;
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.30)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (arc.t <= 1) {
      var u2 = 1 - arc.t;
      var hx = u2 * u2 * ax + 2 * u2 * arc.t * mx + arc.t * arc.t * bx;
      var hy = u2 * u2 * ay + 2 * u2 * arc.t * my + arc.t * arc.t * by;
      ctx.fillStyle = 'rgba(0,200,255,0.85)';
      ctx.beginPath();
      ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  resize();
  requestAnimationFrame(tick);
})();
