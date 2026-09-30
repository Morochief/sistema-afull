export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    message: 'Sistema aFull Vercel Lambda is running',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    url: req.url,
    headers: {
      'x-matched-path': req.headers['x-matched-path'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      host: req.headers.host,
    },
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_KEY),
      nodeEnv: process.env.NODE_ENV,
    }
  });
}
