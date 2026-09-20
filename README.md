# Minimam Bun Secrets API Wrapper

A minimal CLI wrapper around Bun's Secrets API for managing local credentials.

## Usage

```bash
bun install

bun run index.ts set openrouter
# Secret: ********
# stored: openrouter

bun run index.ts get openrouter
# your-secret

bun run index.ts has openrouter
# yes

bun run index.ts delete openrouter
# deleted: openrouter
```

Link the package to use the `bunlt` command directly:

```bash
bun link
bunlt has openrouter
```

`set` masks interactive input with `*` and also accepts piped input. Empty secrets are rejected.
