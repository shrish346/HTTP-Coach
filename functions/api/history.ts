interface Env {
    HISTORY_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const clientId = cookies["client_id"];

    if (!clientId) {
        return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
        });
    }

    const historyKey = `history:${clientId}`;
    const historyRaw = await env.HISTORY_KV.get(historyKey);
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    return new Response(JSON.stringify(history), {
        headers: { "Content-Type": "application/json" },
    });
};

function parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieString.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        if (parts.length === 2) {
            cookies[parts[0].trim()] = parts[1].trim();
        }
    });
    return cookies;
}
