# Owner tasks — step by step (2026-09-12)

Written for Dushyant, or for a browser agent acting as Dushyant. Each task is
independent; do them in this order because the first three unblock money.
Never paste any secret into a chat, a document or a commit — only into the
cockpit fields named below. The cockpit is https://goluq.com/admin.

---

## 1. Razorpay — do NOT regenerate; paste the existing pair, add one webhook (10 minutes)

State on 2026-09-12: goluq.com is listed under the existing Razorpay account
beside sarathi-ai.com and nidaanpartner.com, status "Under review (24–48 h)".
Razorpay's own note on that screen: API keys are universal across all
approved websites. So the key `rzp_live_SPruIDUQVZPQir` (generated 11 Mar
2026) already serves GoLuQ once the review clears. Regenerating it would
break Sarathi-AI and NidaanPartner the same minute.

1. Find the secret for that key where Sarathi-AI keeps it (its `.env` /
   hosting environment variables, names like `RAZORPAY_KEY_SECRET`). Do not
   press "Regenerate Key". If the secret truly cannot be found anywhere,
   stop and tell Claude — regenerating is a coordinated change on three sites.
2. https://goluq.com/admin → **Setup → Settings** → tab **Payments**: Key id
   = `rzp_live_SPruIDUQVZPQir`, Key secret = the value from step 1 → **Save
   payments**. The secret field goes blank and shows "set".
3. Razorpay → Account & Settings → **Webhooks** tab (next to "Websites & API
   keys") → **Add New Webhook**:
   - URL `https://goluq.com/api/razorpay/webhook`
   - Secret: any long random phrase (20+ chars); keep it on screen
   - Alert email kumar26.dushyant@gmail.com
   - Events: payment_link.paid, payment_link.expired, payment_link.cancelled
   - Create.
4. Cockpit → Settings → Payments → "Webhook secret" = that phrase → Save.
5. Wait for the goluq.com review to show Approved (24–48 h). Until then a
   link may be created but Razorpay can refuse the payment on an unapproved
   site; do not send links to real customers before it is Approved.
6. Verify afterwards: cockpit → Sell → Payments → "Send a link for anything
   else" → your own number, ₹1, "test" → pay it → the row turns "paid" and a
   Telegram alert arrives.

## 1b. Dodo Payments — finish the connection (5 minutes)

Done already: GoLuQ.com Digital Consultancy is a secondary brand under the
EagleEye business; the API key is stored in the cockpit (write-only). Left:

1. Dodo dashboard → **Developer → Webhooks** → Add endpoint
   `https://goluq.com/api/dodo/webhook` → events **payment.succeeded** and
   **payment.failed** → create → copy the **signing secret** (starts
   `whsec_`).
2. Dodo → Settings → Business → Brands → the "…" beside
   **GoLuQ.com Digital Consultancy** → copy the brand id (`brand_…`).
3. https://goluq.com/admin → Settings → Payments → paste "Dodo webhook
   signing secret" and "Dodo brand id" → Save payments. The Dodo product
   ("GoLuQ.com services", pay-what-you-want, USD) is created automatically on
   first use and its id appears in the read-only field.
4. Because the API key was pasted into a chat once, rotate it when convenient:
   Developer → API keys → create a new key → paste in the cockpit → delete
   the old one. Nothing else changes.
5. Verify: Sell → Payments → send a link to your own email with country "US"
   (the form uses the number's country; use an email only) for ₹88 — it comes
   out as a $1 Dodo link. Pay it with a card; the row turns "paid".

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
