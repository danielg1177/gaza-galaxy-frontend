import { apiClient } from './apiClient';

export interface Friend {
  friendshipId: number;
  user: { id: number; username: string };
}

export interface FriendRequest {
  friendshipId: number;
  fromUser: { id: number; username: string };
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
  friendshipStatus:
    | 'none'
    | 'pending_sent'
    | 'pending_received'
    | 'accepted';
}

interface ApiFriend {
  friendship_id: number;
  user: { id: number; username: string };
}

interface ApiFriendRequest {
  friendship_id: number;
  from_user: { id: number; username: string };
  created_at: string;
}

interface ApiUserSearchResult {
  id: number;
  username: string;
  friendship_status: UserSearchResult['friendshipStatus'];
}

interface FriendsResponse {
  friends: ApiFriend[];
}

interface FriendRequestsResponse {
  requests: ApiFriendRequest[];
}

interface UserSearchResponse {
  users: ApiUserSearchResult[];
}

function mapFriend(api: ApiFriend): Friend {
  return {
    friendshipId: api.friendship_id,
    user: api.user,
  };
}

function mapFriendRequest(api: ApiFriendRequest): FriendRequest {
  return {
    friendshipId: api.friendship_id,
    fromUser: api.from_user,
    createdAt: api.created_at,
  };
}

function mapUserSearchResult(api: ApiUserSearchResult): UserSearchResult {
  return {
    id: api.id,
    username: api.username,
    friendshipStatus: api.friendship_status,
  };
}

export async function getFriends(): Promise<Friend[]> {
  const data = await apiClient.get<FriendsResponse>('/friends');
  return data.friends.map(mapFriend);
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const data = await apiClient.get<FriendRequestsResponse>('/friends/requests');
  return data.requests.map(mapFriendRequest);
}

export async function sendFriendRequest(username: string): Promise<void> {
  await apiClient.post('/friends/request', { username });
}

export async function acceptFriendRequest(friendshipId: number): Promise<void> {
  await apiClient.post(`/friends/requests/${friendshipId}/accept`);
}

export async function declineFriendRequest(friendshipId: number): Promise<void> {
  await apiClient.post(`/friends/requests/${friendshipId}/decline`);
}

export async function removeFriend(friendshipId: number): Promise<void> {
  await apiClient.delete(`/friends/${friendshipId}`);
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const data = await apiClient.get<UserSearchResponse>(
    `/users/search?q=${encodeURIComponent(query)}`,
  );
  return data.users.map(mapUserSearchResult);
}
