import { embedTexts } from "@/lib/documents/embed";
import { rerankedSearch } from "@/lib/retrieval/rerankedSearch";
import {
  DEFAULT_MAX_K,
  DEFAULT_RELEVANCE_THRESHOLD,
  selectByThreshold,
} from "@/lib/retrieval/selectByThreshold";

const CANDIDATE_POOL_SIZE = 20;

export async function createUserPrompt(
  userInput: string,
  userId: string,
  isAdmin: boolean,
) {
  const [embeddedQuery] = await embedTexts([userInput], "query");

  const rerankedResults = await rerankedSearch(
    userInput,
    embeddedQuery,
    userId,
    isAdmin,
    CANDIDATE_POOL_SIZE,
    CANDIDATE_POOL_SIZE,
  );

  const relevantChunks = selectByThreshold(
    rerankedResults,
    DEFAULT_RELEVANCE_THRESHOLD,
    DEFAULT_MAX_K,
  );

  if (relevantChunks.length === 0) return null;

  const prompt = `
<context>
${relevantChunks
  .map(
    (chunk, idx) =>
      `
    <document index="${idx + 1}" title="${chunk.title}">
    ${chunk.content}
    </document>
    `,
  )
  .join("\n")}
</context>

<question>
${userInput}
</question>

Answer the <question> using only the information inside <context>.
    `;
  return { prompt, chunks: relevantChunks };
}
