import type { RoleId, IndustryId } from "../state/useAppState";

/**
 * What the Digital Employee actually SAYS.
 *
 * The old demo showed a task log ("Flagging 38 reports…") for every role, which
 * is nonsense for a Voice Calling Employee — nobody buys a phone worker to watch
 * a checklist. For every conversational role the honest demonstration is the
 * conversation itself: a real caller, a real reply, and the booking or answer
 * that comes out of it.
 *
 * Each line is what would be spoken or typed. Keep them SHORT — real people
 * speak in one breath, and this is read on a phone.
 */
export interface Turn {
  who: "caller" | "agent";
  en: string;
  hi: string;
  /** Marathi is authored for the VOICE role only — see `line()` for the fallback. */
  mr?: string;
  /** Optional worker label — used by the Workforce role to show who took it. */
  by?: { en: string; hi: string; mr?: string };
}

/** A call can be heard in any of these, independently of the site language. */
export type DialogueLang = "en" | "hi" | "mr";

/** Reads a line in the requested language, falling back Marathi → Hindi → English. */
export function line(
  o: { en: string; hi: string; mr?: string } | undefined,
  lang: DialogueLang
): string {
  if (!o) return "";
  if (lang === "mr") return o.mr || o.hi || o.en;
  return o[lang] || o.en;
}

export interface Dialogue {
  /** Sets the scene: channel, time, why it matters. */
  scene: { en: string; hi: string; mr?: string };
  turns: Turn[];
  /** What concretely happened as a result. */
  result: { en: string; hi: string; mr?: string };
}

const T = (who: Turn["who"], en: string, hi: string, mr?: string, by?: Turn["by"]): Turn =>
  ({ who, en, hi, mr, by });

// ── VOICE — an actual phone call ─────────────────────────────────────────────
const voice: Record<IndustryId, Dialogue> = {
  clinic: {
    scene: {
      en: "Missed call · 9:42 PM · clinic closed",
      hi: "मिस्ड कॉल · रात 9:42 · क्लिनिक बंद",
      mr: "मिस्ड कॉल · रात्री ९:४२ · क्लिनिक बंद",
    },
    turns: [
      T("agent", "Good evening, this is Dr. Mehta's clinic returning your call. How can I help?", "नमस्ते, डॉ. मेहता के क्लिनिक से कॉल बैक कर रहे हैं। कैसे मदद करूँ?", "नमस्कार, डॉ. मेहता यांच्या क्लिनिकमधून कॉल बॅक करत आहोत. कशी मदत करू?"),
      T("caller", "My father has chest pain since evening. Can he see the doctor tomorrow?", "पापा को शाम से सीने में दर्द है। कल डॉक्टर को दिखा सकते हैं?", "बाबांना संध्याकाळपासून छातीत दुखतंय. उद्या डॉक्टरांना दाखवता येईल का?"),
      T("agent", "I'm sorry to hear that. If the pain is severe right now, please go to Emergency — shall I read out the nearest one?", "सुनकर दुख हुआ। अगर दर्द अभी तेज़ है तो कृपया इमरजेंसी जाइए — सबसे नज़दीकी बता दूँ?", "ऐकून वाईट वाटलं. आत्ता वेदना तीव्र असतील तर कृपया इमर्जन्सीला जा — जवळचं ठिकाण सांगू का?"),
      T("caller", "No, it's mild now. Tomorrow morning is fine.", "नहीं, अभी हल्का है। कल सुबह ठीक रहेगा।", "नाही, आत्ता कमी आहे. उद्या सकाळी चालेल."),
      T("agent", "Done — 10:15 AM with Dr. Mehta. Please come fasting, and bring any old ECG reports.", "हो गया — सुबह 10:15, डॉ. मेहता के साथ। खाली पेट आइएगा, और पुरानी ECG रिपोर्ट साथ लाइएगा।", "झालं — सकाळी १०:१५, डॉ. मेहता यांच्याकडे. उपाशीपोटी या, आणि जुने ईसीजी रिपोर्ट सोबत आणा."),
      T("caller", "Thank you so much.", "बहुत-बहुत धन्यवाद।", "खूप खूप धन्यवाद."),
    ],
    result: {
      en: "Appointment booked, doctor's calendar updated, WhatsApp confirmation sent — and an emergency was screened for. At 9:42 PM, with nobody at the desk.",
      hi: "अपॉइंटमेंट बुक, डॉक्टर का कैलेंडर अपडेट, WhatsApp पर पुष्टि — और इमरजेंसी की जाँच भी हुई। रात 9:42 बजे, बिना किसी के डेस्क पर होते हुए।",
      mr: "अपॉइंटमेंट बुक, डॉक्टरांचं कॅलेंडर अपडेट, WhatsApp वर पुष्टी — आणि इमर्जन्सीची तपासणीही झाली. रात्री ९:४२ ला, डेस्कवर कोणीही नसताना.",
    },
  },
  diagnostic: {
    scene: {
      en: "Missed call · 8:10 AM · before the lab opens",
      hi: "मिस्ड कॉल · सुबह 8:10 · लैब खुलने से पहले",
      mr: "मिस्ड कॉल · सकाळी ८:१० · लॅब उघडण्यापूर्वी",
    },
    turns: [
      T("agent", "Good morning, this is City Diagnostics returning your call.", "नमस्ते, City Diagnostics से कॉल बैक कर रहे हैं।", "नमस्कार, City Diagnostics मधून कॉल बॅक करत आहोत."),
      T("caller", "I need a full body checkup. Can someone come home to take the sample?", "मुझे फुल बॉडी चेकअप कराना है। घर से सैंपल ले जाएँगे क्या?", "मला फुल बॉडी चेकअप करायचा आहे. घरून सॅम्पल घेऊन जाल का?"),
      T("agent", "Yes, home collection is available in your area. Tomorrow 7 to 9 AM — shall I book that?", "जी हाँ, आपके इलाक़े में होम कलेक्शन उपलब्ध है। कल सुबह 7 से 9 — बुक कर दूँ?", "होय, तुमच्या भागात होम कलेक्शन उपलब्ध आहे. उद्या सकाळी ७ ते ९ — बुक करू का?"),
      T("caller", "Yes. And do I need to fast?", "हाँ। और खाली पेट रहना है क्या?", "हो. आणि उपाशी राहावं लागेल का?"),
      T("agent", "Twelve hours fasting, water is fine. I'll send the prep instructions on WhatsApp now.", "बारह घंटे खाली पेट, पानी चल जाएगा। तैयारी की जानकारी अभी WhatsApp पर भेज देता हूँ।", "बारा तास उपाशी, पाणी चालेल. तयारीची माहिती आत्ताच WhatsApp वर पाठवतो."),
    ],
    result: {
      en: "Home collection scheduled, phlebotomist assigned, prep instructions sent. The call was returned in under a minute — the lab hadn't opened yet.",
      hi: "होम कलेक्शन तय, स्टाफ़ नियुक्त, तैयारी की जानकारी भेजी गई। कॉल एक मिनट में लौटाई गई — लैब तब खुली भी नहीं थी।",
      mr: "होम कलेक्शन ठरलं, स्टाफ नेमला, तयारीची माहिती पाठवली. कॉल एका मिनिटात परत केला — लॅब तेव्हा उघडलीही नव्हती.",
    },
  },
  coaching: {
    scene: {
      en: "Missed call · 7:30 PM · admission season",
      hi: "मिस्ड कॉल · शाम 7:30 · एडमिशन का सीज़न",
      mr: "मिस्ड कॉल · संध्याकाळी ७:३० · प्रवेशाचा हंगाम",
    },
    turns: [
      T("agent", "Good evening, this is Apex Classes returning your call.", "नमस्ते, Apex Classes से कॉल बैक कर रहे हैं।", "नमस्कार, Apex Classes मधून कॉल बॅक करत आहोत."),
      T("caller", "My daughter is in class 11. What are the timings for the NEET batch?", "मेरी बेटी 11वीं में है। NEET बैच का समय क्या है?", "माझी मुलगी अकरावीत आहे. NEET बॅचची वेळ काय आहे?"),
      T("agent", "Morning batch is 6 to 8:30 AM, evening 5 to 7:30 PM. Which suits her school hours?", "मॉर्निंग बैच सुबह 6 से 8:30, शाम 5 से 7:30। उसके स्कूल के हिसाब से कौन सा ठीक रहेगा?", "सकाळची बॅच ६ ते ८:३०, संध्याकाळची ५ ते ७:३०. तिच्या शाळेच्या वेळेनुसार कोणती योग्य राहील?"),
      T("caller", "Evening. What about the fees?", "शाम वाला। फ़ीस कितनी है?", "संध्याकाळची. आणि फी किती आहे?"),
      T("agent", "I'll send the full fee structure on WhatsApp. Would you like a free demo class this Saturday?", "पूरी फ़ीस डिटेल WhatsApp पर भेज देता हूँ। इस शनिवार एक मुफ़्त डेमो क्लास रखवा दूँ?", "पूर्ण फी रचना WhatsApp वर पाठवतो. या शनिवारी एक मोफत डेमो क्लास ठेवू का?"),
      T("caller", "Yes, please book it.", "हाँ, बुक कर दीजिए।", "हो, बुक करा."),
    ],
    result: {
      en: "Demo class booked, fee structure sent, parent's number captured with the batch they want. That enquiry would otherwise have been a missed call in a busy season.",
      hi: "डेमो क्लास बुक, फ़ीस डिटेल भेजी, अभिभावक का नंबर और पसंदीदा बैच दर्ज। वरना व्यस्त सीज़न में यह बस एक मिस्ड कॉल रह जाती।",
      mr: "डेमो क्लास बुक, फी रचना पाठवली, पालकांचा नंबर आणि हवी असलेली बॅच नोंदवली. अन्यथा गजबजलेल्या हंगामात ही फक्त एक मिस्ड कॉल राहिली असती.",
    },
  },
  ca: {
    scene: {
      en: "Missed call · 10:20 PM · two days before the GST deadline",
      hi: "मिस्ड कॉल · रात 10:20 · GST डेडलाइन से दो दिन पहले",
      mr: "मिस्ड कॉल · रात्री १०:२० · GST मुदतीच्या दोन दिवस आधी",
    },
    turns: [
      T("agent", "Good evening, this is Sharma & Associates returning your call.", "नमस्ते, Sharma & Associates से कॉल बैक कर रहे हैं।", "नमस्कार, Sharma & Associates मधून कॉल बॅक करत आहोत."),
      T("caller", "Has my GST return been filed? The deadline is on the 20th.", "मेरी GST रिटर्न फ़ाइल हो गई? 20 तारीख़ लास्ट डेट है।", "माझं GST रिटर्न भरलं का? २० तारीख शेवटची आहे."),
      T("agent", "Let me check. Your GSTR-1 is filed. GSTR-3B is pending — we're still short of two purchase bills from you.", "देखता हूँ। आपकी GSTR-1 फ़ाइल हो चुकी है। GSTR-3B बाक़ी है — आपकी दो परचेज़ बिल अभी नहीं मिलीं।", "बघतो. तुमचं GSTR-1 भरलं आहे. GSTR-3B बाकी आहे — तुमची दोन खरेदी बिलं अजून मिळालेली नाहीत."),
      T("caller", "Which two?", "कौन सी दो?", "कोणती दोन?"),
      T("agent", "The March bills from Verma Traders and Singh Enterprises. I'll WhatsApp you the list — send photos and we'll file tomorrow.", "मार्च की — वर्मा ट्रेडर्स और सिंह एंटरप्राइज़ेज़ वाली। लिस्ट WhatsApp कर देता हूँ — फ़ोटो भेज दीजिए, कल फ़ाइल कर देंगे।", "मार्चची — वर्मा ट्रेडर्स आणि सिंग एंटरप्रायझेसची. यादी WhatsApp करतो — फोटो पाठवा, उद्या भरून टाकू."),
    ],
    result: {
      en: "Client answered at 10:20 PM with their exact filing status and precisely what was missing — no partner had to be disturbed, and the deadline held.",
      hi: "रात 10:20 बजे क्लाइंट को सही स्थिति और ठीक-ठीक क्या बाक़ी है, दोनों बता दिया — किसी पार्टनर को परेशान नहीं करना पड़ा, और डेडलाइन बच गई।",
      mr: "रात्री १०:२० ला क्लायंटला नेमकी स्थिती आणि नेमकं काय बाकी आहे, दोन्ही सांगितलं — कोणत्याही पार्टनरला त्रास द्यावा लागला नाही, आणि मुदत पाळली गेली.",
    },
  },
  travel: {
    scene: {
      en: "Missed call · 5:05 AM · airport run",
      hi: "मिस्ड कॉल · सुबह 5:05 · एयरपोर्ट की ट्रिप",
      mr: "मिस्ड कॉल · पहाटे ५:०५ · विमानतळाची ट्रिप",
    },
    turns: [
      T("agent", "Good morning, this is Sunrise Travels returning your call.", "नमस्ते, Sunrise Travels से कॉल बैक कर रहे हैं।", "नमस्कार, Sunrise Travels मधून कॉल बॅक करत आहोत."),
      T("caller", "I need a cab to the airport at 7, my flight is at 10.", "मुझे 7 बजे एयरपोर्ट के लिए कैब चाहिए, फ़्लाइट 10 बजे है।", "मला ७ वाजता विमानतळासाठी कॅब हवी आहे, फ्लाइट १० वाजता आहे."),
      T("agent", "For a 10 AM flight I'd suggest 6:30 — there's traffic on the bypass. Sedan or SUV?", "10 बजे की फ़्लाइट के लिए 6:30 बेहतर रहेगा — बायपास पर ट्रैफ़िक रहता है। सेडान या SUV?", "१० वाजताच्या फ्लाइटसाठी ६:३० बरं राहील — बायपासवर ट्रॅफिक असतं. सेडान की SUV?"),
      T("caller", "Sedan is fine. Two people, two bags.", "सेडान ठीक है। दो लोग, दो बैग।", "सेडान चालेल. दोन माणसं, दोन बॅगा."),
      T("agent", "Booked — 6:30 pickup, ₹850 fixed. Driver's name and number will reach you on WhatsApp by 6.", "बुक हो गया — 6:30 पिकअप, ₹850 फ़िक्स। ड्राइवर का नाम और नंबर 6 बजे तक WhatsApp पर आ जाएगा।", "बुक झालं — ६:३० पिकअप, ₹८५० फिक्स. ड्रायव्हरचं नाव आणि नंबर ६ पर्यंत WhatsApp वर येईल."),
    ],
    result: {
      en: "Booking confirmed and a driver assigned at 5 AM — plus the customer was warned about traffic before they were late for a flight.",
      hi: "सुबह 5 बजे बुकिंग पक्की और ड्राइवर तय — और ग्राहक को फ़्लाइट छूटने से पहले ट्रैफ़िक की चेतावनी भी मिल गई।",
      mr: "पहाटे ५ वाजता बुकिंग पक्कं आणि ड्रायव्हर ठरला — आणि ग्राहकाला फ्लाइट चुकण्याआधी ट्रॅफिकची सूचनाही मिळाली.",
    },
  },
};

// ── RECEPTION — front desk, booking and rescheduling ─────────────────────────
const reception: Record<IndustryId, Dialogue> = {
  clinic: {
    scene: { en: "WhatsApp · 1:15 PM · front desk on lunch", hi: "WhatsApp · दोपहर 1:15 · फ़्रंट डेस्क लंच पर" },
    turns: [
      T("caller", "I have an appointment at 4 today. Can I shift it to Friday?", "आज 4 बजे अपॉइंटमेंट है। शुक्रवार कर सकते हैं?"),
      T("agent", "Of course. Friday I have 11:30 AM or 4:45 PM with Dr. Mehta.", "बिल्कुल। शुक्रवार को डॉ. मेहता के पास 11:30 या शाम 4:45 खाली है।"),
      T("caller", "11:30.", "11:30।"),
      T("agent", "Moved. Today's 4 PM slot is now free, so I've offered it to the patient on the waiting list.", "बदल दिया। आज का 4 बजे वाला स्लॉट खाली हुआ, तो वेटिंग लिस्ट वाले मरीज़ को दे दिया।"),
    ],
    result: {
      en: "Rescheduled without a phone call, and the vacated slot was immediately refilled from the waiting list — a slot that normally just goes empty.",
      hi: "बिना फ़ोन किए समय बदला, और खाली हुआ स्लॉट तुरंत वेटिंग लिस्ट से भर दिया — जो आम तौर पर ख़ाली ही चला जाता है।",
    },
  },
  diagnostic: {
    scene: { en: "WhatsApp · 9:50 PM", hi: "WhatsApp · रात 9:50" },
    turns: [
      T("caller", "Can I book a thyroid test for tomorrow morning?", "कल सुबह थायराइड टेस्ट बुक हो सकता है?"),
      T("agent", "Yes. Walk-in from 7 AM, or home collection between 7 and 9. Which would you prefer?", "जी हाँ। सुबह 7 बजे से वॉक-इन, या 7 से 9 के बीच होम कलेक्शन। कौन सा ठीक रहेगा?"),
      T("caller", "Home collection.", "होम कलेक्शन।"),
      T("agent", "Booked for 7:30 AM. Fasting isn't needed for thyroid. Report reaches you by 6 PM the same day.", "7:30 के लिए बुक। थायराइड के लिए खाली पेट ज़रूरी नहीं। रिपोर्ट उसी दिन शाम 6 बजे तक मिल जाएगी।"),
    ],
    result: {
      en: "Booked, slot assigned and prep answered at 9:50 PM — with the right advice, so the patient doesn't fast unnecessarily.",
      hi: "रात 9:50 बजे बुकिंग, स्लॉट और तैयारी की सही जानकारी — ताकि मरीज़ बेवजह भूखा न रहे।",
    },
  },
  coaching: {
    scene: { en: "WhatsApp · 8:20 PM", hi: "WhatsApp · रात 8:20" },
    turns: [
      T("caller", "I want to meet someone about the 12th board batch.", "12वीं बोर्ड बैच के बारे में किसी से मिलना है।"),
      T("agent", "Sure. Counselling slots are open tomorrow at 11 AM or 5 PM. Which suits you?", "ज़रूर। कल काउंसलिंग के लिए 11 बजे या शाम 5 बजे का समय है। कौन सा ठीक रहेगा?"),
      T("caller", "5 PM. Should I bring anything?", "शाम 5 बजे। कुछ लाना है क्या?"),
      T("agent", "Just the last report card. I've booked it and sent you the location pin.", "बस पिछली मार्कशीट। बुक कर दिया है और लोकेशन भेज दी है।"),
    ],
    result: {
      en: "Counselling booked with the file already prepared for the counsellor — an enquiry that arrived after office hours became a scheduled meeting.",
      hi: "काउंसलिंग बुक, और काउंसलर के लिए फ़ाइल पहले से तैयार — ऑफ़िस बंद होने के बाद आई पूछताछ एक तय मुलाक़ात बन गई।",
    },
  },
  ca: {
    scene: { en: "WhatsApp · 7:40 PM", hi: "WhatsApp · शाम 7:40" },
    turns: [
      T("caller", "I want to discuss company registration. When is sir free?", "कंपनी रजिस्ट्रेशन पर बात करनी है। सर कब फ़्री हैं?"),
      T("agent", "He has 12:30 PM Thursday or 4 PM Friday. Is this a Private Limited or LLP?", "गुरुवार 12:30 या शुक्रवार शाम 4 बजे। यह Private Limited है या LLP?"),
      T("caller", "Private Limited, two directors.", "Private Limited, दो डायरेक्टर।"),
      T("agent", "Thursday 12:30 booked. I've sent the document checklist so the meeting starts with everything ready.", "गुरुवार 12:30 बुक। दस्तावेज़ों की सूची भेज दी है, ताकि मीटिंग सीधे काम से शुरू हो।"),
    ],
    result: {
      en: "Meeting booked, matter type captured, checklist sent in advance — the partner walks into a prepared conversation instead of a discovery call.",
      hi: "मीटिंग तय, काम का प्रकार दर्ज, सूची पहले ही भेजी — पार्टनर सीधे तैयार बातचीत में बैठते हैं, शुरुआत से पूछताछ नहीं करनी पड़ती।",
    },
  },
  travel: {
    scene: { en: "WhatsApp · 11:30 PM", hi: "WhatsApp · रात 11:30" },
    turns: [
      T("caller", "Need a car for Ujjain tomorrow, family of 5.", "कल उज्जैन के लिए गाड़ी चाहिए, 5 लोग।"),
      T("agent", "An Ertiga suits 5 with luggage. Round trip same day is ₹3,400 including tolls. Shall I hold it?", "5 लोगों और सामान के लिए Ertiga ठीक रहेगी। उसी दिन आना-जाना ₹3,400, टोल सहित। रोक दूँ?"),
      T("caller", "Yes, pickup at 6 AM.", "हाँ, सुबह 6 बजे पिकअप।"),
      T("agent", "Confirmed. Driver details reach you tonight, and I'll send a reminder at 5:30 AM.", "पक्का। ड्राइवर की जानकारी आज रात मिल जाएगी, और सुबह 5:30 पर याद दिला दूँगा।"),
    ],
    result: {
      en: "Vehicle matched to party size, priced with tolls, confirmed and reminded — at 11:30 PM, when a competitor's phone was switched off.",
      hi: "लोगों के हिसाब से गाड़ी, टोल सहित क़ीमत, बुकिंग और रिमाइंडर — रात 11:30 बजे, जब प्रतिस्पर्धी का फ़ोन बंद था।",
    },
  },
};

// ── SUPPORT — answering the question that's actually being asked ─────────────
const support: Record<IndustryId, Dialogue> = {
  clinic: {
    scene: { en: "WhatsApp · 11:05 PM", hi: "WhatsApp · रात 11:05" },
    turns: [
      T("caller", "Doctor gave my mother a tablet twice a day. She missed the evening one. What to do?", "डॉक्टर ने माँ को दिन में दो बार दवा दी है। शाम वाली छूट गई। क्या करें?"),
      T("agent", "I can't advise on medication — I'll flag this for Dr. Mehta to confirm first thing tomorrow.", "दवा के बारे में सलाह मैं नहीं दे सकता — डॉ. मेहता के लिए यह नोट कर देता हूँ, वे कल सुबह पहले ही बता देंगे।"),
      T("caller", "Okay. Is it urgent?", "ठीक है। क्या यह गंभीर है?"),
      T("agent", "If she has any difficulty breathing or chest pain tonight, please go to Emergency. Otherwise it can wait for morning.", "अगर आज रात साँस लेने में तकलीफ़ या सीने में दर्द हो तो तुरंत इमरजेंसी जाइए। वरना सुबह तक रुक सकते हैं।"),
    ],
    result: {
      en: "Answered instantly, refused to give medical advice it shouldn't give, escalated to the doctor, and gave a safe red-flag instruction. Knowing what NOT to answer is the point.",
      hi: "तुरंत जवाब, और जो सलाह नहीं देनी चाहिए वो नहीं दी — डॉक्टर तक बात पहुँचाई और सुरक्षा की चेतावनी दी। क्या नहीं बताना है, यह जानना ही असली बात है।",
    },
  },
  diagnostic: {
    scene: { en: "WhatsApp · 6:15 PM", hi: "WhatsApp · शाम 6:15" },
    turns: [
      T("caller", "Where is my report? I gave the sample this morning.", "मेरी रिपोर्ट कहाँ है? सुबह ही सैंपल दिया था।"),
      T("agent", "Your CBC and lipid profile are ready — sending the PDF now. The vitamin D takes until tomorrow noon.", "आपकी CBC और लिपिड प्रोफ़ाइल तैयार हैं — PDF अभी भेज रहा हूँ। विटामिन D कल दोपहर तक आएगी।"),
      T("caller", "Why does that one take longer?", "उसमें ज़्यादा समय क्यों?"),
      T("agent", "It runs in a batch once a day. I'll send it the moment it's out — you won't have to ask again.", "वो दिन में एक बार बैच में होता है। जैसे ही आएगा भेज दूँगा — दोबारा पूछना नहीं पड़ेगा।"),
    ],
    result: {
      en: "Report delivered, the delay explained honestly, and a follow-up promised — instead of \"call back tomorrow\".",
      hi: "रिपोर्ट भेजी, देरी की वजह साफ़ बताई, और आगे ख़ुद भेजने का वादा — \"कल फ़ोन कीजिए\" की जगह।",
    },
  },
  coaching: {
    scene: { en: "WhatsApp · 10:40 PM", hi: "WhatsApp · रात 10:40" },
    turns: [
      T("caller", "I missed today's physics class. Can I get the recording?", "आज की फ़िज़िक्स क्लास छूट गई। रिकॉर्डिंग मिल सकती है?"),
      T("agent", "Sent — today's chapter was Rotational Motion. The practice sheet is attached too.", "भेज दी — आज का चैप्टर Rotational Motion था। प्रैक्टिस शीट भी साथ है।"),
      T("caller", "Thanks. Is there a test this week?", "धन्यवाद। इस हफ़्ते टेस्ट है क्या?"),
      T("agent", "Yes, Sunday 10 AM, chapters 3 to 5. I've added a reminder for Saturday evening.", "जी हाँ, रविवार सुबह 10 बजे, चैप्टर 3 से 5। शनिवार शाम का रिमाइंडर लगा दिया है।"),
    ],
    result: {
      en: "Recording and material delivered at 10:40 PM, and the student was reminded about a test they hadn't asked about.",
      hi: "रात 10:40 बजे रिकॉर्डिंग और मटेरियल मिला, और जिस टेस्ट के बारे में पूछा ही नहीं था, उसकी याद भी दिला दी।",
    },
  },
  ca: {
    scene: { en: "WhatsApp · 9:15 PM", hi: "WhatsApp · रात 9:15" },
    turns: [
      T("caller", "What documents do you need for my ITR this year?", "इस साल ITR के लिए कौन-कौन से दस्तावेज़ चाहिए?"),
      T("agent", "For you: Form 16, bank interest certificate, and your two rent receipts. Everything else we already hold.", "आपके लिए: फ़ॉर्म 16, बैंक ब्याज सर्टिफ़िकेट, और आपकी दो किराया रसीदें। बाक़ी सब हमारे पास है।"),
      T("caller", "I sold some shares this year.", "इस साल कुछ शेयर बेचे थे।"),
      T("agent", "Then I also need the capital gains statement from your broker. Added it to your checklist and to your file.", "तो ब्रोकर से कैपिटल गेन स्टेटमेंट भी चाहिए। आपकी सूची और फ़ाइल दोनों में जोड़ दिया।"),
    ],
    result: {
      en: "The client got a personalised list, not a generic one — and a detail they volunteered was captured into the file before anyone forgot it.",
      hi: "क्लाइंट को आम सूची नहीं, उनके हिसाब से बनी सूची मिली — और उन्होंने जो बात ख़ुद बताई, वो भूलने से पहले फ़ाइल में दर्ज हो गई।",
    },
  },
  travel: {
    scene: { en: "WhatsApp · 2:10 AM", hi: "WhatsApp · रात 2:10" },
    turns: [
      T("caller", "My driver hasn't arrived. Pickup was 2 AM.", "ड्राइवर नहीं आया। 2 बजे पिकअप था।"),
      T("agent", "Checking — he's 6 minutes away, held up at the railway crossing. Sharing his live location now.", "देख रहा हूँ — वे 6 मिनट दूर हैं, रेलवे क्रॉसिंग पर रुके थे। लाइव लोकेशन भेज रहा हूँ।"),
      T("caller", "Okay, my train is at 3.", "ठीक है, मेरी ट्रेन 3 बजे है।"),
      T("agent", "You'll reach by 2:40. I've told him it's a 3 o'clock train and flagged it to the night manager.", "आप 2:40 तक पहुँच जाएँगे। मैंने उन्हें बता दिया कि 3 बजे की ट्रेन है, और नाइट मैनेजर को भी सूचित कर दिया।"),
    ],
    result: {
      en: "A 2 AM panic answered in seconds with a real location and a real ETA — the hour when a missed message costs a customer for good.",
      hi: "रात 2 बजे की घबराहट का जवाब सेकंडों में, असली लोकेशन और असली समय के साथ — यही वो वक़्त है जब एक छूटा मैसेज ग्राहक हमेशा के लिए ले जाता है।",
    },
  },
};

// ── SALES — the follow-up nobody in the office got around to ─────────────────
const sales: Record<IndustryId, Dialogue> = {
  clinic: {
    scene: { en: "WhatsApp · day 3 after an enquiry that went cold", hi: "WhatsApp · ठंडी पड़ी पूछताछ के तीसरे दिन" },
    turns: [
      T("agent", "Hello Sir, you enquired about our diabetes care package last week. Still thinking it over?", "नमस्ते सर, पिछले हफ़्ते आपने डायबिटीज़ केयर पैकेज के बारे में पूछा था। अभी सोच रहे हैं?"),
      T("caller", "Yes, but it felt expensive.", "हाँ, पर महँगा लगा।"),
      T("agent", "I understand. It covers four consultations, two HbA1c tests and diet counselling — separately that's about ₹1,000 more.", "समझ सकता हूँ। इसमें चार कंसल्टेशन, दो HbA1c टेस्ट और डाइट काउंसलिंग शामिल है — अलग-अलग कराने पर लगभग ₹1,000 ज़्यादा पड़ता है।"),
      T("caller", "Oh, I didn't realise that.", "अच्छा, यह तो पता ही नहीं था।"),
      T("agent", "Shall I book the first consultation? You can decide on the full package after meeting the doctor.", "पहला कंसल्टेशन बुक कर दूँ? डॉक्टर से मिलने के बाद पूरे पैकेज का फ़ैसला कर लीजिएगा।"),
    ],
    result: {
      en: "A cold enquiry re-opened on day 3, the price objection answered with facts, and a low-commitment next step offered. Nobody at the desk had time to make that call.",
      hi: "तीसरे दिन ठंडी पूछताछ फिर से ज़िंदा, क़ीमत की आपत्ति का तथ्यों से जवाब, और आगे बढ़ने का आसान क़दम। डेस्क पर किसी के पास यह कॉल करने का समय नहीं था।",
    },
  },
  diagnostic: {
    scene: { en: "WhatsApp · day 5 after a quote", hi: "WhatsApp · क़ीमत बताने के पाँचवें दिन" },
    turns: [
      T("agent", "Hello Ma'am, you asked about the full body checkup last week. Shall I hold a slot for you?", "नमस्ते मैडम, पिछले हफ़्ते आपने फुल बॉडी चेकअप के बारे में पूछा था। स्लॉट रोक दूँ?"),
      T("caller", "I keep forgetting. Also I can't take leave from work.", "भूल ही जाती हूँ। और ऑफ़िस से छुट्टी भी नहीं मिलती।"),
      T("agent", "Then home collection is easier — 7 AM at your home, done before you leave for work.", "तो होम कलेक्शन आसान रहेगा — सुबह 7 बजे घर पर, ऑफ़िस निकलने से पहले हो जाएगा।"),
      T("caller", "That works. Saturday?", "यह ठीक है। शनिवार?"),
      T("agent", "Saturday 7 AM booked. I'll remind you Friday evening so it doesn't slip again.", "शनिवार सुबह 7 बजे बुक। शुक्रवार शाम याद दिला दूँगा ताकि फिर न छूटे।"),
    ],
    result: {
      en: "The real objection wasn't price, it was time — and it was solved rather than argued with. Booked on the fifth follow-up.",
      hi: "असली दिक़्क़त क़ीमत नहीं, समय थी — और उससे बहस करने के बजाय उसका हल दिया गया। पाँचवें फ़ॉलो-अप पर बुकिंग।",
    },
  },
  coaching: {
    scene: { en: "WhatsApp · 2 days after a demo class", hi: "WhatsApp · डेमो क्लास के दो दिन बाद" },
    turns: [
      T("agent", "Hello Sir, how did Aarav find Saturday's demo class?", "नमस्ते सर, आरव को शनिवार की डेमो क्लास कैसी लगी?"),
      T("caller", "He liked it. But we're comparing two institutes.", "उसे अच्छी लगी। पर हम दो संस्थान देख रहे हैं।"),
      T("agent", "That's sensible. Ours has a 1:15 doubt-clearing ratio and weekly parent reports — worth comparing on those two points.", "बिल्कुल सही। हमारे यहाँ डाउट क्लियरिंग का अनुपात 1:15 है और हर हफ़्ते पेरेंट रिपोर्ट मिलती है — इन दो बातों पर तुलना कीजिए।"),
      T("caller", "Fair. Fees are due when?", "ठीक। फ़ीस कब तक देनी है?"),
      T("agent", "The batch fills by the 15th. Shall I hold a seat for a week, no payment needed?", "बैच 15 तारीख़ तक भर जाता है। एक हफ़्ते के लिए सीट रोक दूँ, बिना भुगतान के?"),
    ],
    result: {
      en: "Followed up after the demo, gave the parent a real basis for comparison instead of pressure, and created a reason to decide.",
      hi: "डेमो के बाद फ़ॉलो-अप, दबाव के बजाय तुलना का असली आधार, और फ़ैसला लेने की एक वजह।",
    },
  },
  ca: {
    scene: { en: "WhatsApp · day 4 after an enquiry", hi: "WhatsApp · पूछताछ के चौथे दिन" },
    turns: [
      T("agent", "Hello Sir, you'd asked about GST registration for your new business. Have you started trading yet?", "नमस्ते सर, आपने नए बिज़नेस के GST रजिस्ट्रेशन के बारे में पूछा था। काम शुरू हो गया?"),
      T("caller", "Not yet. Is registration compulsory for me?", "अभी नहीं। क्या मेरे लिए रजिस्ट्रेशन ज़रूरी है?"),
      T("agent", "Below ₹40 lakh turnover for goods, it's optional — but you can't claim input credit without it.", "सामान के लिए ₹40 लाख टर्नओवर से नीचे यह वैकल्पिक है — पर बिना इसके इनपुट क्रेडिट नहीं ले पाएँगे।"),
      T("caller", "I do buy a lot of raw material.", "कच्चा माल तो काफ़ी ख़रीदता हूँ।"),
      T("agent", "Then it'll likely pay for itself. Shall I book fifteen minutes with the partner to check your numbers?", "तो इसका फ़ायदा ही होगा। पार्टनर के साथ पंद्रह मिनट का समय तय कर दूँ, आपके आँकड़े देख लेंगे?"),
    ],
    result: {
      en: "Followed up with a genuinely useful answer — including when registration ISN'T required — and earned the meeting instead of pushing for it.",
      hi: "फ़ॉलो-अप में सचमुच काम की जानकारी — यह भी कि कब रजिस्ट्रेशन ज़रूरी नहीं — और मीटिंग माँगी नहीं, कमाई गई।",
    },
  },
  travel: {
    scene: { en: "WhatsApp · day 2 after a quote", hi: "WhatsApp · क़ीमत भेजने के दूसरे दिन" },
    turns: [
      T("agent", "Hello Ma'am, I'd sent the Manali package quote on Monday. Any questions?", "नमस्ते मैडम, सोमवार को मनाली पैकेज की क़ीमत भेजी थी। कोई सवाल?"),
      T("caller", "Another agency quoted ₹4,000 less.", "दूसरी एजेंसी ₹4,000 कम बता रही है।"),
      T("agent", "Does theirs include the Rohtang permit and the two dinners? Ours does — that's usually the gap.", "क्या उसमें रोहतांग परमिट और दो डिनर शामिल हैं? हमारे में हैं — फ़र्क़ आम तौर पर यहीं होता है।"),
      T("caller", "Let me check... no, it doesn't.", "देखती हूँ… नहीं, नहीं है।"),
      T("agent", "Then we're about ₹1,200 cheaper overall. Shall I hold the dates before the weekend rush?", "तो कुल मिलाकर हम ₹1,200 सस्ते पड़ेंगे। वीकेंड की भीड़ से पहले तारीख़ें रोक दूँ?"),
    ],
    result: {
      en: "A price objection turned around with a like-for-like comparison rather than a discount — margin protected, booking held.",
      hi: "क़ीमत की आपत्ति छूट देकर नहीं, बराबरी की तुलना करके पलटी — मुनाफ़ा भी बचा, बुकिंग भी।",
    },
  },
};

// ── WORKFORCE — several conversations at once, each by a different worker ────
function workforceFor(industry: IndustryId): Dialogue {
  const pick = (r: Record<IndustryId, Dialogue>) => r[industry];
  const v = pick(voice);
  const s = pick(support);
  const sl = pick(sales);
  const label = {
    voice: { en: "Voice Employee", hi: "वॉइस कर्मचारी" },
    support: { en: "Support Employee", hi: "सपोर्ट कर्मचारी" },
    sales: { en: "Sales Employee", hi: "सेल्स कर्मचारी" },
  };
  return {
    scene: {
      en: "Three conversations, same minute — handled in parallel by three digital workers",
      hi: "एक ही मिनट में तीन बातचीत — तीन डिजिटल कर्मचारियों ने साथ-साथ संभालीं",
    },
    turns: [
      { ...v.turns[1], by: label.voice },
      { ...v.turns[2], by: label.voice },
      { ...s.turns[0], by: label.support },
      { ...s.turns[1], by: label.support },
      { ...sl.turns[1], by: label.sales },
      { ...sl.turns[2], by: label.sales },
    ],
    result: {
      en: "Three customers served at the same moment — a call answered, a question resolved and a cold enquiry re-opened. One person could have done any one of them.",
      hi: "एक ही पल में तीन ग्राहक — एक कॉल उठी, एक सवाल हल हुआ, और एक ठंडी पूछताछ फिर शुरू हुई। एक इंसान इनमें से सिर्फ़ एक ही कर पाता।",
    },
  };
}

const BY_ROLE: Record<RoleId, (i: IndustryId) => Dialogue> = {
  voice: (i) => voice[i],
  reception: (i) => reception[i],
  support: (i) => support[i],
  sales: (i) => sales[i],
  workforce: workforceFor,
};

/** The conversation to play for a role × industry. Always defined. */
export function getDialogue(role: RoleId, industry: IndustryId): Dialogue {
  return BY_ROLE[role](industry);
}
