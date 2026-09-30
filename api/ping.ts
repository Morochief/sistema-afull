export default async function handler(req: any, res: any) {
  const packages = [
    '@prisma/client',
    'express',
    'jsonwebtoken',
    'bcryptjs',
    'helmet',
    'cors',
    'cookie-parser',
    'express-rate-limit',
    'zod',
    'isomorphic-dompurify',
    'xlsx',
    'multer',
    '@google/genai'
  ];

  const packageStatus: Record<string, string> = {};

  for (const pkg of packages) {
    try {
      await import(pkg);
      packageStatus[pkg] = 'OK';
    } catch (e: any) {
      packageStatus[pkg] = 'FAIL: ' + e.message;
    }
  }

  // Also test importing the bundled api/index.js itself from inside lambda!
  let indexImportStatus = 'NOT_TESTED';
  try {
    await import('./index.js');
    indexImportStatus = 'INDEX_JS_LOADED_OK';
  } catch (e: any) {
    indexImportStatus = 'INDEX_JS_FAILED: ' + e.message + '\n' + e.stack;
  }

  res.status(200).json({
    status: 'diagnostic',
    packageStatus,
    indexImportStatus
  });
}
