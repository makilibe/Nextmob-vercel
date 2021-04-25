export interface RoomDocument {
  name: string;
  adminUid: string;
  admin: string;
  users: UserDocument[];
}

export interface UserDocument {
  uid: string;
  nickname: string | null;
  introduction: string;
  evaluation: number;
}
