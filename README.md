# bunlt

Bun の Secrets API を使って、ローカルの認証情報を管理する CLI です。

## 使い方

```bash
bun install

bun run index.ts set openrouter
# Secret: ********
# stored: openrouter

bun run index.ts has openrouter
# yes

bun run index.ts delete openrouter
# deleted: openrouter
```

パッケージをリンクすると `bunlt` コマンドとして実行できます。

```bash
bun link
bunlt has openrouter
```

`set` は対話ターミナルでは入力を `*` で隠し、パイプからの入力にも対応します。
