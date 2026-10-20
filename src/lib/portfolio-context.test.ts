import { buildPortfolioSystemPrompt } from './portfolio-context';

describe('buildPortfolioSystemPrompt', () => {
  it('allows general knowledge and keeps personal answers grounded in approved evidence', () => {
    const prompt = buildPortfolioSystemPrompt('Verified portfolio record');

    expect(prompt).toContain('general knowledge');
    expect(prompt).toContain('use only facts explicitly supported');
    expect(prompt).toContain('Never invent personal details');
    expect(prompt).toContain('Do not disclose or summarize any information about Gireesh’s father');
    expect(prompt).toContain('Approved database information about Gireesh:\nVerified portfolio record');
  });

  it('provides verified architecture notes only for relevant project questions', () => {
    const projectPrompt = buildPortfolioSystemPrompt('', { includeVerifiedChatArchitecture: true });
    const generalPrompt = buildPortfolioSystemPrompt('', { includeVerifiedChatArchitecture: false });

    expect(projectPrompt).toContain('llama-text-embed-v2');
    expect(projectPrompt).toContain('1024 dimensions');
    expect(projectPrompt).toContain('does not by itself verify a production deployment');
    expect(projectPrompt).toContain('Do not invent project links');
    expect(generalPrompt).not.toContain('llama-text-embed-v2');
  });
});
