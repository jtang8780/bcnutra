export async function onRequest(context) {
  const url = new URL(context.request.url);
  return context.env.ASSETS.fetch(new URL('/admin/index.html', url.origin));
}
