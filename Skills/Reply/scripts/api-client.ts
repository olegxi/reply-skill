// api-client.ts — Shared HTTP client for Reply.io API

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { printError } from "./utils.js";

function loadApiKey(): string {
  // Check env var first
  if (process.env.REPLY_API_KEY) return process.env.REPLY_API_KEY;

  // Walk up from script dir to find .env
  let dir = resolve(import.meta.dirname || __dirname, "..");
  for (let i = 0; i < 5; i++) {
    const envPath = resolve(dir, ".env");
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8");
      const match = content.match(/REPLY_API_KEY=(.+)/);
      if (match) return match[1].trim();
    }
    dir = resolve(dir, "..");
  }

  printError("REPLY_API_KEY not found. Set it in .env or as an environment variable.");
  process.exit(1);
}

class ReplyAPI {
  private baseUrl = "https://api.reply.io";
  private apiKey: string;

  constructor() {
    this.apiKey = loadApiKey();
  }

  private headers(contentType?: string): Record<string, string> {
    const h: Record<string, string> = { "x-api-key": this.apiKey };
    if (contentType) h["Content-Type"] = contentType;
    return h;
  }

  private async handleResponse(res: Response, endpoint: string): Promise<any> {
    if (res.ok) {
      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    let errorMsg: string;
    try {
      const body = await res.json();
      errorMsg = body.message || body.error || JSON.stringify(body);
    } catch {
      errorMsg = await res.text().catch(() => res.statusText);
    }

    switch (res.status) {
      case 400:
        throw new Error(`Bad request to ${endpoint}: ${errorMsg}`);
      case 401:
        throw new Error(`Invalid API key. Check REPLY_API_KEY in your .env file. Get your API key at https://run.reply.io/Dashboard/Material#/settings/api`);
      case 403:
        throw new Error(`Access denied for ${endpoint}. May require owner/master API key.`);
      case 404:
        throw new Error(`Not found: ${endpoint}. Resource may have been deleted.`);
      case 429:
        throw new Error(`Rate limited by Reply.io API. Wait a moment and try again.`);
      default:
        throw new Error(`API error ${res.status} on ${endpoint}: ${errorMsg}`);
    }
  }

  private async fetchSafe(url: string, opts: RequestInit, _endpoint: string): Promise<Response> {
    try {
      return await fetch(url, opts);
    } catch (e: any) {
      if (e?.cause?.code === "ENOTFOUND" || e?.cause?.code === "ECONNREFUSED" || e.message?.includes("fetch failed")) {
        throw new Error("Network error — check your internet connection.");
      }
      throw e;
    }
  }

  async get(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchSafe(url, { headers: this.headers() }, path);
    return this.handleResponse(res, path);
  }

  async post(path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchSafe(url, {
      method: "POST",
      headers: this.headers("application/json"),
      body: body != null ? JSON.stringify(body) : undefined,
    }, path);
    return this.handleResponse(res, path);
  }

  async patch(path: string, body: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchSafe(url, {
      method: "PATCH",
      headers: this.headers("application/json"),
      body: JSON.stringify(body),
    }, path);
    return this.handleResponse(res, path);
  }

  async del(path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = { method: "DELETE", headers: this.headers("application/json") };
    if (body) opts.body = JSON.stringify(body);
    const res = await this.fetchSafe(url, opts, path);
    return this.handleResponse(res, path);
  }

  async postFormData(path: string, formData: FormData): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchSafe(url, {
      method: "POST",
      headers: { "x-api-key": this.apiKey },
      body: formData,
    }, path);
    return this.handleResponse(res, path);
  }
}

export const api = new ReplyAPI();
