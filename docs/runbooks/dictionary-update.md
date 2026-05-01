# Dictionary Update Runbook

The German dictionary is built from a local Wiktextract-style JSONL source and published as static JSON artifacts to a public Cloudflare R2 bucket. The raw source file and generated artifacts are intentionally local-only because they are large and repeatable.

## Local Files

Place the source file at:

```bash
data/dictionary/raw/de-dict.jsonl
```

Do not commit files under `data/dictionary/raw/` or `data/dictionary/generated/`. Commit only scripts, tests, docs, and tiny fixtures.

## Publish Command

Required environment:

- `R2_DICTIONARY_BUCKET`: Cloudflare R2 bucket name used by the upload script
- `R2_ACCOUNT_ID`: Cloudflare account ID, used to form `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID`: R2 API token Access Key ID
- `R2_SECRET_ACCESS_KEY`: R2 API token Secret Access Key

`R2_ENDPOINT` may be used instead of `R2_ACCOUNT_ID` for jurisdiction-specific buckets, for example `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`.

The upload script signs R2 S3 API requests directly. It does not require `wrangler login`. If you only have the raw R2 API token values from the Cloudflare token creation API, set `R2_API_TOKEN_ID` and `R2_API_TOKEN_VALUE`; the script derives the S3 secret key from the token value.

The dictionary scripts load `.env` from the repo root automatically. Existing shell environment variables take precedence over `.env` values. Use `--env-file <path>` to load a different dotenv file.

Example `.env`:

```bash
R2_DICTIONARY_BUCKET=your-bucket
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
```

Generate local artifacts without uploading:

```bash
npm run dict:build -- --source data/dictionary/raw/de-dict.jsonl --version vYYYY-MM-DD
```

This writes artifacts to `data/dictionary/generated/vYYYY-MM-DD/`.
The default search prefix length is 3 characters and each prefix may be split into up to 16 search shards. Search chunk filenames use a hex-encoded prefix, for example `arb` becomes `p617262-00.json`, so R2 object keys avoid punctuation and encoded spaces. Empty shard files are not generated. The builder writes `search-index.json`, which maps each encoded prefix to the non-empty shard files the app should fetch. Use `--prefix-length <n>` only when changing both generated artifacts and app config together. `--search-shard-count <n>` affects generated artifacts, but the app discovers existing shard files from `search-index.json`.
Search rows use `term` for the lemma shown in the result list. Form rows keep the actual matched inflection in `matchedTerm`, so searching `isst` can show `essen` while preserving the matched-form context.
Entries whose senses are only structured `form_of`/`alt_of` references are omitted from artifacts. The canonical entry remains discoverable through its generated form search rows.
The dictionary commands print progress to stderr while reading the source, writing chunks, validating artifacts, and uploading R2 objects.

Build, validate, and upload a new version:

```bash
npm run dict:publish -- --source data/dictionary/raw/de-dict.jsonl --version vYYYY-MM-DD
```

For large dictionaries, use parallel R2 uploads:

```bash
npm run dict:publish -- --source data/dictionary/raw/de-dict.jsonl --version vYYYY-MM-DD --upload-concurrency 32
```

Start with `32`. If R2 returns throttling, timeout, or transient network errors, retry with `16`. If uploads are stable but still slow, `64` may be reasonable. Very high object counts can still take a while even with parallel PUT requests.

Upload an already generated artifact without rebuilding:

```bash
npm run dict:upload -- --version vYYYY-MM-DD --upload-concurrency 32
```

This reads `data/dictionary/generated/vYYYY-MM-DD/`, validates it, then uploads the existing files.

Useful options:

- `--dry-run`: print R2 keys without uploading
- `--bucket <name>`: override `R2_DICTIONARY_BUCKET`
- `--account-id <id>`: override `R2_ACCOUNT_ID`
- `--endpoint <url>`: override the R2 S3 endpoint
- `--access-key-id <id>`: override `R2_ACCESS_KEY_ID`
- `--secret-access-key <secret>`: override `R2_SECRET_ACCESS_KEY`
- `--out-dir <path>`: override `data/dictionary/generated`
- `--prefix-length <n>`: override the search chunk prefix length
- `--search-shard-count <n>`: override the number of search files per prefix
- `--entry-bucket-count <n>`: override the number of entry buckets
- `--max-chunk-bytes <n>`: override validation's maximum JSON chunk size
- `--include-multiword-search`: include whitespace-containing forms in search chunks; off by default to keep common article/periphrastic chunks small
- `--upload-concurrency <n>`: number of parallel R2 PUT requests during upload; default is 16
- `--force`: overwrite an existing version after checking the manifest key
- `--public-base-url <url>`: print the final public manifest URL
- `--env-file <path>`: load environment variables from a dotenv file instead of `.env`

## Validation Checklist

Run validation before upload when not using `dict:publish`:

```bash
npm run dict:validate -- --version vYYYY-MM-DD --samples arbeiten,Arbeit,gearbeitet
```

Check `data/dictionary/generated/vYYYY-MM-DD/build-stats.json` for:

- source filename and SHA-256 checksum
- source line count
- normalized entry count
- search row count
- search chunk count
- largest chunk size
- generated timestamp
- script version

Test the uploaded manifest URL in a browser or with `curl`:

```bash
curl https://<public-r2-host>/dictionary/vYYYY-MM-DD/manifest.json
```

Then test at least one search chunk and entry chunk referenced by the app.
Use `search-index.json` to find the search chunk filenames for a prefix; not every shard number exists.

## App Version

Set the active dictionary location with either:

```bash
VITE_DICTIONARY_PUBLIC_BASE_URL=https://<public-r2-host>
VITE_DICTIONARY_ACTIVE_VERSION=vYYYY-MM-DD
```

The app derives the active manifest URL as:

```text
<VITE_DICTIONARY_PUBLIC_BASE_URL>/dictionary/<VITE_DICTIONARY_ACTIVE_VERSION>/manifest.json
```

After changing the active version, run:

```bash
npm run lint
npm run build
```

## Rollback

Set `VITE_DICTIONARY_ACTIVE_VERSION` back to the previous version and redeploy the app. Dictionary versions are content-addressed by date-style version directories, so rollback does not require deleting the newer R2 objects.

## Retention

Keep at least the current version and one previous known-good version in R2. Older versions may be removed after confirming no deployed app points at them.
