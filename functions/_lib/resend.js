import { responseResult } from './http.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export async function sendEmail(env, payload) {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return responseResult(response);
  } catch {
    return { status: 502, data: { message: 'Resend request failed' } };
  }
}
