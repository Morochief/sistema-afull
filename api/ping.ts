export default async function handler(req: any, res: any) {
  let indexImportStatus = 'NOT_TESTED';
  try {
    await import('./index.js');
    indexImportStatus = 'INDEX_JS_LOADED_OK';
  } catch (e: any) {
    indexImportStatus = 'INDEX_JS_FAILED: ' + e.message + '\n' + e.stack;
  }

  res.status(200).json({
    status: 'ping_ok',
    indexImportStatus,
    timestamp: new Date().toISOString()
  });
}
