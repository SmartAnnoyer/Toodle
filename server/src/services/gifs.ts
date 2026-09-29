import { config } from '../config.js';

export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  label?: string;
  mock?: boolean;
}

const MOCKS: GifResult[] = [
  { id: 'poof', title: 'poof', url: '', previewUrl: '', label: '💨', mock: true },
  { id: 'heart', title: 'heart', url: '', previewUrl: '', label: '💕', mock: true },
  { id: 'lol', title: 'lol', url: '', previewUrl: '', label: '😂', mock: true },
  { id: 'fire', title: 'fire', url: '', previewUrl: '', label: '🔥', mock: true },
  { id: 'sleep', title: 'sleep', url: '', previewUrl: '', label: '😴', mock: true },
  { id: 'eyes', title: 'eyes', url: '', previewUrl: '', label: '👀', mock: true },
  { id: 'dead', title: 'dead', url: '', previewUrl: '', label: '💀', mock: true },
  { id: 'spark', title: 'spark', url: '', previewUrl: '', label: '✨', mock: true },
];

function mockGifs(query: string): GifResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return MOCKS;
  const matched = MOCKS.filter((gif) => gif.title.includes(needle) || gif.label?.includes(query.trim()));
  return matched.length ? matched : MOCKS;
}

export async function searchGifs(query: string): Promise<{ provider: 'giphy' | 'mock'; results: GifResult[] }> {
  if (!config.giphyApiKey) return { provider: 'mock', results: mockGifs(query) };
  try {
    const url = new URL('https://api.giphy.com/v1/gifs/search');
    url.searchParams.set('api_key', config.giphyApiKey);
    url.searchParams.set('q', query.trim() || 'reaction');
    url.searchParams.set('limit', '18');
    url.searchParams.set('rating', 'pg-13');
    const response = await fetch(url);
    if (!response.ok) return { provider: 'mock', results: mockGifs(query) };
    const json = await response.json() as { data?: Array<{ id: string; title: string; images?: { fixed_width?: { url?: string }; fixed_width_small?: { url?: string } } }> };
    const results = (json.data ?? []).flatMap((gif) => {
      const full = gif.images?.fixed_width?.url;
      if (!full) return [];
      return [{
        id: gif.id,
        title: gif.title || 'gif',
        url: full,
        previewUrl: gif.images?.fixed_width_small?.url || full,
      }];
    });
    return { provider: 'giphy', results: results.length ? results : mockGifs(query) };
  } catch (error) {
    console.error('gif search', error);
    return { provider: 'mock', results: mockGifs(query) };
  }
}
