# Google project, YouTube, off-site backups, Oracle safety — owner steps (2026-09-20)

Four jobs for the owner (or the browser extension acting as the owner).
Everything that is a secret comes back to Claude in chat, is stored
write-only in the server's environment, and is rotated after first use.
Nothing here moves goluq.com off Oracle; the Google project is for
services (voices, backups, YouTube), not hosting.

## Job 1 · Google Cloud project and the text-to-speech key (10 minutes)

1. Open https://console.cloud.google.com and sign in with the Google
   account that also owns the YouTube channel @goluq.official.
2. Top bar → project selector → **New project** → name `goluq-voice` →
   **Create** → select it (the top bar shows `goluq-voice`).
3. Left menu → **Billing** → **Link a billing account** → add a card.
   Required for the voice API. Then **Budgets & alerts** → **Create budget**
   → name `guard` → amount ₹500 → alerts at 50 %, 90 %, 100 % → save. The
   free monthly allowances below stay free; the budget only warns.
4. Left menu → **APIs & Services** → **Library** → search
   `Cloud Text-to-Speech API` → **Enable**.
5. **APIs & Services** → **Credentials** → **Create credentials** →
   **API key**. Copy the key.
6. Click the new key → **Name** `tts-server` → **API restrictions** →
   **Restrict key** → tick only `Cloud Text-to-Speech API` → **Save**.
7. Paste the key in chat as: `TTS key: <key>`.

## Job 2 · YouTube uploads by script (10 minutes, same project)

1. **APIs & Services** → **Library** → search `YouTube Data API v3` →
   **Enable**.
2. **APIs & Services** → **OAuth consent screen** → **External** →
   **Create**. App name `GoLuQ Studio`, user support email = your email,
   developer contact = your email → **Save and continue** through Scopes
   (add nothing) → **Test users** → **Add users** → your email → save.
   Leave the app in "Testing"; that is enough for our own channel.
3. **Credentials** → **Create credentials** → **OAuth client ID** →
   Application type **Desktop app** → name `goluq-uploader` → **Create** →
   copy the **Client ID** and **Client secret** (or download the JSON).
4. Paste both in chat as: `YouTube OAuth: id=<...> secret=<...>`.
5. Quota: **APIs & Services** → **Enabled APIs** → **YouTube Data API v3**
   → **Quotas & System Limits** → find "Queries per day" (10,000) →
   **Edit quotas** → request `100000` → reason: "Uploading our own
   marketing films and shorts (about 60 videos) to our channel
   @goluq.official; no third-party content." Submit. Google answers in a
   few days; until then the script uploads about six videos a day.
6. Later, when Claude sends a sign-in link: open it, sign in with the
   channel's account, allow "Manage your YouTube videos", paste the code
   back in chat. One time only.

## Job 3 · Off-site backups in Cloud Storage (8 minutes, same project)

Today the nightly database backups live on the same server. A copy in a
bucket that the server can write to but never read or delete closes that
gap; a stolen server key cannot erase history.

1. **Cloud Storage** → **Buckets** → **Create**. Name `goluq-backups-mum`
   (names are global; add digits if taken) → Location type **Region** →
   `asia-south1 (Mumbai)` → Storage class **Standard** → Access control
   **Uniform** → Protection: tick **Enforce public access prevention** →
   **Create**.
2. Open the bucket → **Lifecycle** → **Add a rule** → Action **Delete
   object** → Condition **Age** `45` days → save. (Six weeks of nightly
   copies; the server keeps two.)
3. **IAM & Admin** → **Service accounts** → **Create service account** →
   name `backup-writer` → **Create and continue** → role: search
   **Storage Object Creator** → **Done**. (Creator only: it can add files,
   never list, read or delete them.)
4. Click `backup-writer` → **Keys** → **Add key** → **Create new key** →
   **JSON** → the file downloads. Paste its full contents in chat as:
   `Backup SA JSON:` followed by the JSON. Then delete the downloaded file.
5. Claude installs it on the server (mode 600, outside the repo) and adds
   one line to the nightly backup so each `.db.gz` is also uploaded; the
   next morning's Telegram brief confirms the first upload.

## Job 4 · Oracle: keep the free server safe (5 minutes)

Oracle can reclaim Always Free machines it thinks are idle. Upgrading the
account to Pay As You Go keeps every free allowance and removes that
rule; nothing is charged unless we add paid resources.

1. https://cloud.oracle.com → sign in → top-right profile → **Tenancy**
   or **Billing** → **Upgrade and Manage Payment** → **Upgrade to Pay As
   You Go** → add the card → confirm.
2. Tell Claude when it is done; the deploy notes get a line and nothing
   else changes.

## What Claude does with each item

| You send | Claude does |
|---|---|
| TTS key | Four sample lines (Google en-IN male and female, current model with an Indian instruction, current voice); after your pick, every English film re-rendered in Indian English for India and the Gulf; optional Hindi refresh with Google's hi-IN voices; key rotated. |
| YouTube OAuth id + secret | Sends the one-time sign-in link; then uploads the whole library with playlists, thumbnails, titles and descriptions in each film's language; card slideshows as Shorts. |
| Backup SA JSON | Nightly off-site copy to the bucket; retention 45 days; a line in the Monday brief. |
| Oracle upgraded | Notes it in docs; no change to the server. |
