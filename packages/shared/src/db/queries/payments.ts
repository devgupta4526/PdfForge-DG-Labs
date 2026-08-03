import { and, between, desc, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../client.js';
import { payments, type NewPayment, type Payment } from '../schema.js';

interface QueryOptions {
  db?: Database;
}

function client(opts?: QueryOptions): Database {
  return opts?.db ?? defaultDb;
}

export async function getPaymentById(id: string, opts?: QueryOptions): Promise<Payment | null> {
  const rows = await client(opts).select().from(payments).where(eq(payments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getPaymentByRazorpayId(
  razorpayPaymentId: string,
  opts?: QueryOptions,
): Promise<Payment | null> {
  const rows = await client(opts)
    .select()
    .from(payments)
    .where(eq(payments.razorpayPaymentId, razorpayPaymentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPaymentsForUser(
  userId: string,
  limit = 50,
  offset = 0,
  opts?: QueryOptions,
): Promise<Payment[]> {
  return client(opts)
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listPaymentsForSubscription(
  subscriptionId: string,
  opts?: QueryOptions,
): Promise<Payment[]> {
  return client(opts)
    .select()
    .from(payments)
    .where(eq(payments.subscriptionId, subscriptionId))
    .orderBy(desc(payments.createdAt));
}

export async function listPaymentsInRange(
  params: { from: Date; to: Date; status?: Payment['status'] },
  opts?: QueryOptions,
): Promise<Payment[]> {
  const conditions = [between(payments.createdAt, params.from, params.to)];
  if (params.status) conditions.push(eq(payments.status, params.status));

  return client(opts)
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt));
}

export async function recordPayment(values: NewPayment, opts?: QueryOptions): Promise<Payment> {
  const [row] = await client(opts).insert(payments).values(values).returning();
  if (!row) throw new Error('recordPayment: insert returned no rows');
  return row;
}

/** Idempotent insert keyed on Razorpay's payment id (webhook-safe). */
export async function upsertPaymentByRazorpayId(
  values: NewPayment,
  opts?: QueryOptions,
): Promise<Payment> {
  const [row] = await client(opts)
    .insert(payments)
    .values(values)
    .onConflictDoUpdate({
      target: payments.razorpayPaymentId,
      set: {
        status: values.status,
        amountInr: values.amountInr,
        currency: values.currency,
        invoiceNumber: values.invoiceNumber,
        invoiceUrl: values.invoiceUrl,
        paymentMethod: values.paymentMethod,
        subscriptionId: values.subscriptionId,
      },
    })
    .returning();
  if (!row) throw new Error('upsertPaymentByRazorpayId: insert returned no rows');
  return row;
}

export async function markPaymentRefunded(
  razorpayPaymentId: string,
  opts?: QueryOptions,
): Promise<Payment | null> {
  const [row] = await client(opts)
    .update(payments)
    .set({ status: 'refunded' })
    .where(eq(payments.razorpayPaymentId, razorpayPaymentId))
    .returning();
  return row ?? null;
}

export async function sumSuccessfulRevenueInr(
  params: { from: Date; to: Date },
  opts?: QueryOptions,
): Promise<string> {
  const [row] = await client(opts)
    .select({
      total: sql<string>`coalesce(sum(${payments.amountInr}), 0)::text`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.status, 'success'),
        between(payments.createdAt, params.from, params.to),
      ),
    );
  return row?.total ?? '0';
}
