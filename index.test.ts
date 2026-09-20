import { describe, expect, test } from "bun:test";

import { run, service } from "./index";

type SecretOptions = {
  name: string;
  service: string;
};

type SetSecretOptions = SecretOptions & {
  value: string;
};

function createStore(value: string | null = null) {
  const calls = {
    delete: [] as SecretOptions[],
    get: [] as SecretOptions[],
    set: [] as SetSecretOptions[],
  };

  const store = {
    delete: async (options: SecretOptions) => {
      calls.delete.push(options);
      return true;
    },
    get: async (options: SecretOptions) => {
      calls.get.push(options);
      return value;
    },
    set: async (options: SetSecretOptions) => {
      calls.set.push(options);
    },
  };

  return { calls, store };
}

async function captureOutput<T>(callback: () => Promise<T>) {
  const stdout: string[] = [];
  const stdoutWrites: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalStdoutWrite = Bun.stdout.write;

  console.log = (...args: unknown[]) => stdout.push(args.join(" "));
  console.error = (...args: unknown[]) => stderr.push(args.join(" "));
  Bun.stdout.write = (value) => {
    if (typeof value === "string") stdoutWrites.push(value);
    return Promise.resolve(0);
  };

  try {
    return { result: await callback(), stderr, stdout, stdoutWrites };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    Bun.stdout.write = originalStdoutWrite;
  }
}

describe("run", () => {
  test("rejects invalid command arguments", async () => {
    const { store } = createStore();
    const output = await captureOutput(() => run(["get"], store));

    expect(output.result).toBe(1);
    expect(output.stdout).toEqual([]);
    expect(output.stderr[0]).toContain("Usage:");
  });

  test("gets and prints an existing secret", async () => {
    const { calls, store } = createStore("secret-value");
    const output = await captureOutput(() => run(["get", "token"], store));

    expect(output.result).toBe(0);
    expect(output.stdout).toEqual([]);
    expect(output.stdoutWrites).toEqual(["secret-value"]);
    expect(output.stderr).toEqual([]);
    expect(calls.get).toEqual([{ name: "token", service }]);
  });

  test("returns a failure when a secret is missing", async () => {
    const { calls, store } = createStore();
    const output = await captureOutput(() => run(["get", "missing"], store));

    expect(output.result).toBe(1);
    expect(output.stdout).toEqual([]);
    expect(output.stderr).toEqual(["not found: missing"]);
    expect(calls.get).toEqual([{ name: "missing", service }]);
  });

  test("reports whether a secret exists", async () => {
    const existing = createStore("secret-value");
    const existingOutput = await captureOutput(() => run(["has", "token"], existing.store));

    const missing = createStore();
    const missingOutput = await captureOutput(() => run(["has", "token"], missing.store));

    expect(existingOutput.result).toBe(0);
    expect(existingOutput.stdout).toEqual(["yes"]);
    expect(missingOutput.result).toBe(0);
    expect(missingOutput.stdout).toEqual(["no"]);
  });

  test("stores a non-empty secret", async () => {
    const { calls, store } = createStore();
    const output = await captureOutput(() =>
      run(["set", "token"], store, async () => "secret-value"),
    );

    expect(output.result).toBe(0);
    expect(output.stdout).toEqual(["stored: token"]);
    expect(output.stderr).toEqual([]);
    expect(calls.set).toEqual([{ name: "token", service, value: "secret-value" }]);
  });

  test("rejects an empty secret without storing it", async () => {
    const { calls, store } = createStore();
    const output = await captureOutput(() => run(["set", "token"], store, async () => ""));

    expect(output.result).toBe(1);
    expect(output.stdout).toEqual([]);
    expect(output.stderr).toEqual(["secret must not be empty"]);
    expect(calls.set).toEqual([]);
  });

  test("deletes a secret", async () => {
    const { calls, store } = createStore();
    const output = await captureOutput(() => run(["delete", "token"], store));

    expect(output.result).toBe(0);
    expect(output.stdout).toEqual(["deleted: token"]);
    expect(output.stderr).toEqual([]);
    expect(calls.delete).toEqual([{ name: "token", service }]);
  });
});
