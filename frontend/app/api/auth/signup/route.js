// Auth temporarily disabled
export async function POST(request) {
  return new Response(
    JSON.stringify({
      error: "Authentication temporarily disabled",
      message: "User registration and authentication are temporarily unavailable. Please check back later.",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function GET(request) {
  return new Response(
    JSON.stringify({
      error: "Authentication temporarily disabled",
      message: "User registration and authentication are temporarily unavailable. Please check back later.",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}