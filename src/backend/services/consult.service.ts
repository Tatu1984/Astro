import { env } from "@/config/env";

export class ConsultError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ConsultError";
  }
}

export type CreateRoomInput = {
  bookingId: string;
  expiresAt: Date;
};

export type CreateRoomResult = {
  roomName: string;
  roomUrl: string;
  stub: boolean;
};

export type CreateMeetingTokenInput = {
  roomName: string;
  userId: string;
  isOwner: boolean;
  expiresAt?: Date;
};

const DAILY_BASE = "https://api.daily.co/v1";

function isStubMode(): boolean {
  if (env.NODE_ENV === "production") return false;
  return !env.DAILY_API_KEY;
}

function authHeader(): string {
  return `Bearer ${env.DAILY_API_KEY}`;
}

export async function createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
  if (isStubMode()) {
    const roomName = `stub-${input.bookingId}`;
    console.log(`[consult-stub] createRoom bookingId=${input.bookingId}`);
    return {
      roomName,
      roomUrl: `stub://daily/${input.bookingId}`,
      stub: true,
    };
  }
  if (!env.DAILY_API_KEY) throw new ConsultError(500, "daily.co not configured");

  const expSeconds = Math.floor(input.expiresAt.getTime() / 1000);
  const res = await fetch(`${DAILY_BASE}/rooms`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: {
        exp: expSeconds,
        enable_chat: true,
        enable_screenshare: true,
        max_participants: 2,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ConsultError(502, `daily.co createRoom failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { name: string; url: string };
  return { roomName: data.name, roomUrl: data.url, stub: false };
}

export async function createMeetingToken(input: CreateMeetingTokenInput): Promise<string> {
  if (isStubMode()) {
    console.log(`[consult-stub] createMeetingToken room=${input.roomName} user=${input.userId}`);
    return `stub-token-${input.userId}`;
  }
  if (!env.DAILY_API_KEY) throw new ConsultError(500, "daily.co not configured");

  const props: Record<string, unknown> = {
    room_name: input.roomName,
    user_id: input.userId,
    is_owner: input.isOwner,
  };
  if (input.expiresAt) props.exp = Math.floor(input.expiresAt.getTime() / 1000);

  const res = await fetch(`${DAILY_BASE}/meeting-tokens`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ properties: props }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ConsultError(502, `daily.co token failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}
