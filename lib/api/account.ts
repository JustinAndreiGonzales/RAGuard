import api from "./client";

export async function updatePassword(body: {
  password: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const { data } = await api.patch("/account/password", body);
  return data;
}
