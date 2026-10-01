/**
 * Supabase database types — TheAstroKaur v1
 * Hand-authored to match the confirmed schema.
 * Regenerate with `npx supabase gen types typescript` once the schema is applied.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string | null
          display_name: string
          bio: string | null
          vision: string | null
          specialties: string[] | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          display_name?: string
          bio?: string | null
          vision?: string | null
          specialties?: string[] | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          display_name?: string
          bio?: string | null
          vision?: string | null
          specialties?: string[] | null
          is_published?: boolean
          updated_at?: string
        }
      }
      customer_profiles: {
        Row: {
          id: string
          auth_user_id: string
          display_name: string | null
          email: string
          date_of_birth: string | null
          time_of_birth: string | null
          time_uncertain: boolean
          place_of_birth: string | null
          avatar_seed: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          display_name?: string | null
          email: string
          date_of_birth?: string | null
          time_of_birth?: string | null
          time_uncertain?: boolean
          place_of_birth?: string | null
          avatar_seed?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          date_of_birth?: string | null
          time_of_birth?: string | null
          time_uncertain?: boolean
          place_of_birth?: string | null
          avatar_seed?: string | null
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          sort_order: number
          title: string
          description: string
          format: 'text' | 'voice_call'
          duration_minutes: number | null
          price_cents: number
          currency: string
          google_schedule_url: string | null
          stripe_payment_link_url: string | null
          requires_partner_details: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sort_order?: number
          title: string
          description: string
          format: 'text' | 'voice_call'
          duration_minutes?: number | null
          price_cents: number
          currency?: string
          google_schedule_url?: string | null
          stripe_payment_link_url?: string | null
          requires_partner_details?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          sort_order?: number
          title?: string
          description?: string
          format?: 'text' | 'voice_call'
          duration_minutes?: number | null
          price_cents?: number
          currency?: string
          google_schedule_url?: string | null
          stripe_payment_link_url?: string | null
          requires_partner_details?: boolean
          is_active?: boolean
          updated_at?: string
        }
      }
      reading_details: {
        Row: {
          id: string
          customer_id: string
          service_id: string
          google_calendar_event_id: string
          status: 'pending' | 'birth_details_received' | 'in_progress' | 'delivered' | 'cancelled'
          admin_notes: string | null
          partner_name: string | null
          partner_date_of_birth: string | null
          partner_time_of_birth: string | null
          partner_time_uncertain: boolean
          partner_place_of_birth: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          service_id: string
          google_calendar_event_id: string
          status?: 'pending' | 'birth_details_received' | 'in_progress' | 'delivered' | 'cancelled'
          admin_notes?: string | null
          partner_name?: string | null
          partner_date_of_birth?: string | null
          partner_time_of_birth?: string | null
          partner_time_uncertain?: boolean
          partner_place_of_birth?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'birth_details_received' | 'in_progress' | 'delivered' | 'cancelled'
          admin_notes?: string | null
          partner_name?: string | null
          partner_date_of_birth?: string | null
          partner_time_of_birth?: string | null
          partner_time_uncertain?: boolean
          partner_place_of_birth?: string | null
          updated_at?: string
        }
      }
      free_reading_requests: {
        Row: {
          id: string
          full_name: string
          email: string
          date_of_birth: string
          time_of_birth: string | null
          time_uncertain: boolean
          place_of_birth: string
          status: 'pending' | 'in_progress' | 'delivered'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          date_of_birth: string
          time_of_birth?: string | null
          time_uncertain?: boolean
          place_of_birth: string
          status?: 'pending' | 'in_progress' | 'delivered'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'in_progress' | 'delivered'
          admin_notes?: string | null
          updated_at?: string
        }
      }
      testimonials: {
        Row: {
          id: string
          customer_id: string | null
          author_name: string
          content: string
          consent_given: boolean
          is_published: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          author_name: string
          content: string
          consent_given?: boolean
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          content?: string
          consent_given?: boolean
          is_published?: boolean
          sort_order?: number
          updated_at?: string
        }
      }
      contact_messages: {
        Row: {
          id: string
          sender_name: string
          email: string
          subject: string | null
          message: string
          status: 'unread' | 'read' | 'replied' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_name: string
          email: string
          subject?: string | null
          message: string
          status?: 'unread' | 'read' | 'replied' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'unread' | 'read' | 'replied' | 'archived'
          updated_at?: string
        }
      }
      website_notifications: {
        Row: {
          id: string
          email_type: 'contact_form_acknowledgement' | 'free_reading_acknowledgement' | 'reading_delivered'
          recipient_email: string
          related_table: string | null
          related_id: string | null
          status: 'pending' | 'sent' | 'failed'
          retries: number
          sent_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email_type: 'contact_form_acknowledgement' | 'free_reading_acknowledgement' | 'reading_delivered'
          recipient_email: string
          related_table?: string | null
          related_id?: string | null
          status?: 'pending' | 'sent' | 'failed'
          retries?: number
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'failed'
          retries?: number
          sent_at?: string | null
          error_message?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience row type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type ReadingDetail = Database['public']['Tables']['reading_details']['Row']
export type FreeReadingRequest = Database['public']['Tables']['free_reading_requests']['Row']
export type Testimonial = Database['public']['Tables']['testimonials']['Row']
export type ContactMessage = Database['public']['Tables']['contact_messages']['Row']
export type WebsiteNotification = Database['public']['Tables']['website_notifications']['Row']
