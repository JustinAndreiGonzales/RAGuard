import { db } from "..";
import bcrypt from "bcrypt";
import { teamMembers, teams, users } from "../schema";

async function seed() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin, alice, bob, oauthStub] = await db
    .insert(users)
    .values([
      {
        email: "admin@example.com",
        name: "Admin",
        passwordHash,
        role: "admin",
      },
      { email: "alice@example.com", name: "Alice", passwordHash, role: "user" },
      { email: "bob@example.com", name: "Bob", passwordHash, role: "user" },
      {
        email: "oauth-stub@example.com",
        name: "OAuth Only",
        passwordHash: null,
        role: "user",
      },
    ])
    .returning();

  const [engineering] = await db
    .insert(teams)
    .values([{ name: "Engineering" }])
    .returning();

  await db
    .insert(teamMembers)
    .values([{ teamId: engineering.id, userId: alice.id }]);

  console.log({ admin, alice, bob, oauthStub, engineering });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
