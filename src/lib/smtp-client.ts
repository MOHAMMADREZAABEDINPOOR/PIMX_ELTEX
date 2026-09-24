import { connect, type TLSSocket } from "node:tls";

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;
const SMTP_TIMEOUT_MS = 20_000;
const EMAIL_ADDRESS = /^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/;

export class EmailDeliveryError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("The SMTP server did not accept the verification email.");
    this.name = "EmailDeliveryError";
    this.status = status;
  }
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary).replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function createLineReader(socket: TLSSocket) {
  const lines: string[] = [];
  const decoder = new TextDecoder();
  let buffer = "";
  let pending: { resolve: (line: string) => void; reject: (error: Error) => void } | null = null;
  let failure: Error | null = null;

  function fail(error: Error) {
    failure = error;
    pending?.reject(error);
    pending = null;
  }

  socket.on("data", (chunk: Uint8Array) => {
    buffer += decoder.decode(chunk, { stream: true });
    if (buffer.length > 32_768) return fail(new EmailDeliveryError(0));
    while (buffer.includes("\n")) {
      const newline = buffer.indexOf("\n");
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (pending) {
        pending.resolve(line);
        pending = null;
      } else lines.push(line);
    }
  });
  socket.on("error", (error: Error) => fail(error));
  socket.on("close", () => fail(new EmailDeliveryError(0)));

  return async () => {
    if (lines.length) return lines.shift()!;
    if (failure) throw failure;
    return new Promise<string>((resolve, reject) => { pending = { resolve, reject }; });
  };
}

async function readReply(nextLine: () => Promise<string>, expected: readonly number[]) {
  let status = 0;
  for (let index = 0; index < 64; index++) {
    const match = /^(\d{3})([ -])/.exec(await nextLine());
    if (!match) throw new EmailDeliveryError(0);
    const current = Number(match[1]);
    if (status && current !== status) throw new EmailDeliveryError(0);
    status = current;
    if (match[2] === " ") {
      if (!expected.includes(status)) throw new EmailDeliveryError(status);
      return;
    }
  }
  throw new EmailDeliveryError(0);
}

async function write(socket: TLSSocket, value: string) {
  await new Promise<void>((resolve, reject) => {
    socket.write(value, "utf8", (error?: Error | null) => error ? reject(error) : resolve());
  });
}

export async function sendSmtpEmail(
  { user, appPassword, to, html }: { user: string; appPassword: string; to: string; html: string },
  connectTls: typeof connect = connect,
) {
  const sender = user.trim().toLowerCase();
  const recipient = to.trim().toLowerCase();
  if (!EMAIL_ADDRESS.test(sender) || !EMAIL_ADDRESS.test(recipient)) throw new EmailDeliveryError(0);
  const password = appPassword.replace(/\s+/g, "");
  if (!password) throw new EmailDeliveryError(535);

  const socket = connectTls({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST, rejectUnauthorized: true });
  socket.setTimeout(SMTP_TIMEOUT_MS, () => socket.destroy(new EmailDeliveryError(0)));
  const nextLine = createLineReader(socket);
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", () => socket.authorized ? resolve() : reject(new EmailDeliveryError(0)));
      socket.once("error", reject);
    });
    const command = async (value: string, expected: readonly number[]) => {
      await write(socket, `${value}\r\n`);
      await readReply(nextLine, expected);
    };

    await readReply(nextLine, [220]);
    await command("EHLO pimxeltex.pages.dev", [250]);
    await command(`AUTH PLAIN ${encodeBase64(`\0${sender}\0${password}`).replace(/\r\n/g, "")}`, [235]);
    await command(`MAIL FROM:<${sender}>`, [250]);
    await command(`RCPT TO:<${recipient}>`, [250, 251]);
    await command("DATA", [354]);

    const message = [
      `From: PIMX_ELTEX <${sender}>`,
      `To: <${recipient}>`,
      "Subject: Your PIMX_ELTEX verification code",
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      encodeBase64(html),
      "",
      ".",
      "",
    ].join("\r\n");
    await write(socket, message);
    await readReply(nextLine, [250]);
    await write(socket, "QUIT\r\n");
  } finally {
    socket.end();
  }
}
