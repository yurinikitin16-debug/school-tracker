const DEFAULT_API_ORIGIN = 'https://school-tracker-api.yurinikitin16.workers.dev';

interface PagesFunctionContext {
  request: Request;
  env: {
    API_ORIGIN?: string;
  };
}

export async function onRequest({ request, env }: PagesFunctionContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const apiOrigin = (env.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, '');
  const targetUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, apiOrigin);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  const response = await fetch(
    new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    }),
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
