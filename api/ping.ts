export default async function handler(req: any, res: any) {
  const info: any = {
    status: 'testing',
    nodeVersion: process.version,
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
    }
  };

  try {
    const { PrismaClient } = await import('@prisma/client');
    info.prismaModuleLoaded = true;
    try {
      const prisma = new PrismaClient();
      info.prismaClientInstantiated = true;
      try {
        await prisma.$queryRaw`SELECT 1`;
        info.prismaQuery = 'SUCCESS';
      } catch (qErr: any) {
        info.prismaQuery = { message: qErr.message, stack: qErr.stack };
      }
    } catch (iErr: any) {
      info.prismaClientInstantiated = false;
      info.instantiationError = { message: iErr.message, stack: iErr.stack };
    }
  } catch (mErr: any) {
    info.prismaModuleLoaded = false;
    info.moduleError = { message: mErr.message, stack: mErr.stack };
  }

  res.status(200).json(info);
}
