export type RagChatPromptSource = {
  articleId: string;
  articleTitle: string;
  relevantChunk: string;
};

export function buildRagChatPrompt(
  question: string,
  sources: RagChatPromptSource[],
): string {
  const contextBlock =
    sources.length > 0
      ? sources
          .map(
            (source, index) =>
              `Source ${index + 1}\nArticle ID: ${source.articleId}\nTitle: ${source.articleTitle}\nChunk: ${source.relevantChunk}`,
          )
          .join('\n\n')
      : 'No relevant context found in Knowledge Hub index.';

  return [
    'You are a Knowledge Hub assistant.',
    'Use two sources of truth with this priority:',
    '1) For factual/domain questions, use ONLY the retrieved Knowledge Hub context below.',
    '2) For meta-questions about this conversation (for example "what did I ask before?" or "what did I ask you to remember?"), use prior conversation history.',
    'Do not invent facts outside retrieved context and conversation history.',
    'If the answer is not present in either retrieved context or prior conversation history, clearly say it is unavailable.',
    '',
    'User question:',
    question.trim(),
    '',
    'Retrieved context:',
    contextBlock,
  ].join('\n');
}
