/// <reference lib="webworker" />
// Runs the on-device AI in the background so the page stays smooth. Receives texts, sends back their vectors.
// The model is downloaded once from Hugging Face and kept in the browser's cache; the texts never leave the phone.

import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { AI_MODEL } from './aiMatch';

env.allowLocalModels = false;

let model: Promise<FeatureExtractionPipeline> | null = null;
const files = new Map<string, { loaded: number; total: number }>();

function load() {
  model ??= pipeline('feature-extraction', AI_MODEL.id, {
    dtype: AI_MODEL.dtype,
    revision: AI_MODEL.revision,
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== 'progress' || !p.file || !p.total) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) [loaded, total] = [loaded + f.loaded, total + f.total];
      self.postMessage({ type: 'progress', loaded, total });
    },
  }) as Promise<FeatureExtractionPipeline>;
  return model;
}

self.onmessage = async (e: MessageEvent<{ id: number; texts: string[] }>) => {
  const { id, texts } = e.data;
  try {
    const embed = await load();
    const out = await embed(
      texts.map((t) => AI_MODEL.prefix + t),
      { pooling: 'mean', normalize: true },
    );
    self.postMessage({ type: 'result', id, vectors: out.tolist() });
  } catch (err) {
    model = null;
    self.postMessage({ type: 'error', id, message: String(err) });
  }
};
