export function json(data, { status = 200, headers = {} } = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

export async function responseResult(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  return { status: response.status, data };
}
