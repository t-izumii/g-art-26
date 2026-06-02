//-------------------------------------
// プロジェクトの基本設定 ここから

let debugMode = false; //デバッグモード、NEORTにアップロード時はfalseにしてください

// キャンバスサイズの設定
const CANVAS_SIZES = {
  LED_CUBE1: { width: 2000, height: 1440 },
  LED_CUBE2: { width: 1536, height: 768 },
  LED_CUBE3: { width: 672, height: 480 },
};

// LEDキューブのレイアウト参考画像
let image1, image2, image3;

// 現在のLEDキューブのサイズ
let currentSize = "";

// GraphicsLayer配列の管理
let graphicsLayers = [];
let currentLayerIndex = 0;

// プロジェクトの基本設定 ここまで
//-------------------------------------

function setup() {
  createCanvasSetup();
  console.log("Setup完了 - active:", active);
  console.log("currentSize:", currentSize);
  applyPerCubeOverrides();
  createGraphicsLayers();
  console.log("GraphicsLayers作成完了 - 数:", graphicsLayers.length);

  if (!currentSize && active.shapes) {
    console.log("フルスクリーンモード - タイル数:", active.shapes.length);
    console.log("タイル例:", active.shapes[0]);

    // タイルの配置範囲を確認
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    active.shapes.forEach((shape) => {
      minX = min(minX, shape.img_x);
      maxX = max(maxX, shape.img_x + shape.w);
      minY = min(minY, shape.img_y);
      maxY = max(maxY, shape.img_y + shape.h);
    });
    console.log(`タイル配置範囲: X(${minX} to ${maxX}), Y(${minY} to ${maxY})`);
    console.log(`Canvasサイズ: ${width}x${height}`);
  }
}

function draw() {
  background(0, 20);
  drawDebugMode(); // デバッグ用LEDキューブのレイアウト参考画像の描画

  if (nagareShared.scale < 0.6) {
    nagareShared.scale = Math.min(0.6, nagareShared.scale + 0.01 * (deltaTime / 1000));
    const inp = document.getElementById("n-scale");
    if (inp) inp.value = nagareShared.scale;
    const lab = document.getElementById("n-scale-val");
    if (lab) lab.textContent = nagareShared.scale.toFixed(2);
  }

  if (graphicsLayers.length > 0) {
    // レイヤーの計算・描画処理を実行
    for (let i = 0; i < graphicsLayers.length; i++) {
      let layer = graphicsLayers[i];
      layer.update();
      layer.draw();
    }

    // メインキャンバスに描画
    for (let i = 0; i < active.shapes.length; i++) {
      let shape = active.shapes[i];
      let layerIndex = shape.layerIndex || i; // フルスクリーンモードではlayerIndexを使用

      // 確実に0-5の範囲に制限
      layerIndex = layerIndex % 6;

      if (layerIndex < graphicsLayers.length) {
        let layer = graphicsLayers[layerIndex];

        if (shape.type === "rect") {
          image(
            layer.graphics,
            shape.img_x,
            shape.img_y,
            layer.graphics.width,
            layer.graphics.height
          );

          // デバッグ用：タイルの境界を描画
          if (debugMode) {
            noFill();
            stroke(255, 0, 0);
            strokeWeight(1);
            rect(
              shape.img_x,
              shape.img_y,
              layer.graphics.width,
              layer.graphics.height
            );
          } else {
            noStroke();
          }
        } else if (shape.type === "poly") {
          push();
          if (debugMode) {
            stroke(255, 0, 0);
          } else {
            noStroke();
          }
          clipPolygon(shape.points);
          drawingContext.clip();
          image(
            layer.graphics,
            shape.img_x,
            shape.img_y,
            layer.graphics.width,
            layer.graphics.height
          );
          pop();
        }
      } else {
        // デバッグ用：layerIndexが範囲外の場合
        if (debugMode && frameCount % 60 === 0) {
          // 1秒に1回のみ表示
          console.log(
            `警告: layerIndex ${layerIndex} が範囲外 (最大: ${
              graphicsLayers.length - 1
            }), shape:`,
            shape
          );
        }
      }
    }
  } else {
    // デバッグ用：GraphicsLayerが存在しない場合
    if (debugMode && frameCount % 60 === 0) {
      // 1秒に1回のみ表示
      console.log("警告: GraphicsLayerがない");
    }
  }
}


const NAGARE_REF_W = 760;
const NAGARE_BASE_SEED = 7;
const NAGARE_CREAM = [245, 241, 230];
const NAGARE_OUTLINE = [58, 52, 44];

const NAGARE_DEFAULTS = {
  axis: -4,
  loopSec: 40,
  spread: 1.2,
  scale: 0.17,
  variation: 0.5,
  introSec: 2.5,
  fadeIn: 0.13,
  fadeOut: 0.18,
  density: 1,
  palette: ["#5fc6e8", "#5bbf6a", "#ffd24c", "#5fc6e8", "#b89cf0", "#ffffff", "#fbf3df", "#8fe3b0", "#d44447"],
  weights: [2, 2, 2.5, 0.5, 2.5, 1, 2, 1],
};
let nagareShared = JSON.parse(JSON.stringify(NAGARE_DEFAULTS));

const NAGARE_PER_CUBE = {
  LED_CUBE1: { density: 720 },
  LED_CUBE2: { density: 1300 },
  LED_CUBE3: { density: 3000 },
};
function applyPerCubeOverrides() {
  const o = NAGARE_PER_CUBE[currentSize];
  if (o) Object.assign(nagareShared, o);
}

function nagAngTo(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= TWO_PI;
  while (d < -Math.PI) d += TWO_PI;
  return d;
}
function nagEaseOutBack(t) {
  if (t <= 0) return 0;
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function nagSmoothstep(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

class GraphicsLayer {
  constructor(size, index, shape) {
    this.graphics = createGraphics(size, size);
    this.index = index;
    this.shape = shape;
    this.isActive = false;

    this.params = nagareShared;
    this.sizeScale = size / NAGARE_REF_W;
    this.shapes = Math.max(
      60,
      Math.round((nagareShared.density * size * size) / (760 * 1180))
    );

    this.effScale = 1;
    this.items = [];
    this.dots = [];
    this.introStart = frameCount;
    this.buildScene();
  }

  paletteColor(idx) {
    if (idx === 0) idx = 3;
    return color(this.params.palette[idx]);
  }
  weightedIndex() {
    const w = this.params.weights;
    let total = 0;
    for (let i = 0; i < w.length; i++) total += w[i];
    if (total <= 0) return 1;
    let r = random(total);
    for (let i = 0; i < w.length; i++) {
      if (r < w[i]) return i + 1;
      r -= w[i];
    }
    return 1;
  }

  buildScene() {
    randomSeed(NAGARE_BASE_SEED + this.index * 101);
    noiseSeed(NAGARE_BASE_SEED + this.index * 101);
    this.items = [];

    for (let i = 0; i < this.shapes; i++) {
      const isOrb = random() < 0.4;
      let colIdx = this.weightedIndex();
      const stream = {
        p0: random(),
        laneN: random(-1, 1),
        swayPh: random(TWO_PI),
        swayAmp: random(8, 30),
        orbPh: random(TWO_PI),
        ph: random(1000),
        sz: random(-1, 1),
        colIdx,
      };

      if (isOrb) {
        this.items.push(Object.assign(stream, { orb: true, rC: 57, aspect: random(0.82, 1.18) }));
      } else {
        const leaf = random() < 0.18;
        if (leaf) stream.colIdx = random() < 0.5 ? 1 : 7;
        const profile = leaf ? 1 : [0, 0, 1, 2][Math.floor(random(4))];
        this.items.push(
          Object.assign(stream, {
            orb: false,
            leaf: leaf,
            angOff: random(-0.4, 0.4),
            lenC: leaf ? 105 : 142,
            widC: leaf ? 62 : 65,
            curlF: random(-0.42, 0.42),
            profile: profile,
          })
        );
      }
    }

    this.dots = [];
    const dn = 0;
    for (let i = 0; i < dn; i++) {
      this.dots.push({
        rC: 20,
        sz: random(-1, 1),
        p0: random(),
        laneN: random(-1, 1),
        swayPh: random(TWO_PI),
        swayAmp: random(6, 22),
        colIdx: this.weightedIndex(),
      });
    }
  }

  sizeFactor(s) {
    return Math.max(0.1, 1 + this.params.variation * s.sz);
  }

  scaleEnv(p) {
    const fin = Math.max(0.001, this.params.fadeIn);
    const fout = Math.max(0.001, this.params.fadeOut);
    if (p < fin) return nagEaseOutBack(p / fin);
    if (p > 1 - fout) return nagSmoothstep((1 - p) / fout);
    return 1;
  }

  ribbonOutline(s, theta, baseX, baseY, sf) {
    const a = radians(-90 + this.params.axis) + s.angOff;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const perp = { x: -Math.sin(a), y: Math.cos(a) };
    const bx = baseX,
      by = baseY;
    const L = s.lenC * this.sizeFactor(s) * this.effScale * sf;
    const maxW = s.widC * this.sizeFactor(s) * this.effScale * sf;
    const ph = s.orbPh;
    const curl = s.curlF * (0.18 + 0.18 * Math.sin(theta + ph));
    const swayAmp = maxW * 0.16;
    const N = 22;

    const pts = [];
    for (let j = 0; j <= N; j++) {
      const u = j / N;
      let px = bx + dir.x * (u * L) + perp.x * (curl * L * Math.sin(u * Math.PI));
      let py = by + dir.y * (u * L) + perp.y * (curl * L * Math.sin(u * Math.PI));
      const wob = Math.sin(theta + ph + u * Math.PI * 0.7) * Math.sin(u * Math.PI) * swayAmp;
      px += perp.x * wob;
      py += perp.y * wob;
      pts.push({ x: px, y: py });
    }

    const w = [];
    for (let j = 0; j <= N; j++) {
      const u = j / N;
      let ww;
      if (s.profile === 0) ww = maxW * Math.pow(Math.max(0, 1 - u), 0.48);
      else if (s.profile === 1) ww = maxW * Math.pow(Math.sin(u * Math.PI), 0.7);
      else ww = maxW * (0.5 + 0.5 * Math.cos(u * Math.PI));
      w.push(ww + 4.0);
    }

    const nor = [];
    for (let j = 0; j <= N; j++) {
      let ax, ay;
      if (j === 0) {
        ax = pts[1].x - pts[0].x;
        ay = pts[1].y - pts[0].y;
      } else if (j === N) {
        ax = pts[N].x - pts[N - 1].x;
        ay = pts[N].y - pts[N - 1].y;
      } else {
        ax = pts[j + 1].x - pts[j - 1].x;
        ay = pts[j + 1].y - pts[j - 1].y;
      }
      const len = Math.hypot(ax, ay) || 1;
      nor.push({ x: -ay / len, y: ax / len });
    }

    const left = [],
      right = [];
    for (let j = 0; j <= N; j++) {
      left.push({ x: pts[j].x + (nor[j].x * w[j]) / 2, y: pts[j].y + (nor[j].y * w[j]) / 2 });
      right.push({ x: pts[j].x - (nor[j].x * w[j]) / 2, y: pts[j].y - (nor[j].y * w[j]) / 2 });
    }

    const out = [];
    for (let j = 0; j <= N; j++) out.push(left[j]);

    {
      const ct = pts[N],
        rt = w[N] / 2;
      if (rt > 1.5) {
        const aL = Math.atan2(left[N].y - ct.y, left[N].x - ct.x);
        const aR = Math.atan2(right[N].y - ct.y, right[N].x - ct.x);
        const outer = Math.atan2(dir.y, dir.x);
        const dFull = nagAngTo(aL, aR);
        const dOut = nagAngTo(aL, outer);
        let sweep = dFull;
        if (Math.sign(dFull) !== Math.sign(dOut)) sweep = dFull > 0 ? dFull - TWO_PI : dFull + TWO_PI;
        const M = 8;
        for (let k = 1; k < M; k++) {
          const ang = aL + sweep * (k / M);
          out.push({ x: ct.x + Math.cos(ang) * rt, y: ct.y + Math.sin(ang) * rt });
        }
      }
    }

    for (let j = N; j >= 0; j--) out.push(right[j]);

    const c = pts[0],
      r = w[0] / 2;
    if (r > 1.5) {
      const aR = Math.atan2(right[0].y - c.y, right[0].x - c.x);
      const aL = Math.atan2(left[0].y - c.y, left[0].x - c.x);
      const outerAng = Math.atan2(-dir.y, -dir.x);
      const dFull = nagAngTo(aR, aL);
      const dOut = nagAngTo(aR, outerAng);
      let sweep = dFull;
      if (Math.sign(dFull) !== Math.sign(dOut)) sweep = dFull > 0 ? dFull - TWO_PI : dFull + TWO_PI;
      const M = 12;
      for (let k = 1; k < M; k++) {
        const ang = aR + sweep * (k / M);
        out.push({ x: c.x + Math.cos(ang) * r, y: c.y + Math.sin(ang) * r });
      }
    }
    return { out, pts };
  }

  update() {}

  draw() {
    const g = this.graphics;
    const W = g.width,
      H = g.height;
    const p = this.params;

    g.background(NAGARE_CREAM[0], NAGARE_CREAM[1], NAGARE_CREAM[2]);
    const loopFrames = Math.max(1, Math.round(p.loopSec * 60));
    const loopPhase = (frameCount % loopFrames) / loopFrames;
    const theta = TWO_PI * loopPhase;
    this.effScale = p.scale * this.sizeScale * (1 + 0.03 * Math.sin(theta * 2));
    g.strokeJoin(ROUND);
    g.strokeCap(ROUND);

    const introFrames = Math.max(1, Math.round(p.introSec * 60));
    const introScale = p.introSec <= 0 ? 1 : nagEaseOutBack(Math.min(1, (frameCount - this.introStart) / introFrames));

    const fa = radians(-90 + p.axis);
    const dir = { x: Math.cos(fa), y: Math.sin(fa) };
    const perp = { x: -Math.sin(fa), y: Math.cos(fa) };
    const cx = W * 0.5,
      cy = H * 0.5;
    const span = H * 0.86;
    const bandHalf = W * 0.5 * p.spread;

    for (let i = 0; i < this.items.length; i++) {
      const s = this.items[i];
      const pp = (s.p0 + loopPhase) % 1;
      const sf = this.scaleEnv(pp) * introScale;
      if (sf <= 0.01) continue;

      const along = (pp - 0.5) * span;
      const lane = s.laneN * bandHalf + Math.sin(theta + s.swayPh) * s.swayAmp;
      const px = cx + dir.x * along + perp.x * lane;
      const py = cy + dir.y * along + perp.y * lane;

      const col = this.paletteColor(s.colIdx);
      const f = this.sizeFactor(s);
      const sizeR = (s.orb ? s.rC : s.widC * 0.5) * f * this.effScale * sf;
      const ow = Math.max(0.4, sizeR * 0.12);
      g.stroke(NAGARE_OUTLINE[0], NAGARE_OUTLINE[1], NAGARE_OUTLINE[2]);
      g.strokeWeight(ow);
      g.fill(red(col), green(col), blue(col));

      if (s.orb) {
        const rEff = s.rC * f * this.effScale * sf;
        g.ellipse(px, py, rEff * 2 * s.aspect, rEff * 2);
      } else {
        const geom = this.ribbonOutline(s, theta, px, py, sf);
        g.beginShape();
        for (let k = 0; k < geom.out.length; k++) g.vertex(geom.out[k].x, geom.out[k].y);
        g.endShape(CLOSE);
        if (s.leaf && sf > 0.6) {
          g.stroke(NAGARE_OUTLINE[0], NAGARE_OUTLINE[1], NAGARE_OUTLINE[2], 150);
          g.strokeWeight(Math.max(0.35, sizeR * 0.08));
          g.noFill();
          g.beginShape();
          for (let k = 0; k < geom.pts.length; k += 2) g.vertex(geom.pts[k].x, geom.pts[k].y);
          g.endShape();
        }
      }
    }

    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      const pp = (d.p0 + loopPhase) % 1;
      const sf = this.scaleEnv(pp) * introScale;
      if (sf <= 0.01) continue;
      const along = (pp - 0.5) * span;
      const lane = d.laneN * bandHalf + Math.sin(theta + d.swayPh) * d.swayAmp;
      const px = cx + dir.x * along + perp.x * lane;
      const py = cy + dir.y * along + perp.y * lane;
      const col = this.paletteColor(d.colIdx);
      const drawnR = d.rC * this.sizeFactor(d) * this.effScale * sf;
      g.stroke(NAGARE_OUTLINE[0], NAGARE_OUTLINE[1], NAGARE_OUTLINE[2]);
      g.strokeWeight(Math.max(0.4, drawnR * 0.12));
      g.fill(red(col), green(col), blue(col));
      g.circle(px, py, drawnR * 2);
    }
  }

  // レイヤーを削除
  remove() {
    if (this.graphics && this.graphics.remove) {
      this.graphics.remove();
    }
  }

  // アクティブ状態を切り替え
  toggleActive() {
    this.isActive = !this.isActive;
  }
}

// GraphicsLayer配列を作成
function createGraphicsLayers() {
  // 既存のLayersを削除
  removeGraphicsLayers();

  if (!active.spec) {
    console.log("createGraphicsLayers: active.specが未定義");
    return;
  }

  const graphicsSize = active.spec.size;
  console.log(
    "createGraphicsLayers: graphicsSize =",
    graphicsSize,
    "currentSize =",
    currentSize
  );

  if (!currentSize) {
    // フルスクリーンモードの場合は6個のGraphicsLayerを作成
    console.log("フルスクリーンモード - 6個のGraphicsLayerを作成");
    for (let i = 0; i < 6; i++) {
      const layer = new GraphicsLayer(graphicsSize, i, null);
      graphicsLayers.push(layer);
    }
  } else {
    // 通常モードの場合は形状数分のGraphicsLayerを作成
    const numShapes = active.shapes.length;
    console.log("通常モード -", numShapes, "個のGraphicsLayerを作成");
    for (let i = 0; i < numShapes; i++) {
      const layer = new GraphicsLayer(graphicsSize, i, active.shapes[i]);
      graphicsLayers.push(layer);
    }
  }

  console.log("createGraphicsLayers完了 - 作成数:", graphicsLayers.length);
}

// GraphicsLayer配列を削除
function removeGraphicsLayers() {
  graphicsLayers.forEach((layer) => {
    if (layer && layer.remove) {
      layer.remove();
    }
  });
  graphicsLayers = [];
  currentLayerIndex = 0;
}

function nagareFormatVal(name, v) {
  if (name === "axis") return v + "°";
  if (name === "loopSec" || name === "introSec") return v + "s";
  if (name === "spread" || name === "variation" || name === "fadeIn" || name === "fadeOut")
    return Math.round(v * 100) + "%";
  return v;
}

function nagareUpdateParam(name, value) {
  const isInt = name === "axis" || name === "loopSec";
  nagareShared[name] = isInt ? parseInt(value) : parseFloat(value);
  const el = document.getElementById("n-" + name + "-val");
  if (el) el.textContent = nagareFormatVal(name, nagareShared[name]);
}

function nagareUpdateColor(idx, value) {
  nagareShared.palette[idx + 1] = value;
  const el = document.getElementById("n-color" + idx + "-val");
  if (el) el.textContent = value;
}

function nagareReplayIntro() {
  for (const layer of graphicsLayers) layer.introStart = frameCount;
}

function nagareRegenerate() {
  for (const layer of graphicsLayers) layer.buildScene();
  nagareReplayIntro();
}

function nagareTogglePanel() {
  const p = document.getElementById("nagare-panel");
  if (p) p.classList.toggle("collapsed");
}

// ウィンドウリサイズ時の処理
function windowResized() {
  // URLパラメータが設定されていない場合のみcanvasをリサイズ
  if (!currentSize || !CANVAS_SIZES[currentSize]) {
    resizeCanvas(windowWidth, windowHeight);
    console.log(`Canvasリサイズ: ${windowWidth}x${windowHeight}`);
  }
}

//-------------------------------------
// ユーティリティ ここから

// レイアウト参考画像の読み込み
function preload() {
  // 画像を読み込む（ファイルが存在しない場合エラー回避）
  if (debugMode) {
    try {
      image1 = loadImage(
        "images/LED_CUBE1.png",
        function () {
          console.log("LED_CUBE1.png 読み込み成功");
        },
        function () {
          console.log("LED_CUBE1.png が不明");
        }
      );
    } catch (e) {
      console.log("LED_CUBE1.png の読み込みをスキップ");
    }

    try {
      image2 = loadImage(
        "images/LED_CUBE2.png",
        function () {
          console.log("LED_CUBE2.png 読み込み成功");
        },
        function () {
          console.log("LED_CUBE2.png が不明");
        }
      );
    } catch (e) {
      console.log("LED_CUBE2.png の読み込みをスキップ");
    }

    try {
      image3 = loadImage(
        "images/LED_CUBE3.png",
        function () {
          console.log("LED_CUBE3.png 読み込み成功");
        },
        function () {
          console.log("LED_CUBE3.png が不明");
        }
      );
    } catch (e) {
      console.log("LED_CUBE3.png の読み込みをスキップ");
    }
  }
}

// レイアウト参考画像の描画（draw関数内）
function drawDebugMode() {
  if (debugMode) {
    if (image1 && image1.width > 0 && currentSize === "LED_CUBE1") {
      image(image1, 0, 0, width, height);
    } else if (image2 && image2.width > 0 && currentSize === "LED_CUBE2") {
      image(image2, 0, 0, width, height);
    } else if (image3 && image3.width > 0 && currentSize === "LED_CUBE3") {
      image(image3, 0, 0, width, height);
    }
  }
}

// キーボードでLED_CUBEのサイズを変更（1-4キー）
function keyPressed() {
  // キーボードでサイズを切り替え
  if (key === "1") {
    currentSize = "LED_CUBE1";
    setActive(1);
  } else if (key === "2") {
    currentSize = "LED_CUBE2";
    setActive(2);
  } else if (key === "3") {
    currentSize = "LED_CUBE3";
    setActive(3);
  } else if (key === "4") {
    currentSize = ""; // フルスクリーンレイアウト
    setActive(4);
  }

  // GraphicsLayer配列の切り替え
  if (key === "1" || key === "2" || key === "3" || key === "4") {
    updateURLAndCanvas();
    // フルスクリーンモードの場合は少し遅延してGraphicsLayerを作成
    if (key === "4") {
      setTimeout(() => {
        createGraphicsLayers();
        console.log("4キー - GraphicsLayers作成完了:", graphicsLayers.length);
      }, 100);
    } else {
      createGraphicsLayers();
    }
  }

  // レイヤーの切り替え（左右矢印キー）
  if (keyCode === LEFT_ARROW) {
    if (graphicsLayers.length > 0) {
      currentLayerIndex =
        (currentLayerIndex - 1 + graphicsLayers.length) % graphicsLayers.length;
      console.log(
        `レイヤー切り替え: ${currentLayerIndex + 1}/${graphicsLayers.length}`
      );
    }
  }
  if (keyCode === RIGHT_ARROW) {
    if (graphicsLayers.length > 0) {
      currentLayerIndex = (currentLayerIndex + 1) % graphicsLayers.length;
      console.log(
        `レイヤー切り替え: ${currentLayerIndex + 1}/${graphicsLayers.length}`
      );
    }
  }

  // スペースキーで現在のレイヤーのアクティブ状態を切り替え
  if (key === " ") {
    if (graphicsLayers.length > 0 && graphicsLayers[currentLayerIndex]) {
      graphicsLayers[currentLayerIndex].toggleActive();
      console.log(
        `レイヤー ${currentLayerIndex + 1} のアクティブ状態を切り替え`
      );
    }
  }
  background(0);
}

// アクティブなLEDキューブを設定
function setActive(n) {
  if (n === 1) active = { shapes: LED_CUBE1, spec: CUBE_SPEC_1 };
  if (n === 2) active = { shapes: LED_CUBE2, spec: CUBE_SPEC_2 };
  if (n === 3) active = { shapes: LED_CUBE3, spec: CUBE_SPEC_3 };
  if (n === 4) {
    // フルスクリーン用の設定を動的に計算
    createFullscreenLayout();
    active = { shapes: LED_CUBE4, spec: CUBE_SPEC_4 };
    console.log("フルスクリーンモード設定完了:", active);

    // フルスクリーンモードの場合はGraphicsLayerを即座に作成
    setTimeout(() => {
      createGraphicsLayers();
      console.log(
        "setActive(4) - GraphicsLayers作成完了:",
        graphicsLayers.length
      );
    }, 50);
  }
}

//クエリパラメーターでLED_CUBEのサイズを変更
function createCanvasSetup() {
  // クエリパラメータからサイズを取得
  const urlParams = new URLSearchParams(window.location.search);
  const sizeParam = urlParams.get("size");
  if (sizeParam && CANVAS_SIZES[sizeParam]) {
    currentSize = sizeParam;
    // アクティブなLEDキューブを設定
    if (sizeParam === "LED_CUBE1") setActive(1);
    if (sizeParam === "LED_CUBE2") setActive(2);
    if (sizeParam === "LED_CUBE3") setActive(3);
  } else {
    // URLパラメータが指定されていない場合はフルスクリーンレイアウト
    currentSize = "";
  }
  createCanvasWithSize(); //キャンバスサイズの設定
  // フルスクリーンモードの場合はキャンバス作成後にレイアウトを設定
  if (!currentSize) {
    setActive(4);
  }
}

//URLParamsを更新してキャンバスサイズを変更
function updateURLAndCanvas() {
  // URLパラメータを更新
  const url = new URL(window.location);
  if (currentSize) {
    url.searchParams.set("size", currentSize);
  } else {
    url.searchParams.delete("size"); // sizeパラメータを完全に削除
  }
  window.history.replaceState({}, "", url);

  createCanvasWithSize(); // キャンバスサイズを変更
}

//キャンバスサイズの設定
function createCanvasWithSize() {
  let size;
  if (currentSize && CANVAS_SIZES[currentSize]) {
    size = CANVAS_SIZES[currentSize];
  } else {
    // URLパラメータが設定されていない場合はwindowWidthとwindowHeightを使用
    size = { width: windowWidth, height: windowHeight };
  }
  // 既存のキャンバスを削除
  if (window.canvas) {
    window.canvas.remove();
  }
  // キャンバスを作成
  pixelDensity(1);
  createCanvas(size.width, size.height);
  console.log(
    `Canvasサイズ変更 : ${currentSize || "screen"} (${size.width}x${
      size.height
    })`
  );
}

// ======== LEDキューブ形状処理ユーティリティ ========

// rect/polyをポリゴン配列に正規化
function toPolygon(item) {
  return item.type === "rect" ? rectToPoly(item) : item.points;
}

// 矩形をポリゴンに変換
const rectToPoly = ({ x, y, w, h }) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

// クリッピング適用
function clipPolygon(poly) {
  push();
  fill(0, 0);
  beginShape();
  for (let i = 0; i < poly.length; i++) {
    vertex(poly[i][0], poly[i][1]);
  }
  endShape(CLOSE);
  pop();
}

// フルスクリーンレイアウトの作成
function createFullscreenLayout() {
  const screenWidth = windowWidth;
  const screenHeight = windowHeight;

  // 既存のデータをクリア
  LED_CUBE4 = [];
  CUBE_SPEC_4 = null;

  // Graphicsサイズを画面幅の1/4に固定
  const graphicsSize = screenWidth / 4;

  // 画面を覆い尽くす格子を計算
  const gridCols = ceil(screenWidth / graphicsSize);
  const gridRows = ceil(screenHeight / graphicsSize);

  // 格子状にタイルを作成（正しく敷き詰める）
  LED_CUBE4 = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      // ランダムにGraphicsLayerのインデックスを選択（0-5の範囲）
      const randomIndex = floor(random(6));

      LED_CUBE4.push({
        type: "rect",
        name: `tile_${row}_${col}`,
        x: col * graphicsSize,
        y: row * graphicsSize,
        w: graphicsSize,
        h: graphicsSize,
        img_x: col * graphicsSize,
        img_y: row * graphicsSize,
        layerIndex: randomIndex % 6, // 確実に0-5の範囲に制限
      });
    }
  }

  // デバッグ: layerIndexの範囲を確認
  let minLayerIndex = Infinity,
    maxLayerIndex = -Infinity;
  LED_CUBE4.forEach((tile) => {
    minLayerIndex = min(minLayerIndex, tile.layerIndex);
    maxLayerIndex = max(maxLayerIndex, tile.layerIndex);
  });
  console.log(
    `layerIndex範囲: ${minLayerIndex} - ${maxLayerIndex} (6個のGraphicsLayerを使用)`
  );

  // スペックを設定
  CUBE_SPEC_4 = {
    w: screenWidth,
    h: screenHeight,
    size: graphicsSize,
  };

  console.log(
    `フルスクリーンレイアウト作成: ${screenWidth}x${screenHeight}, 格子: ${gridCols}×${gridRows}, Graphicsサイズ: ${graphicsSize}, タイル数: ${LED_CUBE4.length}`
  );
}

// LEDキューブの形状定義
// LED_CUBE1 2000×1440
const CUBE_SPEC_1 = { w: 2000, h: 1440, size: 720 };
const LED_CUBE1 = [
  {
    type: "rect",
    name: "r1",
    x: 0,
    y: 0,
    w: 200,
    h: 720,
    img_x: -520,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r2",
    x: 200,
    y: 0,
    w: 720,
    h: 720,
    img_x: 200,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r3",
    x: 920,
    y: 0,
    w: 720,
    h: 720,
    img_x: 920,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r4",
    x: 1640,
    y: 0,
    w: 360,
    h: 720,
    img_x: 1640,
    img_y: 0,
  },
  {
    type: "poly",
    name: "p1",
    points: [
      [560, 1439],
      [560, 1079],
      [200, 1079],
      [200, 720],
      [919, 720],
      [919, 1439],
      [560, 1439],
    ],
    img_x: 200,
    img_y: 720,
  },
];

// LED_CUBE2 1536×768
const CUBE_SPEC_2 = { w: 1536, h: 768, size: 384 };
const LED_CUBE2 = [
  { type: "rect", name: "r1", x: 0, y: 0, w: 384, h: 384, img_x: 0, img_y: 0 },
  {
    type: "rect",
    name: "r2",
    x: 384,
    y: 0,
    w: 384,
    h: 384,
    img_x: 384,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r3",
    x: 768,
    y: 0,
    w: 384,
    h: 384,
    img_x: 768,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r4",
    x: 1152,
    y: 0,
    w: 384,
    h: 384,
    img_x: 1152,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r5",
    x: 384,
    y: 384,
    w: 384,
    h: 384,
    img_x: 384,
    img_y: 384,
  },
];

// LED_CUBE3 672×480
const CUBE_SPEC_3 = { w: 672, h: 480, size: 288 };
const LED_CUBE3 = [
  {
    type: "rect",
    name: "r1",
    x: 192,
    y: 0,
    w: 288,
    h: 288,
    img_x: 192,
    img_y: 0,
  },
  {
    type: "rect",
    name: "r2",
    x: 192,
    y: 288,
    w: 288,
    h: 192,
    img_x: 192,
    img_y: 288,
  },
  {
    type: "poly",
    name: "p1",
    points: [
      [64, 0],
      [192, 0],
      [192, 288],
      [0, 288],
      [0, 224],
      [96, 224],
      [96, 96],
      [64, 96],
    ],
    img_x: -96,
    img_y: 0,
  },
  {
    type: "poly",
    name: "p2",
    points: [
      [480, 287],
      [480, 0],
      [607, 0],
      [607, 95],
      [575, 95],
      [575, 224],
      [671, 224],
      [671, 287],
      [480, 287],
    ],
    img_x: 480,
    img_y: 0,
  },
];

// フルスクリーン用の設定（動的に計算）
let CUBE_SPEC_4 = null;
let LED_CUBE4 = null;

// 現在アクティブなLEDキューブの設定
let active = { shapes: LED_CUBE1, spec: CUBE_SPEC_1 };

// ユーティリティ ここまで
//-------------------------------------
