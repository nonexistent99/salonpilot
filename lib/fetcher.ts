export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const error: Error & { status?: number } = new Error("An error occurred while fetching the data.");
    error.status = res.status;
    throw error;
  }
  return res.json();
};
