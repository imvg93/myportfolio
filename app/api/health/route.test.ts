/** @jest-environment node */

import { GET } from './route';

describe('GET /api/health', () => {
  it('returns status ok with 200 status code', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.timestamp).toBe('string');
  });
});
