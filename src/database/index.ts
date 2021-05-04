/* eslint-disable no-restricted-imports */
/* eslint-disable no-undef */
import firebase from '../plugins/firebase';
import { RoomDocument, UserDocument } from './model';

export const insertUser = async (userDoc: UserDocument) => {
  const db = firebase.firestore();
  const docRef = db.collection('users').doc(userDoc.uid);
  await docRef.set(userDoc);
};

export const isCreatedUser = async (uid: string) => {
  const db = firebase.firestore();
  const user = await db.collection('users').doc(uid).get();
  return user.exists;
};

export const selectRoomDocument = async (docId: string) => {
  const db = firebase.firestore();
  return db.collection('rooms').doc(docId);
};

export const selectUserDocument = async (id: string) => {
  const db = firebase.firestore();
  return db.collection('users').doc(id);
};

export const insertRoomDocument = async (RoomDocument: RoomDocument) => {
  const db = firebase.firestore();
  return await db.collection('rooms').add(RoomDocument);
};

export const selectUser = async (uid: string) => {
  const db = firebase.firestore();
  const user = await db.collection('users').doc(uid).get();
  return user.data() as UserDocument;
};

export const checkDriver = async (docId: string) => {
  const db = firebase.firestore();
  return db.collection('rooms').doc(docId).get();
};

export const updateRoomDocumentWhenJoined = async (
  docId: string,
  UserDocument: UserDocument
) => {
  const db = firebase.firestore();
  await db
    .collection('rooms')
    .doc(docId)
    .update({
      users: firebase.firestore.FieldValue.arrayUnion(UserDocument),
    });
};

export const updateRoomDocumentWhenLeaved = async (
  docId: string,
  UserDocument: UserDocument
) => {
  const db = firebase.firestore();
  await db
    .collection('rooms')
    .doc(docId)
    .update({
      users: firebase.firestore.FieldValue.arrayRemove(UserDocument),
    });
};

export const updateUsername = async (uid: string, nickname: string) => {
  const db = firebase.firestore();
  await db.collection('users').doc(uid).update({
    nickname,
  });
};
