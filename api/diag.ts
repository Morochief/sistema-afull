export default async function handler(req: any, res: any) {
  const results: any = {};
  
  // Test 1: Prisma Client & Query
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || "postgresql://postgres.opscthfkeqlqyrfvafmv:Mjjagkaz012.@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
        }
      }
    });
    results.prismaClientCreated = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.prismaQuery = 'OK';
    } catch (e: any) {
      results.prismaQuery = { message: e.message, stack: e.stack };
    }
  } catch (e: any) {
    results.prismaClientCreated = false;
    results.prismaError = { message: e.message, stack: e.stack };
  }

  // Test 2: server-auth.ts
  try {
    const auth = await import('../server-auth.ts');
    results.serverAuth = 'OK';
  } catch (e: any) {
    results.serverAuth = { message: e.message, stack: e.stack };
  }

  // Test 3: server.ts
  try {
    const s = await import('../server.ts');
    results.server = 'OK';
  } catch (e: any) {
    results.server = { message: e.message, stack: e.stack };
  }

  res.status(200).json({
    status: 'diagnostic_complete',
    env: {
      DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
      DIRECT_URL_SET: Boolean(process.env.DIRECT_URL),
      JWT_SECRET_SET: Boolean(process.env.JWT_SECRET),
      SUPABASE_URL_SET: Boolean(process.env.SUPABASE_URL),
      NODE_ENV: process.env.NODE_ENV,
    },
    results
  });
}
