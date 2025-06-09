"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, BarChart3, RefreshCw, Clock, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { ScheduleService } from "@/lib/schedule-service"
import { isSupabaseConfigured } from "@/lib/supabase"

export default function GuestPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentDate, setCurrentDate] = useState("")
  const [selectedHistoricalDate, setSelectedHistoricalDate] = useState(new Date())
  const [showHistorical, setShowHistorical] = useState(false)

  // Data states
  const [todaySchedule, setTodaySchedule] = useState<Record<string, { status: string; activity: string }>>({})
  const [historicalSchedule, setHistoricalSchedule] = useState<Record<string, { status: string; activity: string }>>({})
  const [activityStats, setActivityStats] = useState<[string, number][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now)
      setCurrentDate(
        now.toLocaleDateString("hr-HR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load historical schedule when date changes
  useEffect(() => {
    if (showHistorical) {
      loadHistoricalSchedule()
    }
  }, [selectedHistoricalDate, showHistorical])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const [schedule, stats] = await Promise.all([
          ScheduleService.getTodaySchedule(),
          ScheduleService.getActivityStats(),
        ])

        setTodaySchedule(schedule)
        setActivityStats(stats)
      } else {
        // Fallback to mock data if Supabase not configured
        const emptySchedule: Record<string, { status: string; activity: string }> = {}
        for (let i = 0; i < 24; i++) {
          const hour = i.toString().padStart(2, "0") + ":00:00"
          if (i >= 4 && i <= 7) {
            emptySchedule[hour] = { status: "busy", activity: "Sleeping" }
          } else if (i >= 10 && i <= 12) {
            emptySchedule[hour] = { status: "busy", activity: "Work meeting" }
          } else if (i === 18) {
            emptySchedule[hour] = { status: "busy", activity: "Dinner" }
          } else if (i >= 22) {
            emptySchedule[hour] = { status: "busy", activity: "Personal time" }
          } else {
            emptySchedule[hour] = { status: "free", activity: "Available" }
          }
        }
        setTodaySchedule(emptySchedule)
        setActivityStats([
          ["Available", 15],
          ["Work meeting", 8],
          ["Personal time", 5],
          ["Sleeping", 4],
          ["Dinner", 2],
        ])
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadHistoricalSchedule = async () => {
    const dateKey = selectedHistoricalDate.toISOString().split("T")[0]
    try {
      if (isSupabaseConfigured) {
        const schedule = await ScheduleService.getScheduleForDate(dateKey)
        setHistoricalSchedule(schedule)
      } else {
        // Fallback to mock data
        const emptySchedule: Record<string, { status: string; activity: string }> = {}
        for (let i = 0; i < 24; i++) {
          const hour = i.toString().padStart(2, "0") + ":00:00"
          const isAvailable = Math.random() > 0.3
          emptySchedule[hour] = isAvailable
            ? { status: "free", activity: "Available" }
            : { status: "busy", activity: ["Work", "Meeting", "Personal", "Sleep"][Math.floor(Math.random() * 4)] }
        }
        setHistoricalSchedule(emptySchedule)
      }
    } catch (error) {
      console.error("Error loading historical schedule:", error)
    }
  }

  const getCurrentHour = () => {
    return currentTime.getHours().toString().padStart(2, "0") + ":00:00"
  }

  const getStatusColor = (status: string) => {
    return status === "free" ? "bg-green-500" : "bg-red-500"
  }

  const getStatusBadgeVariant = (status: string) => {
    return status === "free" ? "outline" : "destructive"
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedHistoricalDate)
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))

    // Don't go beyond today or more than 30 days back
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 29)

    if (newDate <= today && newDate >= thirtyDaysAgo) {
      setSelectedHistoricalDate(newDate)
    }
  }

  const refreshData = () => {
    loadInitialData()
    if (showHistorical) {
      loadHistoricalSchedule()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/background-collage.jpg"
            alt="Background collage"
            fill
            className="object-cover opacity-10 animate-pulse"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md bg-black/80 backdrop-blur-sm border-white/20 text-white">
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
              <p className="text-lg">Učitavam raspored...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Scrolling Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 animate-pulse">
          <Image
            src="/background-collage.jpg"
            alt="Background collage"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
        {/* Today's Schedule Card */}
        <Card className="w-full max-w-2xl bg-black/80 backdrop-blur-sm border-white/20 text-white">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-center mb-4">
                <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                  Nikov plan za danas
                </h1>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4" />
                <span>{currentDate}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-lg font-semibold mt-2">
                <Clock className="w-5 h-5" />
                <span>{currentTime.toLocaleTimeString("sr-RS")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshData}
                  className="ml-2 text-white hover:bg-white/10 p-1 h-7"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Current Status */}
            <div className="mb-6 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-2">Trenutno</h2>
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(todaySchedule[getCurrentHour()]?.status || "free")}`}
                />
                <span className="text-lg">{todaySchedule[getCurrentHour()]?.activity || "Available"}</span>
                <Badge
                  variant={getStatusBadgeVariant(todaySchedule[getCurrentHour()]?.status || "free")}
                  className={`text-white bg-black ${todaySchedule[getCurrentHour()]?.status === "free" ? "border-green-500" : "border-red-500"}`}
                >
                  {todaySchedule[getCurrentHour()]?.status === "free" ? "Slobodan" : "Zauzet"}
                </Badge>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-4">Raspored za danas</h3>
              <div className="grid gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                {Object.entries(todaySchedule).map(([time, data]) => {
                  const isCurrentHour = time === getCurrentHour()
                  // Format time to remove seconds for cleaner display
                  const displayTime = time.substring(0, 5) // Convert HH:MM:SS to HH:MM

                  return (
                    <div
                      key={time}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isCurrentHour ? "bg-white/20 border border-white/30" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-mono text-sm w-12 flex-shrink-0">{displayTime}</span>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(data.status)}`} />
                        <span className={`truncate flex-1 ${isCurrentHour ? "font-semibold" : ""}`}>
                          {data.activity}
                        </span>
                      </div>
                      <Badge
                        variant={getStatusBadgeVariant(data.status)}
                        className={`text-xs text-white bg-black flex-shrink-0 ml-2 ${data.status === "free" ? "border-green-500" : "border-red-500"}`}
                      >
                        {data.status === "free" ? "Slobodan" : "Zauzet"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>Raspored se ažurira automatski u ponoć</p>
            </div>
          </div>
        </Card>

        {/* Historical Data Card */}
        <Card className="w-full max-w-2xl bg-black/80 backdrop-blur-sm border-white/20 text-white">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Prošli mjeseci
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistorical(!showHistorical)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {showHistorical ? "Sakrij" : "Prikaži"}
              </Button>
            </div>

            {showHistorical && (
              <>
                {/* Date Navigation */}
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateDate("prev")}
                    className="text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-semibold">
                    {selectedHistoricalDate.toLocaleDateString("hr-HR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateDate("next")}
                    className="text-white hover:bg-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Historical Schedule */}
                <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {Object.entries(historicalSchedule).map(([time, data]) => {
                    const displayTime = time.substring(0, 5) // Convert HH:MM:SS to HH:MM

                    return (
                      <div
                        key={time}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="font-mono text-xs w-10 flex-shrink-0">{displayTime}</span>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(data.status)}`} />
                          <span className="text-sm truncate flex-1">{data.activity}</span>
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(data.status)}
                          className={`text-xs text-white bg-black flex-shrink-0 ml-2 ${data.status === "free" ? "border-green-500" : "border-red-500"}`}
                        >
                          {data.status === "free" ? "Slobodan" : "Zauzet"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Statistics Card */}
        <Card className="w-full max-w-2xl bg-black/80 backdrop-blur-sm border-white/20 text-white">
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-orange-400" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Statistike (zadnjih 30 dana)
              </h2>
            </div>

            {activityStats.length > 0 ? (
              <div className="space-y-4">
                {activityStats.map(([activity, count], index) => {
                  const maxCount = activityStats[0][1]
                  const percentage = (count / maxCount) * 100

                  return (
                    <div key={activity} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{activity}</span>
                        <span className="text-sm text-gray-300">{count} puta</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            index === 0
                              ? "bg-gradient-to-r from-orange-400 to-red-400"
                              : index === 1
                                ? "bg-gradient-to-r from-blue-400 to-cyan-400"
                                : index === 2
                                  ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                  : index === 3
                                    ? "bg-gradient-to-r from-purple-400 to-pink-400"
                                    : index === 4
                                      ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                      : "bg-gradient-to-r from-gray-400 to-gray-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p>Nema podataka za prikaz statistika</p>
                <p className="text-sm mt-2">Dodajte raspored aktivnosti da biste vidjeli statistike</p>
              </div>
            )}
          </div>
        </Card>

        {/* Back to Login */}
        <div className="text-center">
          <Link href="/">
            <Button
              variant="outline"
              className="bg-gray-700/50 text-white border-gray-600 hover:bg-gray-600/50 backdrop-blur-sm"
            >
              Back to Login
            </Button>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  )
}
