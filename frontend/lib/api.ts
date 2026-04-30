const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Types
export interface User {
  id: string;
  email: string;
  role: 'ATHLETE' | 'COACH' | 'BRAND';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AthleteProfile {
  id: string;
  slug?: string;
  name: string;
  sport: string;
  position?: string;
  schoolTeam?: string;
  classYear?: string;
  location?: string;
  state?: string;
  height?: string;
  weight?: number;
  bio?: string;
  hudlUrl?: string;
  avatarUrl?: string;
  openToNIL: boolean;
  openToSemiProPro: boolean;
  stats?: StatLine[];
  highlights?: Highlight[];
}

export interface CoachProfile {
  id: string;
  name: string;
  title?: string;
  school?: string;
  organization?: string;
  sport: string[];
  schoolLevel?: string;
  statePrefs: string[];
  verified: boolean;
}

export interface StatLine {
  id: string;
  season: string;
  statType: string;
  value: number;
}

export interface Highlight {
  id: string;
  url: string;
  title?: string;
  description?: string;
  tags?: string;
  opponent?: string;
  gameDate?: string;
  season?: string;
}

export interface Post {
  id: string;
  authorId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  isReel?: boolean;
  isHighlight?: boolean;
  isStory?: boolean;
  thumbnailUrl?: string;
  muxUploadId?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  createdAt: string;
  author?: {
    id: string;
    athleteProfile?: { name: string; sport: string; profilePictureUrl?: string; schoolTeam?: string };
    coachProfile?: { name: string; organization?: string };
    brandProfile?: { name: string; organizationType?: string };
  };
  likes?: Like[];
  comments?: Comment[];
  isLiked?: boolean;
  isSaved?: boolean;
  _count?: {
    likes: number;
    comments: number;
    saves: number;
  };
}

export interface Like {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
  user?: User;
}

export interface Comment {
  id: string;
  userId: string;
  postId: string;
  text: string;
  createdAt: string;
  user?: {
    id: string;
    athleteProfile?: { name: string };
    coachProfile?: { name: string };
    brandProfile?: { name: string };
  };
}

export interface Offer {
  id: string;
  deliverables: string;
  campaignStartDate: string;
  campaignEndDate: string;
  compensationAmount: number;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  brand?: BrandProfile;
  athlete?: AthleteProfile;
  deal?: { status: string; completedAt?: string };
}

export interface BrandProfile {
  id: string;
  name: string;
  organizationType?: string;
  location?: string;
}

// Helper to get auth token from localStorage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Helper to set auth token
export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

// Helper to remove auth token
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authApi = {
  signup: async (email: string, password: string, role: string): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  },
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  getMe: async (): Promise<{ user: User }> => {
    return apiRequest<{ user: User }>('/auth/me');
  },
};

// Athlete API
export const athleteApi = {
  getProfile: async (id: string): Promise<{ profile: AthleteProfile }> => {
    return apiRequest<{ profile: AthleteProfile }>(`/athletes/${id}`);
  },
  getMyProfile: async (): Promise<{ profile: AthleteProfile }> => {
    return apiRequest<{ profile: AthleteProfile }>('/athletes/profile/me');
  },
  updateProfile: async (profile: Partial<AthleteProfile>): Promise<{ profile: AthleteProfile }> => {
    return apiRequest<{ profile: AthleteProfile }>('/athletes/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },
  addStat: async (season: string, statType: string, value: number): Promise<{ statLine: StatLine }> => {
    return apiRequest<{ statLine: StatLine }>('/athletes/profile/stats', {
      method: 'POST',
      body: JSON.stringify({ season, statType, value }),
    });
  },
  deleteStat: async (id: string): Promise<void> => {
    return apiRequest<void>(`/athletes/profile/stats/${id}`, { method: 'DELETE' });
  },
  addHighlight: async (highlight: Partial<Highlight>): Promise<{ highlight: Highlight }> => {
    return apiRequest<{ highlight: Highlight }>('/athletes/profile/highlights', {
      method: 'POST',
      body: JSON.stringify(highlight),
    });
  },
  search: async (filters: {
    sport?: string;
    position?: string;
    classYear?: string;
    location?: string;
    state?: string;
    openToNIL?: boolean;
    openToSemiProPro?: boolean;
    statType?: string;
    statMinValue?: number;
  }): Promise<{ profiles: AthleteProfile[]; total: number }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    return apiRequest<{ profiles: AthleteProfile[]; total: number }>(`/athletes?${params.toString()}`);
  },
};

// Post API
export const postApi = {
  getFeed: async (): Promise<{ posts: Post[] }> => {
    return apiRequest<{ posts: Post[] }>('/posts/feed');
  },
  getReels: async (limit?: number, offset?: number): Promise<{ reels: Post[]; total: number }> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return apiRequest<{ reels: Post[]; total: number }>(`/posts/reels?${params.toString()}`);
  },
  getUserPosts: async (userId: string): Promise<{ posts: Post[] }> => {
    return apiRequest<{ posts: Post[] }>(`/posts/user/${userId}`);
  },
  getPost: async (id: string): Promise<{ post: Post }> => {
    return apiRequest<{ post: Post }>(`/posts/${id}`);
  },
  createPost: async (
    text: string,
    mediaUrl?: string,
    mediaType?: string,
    isReel?: boolean,
    thumbnailUrl?: string
  ): Promise<{ post: Post }> => {
    return apiRequest<{ post: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ text, mediaUrl, mediaType, isReel, thumbnailUrl }),
    });
  },
  deletePost: async (id: string): Promise<void> => {
    return apiRequest<void>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },
  getStories: async (): Promise<{ stories: Post[] }> => {
    return apiRequest<{ stories: Post[] }>('/posts/stories');
  },
};

// Like API
export const likeApi = {
  likePost: async (postId: string): Promise<{ like: Like }> => {
    return apiRequest<{ like: Like }>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  },
  unlikePost: async (postId: string): Promise<void> => {
    return apiRequest<void>(`/posts/${postId}/like`, {
      method: 'DELETE',
    });
  },
};

// Comment API
export const commentApi = {
  addComment: async (postId: string, text: string): Promise<{ comment: Comment }> => {
    return apiRequest<{ comment: Comment }>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
  getComments: async (postId: string): Promise<{ comments: Comment[] }> => {
    return apiRequest<{ comments: Comment[] }>(`/posts/${postId}/comments`);
  },
};

// Save API
export const saveApi = {
  savePost: async (postId: string): Promise<{ save: any }> => {
    return apiRequest<{ save: any }>(`/posts/${postId}/save`, {
      method: 'POST',
    });
  },
  unsavePost: async (postId: string): Promise<void> => {
    return apiRequest<void>(`/posts/${postId}/save`, {
      method: 'DELETE',
    });
  },
  getSavedPosts: async (): Promise<{ savedPosts: Post[] }> => {
    return apiRequest<{ savedPosts: Post[] }>('/saved');
  },
};

// Follow API
export const followApi = {
  followUser: async (userId: string): Promise<{ follow: any }> => {
    return apiRequest<{ follow: any }>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  },
  unfollowUser: async (userId: string): Promise<void> => {
    return apiRequest<void>(`/users/${userId}/follow`, {
      method: 'DELETE',
    });
  },
  getFollowStatus: async (userId: string): Promise<{ isFollowing: boolean }> => {
    return apiRequest<{ isFollowing: boolean }>(`/users/${userId}/follow-status`);
  },
};

// Message API
export const messageApi = {
  sendMessage: async (receiverId: string, subject: string, body: string): Promise<any> => {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, subject, body }),
    });
  },
  searchUsers: async (q: string): Promise<{ users: Array<{
    id: string;
    email: string;
    iFollow: boolean;
    theyFollow: boolean;
    athleteProfile?: { name: string; sport: string };
    coachProfile?: { name: string; organization?: string };
    brandProfile?: { name: string; organizationType?: string };
  }> }> => {
    return apiRequest(`/users/search?q=${encodeURIComponent(q)}`);
  },
};

// Offer API
export const offerApi = {
  getOffers: async (): Promise<{ offers: Offer[] }> => {
    return apiRequest<{ offers: Offer[] }>('/offers');
  },
  getOffer: async (id: string): Promise<{ offer: Offer }> => {
    return apiRequest<{ offer: Offer }>(`/offers/${id}`);
  },
  createOffer: async (offer: {
    athleteId: string;
    deliverables: string;
    campaignStartDate: string;
    campaignEndDate: string;
    compensationAmount: number;
    notes?: string;
  }): Promise<{ offer: Offer }> => {
    return apiRequest<{ offer: Offer }>('/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
  },
  acceptOffer: async (id: string): Promise<{ offer: Offer; deal: any }> => {
    return apiRequest<{ offer: Offer; deal: any }>(`/offers/${id}/accept`, {
      method: 'PUT',
    });
  },
  declineOffer: async (id: string): Promise<{ offer: Offer }> => {
    return apiRequest<{ offer: Offer }>(`/offers/${id}/decline`, {
      method: 'PUT',
    });
  },
};
