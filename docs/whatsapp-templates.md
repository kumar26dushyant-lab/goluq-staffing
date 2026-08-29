# WhatsApp message templates — ready to submit

Submit in **Meta Business Suite → WhatsApp Manager → Message templates → Create**.
Approval usually takes a few hours, sometimes a day or two.

## Why these are worded the way they are

A template only reaches someone **outside** the 24-hour service window, which is
exactly when Meta is strictest. Reviewers reject vague, salesy copy and approve
templates that state a real, specific event. So:

- Every template below describes something that actually happened — an enquiry
  arrived, a quote is ready, a stage moved — rather than "check out our offers".
- **Category matters.** Marking a marketing template as UTILITY gets it rejected
  or silently re-categorised, and Meta charges accordingly. The one genuine
  re-engagement message below is declared MARKETING honestly.
- The marketing one carries its own opt-out, because a follow-up that cannot be
  stopped is the fastest way to lose sender quality — and quality is what keeps
  everything else deliverable.
- Body text never begins or ends with a variable, and no two variables sit next
  to each other. Meta rejects both outright.

Name templates exactly as written; the code will look them up by these names.

---

## 1. `enquiry_received` — UTILITY · English

**Body**
```
Hi {{1}}, thanks for contacting GoLuQ about {{2}}. We have your enquiry and will reply here shortly. If you need anything sooner, just message this number.
```
**Samples:** `{{1}}` = Ramesh · `{{2}}` = a toll-free number

Sent when someone submits the enquiry form. Confirms a real person has it.

---

## 2. `quote_ready` — UTILITY · English

**Body**
```
Hi {{1}}, your quote for {{2}} is ready. Setup is {{3}} and we can have it live in {{4}}. Reply here and we will walk you through it.
```
**Samples:** `{{1}}` = Ramesh · `{{2}}` = a toll-free number with call routing ·
`{{3}}` = Rs 9,999 · `{{4}}` = 3 to 7 working days

---

## 3. `project_stage_update` — UTILITY · English

**Body**
```
Hi {{1}}, your project {{2}} has moved to the {{3}} stage. You can see the full history and everything delivered so far in your portal.
```
**Button:** Visit website → `https://goluq.com/portal`

**Samples:** `{{1}}` = Ramesh · `{{2}}` = Clinic booking system · `{{3}}` = testing

Fires from the cockpit when you move a project stage. Pairs with the email that
already goes out.

---

## 4. `service_activated` — UTILITY · English

**Body**
```
Hi {{1}}, your {{2}} is now active on {{3}}. Message here if anything does not look right and we will fix it.
```
**Samples:** `{{1}}` = Ramesh · `{{2}}` = toll-free number · `{{3}}` = 1800 123 4567

---

## 5. `followup_no_reply` — MARKETING · English

**Body**
```
Hi {{1}}, you asked us about {{2}} a few days ago. If it is still on your list, reply here and we will pick up where we left off. If not, reply STOP and we will not message you again.
```
**Samples:** `{{1}}` = Ramesh · `{{2}}` = a WhatsApp automation

This is the day 3 / 5 / 7 / 12 follow-up engine, which is built and currently has
no way to deliver anything. Declared MARKETING because that is what it is.

---

## Hindi versions

Submit each as the **same template name** with language **Hindi (hi)**. Meta
treats name + language as one template, so the code picks the right language
automatically.

**`enquiry_received`**
```
नमस्ते {{1}}, GoLuQ से संपर्क करने के लिए धन्यवाद — {{2}} के बारे में आपका संदेश हमें मिल गया है। हम जल्दी ही यहीं जवाब देंगे। इससे पहले कुछ चाहिए तो इसी नंबर पर लिख दीजिए।
```

**`quote_ready`**
```
नमस्ते {{1}}, {{2}} के लिए आपका कोटेशन तैयार है। सेटअप {{3}} और चालू होने में {{4}} लगेंगे। यहीं जवाब दीजिए, हम पूरी बात समझा देंगे।
```

**`project_stage_update`**
```
नमस्ते {{1}}, आपका प्रोजेक्ट {{2}} अब {{3}} चरण में पहुँच गया है। पूरी जानकारी और अब तक जो कुछ दिया गया है, वह आप अपने पोर्टल में देख सकते हैं।
```

**`service_activated`**
```
नमस्ते {{1}}, आपकी {{2}} अब {{3}} पर चालू हो गई है। कुछ भी ठीक न लगे तो यहीं लिखिए, हम सुधार देंगे।
```

**`followup_no_reply`**
```
नमस्ते {{1}}, कुछ दिन पहले आपने {{2}} के बारे में पूछा था। अगर अब भी ज़रूरत है तो यहीं जवाब दीजिए, हम वहीं से आगे बढ़ते हैं। अगर नहीं, तो STOP लिख दीजिए — फिर हम संदेश नहीं भेजेंगे।
```

---

## After approval

Tell me, and I will wire them up:

- `followup_no_reply` → the day 3/5/7/12 engine, which then works for the first time
- `project_stage_update` → fires when you move a stage in the cockpit
- `enquiry_received` → on lead form submission
- `quote_ready`, `service_activated` → send from the cockpit when relevant

`waSendTemplate()` in `functions/lib/whatsapp.ts` already exists and is tested;
it needs the approved names and nothing else.

## If one is rejected

Meta gives a reason but rarely a useful one. The two that actually matter:

- **Wrong category** — if a UTILITY template reads like promotion, resubmit it as
  MARKETING rather than rewording it into something dishonest.
- **Too generic** — add the specific detail that makes it a real notification
  about a real thing, which is also what makes it worth sending.
