/**
 * Dictionary of common speech-to-text misinterpretations for Indonesian financial brands
 * structure: { incorrect_phonetic: "Correct Name" }
 */
const CORRECTIONS: Record<string, string> = {
  "si beng": "SeaBank",
  "si bang": "SeaBank",
  "sibeng": "SeaBank",
  "sibang": "SeaBank",
  "sea beng": "SeaBank",
  "sibank": "SeaBank",
  "si bank": "SeaBank",
  "seabeng": "SeaBank",
  "sea bang": "SeaBank",
  "sih bang": "SeaBank",
  "sih beng": "SeaBank",
  "b c a": "BCA",
  "bisi a": "BCA",
  "be ce a": "BCA",
  "b n i": "BNI",
  "be en i": "BNI",
  "beni": "BNI",
  "b r i": "BRI",
  "be er i": "BRI",
  "beri": "BRI",
  "bank mandiri": "Mandiri",
  "b t n": "BTN",
  "be te en": "BTN",
  "beten": "BTN",
  "b s i": "BSI",
  "be es i": "BSI",
  "besi": "BSI",
  "bank syariah indonesia": "BSI",
  "b j b": "BJB",
  "bank jabar": "BJB",
  "b t p n": "BTPN",
  "o c b c": "OCBC",
  "ocbe": "OCBC",
  "h s b c": "HSBC",
  "hese bc": "HSBC",
  "d b s": "DBS",
  "debe es": "DBS",
  "u o b": "UOB",
  "sim niaga": "CIMB Niaga",
  "cimbe niaga": "CIMB Niaga",
  "standar chartered": "Standard Chartered",
  "muamalat": "Bank Muamalat",
  "bsm": "Bank Syariah Mandiri",
  "mandiri syariah": "Bank Syariah Mandiri",
  "bank jawa tengah": "Bank Jateng",
  "bank jawa timur": "Bank Jatim",
  "permata bank": "Permata",
  "bank permata": "Permata",
  "mei bank": "Maybank",
  "citi bank": "Citibank",
  "commonwelth": "Commonwealth",
  "bank mega": "Mega",
  "sinar mas": "Sinarmas",
  "panik": "Panin",
  "jeniuz": "Jenius",
  "digi bank": "digibank",
  "bank jago": "Jago",
  "bluu": "Blu",
  "alo bank": "Allo Bank",
  "super bank": "Superbank",
  "saqu": "Bank Saqu",
  "go pe": "GoPay",
  "gope": "GoPay",
  "go pay": "GoPay",
  "gopei": "GoPay",
  "goupe": "GoPay",
  "o v o": "OVO",
  "shopi pe": "ShopeePay",
  "shopipe": "ShopeePay",
  "shope pay": "ShopeePay",
  "shopey pay": "ShopeePay",
  "shopi pay": "ShopeePay",
  "link aja": "LinkAja",
  "link ajar": "LinkAja",
  "linkaja": "LinkAja",
  "kredibo": "Kredivo",
  "akula ku": "Akulaku",
  "shopee paylater": "SPayLater",
  "spaylater": "SPayLater",
  "paylater traveloka": "PayLater Traveloka",
  "traveloka paylater": "PayLater Traveloka",
  "i saku": "iSaku",
  "saku ku": "Sakuku",
  "bri mo": "BRImo",
  "brimo": "BRImo",
  "my bca": "myBCA",
  "mybca": "myBCA",
  "livin mandiri": "Livin Mandiri",
  "livin": "Livin Mandiri",
  "okto": "OCTO Mobile",
  "octo mobile": "OCTO Mobile"
};

/**
 * Escapes characters for use in a regular expression
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Corrects speech-to-text transcript based on a phonetic dictionary
 */
export function correctSpeechText(text: string): string {
  if (!text) return text;
  
  let correctedText = text.toLowerCase();
  
  // Sort keys from longest to shortest to avoid partial replacement issues 
  // (e.g., "si beng" replaced before "beng")
  const sortedKeys = Object.keys(CORRECTIONS).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    const escaped = escapeRegExp(key);
    // Use lookbehind and lookahead to ensure we only match full "words" or phrases
    // not part of other words.
    const regex = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'gi');
    correctedText = correctedText.replace(regex, CORRECTIONS[key]);
  }
  
  return correctedText;
}
