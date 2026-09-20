export type CommentNode = {
  id: string;
  author: { name: string; initials: string; role?: string };
  content: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  reaction?: 1 | -1 | null;
  edited?: boolean;
  isOwner?: boolean;
  replies: CommentNode[];
};
