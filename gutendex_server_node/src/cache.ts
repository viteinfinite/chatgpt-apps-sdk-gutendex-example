import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DEBUG = String(process.env.DEBUG ?? "").toLowerCase() === "1" ||
  String(process.env.DEBUG ?? "").toLowerCase() === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[debug]", ...args);
  }
}

export class FileFifoCache {
  private readonly cacheDir: string;
  private readonly indexFile: string;
  private readonly capacity: number;

  constructor(cacheDir: string, capacity = 10) {
    this.cacheDir = cacheDir;
    this.indexFile = path.join(cacheDir, "index.json");
    this.capacity = capacity;
  }

  private ensureDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private hashKey(key: string): string {
    return createHash("sha1").update(key).digest("hex");
  }

  private async readIndex(): Promise<{ order: string[] }> {
    try {
      this.ensureDir();
      const raw = await fs.promises.readFile(this.indexFile, "utf8");
      const idx = JSON.parse(raw);
      if (!idx || !Array.isArray(idx.order)) return { order: [] };
      return idx;
    } catch {
      return { order: [] };
    }
  }

  private async writeIndex(idx: { order: string[] }): Promise<void> {
    this.ensureDir();
    const tmp = this.indexFile + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(idx), "utf8");
    await fs.promises.rename(tmp, this.indexFile);
  }

  async read(key: string): Promise<any | null> {
    try {
      this.ensureDir();
      const file = path.join(this.cacheDir, this.hashKey(key) + ".json");
      if (!fs.existsSync(file)) return null;
      const raw = await fs.promises.readFile(file, "utf8");
      const data = JSON.parse(raw);
      debug("cache hit", key);
      return data;
    } catch (e) {
      debug("cache read error", (e as Error)?.message);
      return null;
    }
  }

  async write(key: string, data: any): Promise<void> {
    try {
      this.ensureDir();
      const file = path.join(this.cacheDir, this.hashKey(key) + ".json");
      const idx = await this.readIndex();
      const tmp = file + ".tmp";
      await fs.promises.writeFile(tmp, JSON.stringify(data), "utf8");
      await fs.promises.rename(tmp, file);

      if (!idx.order.includes(key)) {
        idx.order.push(key);
      }
      while (idx.order.length > this.capacity) {
        const evictKey = idx.order.shift();
        if (evictKey) {
          const evictFile = path.join(this.cacheDir, this.hashKey(evictKey) + ".json");
          try {
            await fs.promises.unlink(evictFile);
            debug("cache evict", evictKey);
          } catch {
            // ignore unlink errors
          }
        }
      }
      await this.writeIndex(idx);
      debug("cache write", key);
    } catch (e) {
      debug("cache write error", (e as Error)?.message);
    }
  }

  get directory() {
    return this.cacheDir;
  }
}

