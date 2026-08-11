import api from "./client";

export async function registerUser(body: {
  email: string;
  password: string;
  name: string;
}): Promise<{ id: string; email: string }> {
  const { data } = await api.post("/auth/register", body);
  return data;
}
