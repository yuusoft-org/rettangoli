const CONTENT_LENGTH_HEADER = "content-length";

const parseHeaders = (headerText = "") => {
  const headers = new Map();
  headerText
    .split("\r\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) {
        return;
      }
      const name = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      headers.set(name, value);
    });
  return headers;
};

const toJsonRpcError = (error) => {
  if (error && typeof error === "object" && Number.isInteger(error.code) && typeof error.message === "string") {
    return {
      code: error.code,
      message: error.message,
      ...(error.data !== undefined ? { data: error.data } : {}),
    };
  }

  return {
    code: -32603,
    message: error instanceof Error ? error.message : "Internal error",
  };
};

export const createJsonRpcTransport = ({
  input = process.stdin,
  output = process.stdout,
  onRequest = async () => null,
  onNotification = async () => {},
  onResponse = async () => {},
  onError = () => {},
} = {}) => {
  let buffer = Buffer.alloc(0);

  const send = (payload = {}) => {
    const json = JSON.stringify(payload);
    const contentLength = Buffer.byteLength(json, "utf8");
    output.write(`Content-Length: ${contentLength}\r\n\r\n${json}`);
  };

  const sendResult = (id, result) => {
    send({
      jsonrpc: "2.0",
      id,
      result,
    });
  };

  const sendError = (id, error) => {
    send({
      jsonrpc: "2.0",
      id,
      error: toJsonRpcError(error),
    });
  };

  const dispatchMessage = async (message = {}) => {
    if (message && typeof message.method === "string") {
      if (Object.prototype.hasOwnProperty.call(message, "id")) {
        try {
          const result = await onRequest(message);
          sendResult(message.id, result ?? null);
        } catch (err) {
          sendError(message.id, err);
        }
        return;
      }

      try {
        await onNotification(message);
      } catch (err) {
        onError(err);
      }
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      try {
        await onResponse(message);
      } catch (err) {
        onError(err);
      }
    }
  };

  const processBuffer = async () => {
    while (true) {
      const separator = buffer.indexOf("\r\n\r\n");
      if (separator < 0) {
        return;
      }

      const headerBlock = buffer.subarray(0, separator).toString("utf8");
      const headers = parseHeaders(headerBlock);
      const contentLengthValue = headers.get(CONTENT_LENGTH_HEADER);
      const contentLength = Number.parseInt(contentLengthValue || "", 10);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        onError(new Error("Invalid Content-Length header in JSON-RPC payload."));
        buffer = buffer.subarray(separator + 4);
        continue;
      }

      const bodyStart = separator + 4;
      const bodyEnd = bodyStart + contentLength;
      if (buffer.length < bodyEnd) {
        return;
      }

      const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      buffer = buffer.subarray(bodyEnd);

      try {
        const message = JSON.parse(body);
        await dispatchMessage(message);
      } catch (err) {
        onError(err);
      }
    }
  };

  input.on("data", async (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
    await processBuffer();
  });

  return {
    send,
    sendNotification(method, params = {}) {
      send({
        jsonrpc: "2.0",
        method,
        params,
      });
    },
  };
};
