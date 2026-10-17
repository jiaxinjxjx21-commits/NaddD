import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ViewMode, 
  Task, 
  CalendarEvent, 
  FriendGroup, 
  ProjectCategory, 
  NotificationItem, 
  CheckInStatus,
  ProposedTimeSlot,
  FreeDateMatch,
  MatchedTimeSlot,
  UserProfile
} from './types';
import { 
  INITIAL_PROJECTS
} from './data/initialData';
import { 
  auth, 
  db, 
  signOutFirebase, 
  syncUserToFirestore, 
  saveGroupToFirestore, 
  deleteGroupFromFirestore, 
  saveEventToFirestore, 
  deleteEventFromFirestore, 
  saveTaskToFirestore, 
  deleteTaskFromFirestore, 
  saveNotificationToFirestore,
  handleFirestoreError,
  OperationType 
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getTodayDateString } from './utils/calendarUtils';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { UpcomingBanner } from './components/UpcomingBanner';
import { CalendarView } from './components/CalendarView';
import { FreeDateMatcherView } from './components/FreeDateMatcherView';
import { FriendGroupsView } from './components/FriendGroupsView';
import { MeetingVerificationModal } from './components/MeetingVerificationModal';
import { EventDetailModal } from './components/EventDetailModal';
import { NewEventModal } from './components/NewEventModal';
import { NewTaskModal } from './components/NewTaskModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ToastContainer, ToastMessage } from './components/Toast';

interface NewEventConfig {
  isOpen: boolean;
  groupId?: string;
  startWithPoll?: boolean;
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  isPersonal?: boolean;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('naddd_current_user');
    if (!saved || saved === 'null') return null;
    if (saved === 'guest') {
      return {
        id: 'guest',
        name: 'Guest Explorer',
        email: 'guest@naddd.app',
        avatarColor: '#8A9A5B',
        avatarEmoji: '🌿',
        role: 'member',
        tagline: 'Exploring gathering planner',
      };
    }
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  // --- Scoped Persistent Storage State: Starts clean for new users ---
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const savedUser = localStorage.getItem('naddd_current_user');
    let uid: string | null = null;
    try {
      const parsed = savedUser && savedUser !== 'null' ? JSON.parse(savedUser) : null;
      uid = parsed?.id || null;
    } catch {}
    if (!uid) return [];
    const saved = localStorage.getItem(`naddd_${uid}_events`);
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedUser = localStorage.getItem('naddd_current_user');
    let uid: string | null = null;
    try {
      const parsed = savedUser && savedUser !== 'null' ? JSON.parse(savedUser) : null;
      uid = parsed?.id || null;
    } catch {}
    if (!uid) return [];
    const saved = localStorage.getItem(`naddd_${uid}_tasks`);
    return saved ? JSON.parse(saved) : [];
  });

  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>(() => {
    const savedUser = localStorage.getItem('naddd_current_user');
    let uid: string | null = null;
    try {
      const parsed = savedUser && savedUser !== 'null' ? JSON.parse(savedUser) : null;
      uid = parsed?.id || null;
    } catch {}
    if (!uid) return [];
    const saved = localStorage.getItem(`naddd_${uid}_groups`);
    return saved ? JSON.parse(saved) : [];
  });

  const [projects] = useState<ProjectCategory[]>(INITIAL_PROJECTS);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const savedUser = localStorage.getItem('naddd_current_user');
    let uid: string | null = null;
    try {
      const parsed = savedUser && savedUser !== 'null' ? JSON.parse(savedUser) : null;
      uid = parsed?.id || null;
    } catch {}
    if (!uid) return [];
    const saved = localStorage.getItem(`naddd_${uid}_notifications`);
    return saved ? JSON.parse(saved) : [];
  });

  // --- Active Navigation & UI Filters ---
  const [currentView, setCurrentView] = useState<ViewMode>('calendar');
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const touchContentStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const VIEW_INDEX_MAP: Record<ViewMode, number> = {
    calendar: 0,
    matcher: 1,
    groups: 2,
  };

  const handleSelectView = (newView: ViewMode) => {
    const currentIdx = VIEW_INDEX_MAP[currentView] ?? 0;
    const newIdx = VIEW_INDEX_MAP[newView] ?? 0;
    setSlideDirection(newIdx >= currentIdx ? 1 : -1);
    setCurrentView(newView);
  };

  const pointerContentStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePointerDownContent = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary mouse click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement | null;
    // Don't intercept pointer events on interactive controls
    if (target?.closest('input, button, textarea, select, a, [role="button"], [contenteditable="true"]')) {
      return;
    }
    pointerContentStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUpContent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerContentStartRef.current) return;
    const deltaX = e.clientX - pointerContentStartRef.current.x;
    const deltaY = e.clientY - pointerContentStartRef.current.y;
    const duration = Date.now() - pointerContentStartRef.current.time;

    // Primarily horizontal swipe of at least 55px within 600ms
    if (
      Math.abs(deltaX) > 55 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.3 &&
      duration < 600
    ) {
      const views: ViewMode[] = ['calendar', 'matcher', 'groups'];
      const currentIdx = views.indexOf(currentView);
      if (deltaX < 0 && currentIdx < views.length - 1) {
        // Swiped left -> next view
        handleSelectView(views[currentIdx + 1]);
      } else if (deltaX > 0 && currentIdx > 0) {
        // Swiped right -> prev view
        handleSelectView(views[currentIdx - 1]);
      }
    }

    pointerContentStartRef.current = null;
  };

  const handleTouchStartContent = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchContentStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEndContent = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchContentStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchContentStartRef.current.x;
    const deltaY = touch.clientY - touchContentStartRef.current.y;
    const duration = Date.now() - touchContentStartRef.current.time;

    // Primarily horizontal swipe of at least 55px within 600ms
    if (
      Math.abs(deltaX) > 55 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4 &&
      duration < 600
    ) {
      const views: ViewMode[] = ['calendar', 'matcher', 'groups'];
      const currentIdx = views.indexOf(currentView);
      if (deltaX < 0 && currentIdx < views.length - 1) {
        // Swiped left -> next view
        handleSelectView(views[currentIdx + 1]);
      } else if (deltaX > 0 && currentIdx > 0) {
        // Swiped right -> prev view
        handleSelectView(views[currentIdx - 1]);
      }
    }

    touchContentStartRef.current = null;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLargeTextMode, setIsLargeTextMode] = useState<boolean>(() => {
    return localStorage.getItem('naddd_large_text') === 'true';
  });

  // --- Modals State (Consolidated & Simplified) ---
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [newEventConfig, setNewEventConfig] = useState<NewEventConfig>({ isOpen: false });
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CalendarEvent | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [eventToVerify, setEventToVerify] = useState<CalendarEvent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- Helper to Load Scoped User Data (Ensures pristine clean slate for new users) ---
  const loadUserData = (user: UserProfile | null) => {
    if (!user) {
      setEvents([]);
      setFriendGroups([]);
      setTasks([]);
      setNotifications([]);
      return;
    }
    const savedEvents = localStorage.getItem(`naddd_${user.id}_events`);
    const savedGroups = localStorage.getItem(`naddd_${user.id}_groups`);
    const savedTasks = localStorage.getItem(`naddd_${user.id}_tasks`);
    const savedNotifs = localStorage.getItem(`naddd_${user.id}_notifications`);

    setEvents(savedEvents ? JSON.parse(savedEvents) : []);
    setFriendGroups(savedGroups ? JSON.parse(savedGroups) : []);
    setTasks(savedTasks ? JSON.parse(savedTasks) : []);
    setNotifications(savedNotifs ? JSON.parse(savedNotifs) : []);
  };

  // --- LocalStorage & Firestore Sync (User Scoped) ---
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`naddd_${currentUser.id}_events`, JSON.stringify(events));
    }
  }, [events, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`naddd_${currentUser.id}_tasks`, JSON.stringify(tasks));
    }
  }, [tasks, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`naddd_${currentUser.id}_groups`, JSON.stringify(friendGroups));
    }
  }, [friendGroups, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`naddd_${currentUser.id}_notifications`, JSON.stringify(notifications));
    }
  }, [notifications, currentUser]);

  useEffect(() => {
    localStorage.setItem('naddd_current_user', currentUser ? JSON.stringify(currentUser) : 'null');
    if (currentUser && auth.currentUser && auth.currentUser.uid === currentUser.id) {
      syncUserToFirestore(currentUser);
    }
  }, [currentUser]);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setCurrentUser(userData);
            loadUserData(userData);
          }
        } catch (err) {
          console.warn('Could not fetch user document:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('naddd_large_text', String(isLargeTextMode));
    if (isLargeTextMode) {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
  }, [isLargeTextMode]);

  // --- Toast Helper ---
  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- Modal Helpers ---
  const openNewEvent = (config: Partial<NewEventConfig> = {}) => {
    setNewEventConfig({
      isOpen: true,
      date: selectedDate || getTodayDateString(),
      startTime: '11:00',
      endTime: '13:00',
      ...config,
    });
  };

  const closeNewEvent = () => setNewEventConfig({ isOpen: false });

  // --- Automatic Attendance Check-In Verification Prompt ---
  useEffect(() => {
    const checkUpcomingMeetings = () => {
      const today = getTodayDateString();
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

      events.forEach((evt) => {
        if (evt.status !== 'confirmed' || evt.date !== today || !evt.startTime || evt.userVerificationPromptSent) return;
        
        const [evtHours, evtMins] = evt.startTime.split(':').map(Number);
        const diffMinutes = (evtHours * 60 + evtMins) - currentTimeInMinutes;

        // Prompt if starting within 60 minutes
        if (diffMinutes <= 60 && diffMinutes >= -30) {
          setEvents((prev) =>
            prev.map((e) => (e.id === evt.id ? { ...e, userVerificationPromptSent: true } : e))
          );

          setNotifications((prev) => [
            {
              id: `notif-verify-${evt.id}-${Date.now()}`,
              title: `Almost Scheduled Time: ${evt.title}`,
              message: `Starting soon at ${evt.startTime}. Please verify if you are attending so your friends know!`,
              timestamp: 'Just now',
              type: 'attendance_verification',
              read: false,
              eventId: evt.id,
              groupId: evt.groupId,
              needsAction: true,
            },
            ...prev,
          ]);

          addToast('Almost Time! Verify Attendance', `Are you going to ${evt.title}? Tap to check in!`, 'reminder');
          setEventToVerify(evt);
          setIsVerificationModalOpen(true);
        }
      });
    };

    checkUpcomingMeetings();
    const interval = setInterval(checkUpcomingMeetings, 60000);
    return () => clearInterval(interval);
  }, [events]);

  // --- Event & Attendance Handlers ---
  const handleVerifyStatus = (eventId: string, status: CheckInStatus, note?: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const currentUserId = currentUser?.id || 'm-1';
        const currentUserName = currentUser?.name || 'Alex (You)';

        const updatedAttendees = evt.attendees.map((att) =>
          att.memberId === currentUserId
            ? {
                ...att,
                checkInStatus: status,
                checkInNote: note || undefined,
                checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            : att
        );

        const statusLabels: Record<CheckInStatus, string> = {
          unverified: 'unverified',
          attending: 'has arrived 📍',
          on_the_way: 'is on the way 🚗',
          running_late: 'is running late ⏱️',
          cannot_make_it: 'cannot make it ✕',
        };

        const historyEntry = {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: currentUserName,
          action: `Verified attendance: ${statusLabels[status]}${note ? ` ("${note}")` : ''}`,
        };

        return {
          ...evt,
          attendees: updatedAttendees,
          changeHistory: [...(evt.changeHistory || []), historyEntry],
        };
      })
    );

    addToast('Attendance Verified!', 'Your friends have been notified of your status.', 'success');
  };

  const handleCreateEvent = (newEventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const newEvent: CalendarEvent = {
      ...newEventData,
      id: `evt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEvents((prev) => [newEvent, ...prev]);

    if (newEvent.isPersonal) {
      addToast('Personal Event Scheduled', `"${newEvent.title}" is now blocking your calendar.`, 'success');
    } else {
      const grp = friendGroups.find((g) => g.id === newEvent.groupId);
      setNotifications((prev) => [
        {
          id: `notif-created-${newEvent.id}`,
          title: `New Gathering: ${newEvent.title}`,
          message: `Scheduled with ${grp?.name || 'group'}. Invitations sent to ${newEvent.attendees.length} friends.`,
          timestamp: 'Just now',
          type: 'event_invite',
          read: false,
          eventId: newEvent.id,
          groupId: newEvent.groupId,
        },
        ...prev,
      ]);
      addToast('Gathering Scheduled', `All members of ${grp?.name || 'group'} have been notified!`, 'success');
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedEventForDetail(null);
    addToast('Event Removed', 'Event cancelled and calendar updated.', 'info');
  };

  const handleBroadcastChange = (eventId: string, updateMessage: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              changeHistory: [
                ...(e.changeHistory || []),
                {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  author: currentUser?.name || 'Host',
                  action: updateMessage,
                },
              ],
            }
          : e
      )
    );

    const event = events.find((e) => e.id === eventId);
    setNotifications((prev) => [
      {
        id: `notif-update-${Date.now()}`,
        title: `Update: ${event?.title || 'Gathering'}`,
        message: updateMessage,
        timestamp: 'Just now',
        type: 'event_update',
        read: false,
        eventId,
        groupId: event?.groupId,
      },
      ...prev,
    ]);
    addToast('Broadcast Sent', 'All group members notified of this update.', 'success');
  };

  // --- Polling & Voting Handlers ---
  const handleVoteSlot = (eventId: string, slotId: string, available: boolean) => {
    const currentUserId = currentUser?.id || 'm-1';
    const currentUserName = currentUser?.name || 'Alex (You)';

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId || !evt.proposedSlots) return evt;
        const updatedSlots = evt.proposedSlots.map((slot) => {
          if (slot.id !== slotId) return slot;
          const votes = slot.votes.filter((v) => v.memberId !== currentUserId);
          votes.push({ memberId: currentUserId, memberName: currentUserName, available });
          return { ...slot, votes };
        });
        return { ...evt, proposedSlots: updatedSlots };
      })
    );

    addToast('Vote Recorded', available ? "Voted 'I'm Free'." : "Voted 'Busy'.", 'info');
  };

  const handleConfirmSlot = (eventId: string, selectedSlot: ProposedTimeSlot) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? {
              ...evt,
              status: 'confirmed',
              date: selectedSlot.date,
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
              selectedSlotId: selectedSlot.id,
              changeHistory: [
                ...(evt.changeHistory || []),
                {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  author: currentUser?.name || 'Host',
                  action: `Confirmed time slot: ${selectedSlot.date} at ${selectedSlot.startTime}`,
                },
              ],
            }
          : evt
      )
    );

    const event = events.find((e) => e.id === eventId);
    setNotifications((prev) => [
      {
        id: `notif-slot-${Date.now()}`,
        title: `Time Locked: ${event?.title}`,
        message: `Finalized for ${selectedSlot.date} from ${selectedSlot.startTime} to ${selectedSlot.endTime}.`,
        timestamp: 'Just now',
        type: 'event_update',
        read: false,
        eventId,
        groupId: event?.groupId,
      },
      ...prev,
    ]);

    addToast('Time Slot Confirmed', `Locked in for ${selectedSlot.date} at ${selectedSlot.startTime}.`, 'success');
  };

  const handleProposeNewSlot = (eventId: string, newSlotData: Omit<ProposedTimeSlot, 'id' | 'votes'>) => {
    const newSlot: ProposedTimeSlot = {
      ...newSlotData,
      id: `slot-${Date.now()}`,
      votes: [{ memberId: currentUser?.id || 'm-1', memberName: currentUser?.name || 'Alex (You)', available: true }],
    };

    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId ? { ...evt, proposedSlots: [...(evt.proposedSlots || []), newSlot] } : evt
      )
    );

    addToast('Time Slot Added', 'Friends can now vote on this option.', 'info');
  };

  // --- Task Handlers ---
  const handleToggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t))
    );
  };

  const handleToggleTopPriority = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newTop = !t.isDailyTopPriority;
        if (newTop) addToast('Star Pinned', `"${t.title}" is in your Top 3 daily priorities.`, 'success');
        return { ...t, isDailyTopPriority: newTop };
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    addToast('Task Deleted', 'Removed from priorities.', 'info');
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st)),
            }
          : t
      )
    );
  };

  const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTasks((prev) => [newTask, ...prev]);
    addToast('Task Added', `"${newTask.title}" added to daily list.`, 'success');
  };

  // --- Group Handlers ---
  const handleCreateGroup = (newGroupData: Omit<FriendGroup, 'id' | 'createdAt'>) => {
    const newGroup: FriendGroup = {
      ...newGroupData,
      id: `grp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setFriendGroups((prev) => [...prev, newGroup]);
    addToast('Group Created', `"${newGroup.name}" is ready with custom color!`, 'success');
  };

  const handleAddMemberToGroup = (groupId: string, memberData: Omit<FriendGroup['members'][0], 'id'>) => {
    const newMember = { ...memberData, id: `m-${Date.now()}` };
    setFriendGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, members: [...g.members, newMember] } : g))
    );
    if (memberData.status === 'invited') {
      addToast('Invitation Sent', `Invitation created for ${memberData.name} (${memberData.email || 'Invite Code'}).`, 'success');
    } else {
      addToast('Friend Added', `${memberData.name} joined the circle.`, 'success');
    }
  };

  const handleGenerateInviteCode = (groupId: string, guestName?: string, guestEmail?: string): string => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `NADD-${randomSuffix}`;
    
    setFriendGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const newCode = {
          code,
          createdAt: new Date().toISOString(),
          isUsed: false,
          invitedName: guestName,
          invitedEmail: guestEmail,
        };
        return {
          ...g,
          inviteCodes: [...(g.inviteCodes || []), newCode],
        };
      })
    );
    return code;
  };

  const handleJoinGroupByCode = (codeToJoin: string, memberName: string, memberEmail?: string): boolean => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    let foundGroup: FriendGroup | null = null;

    for (const group of friendGroups) {
      const codeMatch = (group.inviteCodes || []).find((c) => c.code.toUpperCase() === cleanCode && !c.isUsed);
      if (codeMatch) {
        foundGroup = group;
        break;
      }
    }

    if (!foundGroup) {
      addToast('Invalid or Expired Code', 'Please check the invite code and try again.', 'warning');
      return false;
    }

    const emojis = ['🌟', '☕', '🎨', '🚀', '📸', '🎵', '🌿', '🧭'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const newMember = {
      id: `m-${Date.now()}`,
      name: memberName.trim() || 'New Friend',
      email: memberEmail?.trim() || undefined,
      avatarColor: foundGroup.color,
      avatarEmoji: randomEmoji,
      role: 'member' as const,
      status: 'active' as const,
      busySchedule: [],
    };

    setFriendGroups((prev) =>
      prev.map((g) => {
        if (g.id !== foundGroup!.id) return g;
        return {
          ...g,
          members: [...g.members, newMember],
          inviteCodes: (g.inviteCodes || []).map((c) =>
            c.code.toUpperCase() === cleanCode ? { ...c, isUsed: true, usedBy: memberName } : c
          ),
        };
      })
    );

    addToast('Joined Group!', `Welcome to ${foundGroup.name}!`, 'success');
    return true;
  };

  // --- 1-Click Plan Gathering from Free Date Matcher ---
  const handlePlanMeetupForMatch = (match: FreeDateMatch, slot?: MatchedTimeSlot) => {
    openNewEvent({
      title: `${match.groupName} Gathering`,
      date: match.date,
      startTime: slot ? slot.startTime : '14:00',
      endTime: slot ? slot.endTime : '17:00',
      groupId: match.groupId,
      isPersonal: false,
      startWithPoll: false,
    });
  };

  // --- Search Filters ---
  const searchedEvents = searchQuery.trim()
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.groupName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  const searchedTasks = searchQuery.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const handleLoginSuccess = (user: UserProfile) => {
    // Purge any old global sample data from previous demo sessions
    localStorage.removeItem('naddd_events');
    localStorage.removeItem('naddd_groups');
    localStorage.removeItem('naddd_tasks');
    localStorage.removeItem('naddd_notifications');

    setCurrentUser(user);
    loadUserData(user);
    addToast('Welcome to NaddD!', `Signed in as ${user.name}`, 'success');
  };

  const handleContinueAsGuest = () => {
    const guestUser: UserProfile = {
      id: 'guest',
      name: 'Guest Explorer',
      email: 'guest@naddd.app',
      avatarColor: '#8A9A5B',
      avatarEmoji: '🌿',
      role: 'member',
      tagline: 'Exploring gathering planner',
    };
    // Ensure clean state for guest
    localStorage.removeItem('naddd_guest_events');
    localStorage.removeItem('naddd_guest_groups');
    localStorage.removeItem('naddd_guest_tasks');
    localStorage.removeItem('naddd_guest_notifications');
    localStorage.removeItem('naddd_events');
    localStorage.removeItem('naddd_groups');
    localStorage.removeItem('naddd_tasks');
    localStorage.removeItem('naddd_notifications');

    setCurrentUser(guestUser);
    setEvents([]);
    setFriendGroups([]);
    setTasks([]);
    setNotifications([]);
    addToast('Guest Mode Activated', 'Explore gatherings with a clean slate.', 'info');
  };

  const handleSignOut = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      console.error('Firebase signOut error:', e);
    }
    setCurrentUser(null);
    loadUserData(null);
    localStorage.removeItem('naddd_current_user');
    addToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  const handleClearAllData = () => {
    if (currentUser) {
      localStorage.removeItem(`naddd_${currentUser.id}_events`);
      localStorage.removeItem(`naddd_${currentUser.id}_groups`);
      localStorage.removeItem(`naddd_${currentUser.id}_tasks`);
      localStorage.removeItem(`naddd_${currentUser.id}_notifications`);
    }
    localStorage.removeItem('naddd_events');
    localStorage.removeItem('naddd_groups');
    localStorage.removeItem('naddd_tasks');
    localStorage.removeItem('naddd_notifications');
    setEvents([]);
    setFriendGroups([]);
    setTasks([]);
    setNotifications([]);
    addToast('Clean Slate', 'Your calendar, groups, and plans have been cleared.', 'info');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Render Login view if user is not signed in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] text-[#3D3A35] flex flex-col font-sans selection:bg-[#8A9A5B]/20 selection:text-[#3D3A35]">
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={handleContinueAsGuest}
        />
        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FDFCF8] text-[#3D3A35] flex flex-col font-sans selection:bg-[#8A9A5B]/20 selection:text-[#3D3A35] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      
      {/* Main Header */}
      <Header
        currentView={currentView}
        onSelectView={handleSelectView}
        unreadCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenNewEvent={() => openNewEvent()}
        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        onUpdateProfile={(updated) => {
          if (!currentUser) return;
          setCurrentUser({ ...currentUser, ...updated });
          addToast('Profile Updated', 'Your profile details have been saved.', 'success');
        }}
        onSignOut={handleSignOut}
        onOpenLogin={() => setCurrentUser(null)}
        onClearAllData={handleClearAllData}
      />

      {/* Main Content Area */}
      <main 
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
        onPointerDown={handlePointerDownContent}
        onPointerUp={handlePointerUpContent}
        onTouchStart={handleTouchStartContent}
        onTouchEnd={handleTouchEndContent}
      >

        {/* Banner for upcoming meeting and quick attendance check-ins (when events exist) */}
        {events.length > 0 && (
          <UpcomingBanner
            events={events}
            friendGroups={friendGroups}
            onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
            onQuickNotify={(evt) => {
              handleBroadcastChange(evt.id, 'Friendly reminder: Gathering is coming up soon!');
            }}
            onOpenVerificationModal={(evt) => {
              setEventToVerify(evt);
              setIsVerificationModalOpen(true);
            }}
          />
        )}

        {/* 3 Core Primary Views with Slide Transition */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: slideDirection * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -slideDirection * 30 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full"
          >
            {currentView === 'calendar' && (
              <CalendarView
                events={searchedEvents}
                tasks={searchedTasks}
                friendGroups={friendGroups}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
                onOpenNewEventWithDate={(date, isPersonal = false, groupId) => {
                  setSelectedDate(date);
                  openNewEvent({ date, isPersonal, groupId });
                }}
                onGoToMatcher={() => handleSelectView('matcher')}
                isLargeTextMode={isLargeTextMode}
              />
            )}

            {currentView === 'matcher' && (
              <FreeDateMatcherView
                friendGroups={friendGroups}
                events={events}
                tasks={tasks}
                onPlanMeetupForMatch={handlePlanMeetupForMatch}
                onOpenNewEventWithPoll={() => openNewEvent({ startWithPoll: true })}
                onRefreshMatches={() => {
                  addToast('Scan Completed', 'Mutual free dates updated across all friend groups.', 'success');
                }}
                onNavigateToGroups={() => handleSelectView('groups')}
                isLargeTextMode={isLargeTextMode}
              />
            )}

            {currentView === 'groups' && (
              <FriendGroupsView
                friendGroups={friendGroups}
                events={events}
                onOpenNewEventForGroup={(groupId) => openNewEvent({ groupId, isPersonal: false })}
                onCreateGroup={handleCreateGroup}
                onAddMemberToGroup={handleAddMemberToGroup}
                onGenerateInviteCode={handleGenerateInviteCode}
                onJoinGroupByCode={handleJoinGroupByCode}
                onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
                onGoToMatcherForGroup={() => handleSelectView('matcher')}
                isLargeTextMode={isLargeTextMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E4D9] bg-white py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] mt-12 text-center text-xs text-[#8E8A81]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium">
            <strong className="text-[#3D3A35] font-serif">NaddD</strong> • Personal calendar, mutual friend free date matching & daily task organizer
          </p>
          <div className="flex items-center gap-4 text-[#AFA99E]">
            <span>Clean & Accessible</span>
            <span>•</span>
            <span>Natural Earth Tones</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <MeetingVerificationModal
        isOpen={isVerificationModalOpen}
        event={eventToVerify}
        friendGroup={friendGroups.find((g) => g.id === eventToVerify?.groupId)}
        onClose={() => setIsVerificationModalOpen(false)}
        onVerifyStatus={handleVerifyStatus}
      />

      <EventDetailModal
        isOpen={!!selectedEventForDetail}
        event={selectedEventForDetail}
        friendGroup={friendGroups.find((g) => g.id === selectedEventForDetail?.groupId)}
        currentUserId={currentUser?.id || 'm-1'}
        onClose={() => setSelectedEventForDetail(null)}
        onDeleteEvent={handleDeleteEvent}
        onOpenVerificationModal={(evt) => {
          setSelectedEventForDetail(null);
          setEventToVerify(evt);
          setIsVerificationModalOpen(true);
        }}
        onBroadcastChange={handleBroadcastChange}
        onUpdateEventStatus={(eventId, status) => {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status } : e)));
        }}
        onVoteSlot={handleVoteSlot}
        onConfirmSlot={handleConfirmSlot}
      />

      <NewEventModal
        isOpen={newEventConfig.isOpen}
        preselectedGroupId={newEventConfig.groupId}
        friendGroups={friendGroups}
        startWithPoll={newEventConfig.startWithPoll}
        initialDate={newEventConfig.date}
        initialStartTime={newEventConfig.startTime}
        initialEndTime={newEventConfig.endTime}
        initialTitle={newEventConfig.title}
        initialIsPersonal={newEventConfig.isPersonal}
        onClose={closeNewEvent}
        onCreateEvent={handleCreateEvent}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        projects={projects}
        onClose={() => setIsNewTaskModalOpen(false)}
        onCreateTask={handleCreateTask}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        notifications={notifications}
        events={events}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onMarkAsRead={(id) => {
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllAsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearAll={() => setNotifications([])}
        onOpenVerificationModal={(evt) => {
          setEventToVerify(evt);
          setIsVerificationModalOpen(true);
        }}
        onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

    </div>
  );
}
