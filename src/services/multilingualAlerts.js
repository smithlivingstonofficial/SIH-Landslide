/**
 * 🏔️ LandslideGuard AI — Multilingual Alert & CAP Notification Service
 * Generates official disaster warning messages across 8 North Eastern Region languages:
 * English (en), Assamese (as), Hindi (hi), Bengali (bn), Khasi (kha),
 * Manipuri/Meitei (mni), Mizo (lus), Nagamese (nag).
 * Also outputs Common Alerting Protocol (CAP 1.2 XML/JSON) for NDMA/SACHET interoperability.
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", localName: "English", state: "All NER States" },
  { code: "as", name: "Assamese", localName: "অসমীয়া", state: "Assam" },
  { code: "hi", name: "Hindi", localName: "हिन्दी", state: "Tripura, Mizoram, Central" },
  { code: "bn", name: "Bengali", localName: "বাংলা", state: "Tripura, Cachar, Barak Valley" },
  { code: "kha", name: "Khasi", localName: "Ka Ktien Khasi", state: "Meghalaya" },
  { code: "mni", name: "Manipuri", localName: "মৈতৈলোন্", state: "Manipur" },
  { code: "lus", name: "Mizo", localName: "Mizo ṭawng", state: "Mizoram" },
  { code: "nag", name: "Nagamese", localName: "Nagamese", state: "Nagaland" },
];

/**
 * Generates translated alert texts based on severity, district, hazard type, and action directive.
 */
export function generateMultilingualAlerts({
  districtName,
  stateName,
  severity,
  hazardType = "LANDSLIDE",
  customDirective = "",
}) {
  const isCritical = severity === "CRITICAL";
  const isHigh = severity === "HIGH";

  const templates = {
    en: {
      title: `${severity} ${hazardType.replace("_", " ")} WARNING: ${districtName}, ${stateName}`,
      message: isCritical
        ? `EMERGENCY ALERT (LEVEL 4): Extreme risk of imminent slope failure in ${districtName}. Soil saturation is critical. Immediate evacuation advised for vulnerable hill hamlets. Avoid highway travel.`
        : isHigh
        ? `HIGH ALERT (LEVEL 3): Severe landslide threat in ${districtName} due to relentless precipitation. Disaster management teams deployed. Keep emergency supplies ready.`
        : `ADVISORY (LEVEL 2): Moderate landslide warning for ${districtName}. Monitor drainage lines and avoid unnecessary transit near steep cuts.`,
      directive: customDirective || (isCritical ? "Evacuate to designated relief shelters immediately." : "Stay vigilant and monitor district bulletins."),
    },
    as: {
      title: `${isCritical ? "জৰুৰী" : "সতৰ্কবাৰ্তা"}: ${districtName}, ${stateName}ত ভূমিস্খলনৰ আশংকা`,
      message: isCritical
        ? `জৰুৰী সতৰ্কবাৰ্তা: ${districtName} জিলাত প্ৰচণ্ড বৰষুণৰ ফলত পাহাৰ খহি পৰাৰ ভয়ংকৰ সম্ভাৱনা আছে। নদী আৰু পাহাৰীয়া কাষৰীয়া অঞ্চলৰ বাসিন্দাসকলক শীঘ্ৰে নিৰাপদ আশ্ৰয়লৈ যাবলৈ অনুৰোধ জনোৱা হৈছে।`
        : `উচ্চ সতৰ্কবাৰ্তা: ${districtName}ত ধাৰাসাৰ বৰষুণৰ বাবে ভূমিস্খলনৰ সম্ভাৱনা বৃদ্ধি পাইছে। ৰাষ্ট্ৰীয় ঘাইপথত যাতায়াত নকৰিব।`,
      directive: "স্থানীয় প্ৰশাসন আৰু দুৰ্যোগ ব্যৱস্থাপনা দলৰ নিৰ্দেশনা পালন কৰক।",
    },
    hi: {
      title: `${isCritical ? "आपातकालीन चेतावनी" : "उच्च चेतावनी"}: ${districtName}, ${stateName} में भूस्खलन खतरा`,
      message: isCritical
        ? `रेड अलर्ट: ${districtName} जिले में मूसलाधार बारिश और मिट्टी के अत्यधिक कटाव के कारण गंभीर भूस्खलन की चेतावनी। ढलानों के समीप रहने वाले लोग तुरंत सुरक्षित राहत शिविरों में जाएं।`
        : `येलो/ऑरेंज अलर्ट: ${districtName} में पहाड़ी ढलानों पर मलबा खिसकने की आशंका है। राजमार्गों पर अनावश्यक यात्रा से बचें।`,
      directive: "एनडीआरएफ/एसडीआरएफ और जिला प्रशासन के निर्देशों का तत्काल पालन करें।",
    },
    bn: {
      title: `জরুরি ভূমিধস সতর্কতা: ${districtName}, ${stateName}`,
      message: isCritical
        ? `জরুরি সতর্কবার্তা: ${districtName} জেলায় অতিরিক্ত বৃষ্টির কারণে মারাত্মক ভূমিধসের প্রবল আশঙ্কা। বিপজ্জনক পাহাড়ি এলাকার বাসিন্দারা অবিলম্বে নিকটবর্তী সাইক্লোন/ত্রাণ শিবিরে চলে যান।`
        : `সতর্কবার্তা: ${districtName} অঞ্চলে পাহাড়ি রাস্তা ও ঢাল অত্যন্ত ঝুঁকিপূর্ণ। নিরাপদ স্থানে অবস্থান করুন।`,
      directive: "স্থানীয় বিপর্যয় মোকাবিলা বাহিনীর সাহায্য নিন।",
    },
    kha: {
      title: `Ka Jingma Ba Jur: Ka Jingtwa Khyndew ha ${districtName}, ${stateName}`,
      message: isCritical
        ? `KA JINGMA BA JUR: Don ka jingma bakhraw ban twa ka khyndew ha ${districtName} namar ka jingther slap kaba jur. Ki nongshong shnong ha ki thain lum kiba ma ki dei ban phet noh sha ki jaka ba shngain.`
        : `Jingma: Ki lum ha ${districtName} ki lah ban twa. Ki nongleit nongwan ki dei ban sumar ha ki surok bah.`,
      directive: "Phet sha ki jaka sah ba shngain ba la pynkhreh da ka District Administration.",
    },
    mni: {
      title: `অককপবা পাউ: ${districtName}, ${stateName}দা চীং য়ৈথবা য়াবা ফিভম`,
      message: isCritical
        ? `অককপবা পাউ: ${districtName} জিলাদা নোং কন্ন চুবা অমসুং চীং য়ৈথবা য়াবা ফিভম লৈরে। চীং মপাংদা লৈবা মীয়াম্না য়াংনা কন্নবা মফমদা চৎপিয়ু।`
        : `চেক্সিন পাউ: ${districtName}দা চীংখোং য়ৈথবা য়াবা অমা লৈবনা লম্বী চৎপদা চেক্সিনবীয়ু।`,
      directive: "প্রশাসন অমসুং দুৰ্যোগ দলগী পাউ তাকপদা ইন্দুনা লৈবীয়ু।",
    },
    lus: {
      title: `HRIATTIRNA HLAUHAWM: ${districtName}, ${stateName} Leimin Thilpek`,
      message: isCritical
        ? `HRIATTIRNA HLAUHAWM: ${districtName} bialah ruah sur nasa lutuk avangin leimin lian tham a thleng thut thei. Hmun hlauhawma chengte chu himna hmun/relief camp pan nghal tur a ni.`
        : `Fimkhur Rawh: ${districtName} kawngpui leh tlang pangte a nghet lo hle. Chhuah vah tam loh tur.`,
      directive: "DC Office leh Disaster Management lamin thu an chhuah te ngaihven reng ang che.",
    },
    nag: {
      title: `ALERT: ${districtName}, ${stateName} te mati khosa bole ase`,
      message: isCritical
        ? `BOHUT DANGEROUS ALERT: ${districtName} jaga te bishi barish karne mati khosa bo pare. Hill side manu khan joldi safe jaga te jabi. Gari chala bole mon thakile rukhi thakibi.`
        : `WARNING: ${districtName} te pahar rasta khan danger ase, mati khosa bo pare. Hoshiar thakibi.`,
      directive: "Police aro Administration laga kotha mani kene safe thakibi.",
    },
  };

  return templates;
}

/**
 * Generates ITU / OASIS Common Alerting Protocol (CAP v1.2) XML
 * For inter-agency interoperability with NDMA SACHET, IMD, and C-DOT.
 */
export function generateCAPXml({
  alertId,
  districtName,
  stateName,
  severity,
  hazardType,
  headline,
  description,
  instruction,
  lat,
  lng,
}) {
  const timestamp = new Date().toISOString();
  const capSeverity =
    severity === "CRITICAL" ? "Extreme" : severity === "HIGH" ? "Severe" : "Moderate";
  const urgency = severity === "CRITICAL" ? "Immediate" : "Expected";
  const certainty = severity === "CRITICAL" ? "Observed" : "Likely";

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>IN-MDoNER-LNDGRD-${alertId || Date.now()}</identifier>
  <sender>landslideguard@mdoner.gov.in</sender>
  <sent>${timestamp}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Geo</category>
    <event>Landslide Hazard / Slope Instability</event>
    <urgency>${urgency}</urgency>
    <severity>${capSeverity}</severity>
    <certainty>${certainty}</certainty>
    <eventCode>
      <valueName>SAME</valueName>
      <value>LSW</value>
    </eventCode>
    <headline>${headline || `${severity} Landslide Warning in ${districtName}, ${stateName}`}</headline>
    <description>${description}</description>
    <instruction>${instruction}</instruction>
    <area>
      <areaDesc>${districtName}, ${stateName}, North Eastern Region, India</areaDesc>
      <circle>${lat},${lng},15.0</circle>
    </area>
  </info>
</alert>`;
}
