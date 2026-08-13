import api from '../services/api';
import type { Achievement } from './reward.api';
export type UserProfileVisibility='public'|'unlisted'|'private';
export interface UserProfile { userProfileId:number; userId:number; handle:string; headline:string|null; bio:string|null; themeConfig:Record<string,unknown>|null; visibility:UserProfileVisibility; status:'draft'|'published'; publishedAt:string|null; userName:string; userLastName:string; userImageUrl:string|null; achievements:Achievement[] }
export interface PublicUserProfile { handle:string; displayName:string; avatarUrl:string|null; headline:string|null; bio:string|null; themeConfig:Record<string,unknown>|null; visibility:UserProfileVisibility; publishedAt:string; achievements:Achievement[] }
const unwrap=<T>(response:{data:{data:T}})=>response.data.data;
export const userProfileApi={
  mine:async()=>unwrap<UserProfile|{profile:null;suggestedHandle:string}>(await api.get('/user-profiles/me')),
  save:async(input:Partial<Pick<UserProfile,'handle'|'headline'|'bio'|'themeConfig'|'visibility'>>)=>unwrap<UserProfile>(await api.put('/user-profiles/me',input)),
  publish:async()=>unwrap<UserProfile>(await api.post('/user-profiles/me/publish')),
  unpublish:async()=>unwrap<UserProfile>(await api.post('/user-profiles/me/unpublish')),
  public:async(handle:string)=>unwrap<PublicUserProfile>(await api.get(`/user-profiles/public/${encodeURIComponent(handle)}`)),
};
