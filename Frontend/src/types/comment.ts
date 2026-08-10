export interface Comment {
  commentId: number;
  taskId: string;
  userId: number;
  comment: string;
  commentImageUrl?: string;
  parentCommentId?: number;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  user: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
    recognition?: {
      auraKey?: string;
      rankValue?: 1 | 2 | 3;
      badgeKey?: string;
    };
  };
  replies?: Comment[];
  reactions?: any[];
  _count?: {
    replies: number;
    reactions: number;
  };
}

export interface CommentNode {
  comment: Comment;
  children: CommentNode[];
  level: number;
  replyCount?: number;
}

export interface CommentTree {
  nodes: CommentNode[];
  totalComments: number;
}
