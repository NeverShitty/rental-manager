
export async function apiRequest(url: string, options: {
  method?: string;
  params?: Record<string, string>;
  body?: any;
} = {}) {
  const { method = 'GET', params, body } = options;
  
  const queryString = params ? `?${new URLSearchParams(params)}` : '';
  const response = await fetch(`${url}${queryString}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}
