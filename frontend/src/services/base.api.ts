import axios, { type AxiosInstance } from "axios";

const baseURL = "http://localhost:3000";

/**
 * Creates an axios instance for API requests
 */
export function createApiClient(): AxiosInstance {
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return api;
}
