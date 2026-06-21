import { createUser } from "../src/lib/users/service.js";

const main = async () => {
  const user = await createUser({
    userId: "workerkaran",
    name: "Worker Karan",
    password: "worker123",
    role: "Karigar",
  });
  console.log(`Created/updated worker: ${user.email}`);
};

main().catch((error) => {
  if (error instanceof Error && error.message.includes("already exists")) {
    console.log("Worker user already exists.");
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});
