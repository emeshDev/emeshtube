// Definisikan tipe untuk data video
interface Video {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoPage {
  items: Video[];
  nextCursor: { id: string; updatedAt: Date } | null;
}

// Definisikan tipe untuk cursor (sesuai dengan struktur dari server)
type Cursor = { id: string; updatedAt: Date } | null;
