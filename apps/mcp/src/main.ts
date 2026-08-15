import server from "./server";

const port = Number(process.env.PORT ?? 3010);
await server.listen(port);
