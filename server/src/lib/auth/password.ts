import bcrypt from "bcryptjs";

const ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, ROUNDS);

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);
