import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache (no R2/KV to provision): the API routes are dynamic and the
// pages are client-rendered shells.
export default defineCloudflareConfig({});
