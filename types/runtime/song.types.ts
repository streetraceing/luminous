export type SongEvent = "ready" | "change";

export type SongPayload = {
  track: Spicetify.PlayerTrack;
  title: string;
  name: string;
  artists: string[];
  image: string | null;
  uri: string;
};

export type SongListener = (song: SongPayload) => void;
