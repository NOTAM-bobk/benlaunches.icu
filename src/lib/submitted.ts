import { votesEndpoint } from "./votes";

export interface ProfileSubmission {
  id: string;
  name: string;
  url: string;
  tagline: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export async function fetchProfileSubmissions(profileId: string, includePending = false): Promise<ProfileSubmission[]> {
  if (!votesEndpoint || !profileId) return [];
  try {
    const query = includePending ? "?private=1" : "";
    const response = await fetch(`${votesEndpoint}/profiles/${encodeURIComponent(profileId)}/submissions${query}`);
    if (!response.ok) return [];
    const data = await response.json() as { submissions?: ProfileSubmission[] };
    return Array.isArray(data.submissions) ? data.submissions : [];
  } catch {
    return [];
  }
}
