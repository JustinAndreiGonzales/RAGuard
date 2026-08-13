import { embedTexts } from "@/lib/documents/embed";
import { rerankedSearch } from "@/lib/retrieval/rerankedSearch";

const CANDIDATE_POOL_SIZE = 20;
const FINAL_CHUNK_COUNT = 5;

export async function createUserPrompt(
  userInput: string,
  userId: string,
  isAdmin: boolean,
) {
  const [embeddedQuery] = await embedTexts([userInput], "query");

  const relevantChunks = await rerankedSearch(
    userInput,
    embeddedQuery,
    userId,
    isAdmin,
    CANDIDATE_POOL_SIZE,
    FINAL_CHUNK_COUNT,
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
