import { getApiUrl, getAuth } from "./config.js";

export async function trpcMutation(path, input) {
  const url = getApiUrl();
  const auth = getAuth();
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${auth.accessToken}`;

  const res = await fetch(`${url}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });

  const json = await res.json();
  if (json.error) {
    const msg = json.error.message || json.error.json?.message || JSON.stringify(json.error);
    throw new Error(msg);
  }
  return json.result?.data?.json ?? json.result?.data ?? json.result;
}

export async function trpcQuery(path, input) {
  const url = getApiUrl();
  const auth = getAuth();
  const headers = {};
  if (auth) headers["Authorization"] = `Bearer ${auth.accessToken}`;

  const encoded = encodeURIComponent(JSON.stringify({ json: input }));
  const res = await fetch(`${url}/${path}?input=${encoded}`, { headers });

  const json = await res.json();
  if (json.error) {
    const msg = json.error.message || json.error.json?.message || JSON.stringify(json.error);
    throw new Error(msg);
  }
  return json.result?.data?.json ?? json.result?.data ?? json.result;
}
