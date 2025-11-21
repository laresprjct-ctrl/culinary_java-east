// CONFIG: gunakan API MockAPI yang kamu berikan
const API_URL = "https://691fa33531e684d7bfca4fb0.mockapi.io/ReviewKuliner";

// daftar kota/kabupaten Jawa Timur (dropdown)
const JATIM_CITIES = [
  "Surabaya","Malang","Batu","Blitar","Kediri","Madiun","Mojokerto","Pasuruan","Probolinggo",
  "Sidoarjo","Gresik","Lamongan","Tuban","Bojonegoro","Jombang","Nganjuk","Ngawi","Magetan",
  "Ponorogo","Trenggalek","Tulungagung","Lumajang","Jember","Bondowoso","Situbondo","Banyuwangi",
  "Sampang","Pamekasan","Sumenep"
];

// --- DOM helpers
const $ = id => document.getElementById(id);
const reviewsContainer = $("reviews-container");
const emptyBox = $("empty");
const cityFilter = $("city-filter");
const citySelect = $("city");

// populate city dropdowns
function populateCities(){
  JATIM_CITIES.forEach(c=>{
    const o = document.createElement("option"); o.value = c; o.textContent = c;
    cityFilter.appendChild(o);
    const p = document.createElement("option"); p.value = c; p.textContent = c;
    citySelect.appendChild(p);
  });
}
populateCities();

let chosenRating = 0;
const starsEl = document.querySelectorAll("#stars span");

// rating click listener
function initStars(){
  const stars = document.querySelectorAll("#stars span");
  stars.forEach(s=>{
    s.addEventListener("click", ()=>{
      chosenRating = Number(s.dataset.value);
      stars.forEach(x=>x.classList.remove("active"));
      for(let i=0;i<chosenRating;i++) stars[i].classList.add("active");
    });
  });
}
initStars();

// fetch reviews from API
async function loadFromApi(){
  try {
    const res = await fetch(API_URL);
    if(!res.ok) throw new Error("Gagal fetch");
    const data = await res.json();
    // normalize rating to number
    window._allReviews = Array.isArray(data) ? data.map(d=>({ ...d, rating: Number(d.rating || 0) })) : [];
    renderReviews();
  } catch(err) {
    console.error(err);
    reviewsContainer.innerHTML = `<div class="empty">Gagal memuat ulasan. Cek koneksi atau endpoint.</div>`;
  }
}

// render reviews with search/filter/sort
function renderReviews(){
  const q = $("search-input").value.trim().toLowerCase();
  const cityF = cityFilter.value;
  const minRating = Number($("rating-filter").value || 0);
  const sortBy = $("sort-by").value;

  let list = (window._allReviews || []).slice();

  if(q) {
    list = list.filter(r =>
      (r.tempat||"").toLowerCase().includes(q) ||
      (r.makanan||"").toLowerCase().includes(q) ||
      (r.nama||"").toLowerCase().includes(q)
    );
  }
  if(cityF) list = list.filter(r => (r.kota||"").toLowerCase() === cityF.toLowerCase());
  if(minRating > 0) list = list.filter(r => Number(r.rating||0) >= minRating);

  if(sortBy === "newest") {
    list.sort((a,b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id||0);
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id||0);
      return tb - ta;
    });
  } else if(sortBy === "rating-desc"){
    list.sort((a,b)=> Number(b.rating||0) - Number(a.rating||0));
  }

  reviewsContainer.innerHTML = "";
  if(!list.length){
    emptyBox.style.display = "block";
    $("count").textContent = "(0)";
    return;
  }
  emptyBox.style.display = "none";
  $("count").textContent = `(${list.length})`;

  list.forEach(item=>{
    const d = document.createElement("div");
    d.className = "review-card";
    d.innerHTML = `<h3>${escapeHtml(item.tempat || item.makanan || "—")} — ${"⭐".repeat(Math.max(0, Math.min(5, Number(item.rating||0))))}</h3>
                   <div class="review-meta">Kota: ${escapeHtml(item.kota || "—")}</div>
                   <div style="margin-top:8px">${escapeHtml(item.ulasan || item.review || "")}</div>
                   <div style="margin-top:8px;font-size:13px;color:#666">— ${escapeHtml(item.nama|| "Anon")} • ${item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</div>`;
    reviewsContainer.appendChild(d);
  });
}

function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[ch]));
}

// send review to API
async function sendReview(){
  const name = $("name").value.trim();
  const makanan = $("food").value.trim();
  const tempat = $("place").value.trim();
  const kota = $("city").value.trim();
  const ulasan = $("comment").value.trim();

  if(!name || !tempat || !kota || !ulasan || chosenRating === 0){
    alert("Isi semua kolom dan pilih rating (klik bintang).");
    return;
  }

  try {
    $("send-btn").disabled = true;
    $("send-btn").classList.add("send-disabled");
    $("send-btn").textContent = "Mengirim...";

    const payload = {
      nama: name,
      makanan: makanan,
      tempat: tempat,
      kota: kota,
      rating: chosenRating,
      ulasan: ulasan,
      createdAt: new Date().toISOString()
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("POST failed");

    // reset form
    $("name").value = "";
    $("food").value = "";
    $("place").value = "";
    $("city").value = "";
    $("comment").value = "";
    chosenRating = 0;
    document.querySelectorAll("#stars span").forEach(s => s.classList.remove("active"));

    // reload from API and re-render
    await loadFromApi();

  } catch(err) {
    console.error(err);
    alert("Gagal mengirim ulasan. Coba lagi.");
  } finally {
    $("send-btn").disabled = false;
    $("send-btn").classList.remove("send-disabled");
    $("send-btn").textContent = "Kirim Ulasan";
  }
}

// search/filter listeners
$("search-input").addEventListener("input", ()=> { clearTimeout(window._deb||0); window._deb = setTimeout(renderReviews, 180); });
cityFilter.addEventListener("change", renderReviews);
$("rating-filter").addEventListener("change", renderReviews);
$("sort-by").addEventListener("change", renderReviews);
$("send-btn").addEventListener("click", sendReview);

// initial load
loadFromApi();
