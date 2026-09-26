import { connect, createServer } from "node:net";

export const portIsFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    const settle = (free: boolean) => {
      socket.destroy();
      resolve(free);
    };

    socket.once("connect", () => settle(false));
    socket.once("error", () => settle(true));
  });

export const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === "object" && address !== null
          ? resolve(address.port)
          : reject(new Error("The OS did not report the port it chose"))
      );
    });
  });
