/**
 * Reconhecimento facial via @vladmandic/face-api (tiny models carregados do CDN).
 */
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (faceapi as any).tf.ready();
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

function euclidean(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export async function getDescriptor(
  el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  await loadFaceModels();
  const det = await faceapi
    .detectSingleFace(el, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return det?.descriptor ?? null;
}

export function bestMatch(
  descriptor: Float32Array,
  candidates: Array<{ id: string; face_descriptor: number[] | null }>
): { id: string; distance: number } | null {
  let best: { id: string; distance: number } | null = null;
  for (const c of candidates) {
    if (!c.face_descriptor || c.face_descriptor.length === 0) continue;
    const stored = new Float32Array(c.face_descriptor);
    const dist = euclidean(descriptor, stored);
    if (!best || dist < best.distance) best = { id: c.id, distance: dist };
  }
  return best && best.distance < 0.55 ? best : null;
}
