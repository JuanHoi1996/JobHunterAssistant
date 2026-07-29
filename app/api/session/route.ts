const SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2F";
const SIGN_OUT_PATH = "/signout-with-chatgpt?return_to=%2F";

export async function GET(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim() || "";

  return Response.json(
    {
      authenticated: Boolean(email),
      email: email || null,
      signInPath: SIGN_IN_PATH,
      signOutPath: SIGN_OUT_PATH,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
