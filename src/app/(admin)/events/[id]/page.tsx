"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  ArrowUpRight,
  QrCode,
  Edit3,
  Send,
  Download,
  CheckCircle2,
  Clock,
  Mail,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  Save,
  X,
  AlertTriangle,
  UserCheck,
  Building2,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { SlideOver } from "@/components/ui/slide-over";
import { MOCK_EVENTS, MOCK_PARTICIPANTS, MOCK_ROUNDS, MOCK_TEAMS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Participant, EventItem } from "@/types";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

const MANAGEMENT_TABS = [
  { id: "overview", label: "Overview & Telemetry" },
  { id: "registrations", label: "Registrations & Passes" },
  { id: "capacity", label: "Capacity Control" },
  { id: "rounds", label: "Competition Stages" },
  { id: "communications", label: "Outbox & Passes" },
];

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const initialEvent =
    MOCK_EVENTS.find((e) => e.id === id) || MOCK_EVENTS[0];

  // Local state for Event Management (Client UI Preview Mode)
  const [event, setEvent] = useState<EventItem>(initialEvent);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState("all");

  // Attendees list specific to this event
  const [attendees, setAttendees] = useState<Participant[]>(
    MOCK_PARTICIPANTS.filter((p) => p.eventId === initialEvent.id || initialEvent.id === "evt-01")
  );

  // Detail drawers and edit modals
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: event.title,
    category: event.category,
    venue: event.venue,
    shortDescription: event.shortDescription,
    description: event.description,
    capacity: event.capacity,
    startDate: event.startDate,
  });

  // Capacity adjustment state
  const [tempCapacity, setTempCapacity] = useState(event.capacity);
  const [capacityFeedback, setCapacityFeedback] = useState<string | null>(null);

  // Communications / re-dispatch modal state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");

  // Filtering attendees
  const filteredAttendees = attendees.filter((a) => {
    const matchesFilter =
      registrationStatusFilter === "all" ||
      (registrationStatusFilter === "checked_in" && a.attendanceStatus === "checked_in") ||
      (registrationStatusFilter === "pending" && a.attendanceStatus === "not_checked_in");
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.registrationId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleCheckIn = (participantId: string) => {
    setAttendees((prev) =>
      prev.map((p) => {
        if (p.id === participantId) {
          const isCurrentlyChecked = p.attendanceStatus === "checked_in";
          const updated: Participant = {
            ...p,
            attendanceStatus: isCurrentlyChecked ? "not_checked_in" : "checked_in",
            checkedInAt: isCurrentlyChecked ? undefined : new Date().toISOString(),
          };
          if (selectedParticipant?.id === participantId) {
            setSelectedParticipant(updated);
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleSaveEventInfo = () => {
    setEvent((prev) => ({
      ...prev,
      title: editFormData.title,
      category: editFormData.category as EventItem["category"],
      venue: editFormData.venue,
      shortDescription: editFormData.shortDescription,
      description: editFormData.description,
      capacity: editFormData.capacity,
    }));
    setIsEditModalOpen(false);
  };

  const handleUpdateCapacity = () => {
    if (tempCapacity < 1) {
      setCapacityFeedback("Capacity must be at least 1 seat.");
      return;
    }
    setEvent((prev) => ({ ...prev, capacity: tempCapacity }));
    setCapacityFeedback(`Capacity updated to ${tempCapacity} seats.`);
    setTimeout(() => setCapacityFeedback(null), 4000);
  };

  const percentFilled = Math.min(
    100,
    Math.round((event.registeredCount / event.capacity) * 100)
  );

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto min-w-0">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Event Directory</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditFormData({
                title: event.title,
                category: event.category,
                venue: event.venue,
                shortDescription: event.shortDescription,
                description: event.description,
                capacity: event.capacity,
                startDate: event.startDate,
              });
              setIsEditModalOpen(true);
            }}
            className="rounded-full border-[#E5E7EA] dark:border-[#30353A] gap-1.5 text-xs font-semibold h-9 px-3.5"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Event</span>
          </Button>

          <Link href={`/e/${event.slug}`} target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-[#E5E7EA] dark:border-[#30353A] gap-1.5 text-xs font-semibold h-9 px-3.5"
            >
              <span>Public Page</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Link href="/attendance">
            <Button
              variant="charcoal"
              size="sm"
              className="rounded-full gap-1.5 text-xs font-semibold h-9 px-4 shadow-sm"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Launch Desk Scanner</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Event Header Banner Card */}
      <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        <div className="relative min-h-[200px] sm:min-h-[260px] w-full overflow-hidden bg-[#17191C]">
          <img
            src={event.heroImage || event.posterUrl}
            alt={event.title}
            style={{ objectPosition: event.heroImageFocalPoint || event.focalPoint || "center" }}
            className="h-full w-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17191C] via-[#17191C]/40 to-transparent" />

          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-white/95 text-[#17191C] font-bold text-[10px] backdrop-blur-md">
              {event.category}
            </Badge>
            <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
              {event.lifecycle}
            </span>
          </div>

          <div className="absolute bottom-5 left-5 right-5 text-white space-y-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 line-clamp-1 max-w-2xl">
              {event.shortDescription}
            </p>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F4F5F6] dark:divide-[#262A2E] border-b border-[#F4F5F6] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#151719] text-xs">
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] dark:text-[#656B73] text-[10px] font-bold uppercase">Schedule</span>
            <div className="font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#8A9098]" />
              <span className="truncate">{formatDate(event.startDate)}</span>
            </div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] dark:text-[#656B73] text-[10px] font-bold uppercase">Venue</span>
            <div className="font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#8A9098]" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] dark:text-[#656B73] text-[10px] font-bold uppercase">Capacity Meter</span>
            <div className="font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#8A9098]" />
              <span>{event.registeredCount} / {event.capacity} ({percentFilled}%)</span>
            </div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] dark:text-[#656B73] text-[10px] font-bold uppercase">Desk Check-in</span>
            <div className="font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#25292F] dark:text-[#E8EAED]" />
              <span>{attendees.filter((a) => a.attendanceStatus === "checked_in").length} Checked In</span>
            </div>
          </div>
        </div>
      </div>

      {/* Management Navigation Tabs */}
      <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3 shadow-sm overflow-x-auto">
        <AnimatedTabs
          tabs={MANAGEMENT_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          layoutId="eventMgmtFilterPill"
        />
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* TAB 1: Overview & Telemetry */}
        {activeTab === "overview" && (
          <motion.div
            key="tab-overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
          >
            {/* Left 7 Cols: Narrative & Configuration */}
            <div className="lg:col-span-7 space-y-5">
              <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">Event Specification</h2>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7] leading-relaxed">
                  {event.description}
                </p>

                <div className="pt-3 border-t border-[#F4F5F6] dark:border-[#262A2E] grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#8A9098] dark:text-[#656B73] block text-[10px] uppercase font-bold">Participation Mode</span>
                    <p className="font-semibold text-[#17191C] dark:text-[#F1F2F3] capitalize">{event.hasTeams ? "Team-Based (2-4 Members)" : "Individual Registrations"}</p>
                  </div>
                  <div>
                    <span className="text-[#8A9098] dark:text-[#656B73] block text-[10px] uppercase font-bold">Competition Stages</span>
                    <p className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{event.hasRounds ? "Multi-Stage Progression Active" : "Single Unified Session"}</p>
                  </div>
                </div>
              </div>

              {/* Registration Capacity Progress Bar */}
              <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">Registration Velocity</h3>
                    <p className="text-xs text-[#656B73] dark:text-[#989EA7]">
                      {event.capacity - event.registeredCount} seats remaining until automatic closing.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">{percentFilled}% Filled</span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F0F1F2] dark:bg-[#151719]">
                  <div
                    style={{ width: `${percentFilled}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentFilled >= 90 ? "bg-[#25292F] dark:bg-[#E8EAED]" : "bg-[#989EA7] dark:bg-[#656B73]"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Operational Checklist & Fast CTAs */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">Operational Checklist</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-[#151719] border border-[#F4F5F6] dark:border-[#262A2E]">
                    <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">QR Ticket Passes Signed</span>
                    <CheckCircle2 className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-[#151719] border border-[#F4F5F6] dark:border-[#262A2E]">
                    <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">Check-in Terminal Configured</span>
                    <CheckCircle2 className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-[#151719] border border-[#F4F5F6] dark:border-[#262A2E]">
                    <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">Attendance Ledger Active</span>
                    <CheckCircle2 className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/attendance">
                    <Button variant="charcoal" className="w-full rounded-full text-xs font-semibold h-10 shadow-sm gap-2">
                      <QrCode className="h-4 w-4" />
                      <span>Open Live Gate Scanner</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: Registrations & Passes */}
        {activeTab === "registrations" && (
          <motion.div
            key="tab-registrations"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Search & Filter Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRegistrationStatusFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    registrationStatusFilter === "all"
                      ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                      : "bg-[#F4F5F6] dark:bg-[#151719] text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                  }`}
                >
                  All ({attendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationStatusFilter("checked_in")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    registrationStatusFilter === "checked_in"
                      ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                      : "bg-[#F4F5F6] dark:bg-[#151719] text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                  }`}
                >
                  Checked In ({attendees.filter((a) => a.attendanceStatus === "checked_in").length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationStatusFilter("pending")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    registrationStatusFilter === "pending"
                      ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                      : "bg-[#F4F5F6] dark:bg-[#151719] text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                  }`}
                >
                  Pending ({attendees.filter((a) => a.attendanceStatus === "not_checked_in").length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#656B73]" />
                <input
                  type="text"
                  placeholder="Search attendees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] pl-8 pr-3 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#656B73] focus:bg-white dark:focus:bg-[#1B1E21] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                />
              </div>
            </div>

            {/* Registrations Data Table */}
            <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] text-[11px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                    <tr>
                      <th className="py-3.5 pl-5 pr-4">Attendee</th>
                      <th className="px-4 py-3.5">Registration ID</th>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Team</th>
                      <th className="px-4 py-3.5">Desk Status</th>
                      <th className="px-4 py-3.5 text-right pr-5">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
                    {filteredAttendees.map((p) => {
                      const isCheckedIn = p.attendanceStatus === "checked_in";

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedParticipant(p)}
                          className="group cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#151719] transition-colors"
                        >
                          <td className="py-3.5 pl-5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] font-bold text-[9px]">
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-[13px] text-[#17191C] dark:text-[#F1F2F3] group-hover:underline tracking-[-0.01em]">{p.name}</p>
                                <p className="font-sans text-[11px] text-[#656B73] dark:text-[#9EA4AD] truncate max-w-[190px] mt-0.5">{p.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[10px] uppercase tracking-wider text-[#8A9098] dark:text-[#828892] whitespace-nowrap select-all font-medium">
                            {p.registrationId}
                          </td>
                          <td className="px-4 py-3.5 text-[#656B73] dark:text-[#989EA7]">
                            {p.department} ({p.year})
                          </td>
                          <td className="px-4 py-3.5 text-[#656B73] dark:text-[#989EA7]">
                            {p.teamName || <span className="text-[#8A9098] dark:text-[#656B73] italic">Individual</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                isCheckedIn ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]" : "bg-[#F0F1F2] dark:bg-[#151719] text-[#656B73] dark:text-[#989EA7]"
                              }`}
                            >
                              {isCheckedIn ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              <span>{isCheckedIn ? "Checked In" : "Pending"}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleCheckIn(p.id)}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${
                                isCheckedIn
                                  ? "border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#656B73] dark:text-[#989EA7] hover:bg-[#F4F5F6] dark:hover:bg-[#151719]"
                                  : "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] hover:bg-[#17191C] dark:hover:bg-white"
                              }`}
                            >
                              {isCheckedIn ? "Undo" : "Check In"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: Capacity Control */}
        {activeTab === "capacity" && (
          <motion.div
            key="tab-capacity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="max-w-2xl space-y-5"
          >
            <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">Adjust Event Capacity</h3>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7] mt-0.5">
                  Update maximum available seats. When registrations reach capacity, public forms will display &quot;Registration Full&quot;.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block">
                  Total Seat Limit
                </label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={tempCapacity}
                    onChange={(e) => setTempCapacity(Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <Button
                    variant="charcoal"
                    onClick={handleUpdateCapacity}
                    className="rounded-full text-xs font-semibold px-5"
                  >
                    Save Capacity
                  </Button>
                </div>

                {tempCapacity < event.registeredCount && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Capacity Warning:</strong>
                      <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                        The requested limit ({tempCapacity}) is less than the current registered attendee count ({event.registeredCount}). No existing registrations will be cancelled, but new registrations will be blocked immediately.
                      </p>
                    </div>
                  </div>
                )}

                {capacityFeedback && (
                  <div className="rounded-xl bg-[#F0F1F2] dark:bg-[#151719] border border-[#E5E7EA] dark:border-[#30353A] p-3 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                    {capacityFeedback}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: Competition Stages */}
        {activeTab === "rounds" && (
          <motion.div
            key="tab-rounds"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            {event.hasRounds ? (
              <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">Competition Stages</h3>
                    <p className="text-xs text-[#656B73] dark:text-[#989EA7]">Multi-round progression pipeline for {event.title}</p>
                  </div>
                  <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-3 py-1 text-xs font-semibold text-[#25292F] dark:text-[#E8EAED]">
                    Round 2 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MOCK_ROUNDS.map((round) => (
                    <div
                      key={round.id}
                      className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] text-xs font-bold">
                          {round.order}
                        </span>
                        <span className="text-[9px] font-bold uppercase rounded-full bg-[#EAECEF] dark:bg-[#22262A] px-2 py-0.5 text-[#17191C] dark:text-[#F1F2F3]">
                          {round.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">{round.name}</h4>
                      <div className="text-[11px] text-[#656B73] dark:text-[#989EA7] space-y-1">
                        <p>Venue: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{round.venue}</strong></p>
                        <p>Quota: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{round.advancedCount} Teams Advance</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-8 text-center space-y-3">
                <Trophy className="mx-auto h-8 w-8 text-[#8A9098] dark:text-[#656B73]" />
                <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">Single-Stage Event</h3>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7] max-w-md mx-auto">
                  This event is configured as a single continuous session without progressive elimination rounds.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: Outbox & Passes */}
        {activeTab === "communications" && (
          <motion.div
            key="tab-communications"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-5 max-w-2xl"
          >
            <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">Event Communications & Re-dispatch</h3>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7]">
                  Trigger batch pass re-dispatches or compose operational updates to attendees.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719]">
                  <div>
                    <h4 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">Batch QR Pass Re-dispatch</h4>
                    <p className="text-[11px] text-[#656B73] dark:text-[#989EA7]">Re-send signed passes to all {event.registeredCount} confirmed attendees.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold"
                    onClick={() => alert(`Batch pass re-dispatch job queued for ${event.registeredCount} attendees (Preview Mode).`)}
                  >
                    Re-send Passes
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719]">
                  <div>
                    <h4 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">Operational Announcement</h4>
                    <p className="text-[11px] text-[#656B73] dark:text-[#989EA7]">Send venue directions or schedule reminder.</p>
                  </div>
                  <Button
                    variant="charcoal"
                    size="sm"
                    className="rounded-full text-xs font-semibold shadow-sm"
                    onClick={() => setIsDispatchModalOpen(true)}
                  >
                    Compose Update
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SlideOver Drawer for Participant Pass Inspector */}
      <SlideOver
        isOpen={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        title="Participant Pass Detail"
        subtitle={selectedParticipant?.registrationId}
      >
        {selectedParticipant && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-5 text-center space-y-4">
              <div className="flex justify-between items-center border-b border-[#E5E7EA] dark:border-[#30353A] pb-3 text-left">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">SKETCH PASS</span>
                  <p className="font-mono text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">{selectedParticipant.registrationId}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                    selectedParticipant.attendanceStatus === "checked_in" ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]" : "bg-[#EAECEF] dark:bg-[#22262A] text-[#17191C] dark:text-[#F1F2F3]"
                  }`}
                >
                  {selectedParticipant.attendanceStatus === "checked_in" ? "Verified" : "Valid Ticket"}
                </span>
              </div>

              <div className="my-3 flex flex-col items-center justify-center rounded-xl bg-white dark:bg-[#1B1E21] p-4 border border-[#E5E7EA] dark:border-[#30353A]">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-[#17191C] text-white">
                  <QrCode className="h-20 w-20 text-white" />
                </div>
                <span className="mt-2 font-mono text-[10px] text-[#8A9098] dark:text-[#656B73]">
                  {selectedParticipant.qrCredentialId}
                </span>
              </div>

              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">{selectedParticipant.name}</h3>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7]">{selectedParticipant.email}</p>
                <p className="text-[11px] text-[#8A9098] dark:text-[#656B73]">{selectedParticipant.department} • {selectedParticipant.year}</p>
              </div>
            </div>

            <Button
              variant={selectedParticipant.attendanceStatus === "checked_in" ? "outline" : "charcoal"}
              className="w-full h-10 rounded-full text-xs font-semibold"
              onClick={() => toggleCheckIn(selectedParticipant.id)}
            >
              {selectedParticipant.attendanceStatus === "checked_in" ? "Undo Check-in" : "Mark as Checked In"}
            </Button>
          </div>
        )}
      </SlideOver>

      {/* Edit Event Information Dialog / Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-3">
              <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">Edit Event Information</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-1 text-[#656B73] dark:text-[#989EA7] hover:bg-[#F4F5F6] dark:hover:bg-[#151719]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Event Title *</label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CustomSelect
                  label="Category"
                  options={[
                    { value: "Design", label: "Design" },
                    { value: "Workshop", label: "Workshop" },
                    { value: "Hackathon", label: "Hackathon" },
                    { value: "Conference", label: "Conference" },
                    { value: "Exhibition", label: "Exhibition" },
                  ]}
                  value={editFormData.category}
                  onChange={(val) => setEditFormData({ ...editFormData, category: val as EventItem["category"] })}
                />

                <div>
                  <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Max Capacity</label>
                  <Input
                    type="number"
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, capacity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Venue / Location</label>
                  <Input
                    value={editFormData.venue}
                    onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                  />
                </div>

                <CustomDateTimePicker
                  label="Start Date & Time"
                  value={editFormData.startDate}
                  onChange={(val) => setEditFormData({ ...editFormData, startDate: val })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={editFormData.shortDescription}
                  onChange={(e) => setEditFormData({ ...editFormData, shortDescription: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-2.5 text-xs text-[#17191C] dark:text-[#F1F2F3] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Full Description</label>
                <textarea
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-2.5 text-xs text-[#17191C] dark:text-[#F1F2F3] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E7EA] dark:border-[#30353A]">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="charcoal"
                size="sm"
                className="rounded-full text-xs font-semibold shadow-sm px-4"
                onClick={handleSaveEventInfo}
              >
                Save Changes (Preview)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-3">
              <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">Broadcast Event Update</h3>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="rounded-full p-1 text-[#656B73] dark:text-[#989EA7] hover:bg-[#F4F5F6] dark:hover:bg-[#151719]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#656B73] dark:text-[#989EA7]">
                Recipient Count: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{event.registeredCount} Confirmed Attendees</strong>
              </p>

              <div>
                <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Subject</label>
                <Input
                  placeholder="e.g. Schedule Update for Tomorrow"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1">Message Content</label>
                <textarea
                  rows={4}
                  placeholder="Enter announcement details..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-2.5 text-xs text-[#17191C] dark:text-[#F1F2F3] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E7EA] dark:border-[#30353A]">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold"
                onClick={() => setIsDispatchModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="charcoal"
                size="sm"
                className="rounded-full text-xs font-semibold shadow-sm px-4"
                onClick={() => {
                  alert(`Broadcast queued for ${event.registeredCount} attendees (Preview Mode).`);
                  setIsDispatchModalOpen(false);
                }}
              >
                Send Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
