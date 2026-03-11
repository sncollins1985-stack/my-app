import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function modelHasField(client: PrismaClient, modelName: string, fieldName: string) {
  const runtimeModel = (client as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: Array<{ name?: string }> }>;
    };
  })._runtimeDataModel;

  const modelFields = runtimeModel?.models?.[modelName]?.fields ?? [];
  return modelFields.some((field) => field?.name === fieldName);
}

function hasProjectUuidField(client: PrismaClient) {
  return modelHasField(client, "Project", "uuid");
}

const cachedClient = globalForPrisma.prisma;
export const prisma =
  cachedClient && hasProjectUuidField(cachedClient) ? cachedClient : new PrismaClient();

export function prismaModelHasField(modelName: string, fieldName: string) {
  return modelHasField(prisma, modelName, fieldName);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
