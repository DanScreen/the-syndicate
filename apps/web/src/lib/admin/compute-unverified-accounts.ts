import { DELETED_EMAIL_DOMAIN } from "@/lib/account-removal";
import { emailDomain, emailDomainAcceptsMail } from "@/lib/email-domain";
import { prisma } from "@tiki-acca/database";
import type { Prisma } from "@prisma/client";

export const UNVERIFIED_PAGE_SIZE = 25;

export type UnverifiedAccountEntry = {
  userId: string;
  name: string;
  email: string;
  joinedAt: Date;
  /** False when DNS says the domain can't receive mail — almost certainly a typo or junk. */
  domainAcceptsMail: boolean;
  lastLinkSentAt: Date | null;
  groups: { id: string; name: string }[];
  legCount: number;
};

export type UnverifiedAccountsResult = {
  users: UnverifiedAccountEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: string;
};

export function unverifiedAccountsWhere(query = ""): Prisma.UserWhereInput {
  return {
    emailVerifiedAt: null,
    NOT: { email: { endsWith: `@${DELETED_EMAIL_DOMAIN}`, mode: "insensitive" } },
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function computeUnverifiedAccounts(input: {
  page?: number;
  query?: string;
}): Promise<UnverifiedAccountsResult> {
  const query = input.query?.trim().slice(0, 100) ?? "";
  const where = unverifiedAccountsWhere(query);

  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / UNVERIFIED_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(input.page ?? 1)), totalPages);

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * UNVERIFIED_PAGE_SIZE,
    take: UNVERIFIED_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      memberships: { select: { group: { select: { id: true, name: true } } } },
      emailVerificationTokens: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { legs: true } },
    },
  });

  // One DNS lookup per distinct domain on the page (gmail.com etc. repeat).
  const domains = [...new Set(rows.map((row) => emailDomain(row.email).toLowerCase()))];
  const accepts = new Map(
    await Promise.all(
      domains.map(async (domain) => [domain, await emailDomainAcceptsMail(domain)] as const)
    )
  );

  return {
    users: rows.map((row) => ({
      userId: row.id,
      name: row.name,
      email: row.email,
      joinedAt: row.createdAt,
      domainAcceptsMail: accepts.get(emailDomain(row.email).toLowerCase()) ?? true,
      lastLinkSentAt: row.emailVerificationTokens[0]?.createdAt ?? null,
      groups: row.memberships.map((m) => m.group),
      legCount: row._count.legs,
    })),
    page,
    pageSize: UNVERIFIED_PAGE_SIZE,
    total,
    totalPages,
    query,
  };
}
