/* /api/houston — shared state for the /houston trip page.
   The logic lives in netlify/lib/houston-core.mjs; this just hands it a
   Netlify Blobs store (netlify/lib/blobs-lite.mjs — no npm install
   needed, nothing to set up). */
import { siteStore } from '../lib/blobs-lite.mjs';
import { handle } from '../lib/houston-core.mjs';

export default async (req) => handle(req, siteStore('houston'));

export const config = { path: '/api/houston' };
