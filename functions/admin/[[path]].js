export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // If the path has a file extension (config.yml, index.html, etc.), serve the real file
  const lastSegment = url.pathname.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) {
    return context.env.ASSETS.fetch(context.request);
  }
  
  // For everything else (OAuth callbacks like /admin/?code=xxx), serve index.html
  return context.env.ASSETS.fetch(new URL('/admin/index.html', url.origin));
}
