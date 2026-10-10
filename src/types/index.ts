export type AdminRole = "master_admin" | "event_manager" | "attendance_staff" | "analyst";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
}

export type EventLifecycle = "draft" | "published" | "live" | "completed" | "archived";
export type RegistrationState = "upcoming" | "open" | "closed" | "full";
export type VenueMode = "in-person" | "online" | "hybrid";

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "url"
  | "date"
  | "info";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface ConditionalRule {
  targetFieldId: string;
  operator: "equals" | "not_equals" | "contains";
  value: string;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  patternErrorMessage?: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  conditional?: ConditionalRule;
  appliesTo?: "leader" | "member" | "both";
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface TeamConfig {
  enabled: boolean;
  minSize: number;
  maxSize: number;
  teamNameRequired?: boolean;
  teamSizeFieldId?: string;
  memberFields?: FormField[];
}

export interface RegistrationFormSchema {
  version: number;
  sections: FormSection[];
  teamConfig?: TeamConfig;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  category: "Design" | "Workshop" | "Hackathon" | "Conference" | "Exhibition" | "Social";
  shortDescription: string;
  description: string;
  posterUrl: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueMode: VenueMode;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  lifecycle: EventLifecycle;
  registrationState: RegistrationState;
  hasTeams: boolean;
  hasRounds: boolean;
  featured?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  contactEmail?: string;
  contactPhone?: string;
  communityLink?: string;
  registrationForm?: RegistrationFormSchema;
}

export interface Participant {
  id: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  year?: string;
  teamId?: string;
  teamName?: string;
  registeredAt: string;
  status: "registered" | "waitlisted" | "cancelled";
  attendanceStatus: "not_checked_in" | "checked_in";
  checkedInAt?: string;
  qrCredentialId: string;
}

export interface Team {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  captainName: string;
  captainEmail: string;
  memberCount: number;
  maxMembers: number;
  status: "complete" | "incomplete";
  registeredAt: string;
}

export interface Round {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  order: number;
  startTime: string;
  venue: string;
  status: "upcoming" | "in_progress" | "completed";
  eligibleCount: number;
  advancedCount?: number;
}

export interface CertificateRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  recipientName: string;
  recipientEmail: string;
  certificateNumber: string;
  issuedAt: string;
  status: "eligible" | "issued" | "revoked";
}

export interface CommunicationJob {
  id: string;
  eventId: string;
  eventTitle: string;
  subject: string;
  type: "confirmation" | "reminder" | "announcement" | "certificate";
  recipientCount: number;
  status: "queued" | "processing" | "sent" | "failed";
  scheduledAt: string;
  deliveredAt?: string;
}

export interface UpcomingOperation {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  type: "registration_closing" | "event_starting" | "round_starting" | "certificates_pending";
  date: string;
  time: string;
  priority: "low" | "medium" | "high";
  actionUrl: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

export interface DashboardMetrics {
  totalEvents: {
    value: number;
    changeText: string;
    subtext: string;
  };
  totalRegistrations: {
    value: number;
    changeText: string;
    subtext: string;
  };
  attendanceRate: {
    value: string;
    checkedInCount: number;
    totalExpected: number;
    subtext: string;
  };
  certificatesIssued: {
    value: number;
    pendingCount: number;
    subtext: string;
  };
}
