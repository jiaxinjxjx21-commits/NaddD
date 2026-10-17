import React, { useState, useEffect } from 'react';
import { CalendarEvent, FriendGroup, ProposedTimeSlot, CheckInStatus } from '../types';
import { getTodayDateString } from '../utils/calendarUtils';

import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Sparkles, 
  Plus, 
  Trash2, 
  Vote, 
  Send,
  User,
  Briefcase,
  Heart,
  Dumbbell,
  Home,
  BookOpen
} from 'lucide-react';

interface NewEventModalProps {
  isOpen: boolean;
  preselectedGroupId?: string;
  friendGroups: FriendGroup[];
  startWithPoll?: boolean;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialTitle?: string;
  initialIsPersonal?: boolean;
  onClose: () => void;
  onCreateEvent: (newEvent: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  preselectedGroupId,
  friendGroups,
  startWithPoll = false,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialTitle,
  initialIsPersonal = false,
  onClose,
  onCreateEvent,
}) => {
  // Event Type: Personal Life Event vs Friend Group Gathering
  const [isPersonalEvent, setIsPersonalEvent] = useState(initialIsPersonal);
  const [personalCategory, setPersonalCategory] = useState<'work' | 'personal' | 'health' | 'family' | 'errand'>('personal');

  const [title, setTitle] = useState(initialTitle || '');
  const [groupId, setGroupId] = useState(preselectedGroupId || (friendGroups[0]?.id ?? ''));
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'in_person' | 'online'>('in_person');
  
  // Date and Time
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [startTime, setStartTime] = useState(initialStartTime || '11:00');
  const [endTime, setEndTime] = useState(initialEndTime || '13:00');

  // Polling mode toggle (for friend gatherings)
  const [isPollingMode, setIsPollingMode] = useState(startWithPoll);
  const [proposedSlots, setProposedSlots] = useState<Omit<ProposedTimeSlot, 'id' | 'votes'>[]>([
    { date: initialDate || getTodayDateString(), startTime: '10:00', endTime: '12:00' },
    { date: initialDate || getTodayDateString(), startTime: '14:00', endTime: '16:00' },
  ]);

  // Sync state whenever modal opens with props
  useEffect(() => {
    if (isOpen) {
      if (initialTitle) setTitle(initialTitle);
      if (initialDate) setDate(initialDate);
      if (initialStartTime) setStartTime(initialStartTime);
      if (initialEndTime) setEndTime(initialEndTime);
      if (preselectedGroupId) setGroupId(preselectedGroupId);
      setIsPersonalEvent(initialIsPersonal);
      setIsPollingMode(startWithPoll);
    }
  }, [isOpen, initialTitle, initialDate, initialStartTime, initialEndTime, preselectedGroupId, initialIsPersonal, startWithPoll]);

  if (!isOpen) return null;

  const selectedGroup = friendGroups.find((g) => g.id === groupId) || friendGroups[0];

  const handleAddSlot = () => {
    setProposedSlots([
      ...proposedSlots,
      { date: date || getTodayDateString(), startTime: '18:00', endTime: '20:00' },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    if (proposedSlots.length <= 1) return;
    setProposedSlots(proposedSlots.filter((_, idx) => idx !== index));
  };

  const handleSlotChange = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    const updated = [...proposedSlots];
    updated[index] = { ...updated[index], [field]: value };
    setProposedSlots(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isPersonalEvent) {
      // Create personal life event
      onCreateEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        isPersonal: true,
        personalCategory,
        color: personalCategory === 'work' ? '#7096D4' : personalCategory === 'health' ? '#8A9A5B' : '#D48C70',
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        locationType,
        status: 'confirmed',
        attendees: [
          {
            memberId: 'm-1',
            name: 'Alex (You)',
            avatarColor: '#8A9A5B',
            status: 'accepted',
            checkInStatus: 'unverified',
          },
        ],
        reminders: [
          { type: '1day', enabled: true },
          { type: '1hour', enabled: true },
        ],
      });
    } else {
      // Create friend group gathering
      const attendees = selectedGroup.members.map((m) => ({
        memberId: m.id,
        name: m.name,
        avatarColor: m.avatarColor,
        status: m.id === 'm-1' ? ('accepted' as const) : ('pending' as const),
        checkInStatus: 'unverified' as CheckInStatus,
      }));

      if (isPollingMode) {
        const generatedSlots: ProposedTimeSlot[] = proposedSlots.map((slot, idx) => ({
          id: `slot-${Date.now()}-${idx}`,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          votes: [
            { memberId: 'm-1', memberName: 'Alex (You)', available: true },
          ],
        }));

        onCreateEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          date: generatedSlots[0]?.date || date,
          startTime: generatedSlots[0]?.startTime || startTime,
          endTime: generatedSlots[0]?.endTime || endTime,
          location: location.trim() || undefined,
          locationType,
          status: 'proposed',
          proposedSlots: generatedSlots,
          attendees,
          reminders: [
            { type: '1day', enabled: true },
            { type: '15min', enabled: true },
          ],
          changeHistory: [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              author: 'Alex (Host)',
              action: `Initiated time slot poll with ${generatedSlots.length} options for ${selectedGroup.name}`,
            },
          ],
        });
      } else {
        onCreateEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          date,
          startTime,
          endTime,
          location: location.trim() || undefined,
          locationType,
          status: 'confirmed',
          attendees,
          reminders: [
            { type: '1day', enabled: true },
            { type: '1hour', enabled: true },
            { type: '15min', enabled: true },
          ],
          changeHistory: [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              author: 'Alex (Host)',
              action: `Scheduled gathering for ${date} at ${startTime} and sent notifications to ${attendees.length} participants`,
            },
          ],
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        id="new-event-modal"
        className="bg-[#FDFCF8] border border-[#E8E4D9] rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] max-h-[92dvh]"
      >
        {/* Header with Type Selector */}
        <div className="p-5 sm:p-6 border-b border-[#E8E4D9] bg-[#F7F3EB]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9A5B]">
                Calendar Scheduler
              </span>
              <h3 className="text-xl font-bold font-serif text-[#3D3A35]">
                {isPersonalEvent ? 'Add Personal Life Event' : 'Schedule Friend Gathering'}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-[#8E8A81]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Event Type Tabs */}
          <div className="grid grid-cols-2 p-1 bg-white rounded-2xl border border-[#E8E4D9]">
            <button
              type="button"
              onClick={() => setIsPersonalEvent(false)}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                !isPersonalEvent
                  ? 'bg-[#8A9A5B] text-white shadow-2xs'
                  : 'text-[#5C574F] hover:bg-[#F7F3EB]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friend Group Gathering</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPersonalEvent(true)}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                isPersonalEvent
                  ? 'bg-[#3D3A35] text-white shadow-2xs'
                  : 'text-[#5C574F] hover:bg-[#F7F3EB]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Life Event</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
          
          {/* If Group Gathering: Friend Group Selector */}
          {!isPersonalEvent ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1.5">
                Friend Circle / Group (Applies Distinct Group Color) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {friendGroups.map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setGroupId(grp.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      groupId === grp.id
                        ? 'ring-2 ring-[#3D3A35] shadow-xs'
                        : 'hover:bg-white'
                    }`}
                    style={{
                      backgroundColor: grp.bgLightColor,
                      borderColor: grp.borderColor,
                      color: grp.textColor,
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: grp.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{grp.name}</p>
                      <p className="text-[10px] opacity-75">{grp.members.length} members</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* If Personal Event: Category Pills */
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1.5">
                Personal Category
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'work', label: 'Work & Focus', icon: Briefcase, color: '#7096D4' },
                  { id: 'health', label: 'Health & Wellness', icon: Heart, color: '#8A9A5B' },
                  { id: 'personal', label: 'Personal & Gym', icon: Dumbbell, color: '#D48C70' },
                  { id: 'family', label: 'Family Commitment', icon: Home, color: '#C98A4B' },
                  { id: 'errand', label: 'Errands & Study', icon: BookOpen, color: '#A389D4' },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = personalCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPersonalCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#3D3A35] text-white border-[#3D3A35]'
                          : 'bg-white text-[#5C574F] border-[#E8E4D9] hover:bg-[#F7F3EB]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isPersonalEvent
                  ? "e.g., Dentist Checkup, Deep Work Sprint, Gym Training, Studio Class"
                  : "e.g., Saturday Matcha Brunch, Board Game Night, Sunset Hike"
              }
              className="w-full px-4 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
            />
          </div>

          {/* Mode Selector Toggle (for group gatherings only) */}
          {!isPersonalEvent && (
            <div className="p-3 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#3D3A35]">
                  {isPollingMode ? 'Mode: Multi-Option Time Poll' : 'Mode: Fixed Confirmed Date & Time'}
                </p>
                <p className="text-[11px] text-[#8E8A81]">
                  {isPollingMode ? 'Friends vote on which time slot works best' : 'Set an exact scheduled meetup time'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPollingMode(!isPollingMode)}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E4D9] text-xs font-bold text-[#8A9A5B] shadow-2xs hover:bg-[#FDFCF8]"
              >
                Switch to {isPollingMode ? 'Fixed Time' : 'Time Polling'}
              </button>
            </div>
          )}

          {/* Date & Time Fields */}
          {!isPollingMode || isPersonalEvent ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">Start Time *</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#5C574F] mb-1">End Time *</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-[#5C574F]">
                  Proposed Time Slot Options ({proposedSlots.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="text-xs font-bold text-[#8A9A5B] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Another Slot
                </button>
              </div>

              {proposedSlots.map((slot, index) => (
                <div key={index} className="p-3 bg-white rounded-xl border border-[#E8E4D9] flex items-center gap-2">
                  <span className="text-xs font-bold text-[#8A9A5B] w-6">#{index + 1}</span>
                  <input
                    type="date"
                    required
                    value={slot.date}
                    onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                    className="flex-1 px-2 py-1 bg-[#FDFCF8] border border-[#E8E4D9] rounded-lg text-xs text-[#3D3A35]"
                  />
                  <input
                    type="time"
                    required
                    value={slot.startTime}
                    onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                    className="w-24 px-2 py-1 bg-[#FDFCF8] border border-[#E8E4D9] rounded-lg text-xs text-[#3D3A35]"
                  />
                  <span className="text-xs text-[#8E8A81]">–</span>
                  <input
                    type="time"
                    required
                    value={slot.endTime}
                    onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                    className="w-24 px-2 py-1 bg-[#FDFCF8] border border-[#E8E4D9] rounded-lg text-xs text-[#3D3A35]"
                  />
                  {proposedSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Location & Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
              Location / Venue (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isPersonalEvent ? "e.g., Health Clinic, Gym, Home Office" : "e.g., Komorebi Tea House, Alex's Loft"}
              className="w-full px-4 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
            />
          </div>

          {/* Notes / Plan description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
              Notes & Details
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Bring materials, free parking behind the building..."
              className="w-full px-4 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
            />
          </div>

          {/* Broadcast Notification banner */}
          {!isPersonalEvent && (
            <div className="p-3 bg-[#F3F6EC] border border-[#C9D6A8] rounded-xl flex items-center gap-2 text-xs text-[#485526]">
              <Send className="w-4 h-4 text-[#8A9A5B] shrink-0" />
              <span>
                All {selectedGroup?.members.length || 4} members in <strong>{selectedGroup?.name}</strong> will receive automatic invitation and verification alerts!
              </span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E4D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E8E4D9] text-xs font-bold text-[#5C574F] hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-sm"
            >
              {isPersonalEvent
                ? 'Save Personal Life Event'
                : isPollingMode
                ? 'Send Time Poll to Friends'
                : 'Schedule & Notify Group'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
