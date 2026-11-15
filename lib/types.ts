export type UserRole = "admin" | "manager" | "customer";

export type ScreenStatus = "online" | "offline" | "pending";

export type DisplayFit = "fit" | "fill" | "stretch";

export type DisplayRotation = 0 | 90 | 180 | 270;

export interface DisplaySettings {
  fit: DisplayFit;
  rotation: DisplayRotation;
  flipH: boolean;
  flipV: boolean;
  width: number;
  height: number;
  left: number;
  top: number;
}

export const DEFAULT_DISPLAY: DisplaySettings = {
  fit: "fit",
  rotation: 0,
  flipH: false,
  flipV: false,
  width: 100,
  height: 100,
  left: 0,
  top: 0,
};

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
  display_fit?: DisplayFit | null;
  display_rotation?: DisplayRotation | null;
  display_flip_h?: boolean | null;
  display_flip_v?: boolean | null;
  display_width?: number | null;
  display_height?: number | null;
  display_left?: number | null;
  display_top?: number | null;
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

export type MediaType = "image" | "video";

export interface Media {
  id: string;
  customer_id: string;
  name: string;
  type: MediaType;
  file_path: string;
  file_size: number;
  duration: number | null;
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
  duration: number | null;
  clip_start: number;
  created_at: string;
}

export interface ScreenPlaylist {
  id: string;
  screen_id: string;
  playlist_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  created_at: string;
}

export interface DashboardStats {
  totalScreens: number;
  onlineScreens: number;
  mediaFiles: number;
  playlists: number;
}

export interface PairingResult {
  code: string;
  screen_id: string;
  expires_at: string;
}
