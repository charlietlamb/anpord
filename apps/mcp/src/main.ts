import { port } from "./config";
import server from "./server";

await server.listen(port);
