import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const userResolvers = {
  Query: {
    users: async () => prisma.user.findMany(),
    me: async (_: any, __: any, { session }: any) => {
      if (!session?.user?.email) return null;
      return prisma.user.findUnique({ where: { email: session.user.email } });
    },
  },

  Mutation: {
    registerUser: async (_: any, { name, email, password }: any) => {
      const hashed = await bcrypt.hash(password, 10);
      return prisma.user.create({
        data: { name, email, password: hashed },
      });
    },
  },
};
