async function request(path, token, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Request failed. Please try again.");
  return result;
}

export const listIncidents = (token, mine = false) => request(`/api/incidents${mine ? "?mine=true" : ""}`, token);
export const createIncident = (token, incident) => request("/api/incidents", token, { method: "POST", body: JSON.stringify(incident) });
export const updateIncident = (token, update) => request("/api/incidents", token, { method: "PATCH", body: JSON.stringify(update) });
export const getCheckin = token => request("/api/checkins", token);
export const createCheckin = (token, checkin) => request("/api/checkins", token, { method: "POST", body: JSON.stringify(checkin) });
