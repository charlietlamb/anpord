export const SERVER_PORT = 3003;

export const WEB_PORT = 3005;

export const MCP_PORT = 3010;

export const LOCAL_SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

export const LOCAL_WEB_ORIGIN = `http://localhost:${WEB_PORT}`;

export const localMcpResource = (port: number) =>
  `http://localhost:${port}/mcp`;
