// Maintenance Mode Middleware for Vercel Edge Functions
// Serves a maintenance page for every request while the site is unavailable.
// Static assets (images, styles, scripts, fonts, favicons) are allowed through
// so the maintenance page itself renders correctly.

export default async function middleware(request) {
  const url = new URL(request.url);

  // Let static assets pass through so the maintenance page can load its logo,
  // icons, styles, etc.
  const assetPattern = /\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|mjs|woff2?|ttf|otf|eot|map|pdf|txt|xml|json|webmanifest)$/i;
  if (assetPattern.test(url.pathname)) {
    return;
  }

  // Serve the maintenance page for every other request.
  const maintenanceUrl = new URL('/maintenance.html', request.url);
  const response = await fetch(maintenanceUrl);

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  // 503 tells crawlers this is temporary and prevents indexing the outage.
  responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  responseHeaders.set('Retry-After', '3600');
  responseHeaders.set('X-Robots-Tag', 'noindex');

  let html;
  if (response.ok) {
    html = await response.text();
  } else {
    // Fallback inline page in case maintenance.html cannot be fetched.
    html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>We'll be back soon</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px 24px;background:#0b1f3a;color:#f4f7fb;">
<h1>We are currently not available</h1>
<p>Our website is temporarily down for maintenance. Please check back shortly.</p>
</body></html>`;
  }

  return new Response(html, {
    status: 503,
    headers: responseHeaders
  });
}

export const config = {
  // Run on every path. Static assets are filtered out inside the function above.
  matcher: '/:path*'
};
