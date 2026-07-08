// In dev the Vite dev server proxies /api → localhost:4233 and /socket.io → localhost:4233,
// avoiding Electron's cross-origin XHR block. In production talk directly to the API.
export const API_URL = import.meta.env.DEV ? '' : 'http://localhost:4233'
