import { io, type Socket } from "socket.io-client";

import type {
  CallAnswerPayload,
  CallEndPayload,
  CallOfferPayload,
  IceCandidatePayload,
  IncomingCall,
} from "./call.types";

export interface CallSocketEvents {
  incoming: (call: IncomingCall) => void;
  answer: (payload: CallAnswerPayload) => void;
  offer: (payload: CallOfferPayload) => void;
  iceCandidate: (payload: IceCandidatePayload) => void;
  end: (payload: CallEndPayload) => void;
  connect: () => void;
  disconnect: () => void;
  error: (message: string) => void;
}

export class CallSocket {
  private socket: Socket | null = null;

  connect(serverUrl: string, token: string): void {
    this.disconnect();

    this.socket = io(serverUrl, {
      transports: ["websocket"],
      auth: {
        token,
      },
    });

    this.socket.on("connect", () => {
      this.emitEvent("connect");
    });

    this.socket.on("disconnect", () => {
      this.emitEvent("disconnect");
    });

    this.socket.on("connect_error", (error: Error) => {
      this.emitEvent(
        "error",
        error.message || "تعذر الاتصال بالخادم",
      );
    });

    this.socket.on(
      "call:incoming",
      (payload: IncomingCall) => {
        this.emitEvent("incoming", payload);
      },
    );

    this.socket.on(
      "call:offer",
      (payload: CallOfferPayload) => {
        this.emitEvent("offer", payload);
      },
    );

    this.socket.on(
      "call:answer",
      (payload: CallAnswerPayload) => {
        this.emitEvent("answer", payload);
      },
    );

    this.socket.on(
      "call:ice-candidate",
      (payload: IceCandidatePayload) => {
        this.emitEvent("iceCandidate", payload);
      },
    );

    this.socket.on(
      "call:end",
      (payload: CallEndPayload) => {
        this.emitEvent("end", payload);
      },
    );
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  startCall(receiverId: string, type: "audio" | "video"): void {
    this.requireSocket();

    this.socket!.emit("call:start", {
      receiverId,
      type,
    });
  }

  acceptCall(callId: string): void {
    this.requireSocket();

    this.socket!.emit("call:accept", {
      callId,
    });
  }

  rejectCall(callId: string): void {
    this.requireSocket();

    this.socket!.emit("call:reject", {
      callId,
    });
  }

  endCall(callId: string): void {
    this.requireSocket();

    this.socket!.emit("call:end", {
      callId,
    });
  }

  sendOffer(
    callId: string,
    offer: RTCSessionDescriptionInit,
  ): void {
    this.requireSocket();

    this.socket!.emit("call:offer", {
      callId,
      offer,
    });
  }

  sendAnswer(
    callId: string,
    answer: RTCSessionDescriptionInit,
  ): void {
    this.requireSocket();

    this.socket!.emit("call:answer", {
      callId,
      answer,
    });
  }

  sendIceCandidate(
    callId: string,
    candidate: RTCIceCandidateInit,
  ): void {
    this.requireSocket();

    this.socket!.emit("call:ice-candidate", {
      callId,
      candidate,
    });
  }

  on<K extends keyof CallSocketEvents>(
    event: K,
    listener: CallSocketEvents[K],
  ): void {
    this.events[event].push(
      listener as (...args: unknown[]) => void,
    );
  }

  private readonly events: Record<
    keyof CallSocketEvents,
    Array<(...args: unknown[]) => void>
  > = {
    incoming: [],
    answer: [],
    offer: [],
    iceCandidate: [],
    end: [],
    connect: [],
    disconnect: [],
    error: [],
  };

  private emitEvent<K extends keyof CallSocketEvents>(
    event: K,
    ...args: Parameters<CallSocketEvents[K]>
  ): void {
    for (const listener of this.events[event]) {
      listener(...(args as unknown[]));
    }
  }

  private requireSocket(): void {
    if (!this.socket) {
      throw new Error("CALL_SOCKET_NOT_CONNECTED");
    }
  }
}
