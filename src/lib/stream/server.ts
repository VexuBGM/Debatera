/**
 * Stream Video – Server-side Client (singleton)
 *
 * Uses NEXT_PUBLIC_STREAM_API_KEY + STREAM_API_SECRET.
 * NEVER import this file from client components.
 */

import { StreamClient } from "@stream-io/node-sdk";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey) throw new Error("Missing env NEXT_PUBLIC_STREAM_API_KEY");
if (!apiSecret) throw new Error("Missing env STREAM_API_SECRET");

export const streamServerClient = new StreamClient(apiKey, apiSecret);
