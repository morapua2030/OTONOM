// Local development / unlaunched preview: disallow everything. A public preview requires a separate go-live decision.
export function GET() {
  return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
}
