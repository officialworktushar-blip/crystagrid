export type UserRole = "admin" | "customer";

export type ScreenStatus = "online" | "offline" | "pending";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  company_name: string | null;
  phone: string | null;
}

export interface Screen {
  id: string;
  customer_id: string;
  name: string;
  status: ScreenStatus;
  location: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PairingCode {
  id: string;
  customer_id: string;
  screen_id?: string | null;
  screen_name?: string | null;
  code: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}

export interface Media {
  id: string;
  customer_id: string;
  name?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  duration_seconds?: number | null;
  created_at: string;
}

export interface Playlist {
  id: string;
  customer_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  duration_seconds?: number | null;
  created_at: string;
}

export interface ScreenPlaylist {
  id: string;
  screen_id: string;
  playlist_id: string;
  created_at: string;
}

export interface DashboardStats {
  totalScreens: number;
  onlineScreens: number;
  mediaFiles: number;
  playlists: number;
}

export interface GeneratePairingCodeResult {
  code: string;
  expires_at?: string;
}
