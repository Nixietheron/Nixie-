export interface Artwork {
  id: string;
  sfwPreview: string;
  nsfwFull: string;
  animatedVersion?: string;
  price: number;
  likes: number;
  comments: number;
  creator: string;
  isUnlocked?: boolean;
}

export const mockArtworks: Artwork[] = [
  {
    id: "1",
    sfwPreview: "anime girl portrait elegant",
    nsfwFull: "anime girl portrait elegant full",
    price: 2.5,
    likes: 234,
    comments: 45,
    creator: "Nixie",
    isUnlocked: false,
  },
  {
    id: "2",
    sfwPreview: "anime magical girl pink",
    nsfwFull: "anime magical girl pink full",
    animatedVersion: "anime magical girl pink animated",
    price: 3.0,
    likes: 567,
    comments: 89,
    creator: "Nixie",
    isUnlocked: false,
  },
  {
    id: "3",
    sfwPreview: "anime cat girl pastel",
    nsfwFull: "anime cat girl pastel full",
    price: 1.5,
    likes: 892,
    comments: 123,
    creator: "Nixie",
    isUnlocked: false,
  },
  {
    id: "4",
    sfwPreview: "anime maid kawaii pink",
    nsfwFull: "anime maid kawaii pink full",
    price: 2.0,
    likes: 445,
    comments: 67,
    creator: "Nixie",
    isUnlocked: false,
  },
  {
    id: "5",
    sfwPreview: "anime school girl soft",
    nsfwFull: "anime school girl soft full",
    animatedVersion: "anime school girl soft animated",
    price: 2.8,
    likes: 678,
    comments: 91,
    creator: "Nixie",
    isUnlocked: false,
  },
];

export interface Comment {
  id: string;
  artworkId: string;
  user: string;
  userWallet: string;
  text: string;
  timestamp: Date;
}

export const mockComments: Comment[] = [
  {
    id: "c1",
    artworkId: "1",
    user: "AnimeFan123",
    userWallet: "0xabcd...ef01",
    text: "Absolutely stunning work! 😍",
    timestamp: new Date("2026-03-10T14:30:00"),
  },
  {
    id: "c2",
    artworkId: "1",
    user: "ArtCollector",
    userWallet: "0xbcde...f012",
    text: "The colors are so beautiful!",
    timestamp: new Date("2026-03-10T15:45:00"),
  },
  {
    id: "c3",
    artworkId: "2",
    user: "MagicalVibes",
    userWallet: "0xcdef...0123",
    text: "Love the magical girl aesthetic! ✨",
    timestamp: new Date("2026-03-11T10:20:00"),
  },
];