#!/usr/bin/env bun

import { secrets } from "bun";

export const service = "dev.halqme.secret";

type SecretStore = Pick<typeof secrets, "get" | "set" | "delete">;

const usage = `Usage:
  bunlt set <name>
  bunlt get <name>
  bunlt has <name>
  bunlt delete <name>`;

function withoutTrailingLineBreak(value: string): string {
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n") || value.endsWith("\r")) return value.slice(0, -1);
  return value;
}

async function readPipedSecret(): Promise<string> {
  return withoutTrailingLineBreak(await Bun.stdin.text());
}

async function readInteractiveSecret(): Promise<string> {
  const stdin = process.stdin;

  process.stdout.write("Secret: ");
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    let escapeSequence: 0 | 1 | 2 = 0;
    const decoder = new TextDecoder();

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdin.off("end", onEnd);
      stdin.off("error", onError);
    };

    const finish = (error?: Error) => {
      cleanup();
      process.stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    const onData = (chunk: Buffer) => {
      for (const character of decoder.decode(chunk, { stream: true })) {
        if (escapeSequence === 1) {
          escapeSequence = character === "[" ? 2 : 0;
          continue;
        }
        if (escapeSequence === 2) {
          if (character >= "@" && character <= "~") escapeSequence = 0;
          continue;
        }
        if (character === "\u001b") {
          escapeSequence = 1;
        } else if (character === "\r" || character === "\n") {
          finish();
          return;
        } else if (character === "\u0003") {
          finish(new Error("入力をキャンセルしました"));
          return;
        } else if (character === "\u0004") {
          finish();
          return;
        } else if (character === "\u007f" || character === "\b") {
          const characters = Array.from(value);
          if (characters.length > 0) {
            characters.pop();
            value = characters.join("");
            process.stdout.write("\b \b");
          }
        } else if (character === "\u0015") {
          const length = Array.from(value).length;
          value = "";
          process.stdout.write(`\b`.repeat(length) + ` `.repeat(length) + `\b`.repeat(length));
        } else if (character >= " ") {
          value += character;
          process.stdout.write("*");
        }
      }
    };

    const onEnd = () => finish();
    const onError = (error: Error) => finish(error);

    stdin.on("data", onData);
    stdin.once("end", onEnd);
    stdin.once("error", onError);
  });
}

async function readSecret(): Promise<string> {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    return readInteractiveSecret();
  }
  return readPipedSecret();
}

type CommandHandler = (name: string, store: SecretStore) => Promise<number>;

const commandHandlers = {
  set: async (name: string, store: SecretStore): Promise<number> => {
    const value = await readSecret();
    if (value.length === 0) {
      console.error("secret must not be empty");
      return 1;
    }
    await store.set({ service, name, value });
    console.log(`stored: ${name}`);
    return 0;
  },
  get: async (name: string, store: SecretStore): Promise<number> => {
    const value = await store.get({ service, name });
    if (value === null) {
      console.error(`not found: ${name}`);
      return 1;
    }
    console.log(value);
    return 0;
  },
  has: async (name: string, store: SecretStore): Promise<number> => {
    const value = await store.get({ service, name });
    console.log(value === null ? "no" : "yes");
    return 0;
  },
  delete: async (name: string, store: SecretStore): Promise<number> => {
    await store.delete({ service, name });
    console.log(`deleted: ${name}`);
    return 0;
  },
} satisfies Record<string, CommandHandler>;

type CommandName = keyof typeof commandHandlers;

export async function run(
  args: readonly string[] = Bun.argv.slice(2),
  store: SecretStore = secrets,
): Promise<number> {
  const [commandName, name, ...extraArgs] = args;

  if (commandName === "-h" || commandName === "--help") {
    console.log(usage);
    return 0;
  }

  const handler =
    commandName === undefined
      ? undefined
      : commandHandlers[commandName as CommandName];

  if (!handler || !name || extraArgs.length > 0) {
    console.error(usage);
    return 1;
  }

  return handler(name, store);
}

if (import.meta.main) {
  try {
    process.exitCode = await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
