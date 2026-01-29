interface Env {
    history_storage: KVNamespace;
    AI: any;
}

const AUDIT_HEADERS = [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const urlObj = new URL(request.url);
    const targetUrl = urlObj.searchParams.get("url");

    // validation checks
    if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing url parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
    // we only support https
    if (!targetUrl.startsWith("https://")) {
        return new Response(JSON.stringify({ error: "URL must use https://" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // key (client_id) for the history database (KV)
    const cookies = parseCookies(request.headers.get("Cookie") || "");
    let clientId = cookies["client_id"];
    let setCookieHeader = "";
    if (!clientId) {
        clientId = crypto.randomUUID();
        setCookieHeader = `client_id=${clientId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`;
    }

    try {
        const resp = await fetch(targetUrl, {
            redirect: "follow",
            headers: {
                "User-Agent": "HTTP-Coach-Scanner/1.0",
            },
        });
        // scoring - 20 pts for each header found
        const headersFound: Record<string, string> = {};
        const missing: string[] = [];
        let score = 0;

        for (const header of AUDIT_HEADERS) {
            const value = resp.headers.get(header);
            if (value) {
                headersFound[header] = value;
                score += 20;
            } else {
                missing.push(header);
            }
        }

        // calling workers ai
        const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
                {
                    role: "system",
                    content: "You are a web security expert. Analyze missing HTTP security headers and provide concise advice.",
                },
                {
                    role: "user",
                    content: `Audit results for ${targetUrl}:
Present headers: ${JSON.stringify(headersFound)}
Missing headers: ${missing.join(", ")}

Provide:
1. Short explanation of missing items.
2. Suggested values.
3. Likely breakage warnings.
Keep it concise and formatted as JSON with keys: "explanation", "suggestions", "warnings".`,
                },
            ],
            response_format: { type: "json_object" },
        });

        const auditData = {
            url: targetUrl,
            timestamp: new Date().toISOString(),
            score,
            headersFound,
            missing,
            aiAnalysis: aiResponse,
        };

        // saving to kv
        const historyKey = `history:${clientId}`;
        const existingHistoryRaw = await env.history_storage.get(historyKey);
        let history = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];
        history.unshift(auditData);
        // only keep last 20 entires
        history = history.slice(0, 20);
        await env.history_storage.put(historyKey, JSON.stringify(history));

        const responseHeaders: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (setCookieHeader) {
            responseHeaders["Set-Cookie"] = setCookieHeader;
        }

        return new Response(JSON.stringify(auditData), {
            headers: responseHeaders,
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: "Failed to fetch URL", details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
// helper to parse cookies
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