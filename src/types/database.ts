/**
 * Supabase Database TypeScript Definitions
 * Accurately models public schema tables and relationships.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AdminRole = "master_admin" | "event_manager" | "attendance_staff" | "analyst";
export type EventLifecycle = "draft" | "published" | "live" | "completed" | "archived";
export type RegistrationState = "upcoming" | "open" | "closed" | "full";
export type VenueMode = "in-person" | "online" | "hybrid";
export type RegistrationMode = "individual" | "team";
export type RegistrationStatus = "registered" | "waitlisted" | "cancelled";
export type AttendanceStatus = "not_checked_in" | "checked_in";
export type CheckInMethod = "camera" | "manual" | "simulation";
export type CommunicationStatus = "queued" | "processing" | "sent" | "failed";

export interface Database {
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: AdminRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: AdminRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: AdminRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: string;
          short_description: string;
          description: string;
          poster_url: string | null;
          hero_image: string | null;
          hero_image_focal_point: string | null;
          directory_image: string | null;
          directory_image_focal_point: string | null;
          start_date: string;
          end_date: string;
          venue: string;
          venue_mode: VenueMode;
          capacity: number;
          registered_count: number;
          checked_in_count: number;
          lifecycle: EventLifecycle;
          registration_state: RegistrationState;
          has_teams: boolean;
          min_team_size: number | null;
          max_team_size: number | null;
          has_rounds: boolean;
          featured: boolean;
          contact_email: string | null;
          contact_phone: string | null;
          community_link: string | null;
          registration_form: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          category: string;
          short_description?: string;
          description?: string;
          poster_url?: string | null;
          hero_image?: string | null;
          hero_image_focal_point?: string | null;
          directory_image?: string | null;
          directory_image_focal_point?: string | null;
          start_date: string;
          end_date: string;
          venue: string;
          venue_mode?: VenueMode;
          capacity: number;
          registered_count?: number;
          checked_in_count?: number;
          lifecycle?: EventLifecycle;
          registration_state?: RegistrationState;
          has_teams?: boolean;
          min_team_size?: number | null;
          max_team_size?: number | null;
          has_rounds?: boolean;
          featured?: boolean;
          contact_email?: string | null;
          contact_phone?: string | null;
          community_link?: string | null;
          registration_form?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          category?: string;
          short_description?: string;
          description?: string;
          poster_url?: string | null;
          hero_image?: string | null;
          hero_image_focal_point?: string | null;
          directory_image?: string | null;
          directory_image_focal_point?: string | null;
          start_date?: string;
          end_date?: string;
          venue?: string;
          venue_mode?: VenueMode;
          capacity?: number;
          registered_count?: number;
          checked_in_count?: number;
          lifecycle?: EventLifecycle;
          registration_state?: RegistrationState;
          has_teams?: boolean;
          min_team_size?: number | null;
          max_team_size?: number | null;
          has_rounds?: boolean;
          featured?: boolean;
          contact_email?: string | null;
          contact_phone?: string | null;
          community_link?: string | null;
          registration_form?: Json;
          created_by?: string | null;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          captain_name: string;
          captain_email: string;
          member_count: number;
          max_members: number;
          status: string;
          custom_answers: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          captain_name: string;
          captain_email: string;
          member_count?: number;
          max_members?: number;
          status?: string;
          custom_answers?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          captain_name?: string;
          captain_email?: string;
          member_count?: number;
          max_members?: number;
          status?: string;
          custom_answers?: Json;
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          registration_id: string;
          event_id: string;
          team_id: string | null;
          mode: RegistrationMode;
          attendee_name: string;
          email: string;
          phone: string | null;
          department: string | null;
          year: string | null;
          status: RegistrationStatus;
          attendance_status: AttendanceStatus;
          checked_in_at: string | null;
          qr_credential_id: string;
          custom_answers: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          event_id: string;
          team_id?: string | null;
          mode?: RegistrationMode;
          attendee_name: string;
          email: string;
          phone?: string | null;
          department?: string | null;
          year?: string | null;
          status?: RegistrationStatus;
          attendance_status?: AttendanceStatus;
          checked_in_at?: string | null;
          qr_credential_id: string;
          custom_answers?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          event_id?: string;
          team_id?: string | null;
          mode?: RegistrationMode;
          attendee_name?: string;
          email?: string;
          phone?: string | null;
          department?: string | null;
          year?: string | null;
          status?: RegistrationStatus;
          attendance_status?: AttendanceStatus;
          checked_in_at?: string | null;
          qr_credential_id?: string;
          custom_answers?: Json;
          updated_at?: string;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          registration_id: string;
          event_id: string;
          checked_in_by: string | null;
          method: CheckInMethod;
          checked_in_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          event_id: string;
          checked_in_by?: string | null;
          method?: CheckInMethod;
          checked_in_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          event_id?: string;
          checked_in_by?: string | null;
          method?: CheckInMethod;
          checked_in_at?: string;
        };
      };
      rounds: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          round_order: number;
          start_time: string;
          venue: string;
          status: string;
          eligible_count: number;
          advanced_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          round_order?: number;
          start_time: string;
          venue: string;
          status?: string;
          eligible_count?: number;
          advanced_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          round_order?: number;
          start_time?: string;
          venue?: string;
          status?: string;
          eligible_count?: number;
          advanced_count?: number | null;
          updated_at?: string;
        };
      };
      certificates: {
        Row: {
          id: string;
          event_id: string;
          recipient_name: string;
          recipient_email: string;
          certificate_number: string;
          status: string;
          issued_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          recipient_name: string;
          recipient_email: string;
          certificate_number: string;
          status?: string;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          recipient_name?: string;
          recipient_email?: string;
          certificate_number?: string;
          status?: string;
          updated_at?: string;
        };
      };
      communications_outbox: {
        Row: {
          id: string;
          event_id: string;
          recipient_email: string;
          recipient_name: string;
          subject: string;
          template_type: string;
          payload: Json;
          status: CommunicationStatus;
          attempts: number;
          last_error: string | null;
          scheduled_at: string;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          recipient_email: string;
          recipient_name: string;
          subject: string;
          template_type: string;
          payload?: Json;
          status?: CommunicationStatus;
          attempts?: number;
          last_error?: string | null;
          scheduled_at?: string;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          recipient_email?: string;
          recipient_name?: string;
          subject?: string;
          template_type?: string;
          payload?: Json;
          status?: CommunicationStatus;
          attempts?: number;
          last_error?: string | null;
          delivered_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string;
          actor_email: string;
          action: string;
          target: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name: string;
          actor_email: string;
          action: string;
          target: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string;
          actor_email?: string;
          action?: string;
          target?: string;
          details?: Json;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      register_for_event: {
        Args: {
          p_event_id: string;
          p_mode: RegistrationMode;
          p_attendee_name: string;
          p_email: string;
          p_phone?: string | null;
          p_department?: string | null;
          p_year?: string | null;
          p_team_name?: string | null;
          p_team_members?: Json;
          p_custom_answers?: Json;
        };
        Returns: Json;
      };
      claim_outbox_batch: {
        Args: {
          p_batch_size?: number;
          p_max_attempts?: number;
        };
        Returns: Database["public"]["Tables"]["communications_outbox"]["Row"][];
      };
    };
    Enums: {
      admin_role: AdminRole;
      event_lifecycle: EventLifecycle;
      registration_state: RegistrationState;
      venue_mode: VenueMode;
      registration_mode: RegistrationMode;
      registration_status: RegistrationStatus;
      attendance_status: AttendanceStatus;
      check_in_method: CheckInMethod;
      communication_status: CommunicationStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
