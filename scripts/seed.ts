/**
 * Dev seed for PDF Forge.
 *
 * Usage (from repo root):
 *   cp .env.example .env          # fill in DATABASE_URL / DIRECT_URL
 *   npm run db:push               # create the schema
 *   npm run db:seed               # populate with realistic sample data
 *
 * Idempotent: truncates every table inside a single transaction before
 * inserting fresh rows, so it's safe to re-run without leaving orphan FKs.
 *
 * NEVER run this against production. The script aborts if NODE_ENV=production
 * unless `ALLOW_PROD_SEED=1` is also set.
 */

import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { getDirectDb } from '../packages/shared/src/db/client.js';
import {
  apiKeys,
  blogPosts,
  operations,
  payments,
  subscriptions,
  usageTracking,
  users,
  type NewApiKey,
  type NewBlogPost,
  type NewOperation,
  type NewPayment,
  type NewSubscription,
  type NewUsageTracking,
  type NewUser,
} from '../packages/shared/src/db/schema.js';

if (process.env['NODE_ENV'] === 'production' && process.env['ALLOW_PROD_SEED'] !== '1') {
  throw new Error('[seed] Refusing to run against NODE_ENV=production without ALLOW_PROD_SEED=1');
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hashKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

async function main(): Promise<void> {
  const { sql: client, db } = getDirectDb();
  const startedAt = Date.now();

  try {
    console.log('[seed] Truncating tables…');
    // Use the raw postgres.js client for DDL — sidesteps Drizzle's dual-ESM
    // type resolution quirk and is faster for a single one-shot statement.
    await client.unsafe(
      'truncate table api_keys, payments, subscriptions, operations, ' +
        'usage_tracking, blog_posts, users restart identity cascade',
    );

    console.log('[seed] Inserting users…');
    const userSeeds: NewUser[] = [
      {
        clerkId: 'user_seed_admin',
        email: 'admin@pdf-forge.local',
        name: 'Aarav Sharma',
        country: 'IN',
        phone: '+919900000001',
        emailVerified: true,
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
        lastLoginAt: daysAgo(0),
      },
      {
        clerkId: 'user_seed_pro',
        email: 'pro@pdf-forge.local',
        name: 'Priya Patel',
        country: 'IN',
        phone: '+919900000002',
        emailVerified: true,
        avatarUrl: 'https://i.pravatar.cc/150?img=32',
        lastLoginAt: daysAgo(1),
      },
      {
        clerkId: 'user_seed_yearly',
        email: 'yearly@pdf-forge.local',
        name: 'Rahul Mehta',
        country: 'IN',
        phone: '+919900000003',
        emailVerified: true,
        avatarUrl: 'https://i.pravatar.cc/150?img=14',
        lastLoginAt: daysAgo(2),
      },
      {
        clerkId: 'user_seed_business',
        email: 'team@acme.test',
        name: 'Acme Corp',
        country: 'US',
        phone: '+14155550100',
        emailVerified: true,
        avatarUrl: 'https://i.pravatar.cc/150?img=68',
        lastLoginAt: daysAgo(0),
      },
      {
        clerkId: 'user_seed_free',
        email: 'free@pdf-forge.local',
        name: 'Sneha Iyer',
        country: 'IN',
        emailVerified: false,
        lastLoginAt: daysAgo(7),
      },
      {
        clerkId: 'user_seed_inactive',
        email: 'inactive@pdf-forge.local',
        name: 'Old Account',
        country: 'IN',
        emailVerified: true,
        isActive: false,
        lastLoginAt: daysAgo(180),
      },
    ];
    const insertedUsers = await db.insert(users).values(userSeeds).returning();
    const [admin, pro, yearly, business, free] = insertedUsers;
    if (!admin || !pro || !yearly || !business || !free) {
      throw new Error('[seed] Failed to insert all expected users');
    }

    console.log('[seed] Inserting subscriptions…');
    const subscriptionSeeds: NewSubscription[] = [
      {
        userId: admin.id,
        plan: 'business',
        status: 'active',
        razorpaySubscriptionId: 'sub_admin_business_001',
        razorpayCustomerId: 'cust_admin_001',
        currentPeriodStart: daysAgo(7),
        currentPeriodEnd: daysAgo(-23),
        cancelAtPeriodEnd: false,
      },
      {
        userId: pro.id,
        plan: 'premium_monthly',
        status: 'active',
        razorpaySubscriptionId: 'sub_pro_monthly_001',
        razorpayCustomerId: 'cust_pro_001',
        currentPeriodStart: daysAgo(10),
        currentPeriodEnd: daysAgo(-20),
        cancelAtPeriodEnd: false,
      },
      {
        userId: yearly.id,
        plan: 'premium_yearly',
        status: 'active',
        razorpaySubscriptionId: 'sub_yearly_001',
        razorpayCustomerId: 'cust_yearly_001',
        currentPeriodStart: daysAgo(60),
        currentPeriodEnd: daysAgo(-305),
        cancelAtPeriodEnd: false,
      },
      {
        userId: business.id,
        plan: 'business',
        status: 'past_due',
        razorpaySubscriptionId: 'sub_business_001',
        razorpayCustomerId: 'cust_business_001',
        currentPeriodStart: daysAgo(35),
        currentPeriodEnd: daysAgo(5),
        cancelAtPeriodEnd: false,
      },
      {
        userId: free.id,
        plan: 'free',
        status: 'active',
      },
    ];
    const insertedSubs = await db.insert(subscriptions).values(subscriptionSeeds).returning();
    const [adminSub, proSub, yearlySub, businessSub] = insertedSubs;
    if (!adminSub || !proSub || !yearlySub || !businessSub) {
      throw new Error('[seed] Failed to insert all expected subscriptions');
    }

    console.log('[seed] Inserting payments…');
    const paymentSeeds: NewPayment[] = [
      {
        userId: pro.id,
        subscriptionId: proSub.id,
        amountInr: '299.00',
        currency: 'INR',
        status: 'success',
        razorpayPaymentId: 'pay_seed_pro_001',
        razorpayOrderId: 'order_seed_pro_001',
        invoiceNumber: 'INV-2026-0001',
        invoiceUrl: 'https://invoices.pdf-forge.local/INV-2026-0001.pdf',
        paymentMethod: 'card',
      },
      {
        userId: yearly.id,
        subscriptionId: yearlySub.id,
        amountInr: '2499.00',
        currency: 'INR',
        status: 'success',
        razorpayPaymentId: 'pay_seed_yearly_001',
        razorpayOrderId: 'order_seed_yearly_001',
        invoiceNumber: 'INV-2026-0002',
        invoiceUrl: 'https://invoices.pdf-forge.local/INV-2026-0002.pdf',
        paymentMethod: 'upi',
      },
      {
        userId: business.id,
        subscriptionId: businessSub.id,
        amountInr: '4999.00',
        currency: 'INR',
        status: 'failed',
        razorpayPaymentId: 'pay_seed_business_failed_001',
        razorpayOrderId: 'order_seed_business_001',
        invoiceNumber: 'INV-2026-0003',
        paymentMethod: 'netbanking',
      },
      {
        userId: admin.id,
        subscriptionId: adminSub.id,
        amountInr: '4999.00',
        currency: 'INR',
        status: 'success',
        razorpayPaymentId: 'pay_seed_admin_001',
        razorpayOrderId: 'order_seed_admin_001',
        invoiceNumber: 'INV-2026-0004',
        invoiceUrl: 'https://invoices.pdf-forge.local/INV-2026-0004.pdf',
        paymentMethod: 'card',
      },
    ];
    await db.insert(payments).values(paymentSeeds);

    console.log('[seed] Inserting operations…');
    const tools = ['merge', 'split', 'compress', 'rotate', 'pdf-to-image', 'image-to-pdf'] as const;
    const operationSeeds: NewOperation[] = [];
    for (let i = 0; i < 25; i++) {
      const tool = tools[i % tools.length];
      if (!tool) continue;
      const status: NewOperation['status'] =
        i % 9 === 0 ? 'failed' : i % 7 === 0 ? 'processing' : 'completed';
      const inputBytes = 200_000 + (i % 5) * 750_000;
      const outputBytes = status === 'completed' ? Math.round(inputBytes * 0.7) : null;
      const owner = i % 3 === 0 ? null : i % 2 === 0 ? pro.id : yearly.id;

      operationSeeds.push({
        userId: owner,
        anonymousId: owner ? null : `anon_${i.toString().padStart(4, '0')}`,
        toolSlug: tool,
        status,
        inputFilesCount: 1 + (i % 4),
        inputSizeBytes: inputBytes,
        outputSizeBytes: outputBytes,
        outputFileUrl:
          status === 'completed'
            ? `https://storage.pdf-forge.local/outputs/${tool}-${i}.pdf`
            : null,
        outputFileExpiresAt: status === 'completed' ? daysAgo(-1) : null,
        errorMessage: status === 'failed' ? 'corrupted-source-pdf' : null,
        processingTimeMs: 200 + (i % 10) * 350,
        ipAddress: `203.0.113.${(i % 250) + 1}`,
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) PDFForgeSeed/1.0',
        createdAt: daysAgo(i % 14),
      });
    }
    await db.insert(operations).values(operationSeeds);

    console.log('[seed] Inserting usage_tracking…');
    const usageSeeds: NewUsageTracking[] = [];
    for (const u of [pro, yearly, business, free]) {
      for (let d = 0; d < 7; d++) {
        usageSeeds.push({
          userId: u.id,
          date: isoDate(daysAgo(d)),
          operationsCount: 3 + ((d * 2 + u.email.length) % 11),
          bytesProcessed: 1_500_000 + d * 500_000,
        });
      }
    }
    for (let d = 0; d < 5; d++) {
      usageSeeds.push({
        anonymousId: `anon_visitor_${d}`,
        date: isoDate(daysAgo(d)),
        operationsCount: 1 + (d % 3),
        bytesProcessed: 250_000 + d * 100_000,
      });
    }
    await db.insert(usageTracking).values(usageSeeds);

    console.log('[seed] Inserting api_keys…');
    const apiKeySeeds: NewApiKey[] = [
      {
        userId: business.id,
        keyHash: hashKey('pf_live_business_demo'),
        name: 'Acme — production',
        isActive: true,
        lastUsedAt: daysAgo(0),
        expiresAt: daysAgo(-365),
      },
      {
        userId: business.id,
        keyHash: hashKey(randomBytes(24).toString('hex')),
        name: 'Acme — staging',
        isActive: true,
        lastUsedAt: daysAgo(2),
      },
      {
        userId: admin.id,
        keyHash: hashKey('pf_test_admin_demo'),
        name: 'Admin tooling',
        isActive: true,
        lastUsedAt: daysAgo(0),
      },
      {
        userId: pro.id,
        keyHash: hashKey(randomBytes(24).toString('hex')),
        name: 'Old laptop (revoked)',
        isActive: false,
        lastUsedAt: daysAgo(45),
      },
    ];
    await db.insert(apiKeys).values(apiKeySeeds);

    console.log('[seed] Inserting blog_posts…');
    const blogSeeds: NewBlogPost[] = [
      {
        slug: 'merge-pdf-files-online-free',
        title: 'How to merge PDF files online for free',
        excerpt: 'Combine any number of PDFs into one in under a minute — privately, in your browser.',
        content:
          '# Merging PDFs\n\nYou can merge PDFs entirely in the browser using PDF Forge — no upload required.\n\n1. Drop the files in.\n2. Drag them into the order you like.\n3. Click **Merge**.\n',
        coverImageUrl: 'https://images.pdf-forge.local/blog/merge.jpg',
        authorId: admin.id,
        status: 'published',
        metaTitle: 'Merge PDF — free, private, in the browser | PDF Forge',
        metaDescription:
          'Combine multiple PDFs into a single file without uploading them to a server.',
        publishedAt: daysAgo(14),
        viewsCount: 2_413,
      },
      {
        slug: 'compress-pdf-without-losing-quality',
        title: 'Compress PDFs without losing quality',
        excerpt: 'Cut PDF file size in half while keeping text crisp and images readable.',
        content:
          '## Why PDFs are large\n\nMost size comes from embedded images. PDF Forge re-encodes them at a sensible DPI before stitching the document back together.\n',
        coverImageUrl: 'https://images.pdf-forge.local/blog/compress.jpg',
        authorId: admin.id,
        status: 'published',
        metaTitle: 'Compress PDF online — keep quality | PDF Forge',
        metaDescription: 'Reduce PDF file size with smart image re-encoding.',
        publishedAt: daysAgo(5),
        viewsCount: 987,
      },
      {
        slug: 'pdf-tools-roadmap-2026',
        title: 'Roadmap: what we\'re building in Q3 2026',
        excerpt: 'A look at upcoming PDF Forge features — OCR, redaction, and form filling.',
        content:
          'We\'re shipping three big features this quarter: OCR for scanned PDFs, redaction with audit trails, and a form-filling builder.\n',
        authorId: admin.id,
        status: 'draft',
        metaTitle: 'Roadmap Q3 2026 — PDF Forge',
        metaDescription: 'Upcoming features: OCR, redaction, form-filling.',
        viewsCount: 0,
      },
      {
        slug: 'old-changelog-v0',
        title: 'Changelog — v0 archive',
        excerpt: 'Historical changelog entries from the v0 preview.',
        content: 'Archived for historical reference.\n',
        authorId: admin.id,
        status: 'archived',
        publishedAt: daysAgo(120),
        viewsCount: 42,
      },
    ];
    await db.insert(blogPosts).values(blogSeeds);

    const elapsed = Date.now() - startedAt;
    console.log(
      `[seed] Done in ${elapsed}ms — ${insertedUsers.length} users, ${insertedSubs.length} subs, ` +
        `${paymentSeeds.length} payments, ${operationSeeds.length} operations, ` +
        `${usageSeeds.length} usage rows, ${apiKeySeeds.length} api keys, ${blogSeeds.length} posts.`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error('[seed] Failed:', err);
  process.exitCode = 1;
});
