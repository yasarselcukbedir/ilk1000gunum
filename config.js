// Buradaki bağlantılar Google Sheets "Web'de yayınla" (CSV) bağlantılarıdır.
// Sheet'te içerik değişince uygulama kendiliğinden güncellenir.
window.APP_CONFIG = {
  etkinliklerCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9u9e_pJOn7UHPL14ZnxBqE6WID4DzCkrWuj5oppG2W9TZs8k4-k297L6qzvAbOg/pub?gid=609479579&single=true&output=csv",
  kitaplarCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9u9e_pJOn7UHPL14ZnxBqE6WID4DzCkrWuj5oppG2W9TZs8k4-k297L6qzvAbOg/pub?gid=452490527&single=true&output=csv",
  haftalikEtkinlikSayisi: 4,
  haftalikKitapSayisi: 3,
  // Sadece bu durumdaki satırlar gösterilir. Test aşamasında "taslak" da dahil.
  gosterilecekDurumlar: ["taslak", "uzman_onayli", "yayinda"]
};
