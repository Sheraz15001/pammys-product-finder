import axios from "axios";

const API_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL;

export async function searchProduct(
  message,
  locale = "en",
  sessionId = crypto.randomUUID()
) {
  const response = await axios.post(
    API_URL,
    {
      action: "search",
      message,
      locale,
      session_id: sessionId,
    }
  );

  return response.data;
}

export async function getHistory() {
  const response = await axios.post(
    API_URL,
    {
      action: "history",
    }
  );

  return response.data.history || [];
}