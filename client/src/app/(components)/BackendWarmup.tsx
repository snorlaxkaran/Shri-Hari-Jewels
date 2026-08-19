const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://shri-hari-jewels-api.onrender.com";

/** Pings a lightweight live endpoint to wake Render before login/submit. */
export function BackendWarmup() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              fetch('${API_BASE}/api/health/live', { method: 'GET', mode: 'cors' }).catch(function(){});
            } catch(e) {}
          })();
        `,
      }}
    />
  );
}
