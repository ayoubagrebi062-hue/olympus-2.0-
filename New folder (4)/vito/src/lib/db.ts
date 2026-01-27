// db.ts
// Stub for Prisma client - Prisma is not configured in this project

interface PrismaClientStub {
  // Add model methods as needed
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}

const db: PrismaClientStub = {
  $connect: async () => {},
  $disconnect: async () => {},
};

export { db };
