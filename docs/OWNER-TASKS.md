# Owner tasks — step by step (2026-09-12)

Written for Dushyant, or for a browser agent acting as Dushyant. Each task is
independent; do them in this order because the first three unblock money.
Never paste any secret into a chat, a document or a commit — only into the
cockpit fields named below. The cockpit is https://goluq.com/admin.

---

## 1. Razorpay — paste the existing key pair, add one webhook (10 minutes)

State on 2026-09-12: goluq.com is APPROVED under the existing Razorpay
account (with sarathi-ai.com and nidaanpartner.com). API keys are universal
across the account's approved sites, so the key `rzp_live_SPruIDUQVZPQir`
(generated 11 Mar 2026) already serves GoLuQ. Never press "Regenerate Key":
it would break Sarathi-AI and NidaanPartner the same minute.

Step by step:
1. Open the place where Sarathi-AI keeps its Razorpay secret — its hosting
   dashboard → environment variables, or its `.env` file — and copy the value
   of the variable named like `RAZORPAY_KEY_SECRET` (a 24-character string).
   The key id is `rzp_live_SPruIDUQVZPQir`. If the secret is not stored
   anywhere, STOP and tell Claude (a regeneration must be coordinated on all
   three sites the same hour).
2. Open https://goluq.com/admin → left menu **Setup → Settings** → tab
   **Payments**. Field "Key id": paste `rzp_live_SPruIDUQVZPQir`. Field "Key
   secret": paste the secret. Press **Save payments**. The secret field goes
   blank and shows "set".
3. Open https://dashboard.razorpay.com → **Account & Settings** → **Business
   website details** → tab **Webhooks** → **Add New Webhook**.
   - Webhook URL: `https://goluq.com/api/razorpay/webhook`
   - Secret: type a random phrase of 20+ characters (e.g. from a password
     generator). Keep it visible.
   - Alert email: kumar26.dushyant@gmail.com
   - Active events: tick `payment_link.paid`, `payment_link.expired`,
     `payment_link.cancelled`. Leave everything else unticked.
   - Press **Create Webhook**.
4. Back in the cockpit Payments tab: field "Webhook secret" = the same
   phrase → **Save payments**.
5. Verify: cockpit → **Sell → Payments**. The yellow "Razorpay is not
   connected" notice must be gone. In "Send a link for anything else" enter
   your own WhatsApp number (10 digits), amount 1, description "test" →
   **Send payment link**. A WhatsApp message with a "Pay now" button arrives;
   pay ₹1 by UPI. Within a minute the row under "Links issued" shows "paid"
   and a Telegram alert "Payment received" arrives.

## 1b. Dodo Payments — webhook secret and brand id (5 minutes)

Done: GoLuQ.com Digital Consultancy exists as a secondary brand under the
EagleEye business; the API key is in the cockpit. The checkout currently
shows "EagleEye" because the product was created before the brand id was
set; step 2 fixes that (the product is recreated under the GoLuQ brand
automatically on the next payment).

1. https://app.dodopayments.com → left menu **Developer** → **Webhooks** →
   **Add Endpoint**. URL: `https://goluq.com/api/dodo/webhook`. Events:
   tick `payment.succeeded` and `payment.failed`. Create. On the endpoint
   page press **Reveal** / copy beside **Signing Secret** (starts `whsec_`).
2. Dodo → **Settings** → tab **Business** → right panel "Brands Under
   EagleEye" → row **GoLuQ.com Digital Consultancy** → press the "…" →
   **Edit** (or "Copy ID") → copy the Brand ID (starts `brand_`). While there,
   set the brand's logo (goluq.com/brand/profile-640.png), statement
   descriptor "GOLUQ.COM" and URL https://goluq.com if empty.
3. https://goluq.com/admin → **Setup → Settings** → tab **Payments** → scroll
   to "Customers outside India · Dodo Payments": paste the signing secret in
   "Dodo webhook signing secret", the brand id in "Dodo brand id" →
   **Save payments**.
4. Rotate the API key (it was pasted into a chat once): Dodo → Developer →
   **API keys** → create a new live key named "goluq.com" → paste it in the
   cockpit "Dodo API key" → Save → delete the old key in Dodo.
5. Verify: cockpit → Sell → Payments → "Send a link for anything else" →
   email kumar26.dushyant@gmail.com (leave the phone empty), amount 88,
   description "test" → Send. The email carries a checkout link; open it —
   the header must now read **GoLuQ.com Digital Consultancy**, not EagleEye.
   Pay $1 with a card or ignore it.

## 1c. Google sign-in for the client login (10 minutes)

1. https://console.cloud.google.com → project "GoLuQ" (create if absent) →
   APIs & Services → OAuth consent screen → External → app name "GoLuQ.com",
   support email kumar26.dushyant@gmail.com, authorised domain goluq.com →
   Save. Publish the app (not testing mode).
2. Credentials → Create credentials → OAuth client ID → Web application →
   name "goluq.com web" → Authorised JavaScript origins `https://goluq.com`
   → Authorised redirect URIs `https://goluq.com/api/auth/google/callback` →
   Create. Copy Client ID and Client secret.
3. Paste into cockpit → Settings → Sign-in (fields appear with the login
   build). Until then, password manager.

## 2. Calendar bridge — Google Apps Script (10 minutes)

Why: bookings from the Google appointment page reach the cockpit, Telegram,
and trigger the payment link only through this script.

1. Open https://goluq.com/admin → **Setup → Settings** → tab
   **Contact & alerts** → panel "Calendar bridge" → press **Copy** next to the
   secret. Keep it in the clipboard.
2. Open https://script.google.com signed in as the Google account that owns
   the appointment schedule (the calendar behind
   https://calendar.app.google/ntCZxLnkDbo1FodJ6).
3. **New project**. Delete the default `myFunction` code. Paste the entire
   contents of the repository file `docs/booking-bridge/Code.gs`
   (GitHub: goluq.com repo → docs → booking-bridge → Code.gs → Raw → select
   all → copy). Rename the project "GoLuQ booking bridge". Save (Ctrl+S).
4. Left sidebar gear icon **Project Settings** → scroll to **Script
   properties** → **Add script property**, three times:
   - `SECRET` = the bridge secret from step 1
   - `CALENDAR` = the Gmail address of that Google account (the calendar id)
   - `MATCH` = `GoLuQ discovery call` (the words that appear in every booking's
     event title; check one existing booking event to confirm the exact title
     and use that text if it differs)
   Save script properties.
5. Back in the editor: function dropdown → choose `syncBookings` → **Run**.
   A permissions dialog appears: Review permissions → choose the account →
   "Advanced" → "Go to GoLuQ booking bridge (unsafe)" → Allow. The run should
   finish without a red error in the Execution log.
6. Left sidebar clock icon **Triggers** → **Add Trigger**: function
   `syncBookings`, event source **Time-driven**, type **Minutes timer**,
   interval **Every 10 minutes** → Save.
7. Verify: make a test booking on the appointment page with your own phone
   number in the form. Within 10 minutes it appears on cockpit → Today →
   "Upcoming calls" and a Telegram alert arrives. Cancel the test event
   afterwards in Google Calendar; the cockpit follows.

---

## 3. WhatsApp message templates — submit three (10 minutes)

Why: WhatsApp only delivers messages outside 24 hours through approved
templates. These cover booking confirmations, reminders and payment links.

Go to https://business.facebook.com → **WhatsApp Manager** (business portfolio
"GoLuQ - Digital Consultancy", WABA 1942085573135209) → **Message templates**
→ **Create template**. For each template below:

- Category: **Utility**
- Name: exactly as given (lowercase, underscores)
- Language: English first; then create the same name again with Hindi and the
  Hindi body.
- Body: paste exactly. Where the form asks for sample content for the
  variables, use the samples given.
- No header, no footer, no buttons unless stated.

### 3a. `appointment_confirmed` (English)
```
Hello {{1}}, your call with GoLuQ is booked for {{2}} (IST). We will call you on this number, or join here: {{3}}. Reply here if you need to change the time.
```
Samples: {{1}} Rahul · {{2}} Tue 16 Sep, 4:00 pm · {{3}} https://meet.google.com/abc-defg-hij

### 3b. `appointment_reminder` (English)
```
Hello {{1}}, a reminder that your call with GoLuQ is {{2}} (IST). Join here: {{3}}. If the time no longer suits you, reply here and we will move it.
```
Samples: {{1}} Rahul · {{2}} tomorrow at 4:00 pm · {{3}} https://meet.google.com/abc-defg-hij

### 3c. `payment_link` (English)
```
Hi {{1}}, here is your GoLuQ payment link for {{2}}: {{3}} — pay whenever suits you, by UPI, card or netbanking. Reply here with any question.
```
Samples: {{1}} Rahul · {{2}} your 30-minute call with Dushyant · {{3}} https://rzp.io/l/abc123

### 3c-hi. `payment_link` (Hindi)
```
नमस्ते {{1}}, {{2}} के लिए आपका GoLuQ पेमेंट लिंक यह रहा: {{3}} — जब सुविधा हो तब भुगतान करें, UPI, कार्ड या नेटबैंकिंग से। कोई सवाल हो तो यहीं लिखिए।
```
Samples: {{1}} राहुल · {{2}} दुष्यंत के साथ 30 मिनट की कॉल · {{3}} https://rzp.io/l/abc123

### 3d. `login_otp` — Authentication category (English, then Hindi)
Create template → Category **Authentication** → name `login_otp` → language
English → Code delivery **Copy code** → tick "Add security recommendation" →
code expires in 10 minutes → Submit. Repeat for Hindi. (Meta writes the body.)
Once approved: cockpit → Settings → **Client sign-in** → "WhatsApp OTP template
name" = `login_otp` → Save. /start then offers sign-in by WhatsApp code.

After approval (usually a few hours): open cockpit → Settings → Payments and
type `payment_link` into "Approved WhatsApp template for payment links" →
Save. Tell Claude the other two are approved so the confirmation and the
reminders cron can be switched on.

If Meta rejects one, read the reason; if it says "category", resubmit the same
text as Marketing; if it says "generic", tell Claude and we add detail.

---

## 4. Facebook posting — add the Pages use case and regenerate the token (10 minutes)

Why: the cockpit's Publish tab can reach the Page but cannot post; the app
lacks the Pages permissions.

1. https://developers.facebook.com/apps → open the app used for WhatsApp
   ("GoLuQ.com" app). Left menu → **Use cases** → **Add use case** (or
   "Customize") → choose **"Manage everything on your Page"** (Pages /
   Content). Add it. Inside it, under Permissions, make sure
   `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
   `instagram_content_publish` are added (click "Add" beside each).
2. https://business.facebook.com/settings → **Users → System users** →
   **goluq-api** → **Add assets** → Pages → tick "GoLuQ.com Digital
   Consultancy" → Full control (Manage) → Save. (Skip if already assigned.)
   If the Instagram account exists (task 5), also add it under Instagram
   accounts.
3. Same screen → **Generate new token** → App: the GoLuQ.com app → Token
   expiration: **Never** → tick permissions: `whatsapp_business_management`,
   `whatsapp_business_messaging`, `catalog_management`, `business_management`,
   `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
   `instagram_content_publish` → Generate → Copy.
4. https://goluq.com/admin → **Setup → Settings** → tab **WhatsApp Business
   API** → paste into "Access token" → Save → press **Check connection**
   (must say OK). Then **Sell → Publish** → **Connect** — it should name the
   Page and, if linked, the Instagram account.
5. Do NOT paste the token anywhere else. Old tokens: revoke in the system
   user's token list.

---

## 5. Instagram professional account (10 minutes)

1. Instagram app → create account with the business email → username
   `goluq.com` if free, else `goluq_com` or `goluqdotcom`.
2. Profile → Edit → Switch to professional account → **Business** → category
   "Software company" or "Consulting agency".
3. Profile picture: use `public/brand/profile-640.png` from the repo
   (goluq.com/brand/profile-640.png). Bio: "GoLuQ.com Digital Consultancy ·
   Indore · Software, WhatsApp, voice and toll-free lines for growing
   businesses · goluq.com". Website: https://goluq.com
4. Settings → Account type and tools → **Connect a Facebook Page** → choose
   "GoLuQ.com Digital Consultancy".
5. Then redo task 4 steps 2–4 so the token covers Instagram, and press Connect
   in Publish.

---

## 6. LinkedIn company page (10 minutes)

1. https://www.linkedin.com/company/setup/new/ → Company → name
   "GoLuQ.com Digital Consultancy", public URL `goluq`, website
   https://goluq.com, industry "IT Services and IT Consulting", size 1–10,
   type "Sole proprietorship", tagline "Software, WhatsApp, voice and
   toll-free lines that let a business run without the owner on the phone."
2. Logo: goluq.com/brand/profile-640.png. Cover: any card from
   goluq.com/catalog/ (e.g. whatsappOffice.jpg) cropped to 1128×191.
3. Post nothing yet; posting from the cockpit is a later build. Send Claude
   the page URL.

---

## 7. Public Telegram channel (5 minutes)

1. Telegram → New channel → name "GoLuQ.com" → public → link `t.me/goluqcom`
   (or the nearest free).
2. Description: "Software, WhatsApp, voice and toll-free lines for growing
   businesses. goluq.com". Photo: profile-640.png.
3. https://goluq.com/admin → Settings → Contact & alerts → "Public Telegram
   channel or username" → paste `@goluqcom` → Save. The site's Telegram
   button turns on.
   (The cockpit bot @GoLuQ_Bot stays private; do not put it here.)

---

## 8. Ashwin testimonial (when convenient)

A 30–60 s phone video: who he is, what was built, what changed for him, in his
own words, plus one line of written consent on WhatsApp ("You may use this
video on goluq.com and social media"). Send both to Claude.
