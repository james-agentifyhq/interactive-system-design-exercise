/**
 * Local Embedding Model — runs all-MiniLM-L6-v2 in Node.js via @xenova/transformers.
 *
 * No API key needed, no network call for embeddings.
 * Produces 384-dimensional normalized vectors (~80ms per embedding on CPU).
 *
 * The model downloads (~90MB) on first use and is cached locally after that.
 * Uses a singleton pattern — the model loads once and all callers share it.
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

export class Embedder {
  private pipe: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    console.log(`Loading embedding model: ${MODEL_NAME} ...`);
    const start = Date.now();
    this.pipe = await pipeline('feature-extraction', MODEL_NAME);
    console.log(`Embedding model loaded in ${Date.now() - start}ms`);
  }

  /**
   * Embed a text string into a 384-dim normalized vector.
   * Returns a Float32Array suitable for sqlite-vec storage.
   */
  async embed(text: string): Promise<Float32Array> {
    await this.initPromise;
    if (!this.pipe) throw new Error('Embedder not initialized');

    const output = await this.pipe(text, {
      pooling: 'mean',
      normalize: true,
    });

    // output.data may be typed as a union — cast to number[] for Float32Array ctor
    return new Float32Array(output.data as number[]);
  }

  /** The dimensionality of embeddings produced by this model. */
  get dimensions(): number {
    return EMBEDDING_DIM;
  }
}
