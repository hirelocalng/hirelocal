const page = document.body.dataset.page;
const providerStorageKey = "hirelocal_provider";
const providerTokenStorageKey = "hirelocal_auth_token";
const adminTokenStorageKey = "hirelocal_admin_token";

const escapeHtml = (value = "") =>
String(value).replace(/[&<>"']/g, (char) => ({
"&": "&amp;",
"<": "&lt;",
">": "&gt;",
'"': "&quot;",
"'": "&#39;"
}[char]));

const getStoredProvider = () => {
try { return JSON.parse(localStorage.getItem(providerStorageKey) || "null"); }
catch (error) { return null; }
};
const setStoredProvider = (provider) => localStorage.setItem(providerStorageKey, JSON.stringify(provider));
const setStoredProviderToken = (token) => localStorage.setItem(providerTokenStorageKey, token);
const getStoredProviderToken = () => localStorage.getItem(providerTokenStorageKey);
const setStoredAdminToken = (token) => localStorage.setItem(adminTokenStorageKey, token);
const getStoredAdminToken = () => localStorage.getItem(adminTokenStorageKey);
const clearStoredProvider = () => {
localStorage.removeItem(providerStorageKey);
localStorage.removeItem(providerTokenStorageKey);
};
const clearStoredAdmin = () => localStorage.removeItem(adminTokenStorageKey);

const attachStatusBox = (form) => {
if (!form) return null;
let box = form.querySelector(".status-box");
if (!box) {
box = document.createElement("div");
box.className = "status-box";
box.setAttribute("aria-live", "polite");
form.appendChild(box);
}
return box;
};
const setStatus = (form, message, type = "info") => {
const box = attachStatusBox(form);
if (!box) return;
box.className = `status-box ${type}`;
box.textContent = message;
};
const clearStatus = (form) => {
const box = form?.querySelector(".status-box");
if (box) { box.className = "status-box"; box.textContent = ""; }
};
const setInlineStatus = (container, message, type = "info") => {
if (!container) return;
container.innerHTML = `<div class="status-box ${type}">${escapeHtml(message)}</div>`;
};
const setTextStatus = (element, message, type = "info") => {
if (!element) return;
element.className = `status-box ${type}`;
element.textContent = message;
};
const clearTextStatus = (element) => {
if (!element) return;
element.className = "status-box";
element.textContent = "";
};

const formatLocation = (provider) =>
[provider.city, provider.lga, provider.state].filter(Boolean).join(", ");

const formatDateLabel = (value) => {
if (!value) return "Not set";
const date = new Date(value);
if (Number.isNaN(date.getTime())) return "Not set";
return date.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
};

const getSubscriptionState = (provider = {}) =>
provider.subscription || {
status: "Expired", isActive: false, expiryDate: null,
daysRemaining: 0, warning: true,
warningMessage: "Your profile is offline until you renew your subscription."
};

const createRatingStars = (ratingValue) => {
const rating = Math.max(0, Math.min(5, Number(ratingValue) || 0));
const rounded = Math.round(rating);
return `${"\u2605".repeat(rounded)}${"\u2606".repeat(5 - rounded)}`;
};

const renderProviderAvatar = (provider, size = "normal") => {
const initials = escapeHtml((provider.name || "HL").slice(0, 2).toUpperCase());
const dim = size === "large" ? "96px" : "48px";
if (provider.photo && provider.photo.trim() !== "") {
return `<img src="${provider.photo}" alt="${escapeHtml(provider.name)} profile photo" style="width:${dim};height:${dim};border-radius:50%;object-fit:cover;" />`;
}
return `<span class="avatar-dot" style="width:${dim};height:${dim};display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--brand));">${initials}</span>`;
};

const createResultCard = (provider) => `
<article class="result-card">
<div class="result-card-head">
<div style="display:flex;align-items:center;gap:0.75rem;">
${renderProviderAvatar(provider)}
<div>
<p class="eyebrow">${provider.verified ? "Verified provider" : "Provider"}</p>
<h3>${escapeHtml(provider.name)}</h3>
</div>
</div>
<span class="pill ${provider.verified ? "success" : "warm"}">${provider.verified ? "Verified" : "Pending"}</span>
</div>
<div class="result-card-meta">
<span class="pill">${escapeHtml(provider.skill || "Skilled worker")}</span>
<span class="pill warm">${escapeHtml(formatLocation(provider) || "Location pending")}</span>
</div>
<p>${escapeHtml(provider.bio || "No bio added yet.")}</p>
<div class="result-card-meta">
<span>${createRatingStars(provider.rating)} ${escapeHtml(String(provider.rating || "0.00"))}</span>
<span>${escapeHtml(String(provider.review_count || 0))} review(s)</span>
</div>
<a class="button secondary full" href="/profile.html?id=${provider.id}">View Full Profile</a>
</article>
`;

const createReviewCard = (review) => `
<article class="review-card">
<div class="result-card-head">
<strong>${escapeHtml(review.reviewer_name)}</strong>
<span class="pill">${review.rating}/5</span>
</div>
<p>${escapeHtml(review.comment || "No comment.")}</p>
</article>
`;

const renderPhotoGallery = (container, photos = [], options = {}) => {
if (!container) return;
if (!photos.length) {
container.innerHTML = `<div class="empty-state">${escapeHtml(options.emptyMessage || "No photos uploaded yet.")}</div>`;
return;
}
container.innerHTML = photos.map((photo, index) => `<article class="photo-tile"> <img src="${photo}" alt="${escapeHtml(options.altPrefix || "Provider photo")} ${index + 1}" /> ${options.showCaption ? `<span>Photo ${index + 1}</span>` : ""} </article>`).join("");
};

const requestJson = async (url, options = {}, authMode = "provider") => {
const headers = { ...(options.headers || {}) };
if (authMode === "provider") {
const token = getStoredProviderToken();
if (token) headers.Authorization = `Bearer ${token}`;
}
if (authMode === "admin") {
const token = getStoredAdminToken();
if (token) headers.Authorization = `Bearer ${token}`;
}
const response = await fetch(url, { ...options, headers });
let data = {};
try { data = await response.json(); }
catch (error) { data = { success: false, message: "Unexpected server response." }; }
return { response, data };
};

const readFileAsDataUrl = (file) =>
new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = () => reject(new Error("Unable to read file."));
reader.readAsDataURL(file);
});

const readFilesAsDataUrls = async (fileList) => {
const files = Array.from(fileList || []);
return Promise.all(files.map(readFileAsDataUrl));
};

const renderUploaderSlots = (container, photos, input, maxFiles, addLabel) => {
if (!container) return;
const photoTiles = photos.map((photo, index) => `<article class="photo-tile upload-slot filled"> <button type="button" class="remove-photo-button" data-index="${index}" aria-label="Remove photo ${index + 1}">Remove</button> <img src="${photo}" alt="Selected work photo ${index + 1}" /> <span>Photo ${index + 1}</span> </article>`);
const remaining = Math.max(0, maxFiles - photos.length);
const emptyTiles = Array.from({ length: remaining }, (_, index) => `<button type="button" class="photo-tile upload-slot empty add-more-photos" data-add-photo="true"> <strong>+</strong> <span>${index === 0 ? addLabel : "Add another photo"}</span> </button>`);
container.innerHTML = [...photoTiles, ...emptyTiles].join("");
container.querySelectorAll(".remove-photo-button").forEach((button) => {
button.addEventListener("click", () => {
container.dispatchEvent(new CustomEvent("remove-photo", { detail: { index: Number(button.dataset.index) } }));
});
});
container.querySelectorAll("[data-add-photo]").forEach((button) => {
button.addEventListener("click", () => input?.click());
});
};

const setupMultiImageUploader = (input, previewContainer, options = {}) => {
if (!input || !previewContainer) return { getPhotos: () => [], setPhotos: () => {}, clear: () => {} };
const maxFiles = options.maxFiles || 5;
const addLabel = options.addLabel || "Add photo";
let photos = Array.isArray(options.initialPhotos) ? [...options.initialPhotos] : [];
const sync = () => renderUploaderSlots(previewContainer, photos, input, maxFiles, addLabel);
previewContainer.addEventListener("remove-photo", (event) => { photos.splice(event.detail.index, 1); sync(); });
input.addEventListener("change", async () => {
try {
const newPhotos = await readFilesAsDataUrls(input.files);
if (newPhotos.length) photos = [...photos, ...newPhotos].slice(0, maxFiles);
input.value = "";
sync();
} catch (error) {
previewContainer.innerHTML = `<div class="empty-state">Unable to preview image(s).</div>`;
}
});
sync();
return {
getPhotos: () => [...photos],
setPhotos: (nextPhotos = []) => { photos = [...nextPhotos].slice(0, maxFiles); sync(); },
clear: () => { photos = []; sync(); }
};
};

const bindFilePreview = (input, previewContainer, multiple = false) => {
if (!input || !previewContainer) return;
input.addEventListener("change", async () => {
try {
const dataUrls = await readFilesAsDataUrls(input.files);
if (!dataUrls.length) { previewContainer.innerHTML = ""; return; }
if (multiple) {
renderPhotoGallery(previewContainer, dataUrls, { showCaption: true, emptyMessage: "" });
} else {
previewContainer.innerHTML = `<article class="photo-tile single"> <img src="${dataUrls[0]}" alt="Preview" /> <span>Preview</span> </article>`;
}
} catch (error) {
previewContainer.innerHTML = `<div class="empty-state">Unable to preview image(s).</div>`;
}
});
};

const validatePhotoCount = (photos) => {
if (photos.length < 3 || photos.length > 5) return "Please upload between 3 and 5 work photos.";
return null;
};

document.querySelectorAll('[data-action="logout"]').forEach((link) => {
link.addEventListener("click", () => clearStoredProvider());
});
document.querySelectorAll('[data-action="admin-logout"]').forEach((link) => {
link.addEventListener("click", () => clearStoredAdmin());
});

// ─── HOME ────────────────────────────────────────────────────────────────────
if (page === "home") {
const form = document.getElementById("quick-search-form");
const featuredProviders = document.getElementById("featured-providers");

form?.addEventListener("submit", (event) => {
event.preventDefault();
window.location.href = `/search.html?${new URLSearchParams(new FormData(form)).toString()}`;
});
document.querySelectorAll("[data-quick-category]").forEach((button) => {
button.addEventListener("click", () => {
if (!form) return;
form.elements.namedItem("category").value = button.getAttribute("data-quick-category");
form.requestSubmit();
});
});

const loadFeaturedProviders = async () => {
if (!featuredProviders) return;
try {
const { data } = await requestJson("/api/search", {}, false);
const providers = (data.providers || []).slice(0, 10);
if (!providers.length) return;
featuredProviders.innerHTML = providers.map((provider) => `
<article class="provider-horizontal-card">
<div class="provider-card-avatar">
${provider.photo && provider.photo.trim() !== "" 
? `<img src="${provider.photo}" alt="${escapeHtml(provider.name)}" />`
: `<div class="avatar-placeholder-small">${escapeHtml((provider.name || "HL").slice(0, 2).toUpperCase())}</div>`
}
</div>
<div class="provider-card-info">
<div class="provider-card-header">
<div class="provider-name-rating">
<h3 class="provider-name">${escapeHtml(provider.name)}</h3>
<div class="provider-rating">
${createRatingStars(provider.rating)} <span>(${provider.review_count || 0})</span>
</div>
</div>
${provider.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
</div>
<div class="provider-location">
📍 ${escapeHtml(formatLocation(provider) || "Location pending")}
</div>
<p class="provider-bio">${escapeHtml(provider.bio || "No bio added yet.")}</p>
<div class="provider-tags">
<span class="provider-tag">${escapeHtml(provider.skill || "Skilled worker")}</span>
<span class="provider-tag">${escapeHtml(provider.category || "General")}</span>
</div>
<button class="view-profile-btn" onclick="window.location.href='/profile.html?id=${provider.id}'">View Profile →</button>
</div>
</article>
`).join("");
} catch (error) { console.error("Error loading providers:", error); }
};
loadFeaturedProviders();
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
if (page === "search") {
const results = document.getElementById("search-results");
const form = document.getElementById("search-form");
const searchSummary = document.getElementById("search-summary");

const renderProviders = (providers = []) => {
if (!results) return;
if (!providers.length) {
results.innerHTML = `<div class="empty-state">No active providers found right now. Try another search later.</div>`;
if (searchSummary) searchSummary.textContent = "No matching active providers found.";
return;
}
results.innerHTML = providers.map(createResultCard).join("");
if (searchSummary) {
searchSummary.textContent = `${providers.length} active provider(s) found.`;
}
};

const loadProviders = async (searchParams) => {
try {
if (searchSummary) searchSummary.textContent = "Searching providers...";
const { data } = await requestJson(`/api/search?${searchParams.toString()}`, {}, false);
renderProviders(data.success ? data.providers || [] : []);
} catch (error) {
if (results) results.innerHTML = `<div class="empty-state">Unable to load providers right now.</div>`;
if (searchSummary) searchSummary.textContent = "Unable to load search results.";
}
};

form?.addEventListener("submit", (event) => {
event.preventDefault();
const params = new URLSearchParams(new FormData(form));
window.history.replaceState({}, "", `/search.html?${params.toString()}`);
loadProviders(params);
});
document.querySelectorAll("[data-search-chip]").forEach((button) => {
button.addEventListener("click", () => {
if (!form) return;
form.elements.namedItem("category").value = button.getAttribute("data-search-chip");
form.requestSubmit();
});
});

const params = new URLSearchParams(window.location.search);
["category", "state", "lga", "query"].forEach((key) => {
const field = form?.elements.namedItem(key);
if (field && params.get(key)) field.value = params.get(key);
});
loadProviders(params);
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
if (page === "profile") {
const params = new URLSearchParams(window.location.search);
const providerId = params.get("id");
const profile = document.getElementById("provider-profile");
const reviewsList = document.getElementById("reviews-list");
const reviewForm = document.getElementById("review-form");
const contactLinks = document.getElementById("provider-contact-links");
const gallery = document.getElementById("provider-gallery");

const editSection = document.getElementById("edit-profile-section");
const editForm = document.getElementById("edit-profile-form");
const editPictureInput = document.getElementById("edit-profile-picture-input");
const editPreview = document.getElementById("edit-profile-preview");

let editPendingPhoto = null;

if (editPictureInput && editPreview) {
editPictureInput.addEventListener("change", async () => {
try {
const [dataUrl] = await readFilesAsDataUrls(editPictureInput.files);
if (dataUrl) {
editPendingPhoto = dataUrl;
editPreview.innerHTML = `<article class="photo-tile single"> <img src="${dataUrl}" alt="New profile picture preview" style="width:96px;height:96px;border-radius:50%;object-fit:cover;" /> <span>New photo (not saved yet)</span> </article>`;
}
} catch (error) {
editPreview.innerHTML = `<div class="empty-state">Unable to preview image.</div>`;
}
});
}

const maybeRevealEditSection = (loadedProviderId) => {
const stored = getStoredProvider();
const token = getStoredProviderToken();
const section = document.getElementById("edit-profile-section");
const formEl = document.getElementById("edit-profile-form");
const previewEl = document.getElementById("edit-profile-preview");

if (!stored || !token || !section) return;

if (String(stored.id) === String(loadedProviderId)) {
section.classList.add("owner-visible");
section.style.display = "block";

const nameInput = formEl?.elements?.namedItem("name");
const skillInput = formEl?.elements?.namedItem("skill");
if (nameInput) nameInput.value = stored.name || "";
if (skillInput) skillInput.value = stored.skill || "";

if (previewEl && stored.photo && stored.photo.trim() !== "" && !editPendingPhoto) {
previewEl.innerHTML = `
<article class="photo-tile single">
<img src="${stored.photo}" alt="Current profile picture" style="width:96px;height:96px;border-radius:50%;object-fit:cover;" />
<span>Current photo</span>
</article>
`;
}
}
};

editForm?.addEventListener("submit", async (event) => {
event.preventDefault();
const stored = getStoredProvider();
const token = getStoredProviderToken();
if (!stored || !token) {
setStatus(editForm, "You must be logged in to edit your profile.", "error");
return;
}

setStatus(editForm, "Saving your profile changes...", "info");

const formData = new FormData(editForm);
const payload = {
phone: stored.phone || null,
whatsapp: stored.whatsapp || null,
skill: formData.get("skill") || stored.skill || "",
category: stored.category || null,
state: stored.state || "",
lga: stored.lga || null,
city: stored.city || null,
bio: stored.bio || null,
work_photos: stored.work_photos || []
};

if (editPendingPhoto) {
payload.photo = editPendingPhoto;
} else if (stored.photo) {
payload.photo = stored.photo;
}

try {
const { data } = await requestJson("/api/provider/me", {
method: "PUT",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
});

if (data.success) {
editPendingPhoto = null;
setStoredProvider(data.provider);
setStatus(editForm, data.message || "Profile updated successfully.", "success");
loadProfile();
} else {
setStatus(editForm, data.message || "Unable to update your profile.", "error");
}
} catch (error) {
setStatus(editForm, "Unable to update your profile right now.", "error");
}
});

const loadProfile = async () => {
if (!providerId) {
if (reviewsList) reviewsList.innerHTML = `<div class="empty-state">No provider selected.</div>`;
return;
}
try {
const { data } = await requestJson(`/api/provider/${providerId}`, {}, false);
if (!data.success) {
if (reviewsList) reviewsList.innerHTML = `<div class="empty-state">${escapeHtml(data.message || "Provider not found.")}</div>`;
return;
}
const { provider, reviews } = data;
const location = formatLocation(provider) || "Location not set";

if (profile) {
const avatarHtml = provider.photo && provider.photo.trim() !== ""
? `<img src="${provider.photo}" alt="${escapeHtml(provider.name)} profile photo" style="width:120px;height:120px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 1rem;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.15);" />`
: `<div class="avatar-placeholder" style="width:120px;height:120px;font-size:2rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--brand));color:white;font-weight:bold;">${escapeHtml((provider.name || "HL").slice(0, 2).toUpperCase())}</div>`;

profile.innerHTML = `
${avatarHtml}
<div class="profile-main-copy">
<p class="eyebrow">${provider.verified ? "Verified provider" : "Provider profile"}</p>
<h1>${escapeHtml(provider.name)}</h1>
<p class="profile-meta">${escapeHtml(provider.skill || "-")} - ${escapeHtml(provider.category || "General")} - ${escapeHtml(location)}</p>
<p class="profile-bio">${escapeHtml(provider.bio || "No bio added yet.")}</p>
</div>
`;
}

document.getElementById("provider-phone").textContent = provider.phone || "-";
document.getElementById("provider-whatsapp").textContent = provider.whatsapp || "-";
document.getElementById("provider-rating").textContent = provider.rating || "0.00";
document.getElementById("provider-views").textContent = provider.views || "0";

renderPhotoGallery(gallery, provider.work_photos || [], {
showCaption: true,
emptyMessage: "This provider has not uploaded work photos yet."
});

if (contactLinks) {
const links = [];
if (provider.phone) links.push(`<a class="button secondary" href="tel:${escapeHtml(provider.phone)}">Call Provider</a>`);
if (provider.whatsapp) {
links.push(`<a class="button tertiary" href="https://wa.me/${String(provider.whatsapp).replace(/\D/g, '').replace(/^0/, '234')}" target="_blank" rel="noreferrer">WhatsApp</a>`);
}
contactLinks.innerHTML = links.join("") || `<div class="empty-state">No direct contact details available yet.</div>`;
}

if (reviewForm?.elements.namedItem("provider_id")) {
reviewForm.elements.namedItem("provider_id").value = provider.id;
}

maybeRevealEditSection(provider.id);

if (!reviewsList) return;
reviewsList.innerHTML = reviews.length
? reviews.map(createReviewCard).join("")
: `<div class="empty-state">No reviews yet. Be the first to leave one.</div>`;
} catch (error) {
if (reviewsList) reviewsList.innerHTML = `<div class="empty-state">Unable to load profile details.</div>`;
}
};

reviewForm?.addEventListener("submit", async (event) => {
event.preventDefault();
setStatus(reviewForm, "Submitting review...", "info");
const payload = Object.fromEntries(new FormData(reviewForm).entries());
try {
const { data } = await requestJson("/api/review", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
}, false);
if (data.success) {
reviewForm.reset();
reviewForm.elements.namedItem("provider_id").value = providerId;
setStatus(reviewForm, "Review submitted successfully.", "success");
loadProfile();
} else {
setStatus(reviewForm, data.message || "Unable to submit review.", "error");
}
} catch (error) {
setStatus(reviewForm, "Unable to submit review right now.", "error");
}
});

loadProfile();
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
if (page === "dashboard") {
const panel = document.getElementById("dashboard-profile");
const badge = document.getElementById("dashboard-badge");
const gallery = document.getElementById("dashboard-gallery");
const updateForm = document.getElementById("dashboard-update-form");
const workPreview = document.getElementById("dashboard-work-preview");
const subscriptionStatus = document.getElementById("subscription-status");
const subscriptionExpiry = document.getElementById("subscription-expiry");
const subscriptionDays = document.getElementById("subscription-days");
const subscriptionNote = document.getElementById("subscription-note");
const subscriptionWarning = document.getElementById("subscription-warning");
const renewButton = document.getElementById("subscription-renew-button");
const paymentStatus = document.getElementById("subscription-payment-status");
const photoInput = updateForm?.elements?.namedItem("profile_picture");
const photoPreview = document.getElementById("dashboard-photo-preview");

let currentProvider = null;
let paymentConfig = null;
let pendingPhoto = null;

if (photoInput && photoPreview) {
photoInput.addEventListener("change", async () => {
try {
const [dataUrl] = await readFilesAsDataUrls(photoInput.files);
if (dataUrl) {
pendingPhoto = dataUrl;
photoPreview.innerHTML = `<article class="photo-tile single"> <img src="${dataUrl}" alt="New profile photo preview" style="width:96px;height:96px;border-radius:50%;object-fit:cover;" /> <span>New photo (not saved yet)</span> </article>`;
}
} catch (error) {
photoPreview.innerHTML = `<div class="empty-state">Unable to preview photo.</div>`;
}
});
}

const dashboardUploader = setupMultiImageUploader(
updateForm?.elements?.namedItem("work_photo_files"),
workPreview,
{ maxFiles: 5, addLabel: "Add work photo" }
);

const populateDashboardForm = (provider) => {
if (!updateForm) return;
["phone", "whatsapp", "skill", "category", "state", "lga", "city", "bio"].forEach((fieldName) => {
const field = updateForm.elements.namedItem(fieldName);
if (field) field.value = provider[fieldName] || "";
});
};

const renderSubscriptionDetails = (provider, payment) => {
const subscription = getSubscriptionState(provider);
const amount = payment?.amount || 1000;
if (subscriptionStatus) {
subscriptionStatus.className = `pill ${subscription.isActive ? "success" : "warm"}`;
subscriptionStatus.textContent = subscription.status;
}
if (subscriptionExpiry) subscriptionExpiry.textContent = formatDateLabel(subscription.expiryDate);
if (subscriptionDays) subscriptionDays.textContent = String(subscription.daysRemaining || 0);
if (subscriptionNote) {
subscriptionNote.textContent = subscription.isActive
? "Your profile is visible in search results while this subscription stays active."
: "Your profile is currently hidden from public search until payment is confirmed.";
}
if (subscriptionWarning) {
if (subscription.warning) {
subscriptionWarning.textContent = subscription.warningMessage;
subscriptionWarning.classList.remove("hidden");
} else {
subscriptionWarning.textContent = "";
subscriptionWarning.classList.add("hidden");
}
}
if (renewButton) {
renewButton.textContent = `Renew Now - ₦${amount.toLocaleString("en-NG")}`;
renewButton.disabled = !payment?.enabled;
if (!payment?.enabled) setTextStatus(paymentStatus, "Korapay keys are not configured yet.", "error");
}
if (badge) {
badge.textContent = subscription.isActive
? `Active until ${formatDateLabel(subscription.expiryDate)}`
: "Profile hidden until renewal";
}
};

const loadDashboard = async () => {
if (!panel) return;
try {
const { response, data } = await requestJson("/api/me");
if (!response.ok || !data.success) {
clearStoredProvider();
panel.innerHTML = `<h2>Profile Summary</h2><div class="empty-state">Login first to load your provider dashboard.</div>`;
return;
}
const provider = data.provider;
currentProvider = provider;
paymentConfig = data.payment || null;
setStoredProvider(provider);

document.getElementById("dash-plan").textContent = provider.plan || "Free";
document.getElementById("dash-verified").textContent = provider.verified ? "Verified" : "Pending";
document.getElementById("dash-views").textContent = provider.views || "0";
document.getElementById("dash-reviews").textContent = provider.review_count || "0";

const avatarHtml = provider.photo && provider.photo.trim() !== ""
? `<img src="${provider.photo}" alt="Profile photo" style="width:80px;height:80px;border-radius:50%;object-fit:cover;display:block;margin-bottom:0.75rem;border:2px solid var(--brand);" />`
: `<div class="avatar-dot" style="width:80px;height:80px;font-size:1.75rem;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e5e7eb;margin-bottom:0.75rem;">${escapeHtml((provider.name || "HL").slice(0, 2).toUpperCase())}</div>`;

panel.innerHTML = `
${avatarHtml}
<h2>${escapeHtml(provider.name)}</h2>
<p><strong>Skill:</strong> ${escapeHtml(provider.skill || "Not set")}</p>
<p><strong>Category:</strong> ${escapeHtml(provider.category || "General")}</p>
<p><strong>Location:</strong> ${escapeHtml(formatLocation(provider) || "Location pending")}</p>
<p><strong>Bio:</strong> ${escapeHtml(provider.bio || "No bio added yet.")}</p>
<p><strong>Email:</strong> ${escapeHtml(provider.email || "-")}</p>
<p><strong>Phone:</strong> ${escapeHtml(provider.phone || "-")}${provider.whatsapp ? ` | <strong>WhatsApp:</strong> ${escapeHtml(provider.whatsapp)}` : ""}</p>
<p><strong>ID Type:</strong> ${escapeHtml(provider.id_type || "Not supplied")}</p>
<p><strong>Subscription:</strong> ${escapeHtml(getSubscriptionState(provider).status)}</p>
`;

if (photoPreview && !pendingPhoto) {
photoPreview.innerHTML = provider.photo && provider.photo.trim() !== ""
? `<article class="photo-tile single"><img src="${provider.photo}" alt="Current profile photo" style="width:96px;height:96px;border-radius:50%;object-fit:cover;" /><span>Current photo</span></article>`
: `<div class="empty-state">No profile photo yet.</div>`;
}

populateDashboardForm(provider);
renderPhotoGallery(gallery, provider.work_photos || [], {
showCaption: true,
emptyMessage: "Upload 3 to 5 work photos to build your portfolio."
});
dashboardUploader.setPhotos(provider.work_photos || []);
renderSubscriptionDetails(provider, paymentConfig);
if (paymentConfig?.enabled) clearTextStatus(paymentStatus);
} catch (error) {
panel.innerHTML = `<h2>Profile Summary</h2><div class="empty-state">Unable to load dashboard data.</div>`;
}
};

renewButton?.addEventListener("click", async () => {
if (!currentProvider) { setTextStatus(paymentStatus, "Reload the dashboard before starting payment.", "error"); return; }
if (!window.Korapay || typeof window.Korapay.initialize !== "function") {
setTextStatus(paymentStatus, "Korapay checkout is unavailable right now.", "error"); return;
}
renewButton.disabled = true;
setTextStatus(paymentStatus, "Preparing Korapay checkout...", "info");
try {
const { data } = await requestJson("/api/payment/initialize", {
method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({})
});
if (!data.success) {
setTextStatus(paymentStatus, data.message || "Unable to start payment.", "error");
renewButton.disabled = !paymentConfig?.enabled;
return;
}
const payment = data.payment;
window.Korapay.initialize({
key: payment.publicKey,
reference: payment.merchantReference,
amount: payment.amount,
currency: "NGN",
customer: payment.customer,
onClose: () => { setTextStatus(paymentStatus, "Payment window closed.", "info"); renewButton.disabled = !paymentConfig?.enabled; },
onFailed: () => { setTextStatus(paymentStatus, "Payment was not completed.", "error"); renewButton.disabled = !paymentConfig?.enabled; },
onSuccess: async (result) => {
setTextStatus(paymentStatus, "Verifying payment...", "info");
try {
const verifyResponse = await requestJson("/api/payment/verify", {
method: "POST", headers: { "Content-Type": "application/json" },
body: JSON.stringify({ reference: result.reference, payment_reference: payment.merchantReference })
});
if (verifyResponse.data.success) {
currentProvider = verifyResponse.data.provider;
setStoredProvider(currentProvider);
renderSubscriptionDetails(currentProvider, paymentConfig);
setTextStatus(paymentStatus, "Subscription renewed successfully.", "success");
await loadDashboard();
} else {
setTextStatus(paymentStatus, verifyResponse.data.message || "Unable to verify payment.", "error");
}
} catch (error) {
setTextStatus(paymentStatus, "Unable to verify payment right now.", "error");
} finally {
renewButton.disabled = !paymentConfig?.enabled;
}
}
});
} catch (error) {
setTextStatus(paymentStatus, "Unable to start payment right now.", "error");
renewButton.disabled = !paymentConfig?.enabled;
}
});

updateForm?.addEventListener("submit", async (event) => {
event.preventDefault();
if (!currentProvider) { setStatus(updateForm, "Login again to update your profile.", "error"); return; }
setStatus(updateForm, "Saving your profile changes...", "info");
const formData = new FormData(updateForm);
const workPhotos = dashboardUploader.getPhotos();
const photoError = validatePhotoCount(workPhotos);
if (photoError) { setStatus(updateForm, photoError, "error"); return; }

const payload = {
phone: formData.get("phone"),
whatsapp: formData.get("whatsapp"),
skill: formData.get("skill"),
category: formData.get("category"),
state: formData.get("state"),
lga: formData.get("lga"),
city: formData.get("city"),
bio: formData.get("bio"),
work_photos: workPhotos
};

if (pendingPhoto) {
payload.photo = pendingPhoto;
} else if (currentProvider.photo) {
payload.photo = currentProvider.photo;
}

try {
const { data } = await requestJson("/api/provider/me", {
method: "PUT",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
});
if (data.success) {
currentProvider = data.provider;
pendingPhoto = null;
setStoredProvider(data.provider);
setStatus(updateForm, data.message || "Profile updated successfully.", "success");
loadDashboard();
} else {
setStatus(updateForm, data.message || "Unable to update your profile.", "error");
}
} catch (error) {
setStatus(updateForm, "Unable to update your profile right now.", "error");
}
});

loadDashboard();
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
if (page === "admin-login") {
const form = document.getElementById("admin-login-form");
form?.addEventListener("submit", async (event) => {
event.preventDefault();
clearStatus(form);
setStatus(form, "Opening admin panel...", "info");
const payload = Object.fromEntries(new FormData(form).entries());
try {
const { data } = await requestJson("/api/admin/login", {
method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
}, false);
if (data.success) {
setStoredAdminToken(data.token);
setStatus(form, "Admin login successful. Redirecting...", "success");
window.location.href = "/admin.html";
} else {
setStatus(form, data.message || "Admin login failed.", "error");
}
} catch (error) {
setStatus(form, "Unable to login right now.", "error");
}
});
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
if (page === "admin") {
const list = document.getElementById("admin-providers");
const statusContainer = document.getElementById("admin-status");
const refreshButton = document.getElementById("admin-refresh-button");

const renderAdminProviders = (providers = []) => {
if (!providers.length) { list.innerHTML = `<div class="empty-state">No providers found yet.</div>`; return; }
list.innerHTML = providers.map((provider) => `
<article class="result-card admin-card">
<div class="result-card-head">
<div style="display:flex;align-items:center;gap:0.75rem;">
${provider.photo && provider.photo.trim() !== ""
? `<img src="${provider.photo}" alt="Profile photo" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />`
: `<span class="avatar-dot">${escapeHtml((provider.name || "HL").slice(0, 2).toUpperCase())}</span>`
}
<div>
<p class="eyebrow">${provider.verified ? "Verified provider" : "Awaiting review"}</p>
<h3>${escapeHtml(provider.name)}</h3>
</div>
</div>
<span class="pill ${provider.verified ? "success" : "warm"}">${provider.verified ? "Verified" : "Pending"}</span>
</div>
<p><strong>Email:</strong> ${escapeHtml(provider.email)}</p>
<p><strong>Skill:</strong> ${escapeHtml(provider.skill || "-")}</p>
<p><strong>Location:</strong> ${escapeHtml(formatLocation(provider) || provider.state || "-")}</p>
<p><strong>Subscription:</strong> ${escapeHtml(getSubscriptionState(provider).status)} until ${escapeHtml(formatDateLabel(getSubscriptionState(provider).expiryDate))}</p>
<p><strong>ID Type:</strong> ${escapeHtml(provider.id_type || "Not provided")}</p>
<p>${escapeHtml(provider.bio || "No bio added yet.")}</p>
<div class="admin-media-block">
<strong>Verification ID Photo</strong>
<div class="single-photo-preview">
${provider.id_photo ? `<article class="photo-tile single"><img src="${provider.id_photo}" alt="Verification ID" /></article>` : `<div class="empty-state">No ID photo uploaded.</div>`}
</div>
</div>
<div class="admin-media-block">
<strong>Work Photos</strong>
<div class="photo-gallery compact">
${(provider.work_photos || []).map((photo, index) => `<article class="photo-tile"><img src="${photo}" alt="Work sample ${index + 1}" /></article>`).join("") || `<div class="empty-state">No work photos uploaded.</div>`}
</div>
</div>
${provider.verified ? "" : `<button class="button primary full admin-verify" data-id="${provider.id}">Verify Provider</button>`}
<button class="button secondary full admin-delete" data-id="${provider.id}" style="background:rgba(166,63,56,0.12);color:#a63f38;margin-top:0.5rem;">Delete Provider</button>
</article>
`).join("");

list.querySelectorAll(".admin-verify").forEach((button) => {
button.addEventListener("click", async () => {
button.disabled = true;
try {
const { data } = await requestJson(`/api/admin/verify/${button.dataset.id}`, {
method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({})
}, "admin");
if (data.success) { setInlineStatus(statusContainer, "Provider verified successfully.", "success"); loadAdminProviders(); }
else { setInlineStatus(statusContainer, data.message || "Unable to verify provider.", "error"); button.disabled = false; }
} catch (error) { setInlineStatus(statusContainer, "Unable to verify provider right now.", "error"); button.disabled = false; }
});
});

list.querySelectorAll(".admin-delete").forEach((button) => {
button.addEventListener("click", async () => {
if (!confirm("Are you sure you want to delete this provider? This cannot be undone.")) return;
button.disabled = true;
try {
const { data } = await requestJson(`/api/admin/delete/${button.dataset.id}`, {
method: "DELETE", headers: { "Content-Type": "application/json" }
}, "admin");
if (data.success) { setInlineStatus(statusContainer, "Provider deleted.", "success"); loadAdminProviders(); }
else { setInlineStatus(statusContainer, data.message || "Unable to delete provider.", "error"); button.disabled = false; }
} catch (error) { setInlineStatus(statusContainer, "Unable to delete provider right now.", "error"); button.disabled = false; }
});
});
};

const loadAdminProviders = async () => {
if (!getStoredAdminToken()) { window.location.href = "/admin-login.html"; return; }
setInlineStatus(statusContainer, "Loading providers...", "info");
try {
const { response, data } = await requestJson("/api/admin/providers", {}, "admin");
if (!response.ok || !data.success) {
clearStoredAdmin();
setInlineStatus(statusContainer, data.message || "Unauthorized", "error");
list.innerHTML = `<div class="empty-state">Admin session expired. Please login again.</div>`;
return;
}
setInlineStatus(statusContainer, `Loaded ${data.providers.length} provider(s).`, "success");
renderAdminProviders(data.providers || []);
} catch (error) {
setInlineStatus(statusContainer, "Unable to load providers right now.", "error");
list.innerHTML = `<div class="empty-state">Unable to load providers.</div>`;
}
};

refreshButton?.addEventListener("click", loadAdminProviders);
loadAdminProviders();
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
if (page === "register") {
const form = document.getElementById("register-form");
const workPreview = document.getElementById("register-work-preview");
const idPreview = document.getElementById("register-id-preview");
const workPhotoInput = form?.elements?.namedItem("work_photo_files");
const idPhotoInput = form?.elements?.namedItem("id_photo_file");
const profileInput = form?.elements?.namedItem("profile_picture");
const profilePreview = document.getElementById("register-profile-preview");

const registerUploader = setupMultiImageUploader(workPhotoInput, workPreview, {
maxFiles: 5, addLabel: "Add work photo"
});
bindFilePreview(idPhotoInput, idPreview, false);

if (profileInput && profilePreview) {
profileInput.addEventListener("change", async () => {
try {
const [dataUrl] = await readFilesAsDataUrls(profileInput.files);
if (dataUrl) {
profilePreview.innerHTML = `<article class="photo-tile single"> <img src="${dataUrl}" alt="Profile picture preview" style="width:96px;height:96px;border-radius:50%;object-fit:cover;" /> <span>Profile picture</span> </article>`;
}
} catch (error) {
profilePreview.innerHTML = `<div class="empty-state">Unable to preview profile picture.</div>`;
}
});
}

form?.addEventListener("submit", async (event) => {
event.preventDefault();
clearStatus(form);
setStatus(form, "Creating your provider account...", "info");

const formData = new FormData(form);
const workPhotos = registerUploader.getPhotos();
const idPhotos = await readFilesAsDataUrls(idPhotoInput?.files);
const profilePhotos = profileInput?.files?.length ? await readFilesAsDataUrls(profileInput.files) : [];

const photoError = validatePhotoCount(workPhotos);
if (photoError) { setStatus(form, photoError, "error"); return; }
if (!idPhotos.length) { setStatus(form, "Please upload a verification ID photo.", "error"); return; }

const payload = {
name: formData.get("name"),
email: formData.get("email"),
phone: formData.get("phone"),
whatsapp: formData.get("whatsapp"),
password: formData.get("password"),
skill: formData.get("skill"),
category: formData.get("category"),
state: formData.get("state"),
lga: formData.get("lga"),
city: formData.get("city"),
bio: formData.get("bio"),
id_type: formData.get("id_type"),
id_photo: idPhotos[0],
work_photos: workPhotos,
photo: profilePhotos[0] || null
};

try {
const { data } = await requestJson("/api/register", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
}, false);
if (data.success) {
setStoredProvider(data.provider);
setStoredProviderToken(data.token);
setStatus(form, "Account created successfully. Redirecting...", "success");
window.location.href = "/dashboard.html";
} else {
setStatus(form, data.message || "Unable to create account.", "error");
}
} catch (error) {
setStatus(form, "Unable to create account right now.", "error");
}
});
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
if (page === "login") {
const form = document.getElementById("login-form");
form?.addEventListener("submit", async (event) => {
event.preventDefault();
clearStatus(form);
setStatus(form, "Logging you in...", "info");
const payload = Object.fromEntries(new FormData(form).entries());
try {
const { data } = await requestJson("/api/login", {
method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
}, false);
if (data.success) {
setStoredProvider(data.provider);
setStoredProviderToken(data.token);
setStatus(form, "Login successful. Redirecting...", "success");
window.location.href = "/dashboard.html";
} else {
setStatus(form, data.message || "Login failed.", "error");
}
} catch (error) {
setStatus(form, "Unable to login right now.", "error");
}
});
}