/* /api/houston — shared state for the /houston trip page.
   The logic lives in netlify/lib/houston-core.mjs; this just hands it a
   Netlify Blobs store. Blobs needs no setup or keys on Netlify. */
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/houston-core.mjs';

export default async (req) => handle(req, getStore({ name: 'houston', consistency: 'strong' }));

export const config = { path: '/api/houston' };
