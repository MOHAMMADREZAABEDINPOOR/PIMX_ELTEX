import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { EmailDeliveryError, sendSmtpEmail } from "../src/lib/smtp-client.ts";

class FakeSmtpSocket extends EventEmitter {
  authorized = true;
  commands = [];
  message = "";
  #receivingData = false;

  constructor({ rejectAuth = false } = {}) {
    super();
    this.rejectAuth = rejectAuth;
    queueMicrotask(() => {
      this.emit("secureConnect");
      this.#reply("220 smtp.gmail.com ready\r\n");
    });
  }

  setTimeout() { return this; }
  destroy(error) { if (error) this.emit("error", error); this.emit("close"); }
  end() { this.emit("close"); }

  #reply(response) {
    queueMicrotask(() => {
      const bytes = Buffer.from(response);
      this.emit("data", bytes.subarray(0, 2));
      this.emit("data", bytes.subarray(2));
    });
  }

  write(value, encoding, callback) {
    if (this.#receivingData) {
      this.message = value;
      this.#receivingData = false;
      this.#reply("250 2.0.0 queued\r\n");
    } else {
      const command = value.trimEnd();
      this.commands.push(command);
      if (command.startsWith("EHLO ")) this.#reply("250-smtp.gmail.com\r\n250 AUTH PLAIN LOGIN\r\n");
      else if (command.startsWith("AUTH PLAIN ")) this.#reply(this.rejectAuth ? "535 5.7.8 BadCredentials\r\n" : "235 2.7.0 Accepted\r\n");
      else if (command.startsWith("MAIL FROM:")) this.#reply("250 2.1.0 OK\r\n");
      else if (command.startsWith("RCPT TO:")) this.#reply("250 2.1.5 OK\r\n");
      else if (command === "DATA") { this.#receivingData = true; this.#reply("354 End data with <CR><LF>.<CR><LF>\r\n"); }
      else if (command === "QUIT") this.#reply("221 2.0.0 closing\r\n");
      else throw new Error(`Unexpected SMTP command: ${command.slice(0, 12)}`);
    }
    callback?.();
    return true;
  }
}

test("Gmail SMTP sends the one-time code as an encoded HTML message", async () => {
  let socket;
  await sendSmtpEmail({ user: "sender@gmail.com", appPassword: "abcd efgh ijkl mnop", to: "reader@gmail.com", html: "<p>Code: 123456 — hello</p>" }, () => socket = new FakeSmtpSocket());
  assert.ok(socket.commands.includes("MAIL FROM:<sender@gmail.com>"));
  assert.ok(socket.commands.includes("RCPT TO:<reader@gmail.com>"));
  const auth = socket.commands.find((command) => command.startsWith("AUTH PLAIN "));
  assert.equal(Buffer.from(auth.slice(11), "base64").toString(), "\0sender@gmail.com\0abcdefghijklmnop");
  assert.match(socket.message, /Content-Transfer-Encoding: base64/);
  assert.match(Buffer.from(socket.message.split("\r\n\r\n")[1].split("\r\n.\r\n")[0].replace(/\r\n/g, ""), "base64").toString(), /123456 — hello/);
});

test("Gmail authentication rejection is reported without exposing the password", async () => {
  await assert.rejects(
    sendSmtpEmail({ user: "sender@gmail.com", appPassword: "a-private-app-password", to: "reader@gmail.com", html: "test" }, () => new FakeSmtpSocket({ rejectAuth: true })),
    (error) => error instanceof EmailDeliveryError && error.status === 535 && !error.message.includes("a-private-app-password"),
  );
});

test("invalid recipient is rejected before opening a connection", async () => {
  let connected = false;
  await assert.rejects(sendSmtpEmail({ user: "sender@gmail.com", appPassword: "app-password", to: "reader@gmail.com\r\nBcc:bad@example.com", html: "test" }, () => { connected = true; return new FakeSmtpSocket(); }), EmailDeliveryError);
  assert.equal(connected, false);
});
