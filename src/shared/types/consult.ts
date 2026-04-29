export type ServiceKind = "CHAT" | "VOICE" | "VIDEO" | "REPORT";

export interface AstrologerListItem {
  id: string;
  fullName: string;
  city: string | null;
  bio: string | null;
  languages: string[];
  specialties: string[];
  yearsExperience: number | null;
  averageRating: number;
  ratingCount: number;
  user: { id: string; image: string | null } | null;
  services: Array<{
    id: string;
    kind: ServiceKind;
    title: string;
    priceInr: number;
    durationMin: number;
  }>;
}

export interface ConsultJoinResponse {
  roomUrl: string;
  roomName: string;
  token: string;
}
