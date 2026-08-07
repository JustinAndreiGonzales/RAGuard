import { embedTexts } from "@/lib/documents/embed";
import { searchAccessibleChunks } from "@/lib/retrieval/searchAccessibleChunks";

export async function createUserPrompt(
  userInput: string,
  userId: string,
  isAdmin: boolean,
) {
  const [embeddedQuery] = await embedTexts([userInput], "query");

  const relevantChunks = await searchAccessibleChunks(
    embeddedQuery,
    userId,
    isAdmin,
    5,
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
  return prompt;
}
