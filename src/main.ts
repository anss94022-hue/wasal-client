import "./style.css";
import { CallSocket } from "./calls/call.socket";
import { CallWebRTC } from "./calls/call.webrtc";
import type { CallEndPayload, IncomingCall } from "./calls/call.types";

const SERVER_URL = import.meta.env.VITE_WASAL_SERVER_URL ?? "http://localhost:3000";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("APP_ROOT_NOT_FOUND");

app.innerHTML = `
  <main class="app">
    <div class="container">
      <header class="header">
        <h1>وصال</h1>
        <p>المكالمات ورفع الوسائط</p>
      </header>

      <section class="card">
        <div id="status" class="status">غير متصل بالسيرفر</div>
        <div class="field">
          <label for="token">JWT Token</label>
          <input id="token" type="password" placeholder="أدخل رمز الدخول" autocomplete="off" />
        </div>
        <div class="field">
          <label for="serverUrl">Server URL</label>
          <input id="serverUrl" value="${SERVER_URL}" autocomplete="off" />
        </div>
        <button id="connectButton" class="btn primary">اتصال بالسيرفر</button>
      </section>

      <section class="card">
        <h2>رفع صورة</h2>
        <div class="field">
          <input type="file" id="imageInput" accept="image/*" />
        </div>
        <button id="uploadButton" class="btn primary">رفع الصورة</button>
        <div id="uploadStatus" class="status"></div>
      </section>
    </div>
  </main>
`;

const statusElement = document.querySelector<HTMLDivElement>("#status")!;
const tokenInput = document.querySelector<HTMLInputElement>("#token")!;
const serverUrlInput = document.querySelector<HTMLInputElement>("#serverUrl")!;
const connectButton = document.querySelector<HTMLButtonElement>("#connectButton")!;
const imageInput = document.querySelector<HTMLInputElement>("#imageInput")!;
const uploadButton = document.querySelector<HTMLButtonElement>("#uploadButton")!;
const uploadStatus = document.querySelector<HTMLDivElement>("#uploadStatus")!;

const socket = new CallSocket();

connectButton.addEventListener("click", () => {
  const token = tokenInput.value.trim();
  const serverUrl = serverUrlInput.value.trim();
  if (!token || !serverUrl) {
    statusElement.textContent = "أدخل التوكن وعنوان السيرفر أولاً";
    return;
  }
  socket.connect(serverUrl, token);
  statusElement.textContent = "متصل بالسيرفر بنجاح";
});

uploadButton.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  const serverUrl = serverUrlInput.value.trim();
  const file = imageInput.files?.[0];

  if (!token) {
    uploadStatus.textContent = "خطأ: يجب إدخال JWT Token أولاً لتفادي خطأ الصلاحية";
    return;
  }

  if (!file) {
    uploadStatus.textContent = "اختر صورة أولاً";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    uploadStatus.textContent = "جاري رفع الصورة...";
    const response = await fetch(`${serverUrl}/api/media/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      uploadStatus.textContent = "تم رفع الصورة بنجاح!";
      console.log(result);
    } else {
      uploadStatus.textContent = `فشل الرفع: ${result.message || "رمز غير صالح"}`;
    }
  } catch (error) {
    uploadStatus.textContent = "حدث خطأ أثناء الاتصال بالخادم";
  }
});
