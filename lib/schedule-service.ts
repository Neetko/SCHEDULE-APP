import { supabase } from "./supabase"

export class ScheduleService {
  // Get today's schedule
  static async getTodaySchedule(): Promise<Record<string, { status: string; activity: string }>> {
    const today = new Date().toISOString().split("T")[0]

    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("time_slot, status, activity")
        .eq("date", today)
        .order("time_slot")

      if (error) throw error

      // Create a complete 24-hour schedule
      const schedule: Record<string, { status: string; activity: string }> = {}

      // Initialize all 24 hours
      for (let i = 0; i < 24; i++) {
        const timeSlot = `${i.toString().padStart(2, "0")}:00:00`
        schedule[timeSlot] = { status: "free", activity: "Available" }
      }

      // Override with actual data from database
      data?.forEach((entry) => {
        schedule[entry.time_slot] = {
          status: entry.status,
          activity: entry.activity,
        }
      })

      return schedule
    } catch (error) {
      console.error("Error fetching today schedule:", error)
      throw error
    }
  }

  // Get schedule for a specific date
  static async getScheduleForDate(date: string): Promise<Record<string, { status: string; activity: string }>> {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("time_slot, status, activity")
        .eq("date", date)
        .order("time_slot")

      if (error) throw error

      // Create a complete 24-hour schedule
      const schedule: Record<string, { status: string; activity: string }> = {}

      // Initialize all 24 hours
      for (let i = 0; i < 24; i++) {
        const timeSlot = `${i.toString().padStart(2, "0")}:00:00`
        schedule[timeSlot] = { status: "free", activity: "Available" }
      }

      // Override with actual data from database
      data?.forEach((entry) => {
        schedule[entry.time_slot] = {
          status: entry.status,
          activity: entry.activity,
        }
      })

      return schedule
    } catch (error) {
      console.error("Error fetching schedule for date:", error)
      throw error
    }
  }

  // Save or update a time slot
  static async saveTimeSlot(
    date: string,
    timeSlot: string,
    status: string,
    activity: string,
    description = "",
  ): Promise<void> {
    try {
      const { error } = await supabase.from("schedules").upsert(
        {
          date,
          time_slot: timeSlot,
          status,
          activity,
          description,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "date,time_slot",
        },
      )

      if (error) throw error
    } catch (error) {
      console.error("Error saving time slot:", error)
      throw error
    }
  }

  // Save entire day schedule
  static async saveDaySchedule(
    date: string,
    schedule: Record<string, { status: string; activity: string; description?: string }>,
  ): Promise<void> {
    try {
      const scheduleEntries = Object.entries(schedule).map(([timeSlot, data]) => ({
        date,
        time_slot: timeSlot,
        status: data.status,
        activity: data.activity,
        description: data.description || "",
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from("schedules").upsert(scheduleEntries, {
        onConflict: "date,time_slot",
      })

      if (error) throw error
    } catch (error) {
      console.error("Error saving day schedule:", error)
      throw error
    }
  }

  // Get activity statistics for the last 30 days
  static async getActivityStats(): Promise<[string, number][]> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("schedules")
        .select("activity")
        .gte("date", thirtyDaysAgoStr)
        .neq("activity", "Available")

      if (error) throw error

      // Count activities
      const activityCounts: Record<string, number> = {}
      data?.forEach((entry) => {
        activityCounts[entry.activity] = (activityCounts[entry.activity] || 0) + 1
      })

      // Sort by count and return top 10
      return Object.entries(activityCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    } catch (error) {
      console.error("Error fetching activity stats:", error)
      return []
    }
  }

  // Get available dates (dates with schedule data)
  static async getAvailableDates(): Promise<string[]> {
    try {
      const { data, error } = await supabase.from("schedules").select("date").order("date", { ascending: false })

      if (error) throw error

      // Get unique dates
      const uniqueDates = [...new Set(data?.map((entry) => entry.date) || [])]
      return uniqueDates
    } catch (error) {
      console.error("Error fetching available dates:", error)
      return []
    }
  }
}
