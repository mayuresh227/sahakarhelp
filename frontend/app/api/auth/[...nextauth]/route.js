// Auth temporarily disabled
export async function GET(req, res) {
  return new Response(
    JSON.stringify({
      error: "Authentication temporarily disabled",
      message: "Google Login and authentication are temporarily unavailable. Please check back later.",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function POST(req, res) {
  return new Response(
    JSON.stringify({
      error: "Authentication temporarily disabled",
      message: "Google Login and authentication are temporarily unavailable. Please check back later.",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}