import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../src/server/prompt.js';

describe('Prompt construction', () => {
  it('builds text-only prompt', () => {
    expect(buildPrompt({ text: 'Hello' })).toEqual([{ type: 'text', text: 'Hello' }]);
  });

  it('prepends image blocks before text', () => {
    const result = buildPrompt({ text: 'Describe', images: [{ data: 'b64', mimeType: 'image/png' }] });
    expect(result).toEqual([{ type: 'image', data: 'b64', mimeType: 'image/png' }, { type: 'text', text: 'Describe' }]);
  });

  it('prepends resource blocks for files', () => {
    const result = buildPrompt({ text: 'Review', files: [{ name: 'app.ts', content: 'const x = 1;' }] });
    expect(result).toEqual([{ type: 'resource', resource: { uri: 'file:///app.ts', text: 'const x = 1;', mimeType: 'text/plain' } }, { type: 'text', text: 'Review' }]);
  });

  it('includes both images and files before text', () => {
    const result = buildPrompt({ text: 'Go', images: [{ data: 'img', mimeType: 'image/png' }], files: [{ name: 'f.md', content: '# Hi' }] });
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('image');
    expect(result[1].type).toBe('resource');
    expect(result[2]).toEqual({ type: 'text', text: 'Go' });
  });

  it('handles empty arrays as text-only', () => {
    expect(buildPrompt({ text: 'Just text', images: [], files: [] })).toEqual([{ type: 'text', text: 'Just text' }]);
  });
});
