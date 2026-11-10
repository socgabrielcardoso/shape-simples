import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

import { visualPoint, smoothDetectedHands, resetHandSmoothing, classifyShape } from "./recognition-core.js";

const TIP_INDEXES = [4, 8];

const elements = {
  video: document.querySelector("#camera"),
  canvas: document.querySelector("#visionCanvas"),
  startButton: document.querySelector("#startButton"),
  shapeName: document.querySelector("#shapeName"),
  eyeState: document.querySelector("#eyeState")
};

const context = elements.canvas.getContext("2d", { alpha: false });

let handLandmarker = null;
let faceLandmarker = null;
let mediaStream = null;
let cameraReady = false;
let modelsReady = false;
let lastInferenceAt = 0;
let lastVideoTime = -1;
let smoothedHands = [];
let currentShape = null;

const shapeTracker = {
  candidate: "",
  count: 0,
  stable: "NENHUMA",
  lastSeenAt: 0
};

const eyeTracker = {
  closedAt: null,
  blinkUntil: 0,
  lastFaceAt: 0,
  leftScore: 0,
  rightScore: 0
};

function setRuntime(text, state) {
  document.body.dataset.runtime = text;
  document.body.dataset.state = state;
}

function createHandOptions(delegate) {
  const baseOptions = { modelAssetPath: HAND_MODEL };

  if (delegate) {
    baseOptions.delegate = delegate;
  }

  return {
    baseOptions,
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.55
  };
}

function createFaceOptions(delegate) {
  const baseOptions = { modelAssetPath: FACE_MODEL };

  if (delegate) {
    baseOptions.delegate = delegate;
  }

  return {
    baseOptions,
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    outputFaceBlendshapes: true
  };
}

async function createHandDetector(vision) {
  try {
    return await HandLandmarker.createFromOptions(vision, createHandOptions("GPU"));
  } catch {
    return HandLandmarker.createFromOptions(vision, createHandOptions());
  }
}

async function createFaceDetector(vision) {
  try {
    return await FaceLandmarker.createFromOptions(vision, createFaceOptions("GPU"));
  } catch {
    return FaceLandmarker.createFromOptions(vision, createFaceOptions());
  }
}

async function loadModels() {
  setRuntime("MODELOS", "loading");
  elements.startButton.disabled = true;
  elements.startButton.textContent = "CARREGANDO";

  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  handLandmarker = await createHandDetector(vision);
  try { faceLandmarker = await createFaceDetector(vision); }
  catch { faceLandmarker = null; }
  modelsReady = true;

  setRuntime("PRONTO", "ready");
  elements.startButton.disabled = false;
  elements.startButton.textContent = "INICIAR";
}

async function startCamera() {
  if (!modelsReady || cameraReady) {
    return;
  }

  elements.startButton.disabled = true;
  elements.startButton.textContent = "CÂMERA";
  setRuntime("CÂMERA", "loading");

  try {
    if (!window.isSecureContext) throw new Error("A câmera exige localhost ou HTTPS.");
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      },
      audio: false
    });

    elements.video.srcObject = mediaStream;
    await elements.video.play();
    resizeCanvas();
    cameraReady = true;
    mediaStream.getVideoTracks()[0]?.addEventListener("ended", stopCamera, { once:true });
    elements.startButton.classList.add("is-hidden");
    setRuntime("ATIVO", "ready");
  } catch {
    stopCamera();
    elements.startButton.disabled = false;
    elements.startButton.textContent = "TENTAR";
    setRuntime("NEGADO", "error");
  }
}

function resizeCanvas() {
  const width = elements.video.videoWidth || 1280;
  const height = elements.video.videoHeight || 720;

  if (elements.canvas.width !== width || elements.canvas.height !== height) {
    elements.canvas.width = width;
    elements.canvas.height = height;
  }
}

function canvasPoint(point) {
  const visual = visualPoint(point);

  return {
    x: visual.x * elements.canvas.width,
    y: visual.y * elements.canvas.height
  };
}

function stabilizeShape(observation, now) {
  if (observation) {
    if (now - shapeTracker.lastSeenAt > 400) { shapeTracker.candidate = ""; shapeTracker.count = 0; }
    shapeTracker.lastSeenAt = now;

    if (shapeTracker.candidate === observation.label) {
      shapeTracker.count += 1;
    } else {
      shapeTracker.candidate = observation.label;
      shapeTracker.count = 1;
    }

    if (shapeTracker.count >= 3) {
      shapeTracker.stable = observation.label;
    }
  } else if (now - shapeTracker.lastSeenAt > 450) {
    shapeTracker.candidate = "";
    shapeTracker.count = 0;
    shapeTracker.stable = "NENHUMA";
  }

  elements.shapeName.textContent = shapeTracker.stable;
}

function categoryScore(categories, name) {
  if (!Array.isArray(categories)) return 0;
  const category = categories.find(item => item.categoryName === name);
  const score = Number(category?.score);
  return Number.isFinite(score) ? Math.max(0,Math.min(1,score)) : 0;
}

function setEyeOutput(state) {
  elements.eyeState.textContent = state;
  elements.eyeState.style.color = state === "DORMINDO" ? "#c62828" : "#111";
}

function updateEyeState(faceResult, now) {
  const face = faceResult?.faceLandmarks?.[0];
  const categories = faceResult?.faceBlendshapes?.[0]?.categories;

  if (!face || !categories) {
    if (now - eyeTracker.lastFaceAt > 500) {
      eyeTracker.closedAt = null;
      eyeTracker.leftScore = 0;
      eyeTracker.rightScore = 0;
      setEyeOutput("AUSENTE");
    }
    return;
  }

  eyeTracker.lastFaceAt = now;

  const rawLeft = categoryScore(categories, "eyeBlinkLeft");
  const rawRight = categoryScore(categories, "eyeBlinkRight");
  eyeTracker.leftScore += (rawLeft - eyeTracker.leftScore) * 0.5;
  eyeTracker.rightScore += (rawRight - eyeTracker.rightScore) * 0.5;

  const bothClosed = eyeTracker.leftScore > 0.48 && eyeTracker.rightScore > 0.48;
  const oneClosed = Math.max(eyeTracker.leftScore, eyeTracker.rightScore) > 0.68;

  if (bothClosed) {
    if (eyeTracker.closedAt === null) {
      eyeTracker.closedAt = now;
    }

    const closedDuration = now - eyeTracker.closedAt;
    setEyeOutput(closedDuration >= 1100 ? "DORMINDO" : "PISCANDO");
    return;
  }

  if (eyeTracker.closedAt !== null) {
    const closedDuration = now - eyeTracker.closedAt;

    if (closedDuration >= 70 && closedDuration < 900) {
      eyeTracker.blinkUntil = now + 430;
    }

    eyeTracker.closedAt = null;
  }

  if (oneClosed) {
    setEyeOutput("PISCANDO");
  } else if (now < eyeTracker.blinkUntil) {
    setEyeOutput("PISCOU");
  } else {
    setEyeOutput("ACORDADO");
  }
}

function drawCameraFrame() {
  const width = elements.canvas.width;
  const height = elements.canvas.height;

  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(elements.video, 0, 0, width, height);
  context.restore();
}

function createShapePath(shape) {
  const path = new Path2D();

  if (shape.kind === "ellipse") {
    path.ellipse(
      shape.center.x * elements.canvas.width,
      shape.center.y * elements.canvas.height,
      shape.radiusX * elements.canvas.width,
      shape.radiusY * elements.canvas.height,
      0,
      0,
      Math.PI * 2
    );
    return path;
  }

  const points = shape.points.map(point => ({
    x: point.x * elements.canvas.width,
    y: point.y * elements.canvas.height
  }));

  path.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => path.lineTo(point.x, point.y));
  path.closePath();
  return path;
}

function drawShapeOverlay(shape) {
  const path = createShapePath(shape);

  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.1)";
  context.fill(path);
  context.lineWidth = Math.max(3, elements.canvas.width * 0.003);
  context.strokeStyle = "rgba(255, 255, 255, 0.95)";
  context.shadowColor = "rgba(0, 0, 0, 0.5)";
  context.shadowBlur = 5;
  context.stroke(path);
  context.restore();
}

function drawHands(hands) {
  context.save();

  hands.forEach(hand => {
    TIP_INDEXES.forEach(index => {
      const point = canvasPoint(hand[index]);
      context.beginPath();
      context.arc(point.x, point.y, 5, 0, Math.PI * 2);
      context.fillStyle = "#fff";
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "rgba(0, 0, 0, 0.55)";
      context.stroke();
    });
  });

  context.restore();
}

function runInference(now) {
  if (!modelsReady || !cameraReady || elements.video.readyState < 2) {
    return;
  }

  if (now - lastInferenceAt < 58 || elements.video.currentTime === lastVideoTime) {
    return;
  }

  lastInferenceAt = now;
  lastVideoTime = elements.video.currentTime;

  const handResult = handLandmarker.detectForVideo(elements.video, now);
  const faceResult = faceLandmarker?.detectForVideo(elements.video, now) ?? null;
  const hands = smoothDetectedHands(handResult.landmarks || []);
  smoothedHands = hands;
  const observation = classifyShape(hands);

  currentShape = observation;
  stabilizeShape(observation, now);
  updateEyeState(faceResult, now);
}

function render(now) {
  if (cameraReady) {
    resizeCanvas();
    runInference(now);
    drawCameraFrame();

    if (currentShape) {
      drawShapeOverlay(currentShape);
    }

    drawHands(smoothedHands);
  } else {
    context.fillStyle = "#111";
    context.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
  }

  requestAnimationFrame(render);
}

function stopCamera() {
  mediaStream?.getTracks().forEach(track => track.stop());
  mediaStream = null;
  cameraReady = false;
  elements.video.srcObject = null;
  lastInferenceAt = 0;
  lastVideoTime = -1;
  smoothedHands = [];
  currentShape = null;
  resetHandSmoothing();
  shapeTracker.candidate = "";
  shapeTracker.count = 0;
  shapeTracker.stable = "NENHUMA";
  elements.shapeName.textContent = "NENHUMA";
  elements.startButton.classList.remove("is-hidden");
  elements.startButton.disabled = !modelsReady;
  setRuntime("PARADO","ready");
}

async function boot() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setRuntime("INCOMPATÍVEL", "error");
    elements.startButton.textContent = "INCOMPATÍVEL";
    elements.startButton.disabled = true;
    return;
  }

  try {
    await loadModels();
    await startCamera();
  } catch {
    setRuntime("ERRO", "error");
    elements.startButton.textContent = "RECARREGAR";
    elements.startButton.disabled = false;
  }
}

elements.startButton.addEventListener("click", async () => {
  if (!modelsReady) {
    window.location.reload();
    return;
  }

  await startCamera();
});

elements.video.addEventListener("loadedmetadata", resizeCanvas);
window.addEventListener("beforeunload", stopCamera);
window.addEventListener("resize", resizeCanvas);

requestAnimationFrame(render);
boot();
