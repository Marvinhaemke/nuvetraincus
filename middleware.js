// Simple A/B Testing Middleware for Vercel Edge Functions
// This version works with static HTML files without Next.js

export default async function middleware(request) {
  const url = new URL(request.url);
  
  // Only apply A/B testing to the homepage
  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    return;
  }

  // Parse cookies from the request
  const cookieString = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieString.split('; ').map(c => {
      const [key, ...val] = c.split('=');
      return [key, val.join('=')];
    }).filter(([key]) => key)
  );

  // Check for forced variant via query parameter (for testing)
  const forcedVariant = url.searchParams.get('variant');
  let variant = cookies.ab_variant;

  if (forcedVariant === 'A' || forcedVariant === 'B') {
    variant = forcedVariant;
    // Remove variant parameter from URL for cleaner URLs
    url.searchParams.delete('variant');
  } else if (!variant || (variant !== 'A' && variant !== 'B')) {
    // If no variant assigned, randomly assign one
    variant = Math.random() < 0.5 ? 'A' : 'B';
  }

  // Build the response headers
  const responseHeaders = new Headers();
  
  // CRITICAL: Set Content-Type to HTML
  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  
  // Set the variant cookie
  responseHeaders.set('Set-Cookie', `ab_variant=${variant}; Max-Age=2592000; Path=/; SameSite=Strict`);
  responseHeaders.set('X-AB-Variant', variant);
  
  // Add security headers
  responseHeaders.set('Referrer-Policy', 'origin-when-cross-origin');
  responseHeaders.set('X-Frame-Options', 'DENY');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('X-DNS-Prefetch-Control', 'on');
  responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // For Variant B, fetch and return the variant B HTML file
  if (variant === 'B') {
    const variantBUrl = new URL('/index-variant-b.html', request.url);
    const response = await fetch(variantBUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch variant B file:', response.status);
      // Fall back to regular index.html if variant B file doesn't exist
      const indexUrl = new URL('/index.html', request.url);
      const fallbackResponse = await fetch(indexUrl);
      const fallbackHtml = await fallbackResponse.text();
      
      return new Response(fallbackHtml, {
        status: 200,
        headers: responseHeaders
      });
    }
    
    const html = await response.text();
    
    return new Response(html, {
      status: 200,
      headers: responseHeaders
    });
  }

  // For Variant A, fetch and return the regular index.html
  const indexUrl = new URL('/index.html', request.url);
  const response = await fetch(indexUrl);
  
  if (!response.ok) {
    // If index.html doesn't exist, return an error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
      </head>
      <body>
        <h1>Error: index.html not found</h1>
        <p>Please make sure index.html exists in your deployment.</p>
      </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      status: 404,
      headers: responseHeaders
    });
  }
  
  const html = await response.text();
  
  return new Response(html, {
    status: 200,
    headers: responseHeaders
  });
}

export const config = {
  matcher: '/'
};
