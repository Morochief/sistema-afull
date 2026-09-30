export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    message: 'Sistema aFull Serverless API is online',
    timestamp: new Date().toISOString()
  });
}
