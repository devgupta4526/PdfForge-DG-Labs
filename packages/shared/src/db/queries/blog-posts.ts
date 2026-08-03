import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import { blogPosts, type BlogPost, type NewBlogPost } from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

export async function getBlogPostById(
  id: string,
  opts?: QueryOptions,
): Promise<BlogPost | null> {
  const rows = await client(opts).select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getBlogPostBySlug(
  slug: string,
  opts?: QueryOptions,
): Promise<BlogPost | null> {
  const rows = await client(opts)
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPublishedBlogPostBySlug(
  slug: string,
  opts?: QueryOptions,
): Promise<BlogPost | null> {
  const now = new Date();
  const rows = await client(opts)
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, 'published'),
        lte(blogPosts.publishedAt, now),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublishedBlogPosts(
  limit = 20,
  offset = 0,
  opts?: QueryOptions,
): Promise<BlogPost[]> {
  const now = new Date();
  return client(opts)
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.status, 'published'), lte(blogPosts.publishedAt, now)))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function listBlogPostsByStatus(
  status: BlogPost['status'],
  limit = 50,
  offset = 0,
  opts?: QueryOptions,
): Promise<BlogPost[]> {
  return client(opts)
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, status))
    .orderBy(desc(blogPosts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createBlogPost(
  values: NewBlogPost,
  opts?: QueryOptions,
): Promise<BlogPost> {
  const [row] = await client(opts).insert(blogPosts).values(values).returning();
  if (!row) throw new Error('createBlogPost: insert returned no rows');
  return row;
}

export async function updateBlogPost(
  id: string,
  patch: Partial<Omit<NewBlogPost, 'id' | 'createdAt'>>,
  opts?: QueryOptions,
): Promise<BlogPost | null> {
  const [row] = await client(opts)
    .update(blogPosts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(blogPosts.id, id))
    .returning();
  return row ?? null;
}

export async function publishBlogPost(
  id: string,
  publishedAt: Date = new Date(),
  opts?: QueryOptions,
): Promise<BlogPost | null> {
  const [row] = await client(opts)
    .update(blogPosts)
    .set({ status: 'published', publishedAt, updatedAt: new Date() })
    .where(eq(blogPosts.id, id))
    .returning();
  return row ?? null;
}

export async function archiveBlogPost(
  id: string,
  opts?: QueryOptions,
): Promise<BlogPost | null> {
  const [row] = await client(opts)
    .update(blogPosts)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(blogPosts.id, id))
    .returning();
  return row ?? null;
}

export async function incrementBlogPostViews(
  id: string,
  delta = 1,
  opts?: QueryOptions,
): Promise<void> {
  await client(opts)
    .update(blogPosts)
    .set({ viewsCount: sql`${blogPosts.viewsCount} + ${delta}` })
    .where(eq(blogPosts.id, id));
}
