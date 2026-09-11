export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // If requesting a real file (config.yml, index.html, etc.), serve it directly
  const assetResponse = await context.env.ASSETS.fetch(context.request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }
  
  // Otherwise serve index.html (for OAuth callback URLs like /admin/?code=xxx)
  return context.env.ASSETS.fetch(new URL('/admin/index.html', url.origin));
}
