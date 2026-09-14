import "./style.css";

import { CallSocket } from "./calls/call.socket";
import { CallWebRTC } from "./calls/call.webrtc";

import type {
  CallEndPayload,
  IncomingCall,
} from "./calls/call.types";

const SERVER_URL =
  import.meta.env.VITE_WASAL_SERVER_URL ??
  "http://localhost:3000";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("APP_ROOT_NOT_FOUND");
}

app.innerHTML = `
  <main class="app">
    <div class="container">

      <header class="header">
        <h1>وصال</h1>
        <p>المكالمات الصوتية والمرئية</p>
      </header>

      <section class="card">
        <div id="status" class="status">
          غير متصل بالسيرفر
        </div>

        <div class="field">
          <label for="token">JWT Token</label>
          <input
            id="token"
            type="password"
            placeholder="أدخل رمز الدخول"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="serverUrl">Server URL</label>
          <input
            id="serverUrl"
            value="${SERVER_URL}"
            autocomplete="off"
          />
        </div>

        <button
          id="connectButton"
          class="btn primary"
        >
          اتصال بالسيرفر
        </button>
      </section>

      <section class="card">
        <div class="field">
          <label for="receiverId">
            معرف المستخدم المراد الاتصال به
          </label>

          <input
            id="receiverId"
            placeholder="مثال: receiver-1"
          />
        </div>

        <div class="field">
          <label for="callType">نوع المكالمة</label>

          <select id="callType">
            <option value="audio">صوتية</option>
            <option value="video">مرئية</option>
          </select>
        </div>

        <button
          id="startCallButton"
          class="btn success"
          disabled
        >
          بدء المكالمة
        </button>
      </section>

      <section
        id="incomingPanel"
        class="card incoming"
      >
        <h2>📞 مكالمة واردة</h2>

        <p id="incomingText"></p>

        <div class="row">
          <button
            id="acceptButton"
            class="btn success"
          >
            قبول
          </button>

          <button
            id="rejectButton"
            class="btn danger"
          >
            رفض
          </button>
        </div>
      </section>

      <section
        id="callPanel"
        class="card call-panel"
      >
        <div id="callStatus" class="status">
          لا توجد مكالمة
        </div>

        <div class="video-grid">

          <div class="video-box">
            <video
              id="localVideo"
              autoplay
              muted
              playsinline
            ></video>

            <span class="video-label">
              أنت
            </span>
          </div>

          <div class="video-box">
            <video
              id="remoteVideo"
              autoplay
              playsinline
            ></video>

            <span class="video-label">
              الطرف الآخر
            </span>
          </div>

        </div>

        <div class="row">

          <button
            id="microphoneButton"
            class="btn"
          >
            🎙️ كتم الميكروفون
          </button>

          <button
            id="cameraButton"
            class="btn"
          >
            📷 إيقاف الكاميرا
          </button>

          <button
            id="endCallButton"
            class="btn danger"
          >
            🔴 إنهاء المكالمة
          </button>

        </div>
      </section>

    </div>
  </main>
`;

const statusElement =
  document.querySelector<HTMLDivElement>("#status")!;

const callStatusElement =
  document.querySelector<HTMLDivElement>("#callStatus")!;

const tokenInput =
  document.querySelector<HTMLInputElement>("#token")!;

const serverUrlInput =
  document.querySelector<HTMLInputElement>("#serverUrl")!;

const receiverIdInput =
  document.querySelector<HTMLInputElement>("#receiverId")!;

const callTypeSelect =
  document.querySelector<HTMLSelectElement>("#callType")!;

const connectButton =
  document.querySelector<HTMLButtonElement>(
    "#connectButton",
  )!;

const startCallButton =
  document.querySelector<HTMLButtonElement>(
    "#startCallButton",
  )!;

const incomingPanel =
  document.querySelector<HTMLDivElement>(
    "#incomingPanel",
  )!;

const incomingText =
  document.querySelector<HTMLParagraphElement>(
    "#incomingText",
  )!;

const acceptButton =
  document.querySelector<HTMLButtonElement>(
    "#acceptButton",
  )!;

const rejectButton =
  document.querySelector<HTMLButtonElement>(
    "#rejectButton",
  )!;

const callPanel =
  document.querySelector<HTMLDivElement>("#callPanel")!;

const localVideo =
  document.querySelector<HTMLVideoElement>(
    "#localVideo",
  )!;

const remoteVideo =
  document.querySelector<HTMLVideoElement>(
    "#remoteVideo",
  )!;

const microphoneButton =
  document.querySelector<HTMLButtonElement>(
    "#microphoneButton",
  )!;

const cameraButton =
  document.querySelector<HTMLButtonElement>(
    "#cameraButton",
  )!;

const endCallButton =
  document.querySelector<HTMLButtonElement>(
    "#endCallButton",
  )!;

const socket = new CallSocket();

const webrtc = new CallWebRTC(
  socket,
  (remoteStream) => {
    remoteVideo.srcObject = remoteStream;
  },
  (state) => {
    callStatusElement.textContent =
      `حالة WebRTC: ${state}`;

    if (
      state === "failed" ||
      state === "disconnected" ||
      state === "closed"
    ) {
      cleanupCall();
    }
  },
);

let connected = false;

let activeCallId: string | null = null;

let incomingCall: IncomingCall | null = null;

let activeCallType: "audio" | "video" | null = null;

socket.on("connect", () => {
  connected = true;

  statusElement.textContent =
    "متصل بالسيرفر بنجاح";

  startCallButton.disabled = false;
});

socket.on("disconnect", () => {
  connected = false;

  statusElement.textContent =
    "انقطع الاتصال بالسيرفر";

  startCallButton.disabled = true;
});

socket.on("error", (message) => {
  statusElement.textContent = `خطأ: ${message}`;
});

socket.on("incoming", (call) => {
  incomingCall = call;

  incomingPanel.classList.add("active");

  incomingText.textContent =
    `مكالمة ${call.type === "video" ? "مرئية" : "صوتية"} من المستخدم ${call.callerId}`;

  callStatusElement.textContent =
    "مكالمة واردة";
});

socket.on("offer", async (payload) => {
  if (!activeCallId) {
    activeCallId = payload.callId;
  }

  try {
    await webrtc.handleOffer(
      payload.callId,
      payload.offer,
    );

    callStatusElement.textContent =
      "تم إرسال الرد للطرف الآخر";
  } catch (error) {
    showError(error);
  }
});

socket.on("answer", async (payload) => {
  try {
    await webrtc.handleAnswer(payload.answer);

    callStatusElement.textContent =
      "تم الاتصال بالطرف الآخر";
  } catch (error) {
    showError(error);
  }
});

socket.on("iceCandidate", async (payload) => {
  try {
    await webrtc.handleIceCandidate(
      payload.candidate,
    );
  } catch (error) {
    showError(error);
  }
});

socket.on("end", (payload: CallEndPayload) => {
  if (payload.callId !== activeCallId) {
    return;
  }

  callStatusElement.textContent =
    payload.reason === "missed"
      ? "انتهت المكالمة: لم يتم الرد"
      : "انتهت المكالمة";

  cleanupCall();
});

connectButton.addEventListener("click", () => {
  const token = tokenInput.value.trim();

  const serverUrl = serverUrlInput.value.trim();

  if (!token) {
    statusElement.textContent =
      "أدخل JWT Token أولًا";
    return;
  }

  if (!serverUrl) {
    statusElement.textContent =
      "أدخل عنوان السيرفر";
    return;
  }

  socket.connect(serverUrl, token);

  statusElement.textContent =
    "جاري الاتصال بالسيرفر...";
});

startCallButton.addEventListener("click", async () => {
  if (!connected) {
    statusElement.textContent =
      "اتصل بالسيرفر أولًا";
    return;
  }

  const receiverId =
    receiverIdInput.value.trim();

  const type =
    callTypeSelect.value as "audio" | "video";

  if (!receiverId) {
    statusElement.textContent =
      "أدخل معرف المستخدم أولًا";
    return;
  }

  try {
    const temporaryCallId =
      crypto.randomUUID();

    activeCallId = temporaryCallId;
    activeCallType = type;

    socket.startCall(receiverId, type);

    showCallPanel();

    callStatusElement.textContent =
      "جاري إنشاء المكالمة...";

    /*
     * The server owns the real callId.
     * The offer is created after the incoming
     * signaling state is available.
     *
     * For the current server contract, the
     * caller creates the WebRTC offer once
     * the real call identifier is known.
     *
     * The initial implementation waits for
     * the server's incoming signaling event
     * before creating the offer.
     */
  } catch (error) {
    showError(error);
  }
});

acceptButton.addEventListener("click", async () => {
  if (!incomingCall) {
    return;
  }

  try {
    activeCallId = incomingCall.callId;
    activeCallType = incomingCall.type;

    socket.acceptCall(incomingCall.callId);

    const localStream =
      await webrtc.acceptIncomingCall(
        incomingCall.callId,
        incomingCall.type,
      );

    localVideo.srcObject = localStream;

    showCallPanel();

    callStatusElement.textContent =
      "تم قبول المكالمة، بانتظار العرض...";

    incomingPanel.classList.remove("active");

    incomingCall = null;
  } catch (error) {
    showError(error);
  }
});

rejectButton.addEventListener("click", () => {
  if (!incomingCall) {
    return;
  }

  socket.rejectCall(incomingCall.callId);

  incomingPanel.classList.remove("active");

  incomingCall = null;

  callStatusElement.textContent =
    "تم رفض المكالمة";
});

microphoneButton.addEventListener("click", () => {
  const enabled =
    webrtc.toggleMicrophone();

  microphoneButton.textContent =
    enabled
      ? "🎙️ كتم الميكروفون"
      : "🔇 فتح الميكروفون";
});

cameraButton.addEventListener("click", () => {
  const enabled =
    webrtc.toggleCamera();

  cameraButton.textContent =
    enabled
      ? "📷 إيقاف الكاميرا"
      : "📷 تشغيل الكاميرا";
});

endCallButton.addEventListener("click", () => {
  if (activeCallId) {
    socket.endCall(activeCallId);
  }

  cleanupCall();

  callStatusElement.textContent =
    "تم إنهاء المكالمة";
});

function showCallPanel(): void {
  callPanel.classList.add("active");
}

function cleanupCall(): void {
  webrtc.close();

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  activeCallId = null;
  activeCallType = null;

  callPanel.classList.remove("active");

  microphoneButton.textContent =
    "🎙️ كتم الميكروفون";

  cameraButton.textContent =
    "📷 إيقاف الكاميرا";
}

function showError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : "حدث خطأ غير معروف";

  callStatusElement.textContent =
    `خطأ: ${message}`;
}
