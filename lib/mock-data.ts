import { Artwork } from "@/lib/types";
import { CommentDisplay } from "@/components/nixie/comments-panel";

export const mockArtworks: Artwork[] = [
  {
    id: "1",
    title: "Portrait",
    description: null,
    sfwPreview: "https://source.unsplash.com/600x800/?anime",
    nsfwFull: "https://source.unsplash.com/800x1000/?anime",
    price: 2.5,
    likes: 234,
    comments: 45,
    creator: "Nixie",
    nsfwUnlocked: false,
    animatedUnlocked: false,
    isUnlocked: false,
    createdAt: "2026-03-10T14:00:00Z",
  },
  {
    id: "2",
    title: "Magical",
    description: null,
    sfwPreview: "https://source.unsplash.com/600x800/?magical",
    nsfwFull: "https://source.unsplash.com/800x1000/?magical",
    animatedVersion: "https://source.unsplash.com/800x1000/?magical",
    price: 3.0,
    likes: 567,
    comments: 89,
    creator: "Nixie",
    nsfwUnlocked: false,
    animatedUnlocked: false,
    isUnlocked: false,
    createdAt: "2026-03-09T12:00:00Z",
  },
  {
    id: "3",
    title: "Pastel",
    description: null,
    sfwPreview: "https://source.unsplash.com/600x800/?pastel",
    nsfwFull: "https://source.unsplash.com/800x1000/?pastel",
    price: 1.5,
    likes: 892,
    comments: 123,
    creator: "Nixie",
    nsfwUnlocked: false,
    animatedUnlocked: false,
    isUnlocked: false,
    createdAt: "2026-03-08T10:00:00Z",
  },
];

export const mockComments: Record<string, CommentDisplay[]> = {
  "1": [
    {
      id: "c1",
      wallet: "0xabcd...ef01",
      text: "Absolutely stunning work!",
      created_at: "2026-03-10T14:30:00Z",
    },
    {
      id: "c2",
      wallet: "0xbcde...f012",
      text: "The colors are so beautiful!",
      created_at: "2026-03-10T15:45:00Z",
    },
  ],
  "2": [
    {
      id: "c3",
      wallet: "0xcdef...0123",
      text: "Love the magical aesthetic!",
      created_at: "2026-03-11T10:20:00Z",
    },
  ],
  "3": [],
};
