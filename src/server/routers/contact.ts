import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

const contactInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
});

export const contactRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          take: z.number().min(1).max(200).default(50),
          skip: z.number().min(0).default(0),
        })
        .default({}),
    )
    .query(({ ctx, input }) => {
      const where = input.search
        ? {
            OR: [
              { firstName: { contains: input.search, mode: "insensitive" as const } },
              { lastName: { contains: input.search, mode: "insensitive" as const } },
              { email: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};
      return ctx.prisma.contact.findMany({
        where,
        take: input.take,
        skip: input.skip,
        orderBy: { updatedAt: "desc" },
        include: { company: true },
      });
    }),

  byId: protectedProcedure.input(z.string()).query(({ ctx, input }) =>
    ctx.prisma.contact.findUnique({
      where: { id: input },
      include: { company: true, deals: true, activities: true, notes: true },
    }),
  ),

  create: protectedProcedure.input(contactInput).mutation(({ ctx, input }) =>
    ctx.prisma.contact.create({
      data: { ...input, ownerId: ctx.userId },
    }),
  ),

  update: protectedProcedure
    .input(contactInput.partial().extend({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.contact.update({ where: { id }, data });
    }),

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.contact.delete({ where: { id: input } }),
  ),
});
