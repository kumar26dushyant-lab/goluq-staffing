# Owner tasks — step by step (2026-09-12)

Written for Dushyant, or for a browser agent acting as Dushyant. Each task is
independent; do them in this order because the first three unblock money.
Never paste any secret into a chat, a document or a commit — only into the
cockpit fields named below. The cockpit is https://goluq.com/admin.

---

## 1. Razorpay — reuse the Sarathi-AI keys, add one webhook (10 minutes)

Why: without this, the founder-call and cart payment links cannot be created.
GoLuQ uses the same Razorpay account as Sarathi-AI.com. A Razorpay account has
ONE live key pair; regenerating it would break Sarathi-AI, so do not press
"Regenerate". Copy the pair that Sarathi-AI already uses.

1. Open the Sarathi-AI.com server configuration (its `.env` or hosting
   dashboard → environment variables) and copy the two values named like
   `RAZORPAY_KEY_ID` (starts `rzp_live_`) and `RAZORPAY_KEY_SECRET`.
   If they cannot be found there: https://dashboard.razorpay.com → Account &
   Settings → API Keys shows the Key Id; the secret is only shown at
   generation time, so in that case generate a NEW pair and update Sarathi-AI
   with the same new pair on the same day.
2. Open https://goluq.com/admin → **Setup → Settings** → tab **Payments**.
   Paste Key Id into "Key id", Key Secret into "Key secret". Press
   **Save payments**. The secret field goes blank after save and shows "set".
3. In Razorpay: **Account & Settings** → **Webhooks** → **Add New Webhook**
   (Sarathi-AI's existing webhook stays; a second one is allowed).
   - Webhook URL: `https://goluq.com/api/razorpay/webhook`
   - Secret: type any long random phrase (20+ characters). Keep it on screen.
   - Alert email: kumar26.dushyant@gmail.com
   - Active events: tick **payment_link.paid**, **payment_link.expired**,
     **payment_link.cancelled**. Nothing else is needed.
   - Create Webhook.
4. In the cockpit Payments tab paste that same phrase into "Webhook secret" →
   **Save payments**.
5. Leave "Send the call link for every booking" OFF unless you want every
   calendar booking (even a free discovery call) to receive the ₹999 link.
6. Verify: cockpit → **Sell → Payments** should no longer show the yellow
   "Razorpay is not connected" notice. Optional dry run: in "Send a link for
   anything else" enter your own WhatsApp number, amount 1, description
   "test", Send. A link arrives on WhatsApp; pay ₹1 or ignore it; the ledger
   row appears under "Links issued".

## 1b. Dodo Payments — for customers outside India (10 minutes)

Why: Razorpay serves India in rupees. International customers pay through Dodo
Payments (merchant of record: cards, PayPal, local methods, tax handled), the
account already used for one of our apps.

1. https://app.dodopayments.com → Developer → **API keys** → create a key
   named "goluq.com" (live mode). Copy it.
2. Developer → **Webhooks** → add endpoint `https://goluq.com/api/dodo/webhook`,
   events: payment.succeeded, payment.failed. Copy the signing secret.
3. Paste both into cockpit → Settings → Payments → "Dodo API key" and "Dodo
   webhook secret" (fields appear once the international build is deployed;
   until then keep them in your password manager, not in chat).
4. Tell Claude which currencies to offer: USD only, or USD + AED + GBP.

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
