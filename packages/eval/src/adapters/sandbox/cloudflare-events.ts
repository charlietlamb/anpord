import { Schema } from "effect";

const ExitEvent = Schema.Struct({ exit_code: Schema.Number });
const ErrorEvent = Schema.Struct({ error: Schema.String });

export interface ExecSink {
  readonly stderr: (data: string) => void;
  readonly stdout: (data: string) => void;
}

export const readEvents = async (response: Response, sink: ExecSink) => {
  if (response.body === null) {
    throw new Error("Cloudflare returned no command stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let exitCode: number | undefined;

  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value, { stream: !chunk.done });

    for (
      let end = buffer.indexOf("\n\n");
      end >= 0;
      end = buffer.indexOf("\n\n")
    ) {
      const lines = buffer.slice(0, end).split("\n");
      buffer = buffer.slice(end + 2);
      const event = lines.find((line) => line.startsWith("event: "))?.slice(7);
      const data = lines
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");

      if (event === "stdout" || event === "stderr") {
        sink[event](Buffer.from(data, "base64").toString());
      } else if (event === "exit") {
        exitCode = Schema.decodeUnknownSync(ExitEvent)(
          JSON.parse(data)
        ).exit_code;
      } else if (event === "error") {
        throw new Error(
          Schema.decodeUnknownSync(ErrorEvent)(JSON.parse(data)).error
        );
      }
    }

    if (chunk.done) {
      break;
    }
  }

  if (exitCode === undefined) {
    throw new Error("Cloudflare command stream ended without an exit code");
  }
  return exitCode;
};
