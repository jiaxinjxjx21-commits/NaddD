import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, FriendGroup, CalendarEvent, Task, NotificationItem } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with database ID (CRITICAL: Required for named firestoreDatabaseId)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Operation Types for error logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// --- Auth Helper Functions ---
export async function signInWithGoogle(): Promise<UserProfile | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    
    // Check if user document already exists in Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    let userProfile: UserProfile;
    
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        userProfile = snap.data() as UserProfile;
      } else {
        userProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Friend',
          email: fbUser.email || '',
          avatarColor: '#8A9A5B',
          avatarEmoji: '🌿',
          role: 'member',
          tagline: 'Gathering organizer',
          authProvider: 'google',
          createdAt: new Date().toISOString().split('T')[0],
        };
        await setDoc(userDocRef, userProfile);
      }
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.WRITE, `users/${fbUser.uid}`);
      userProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Friend',
        email: fbUser.email || '',
        avatarColor: '#8A9A5B',
        avatarEmoji: '🌿',
        role: 'member',
        tagline: 'Gathering organizer',
        authProvider: 'google',
        createdAt: new Date().toISOString().split('T')[0],
      };
    }
    return userProfile;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

// --- Firestore Sync Helpers ---
export async function syncUserToFirestore(user: UserProfile): Promise<void> {
  // Only sync to Firestore if user is authenticated in Firebase Auth and UID matches
  if (!auth.currentUser || auth.currentUser.uid !== user.id) {
    return;
  }
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function saveGroupToFirestore(group: FriendGroup): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'groups', group.id), group, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `groups/${group.id}`);
  }
}

export async function deleteGroupFromFirestore(groupId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}`);
  }
}

export async function saveEventToFirestore(event: CalendarEvent): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'events', event.id), event, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
  }
}

export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

export async function saveTaskToFirestore(task: Task): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'tasks', task.id), task, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tasks/${task.id}`);
  }
}

export async function deleteTaskFromFirestore(taskId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
  }
}

export async function saveNotificationToFirestore(notif: NotificationItem): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'notifications', notif.id), notif, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}
