# Minimal Bun Secrets API Wrapper

A minimal CLI wrapper around Bun's Secrets API for managing local credentials.

## Usage

Install `bunlt` globally and see the available commands:

```bash
bun add -g @halqme/bunlt
bunlt --help
```

Store and manage a secret:

```bash
bunlt set openrouter
# Secret: ********
# stored: openrouter

bunlt has openrouter
# yes

bunlt get openrouter
# your-secret

bunlt delete openrouter
# deleted: openrouter
```

`set` masks interactive input with `*` and also accepts piped input. Empty secrets are rejected.
