"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, BarChart3, RefreshCw, Clock, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { ScheduleService } from "@/lib/schedule-service"
import { TodosService } from "@/lib/todos-service"
import { isSupabaseConfigured } from "@/lib/supabase"

export default function GuestPage() {
  // Language state: 'hr' or 'en'
  const [lang, setLang] = useState<'hr' | 'en'>('hr')

  // Static text translations
  const TEXT = {
    mainTitle: {
      hr: 'Nikov Raspored',
      en: "Niko's Schedule",
    },
    todoList: {
      hr: 'To Do List',
      en: 'To Do List',
    },
    scheduleToday: {
      hr: 'Raspored za danas',
      en: 'Schedule for Today',
    },
    available: {
      hr: 'Dostupan',
      en: 'Available',
    },
    unavailable: {
      hr: 'Nedostupan',
      en: 'Unavailable',
    },
    noTasks: {
      hr: 'Nema zadataka.',
      en: 'No tasks yet.',
    },
    managedOnAdmin: {
      hr: '(Zadaci se uređuju na admin stranici)',
      en: '(Tasks are managed on the admin page)',
    },
    footer: {
      hr: 'Raspored se ažurira automatski u ponoć',
      en: 'Schedule updates automatically at midnight',
    },
  }
  const [currentTime, setCurrentTime] = useState(new Date())
  const currentSlotRef = useRef<HTMLDivElement | null>(null)
  const gridContainerRef = useRef<HTMLDivElement | null>(null)
  const [currentDate, setCurrentDate] = useState("")
  const [selectedHistoricalDate, setSelectedHistoricalDate] = useState(new Date())
  const [showHistorical, setShowHistorical] = useState(false)

  // Data states
  const [todaySchedule, setTodaySchedule] = useState<Record<string, { status: string; activity: string }>>({})
  const [historicalSchedule, setHistoricalSchedule] = useState<Record<string, { status: string; activity: string }>>({})
  const [activityStats, setActivityStats] = useState<[string, number][]>([])
  const [todos, setTodos] = useState<Array<{ id: string; text: string; completed: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now)
      setCurrentDate(
        now.toLocaleDateString(
          lang === 'hr' ? 'hr-HR' : 'en-US',
          lang === 'hr'
            ? {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }
            : {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }
        )
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [lang])

  // Scroll to current slot only once on initial mount
  const didScrollRef = useRef(false)
  useEffect(() => {
    if (!didScrollRef.current && currentSlotRef.current && gridContainerRef.current) {
      setTimeout(() => {
        const slot = currentSlotRef.current
        const container = gridContainerRef.current
        if (slot && container) {
          // Calculate offset of slot relative to container
          const slotTop = slot.offsetTop - container.offsetTop
          container.scrollTo({
            top: slotTop,
            behavior: "smooth"
          })
        }
      }, 0)
      didScrollRef.current = true
    }
  }, [todaySchedule])

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

  // Fetch todos on mount
  useEffect(() => {
    const fetchTodos = async () => {
      if (!isSupabaseConfigured) return
      try {
        const result = await TodosService.getTodos()
        setTodos(result)
      } catch (error) {
        console.error("Error fetching todos:", error)
      }
    }
    fetchTodos()
  }, [])

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
            emptySchedule[hour] = { status: "free", activity: "" } // Default to empty activity
          }
        }
        setTodaySchedule(emptySchedule)
        setActivityStats([
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
            src="/background-collage.jpeg"
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
    <div className="min-h-screen relative overflow-y-auto">
      {/* Background Image */}
      {/* Sliding Background Image Container */}
      <div className="picbox2 w-screen">
        <div className="sliding-background"></div>
        <div className="absolute inset-0 bg-black/60 z-0"></div> {/* Opaque black layer */}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center space-y-6 pt-8 pb-8 px-2 sm:px-4 md:px-8">
        {/* Today's Schedule Card */}
        <Card className="w-full max-w-2xl bg-black/80 backdrop-blur-sm border-white/20 text-white pt-4">
          <div className="p-8">
            {/* Language Toggle at top right */}
            <div className="flex justify-end items-start pt-0 pr-0 pb-2">
              <Button
                variant="outline"
                size="sm"
                className="relative border-gray-600 text-gray-200 bg-gray-900/70 hover:bg-gray-800/80 hover:text-white transition-colors w-8 h-8 p-0 rounded-full overflow-hidden flex items-center justify-center shadow-lg"
                onClick={() => setLang(lang === 'hr' ? 'en' : 'hr')}
                style={{marginLeft: 'auto'}}
              >
                {/* Flag background only */}
                <span className="absolute inset-0 pointer-events-none select-none flex items-center justify-center" style={{zIndex:0}}>
                  {lang === 'hr' ? (
                    <img src="/flag-button-square-250-2.png" alt="Croatia flag" className="w-full h-full object-cover rounded-full" style={{filter:'brightness(1.15) contrast(1.1) drop-shadow(0 1px 2px #0006)'}} />
                  ) : (
                    <img src="/flag-button-round-250.png" alt="UK flag" className="w-full h-full object-cover rounded-full" style={{filter:'brightness(1.15) contrast(1.1) drop-shadow(0 1px 2px #0006)'}} />
                  )}
                </span>
              </Button>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-center mb-4">
                <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                  {TEXT.mainTitle[lang]}
                </h1>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className="text-base md:text-lg font-semibold tracking-wide px-3 py-1 rounded-lg bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-white/90 shadow-sm border border-white/10 backdrop-blur-sm"
                  style={{ letterSpacing: '0.03em', textShadow: '0 1px 8px rgba(180, 100, 255, 0.12)' }}
                >
                  {currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-lg font-semibold mt-2">
                <Clock className="w-5 h-5" />
                <span>{currentTime.toLocaleTimeString("sr-RS")}</span>
              </div>
            </div>

            {/* Language Toggle */}

            {/* To Do List */}
            <div className="mb-6 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight mb-2">{TEXT.todoList[lang]}</h2>
              <ul className="space-y-1">
                {todos.length === 0 ? (
                  <li className="text-gray-400">{TEXT.noTasks[lang]}</li>
                ) : (
                  todos.map((todo) => (
                    <li key={todo.id} className="flex items-center gap-2">
                      <span
                        className={`inline-block w-5 h-5 rounded border-2 flex items-center justify-center ${
                          todo.completed
                            ? "bg-green-600 border-green-700"
                            : "bg-gray-700 border-gray-500"
                        }`}
                        aria-label={todo.completed ? (lang === 'hr' ? 'Završeno' : 'Completed') : (lang === 'hr' ? 'Nedovršeno' : 'Incomplete')}
                      >
                        {todo.completed ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : null}
                      </span>
                      <span className={todo.completed ? "line-through text-gray-400" : "text-white"}>{todo.text}</span>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-2 text-xs text-gray-400">
                {TEXT.managedOnAdmin[lang]}
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight mb-4">{TEXT.scheduleToday[lang]}</h3>
              <div className="grid gap-2 max-h-64 overflow-y-auto custom-scrollbar" ref={gridContainerRef}>
                {Object.entries(todaySchedule).map(([time, data]) => {
                  const isCurrentHour = time === getCurrentHour()
                  // Format time to remove seconds for cleaner display
                  const displayTime = time.substring(0, 5) // Convert HH:MM:SS to HH:MM

                  // Determine border color for current slot
                  const borderColor = data.status === "free"
                    ? "border-green-400"
                    : "border-red-400"
                  const boxShadow = data.status === "free"
                    ? "0 0 0 6px rgba(34,197,94,0.15)" // green-500 with 15% opacity
                    : "0 0 0 6px rgba(239,68,68,0.15)" // red-500 with 15% opacity

                  return (
                    <div
                      key={time}
                      ref={isCurrentHour ? currentSlotRef : undefined}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isCurrentHour
                          ? `bg-white/20 border-2 ${borderColor}`
                          : "bg-white/5 hover:bg-white/10 border border-transparent"
                      }`}
                      style={isCurrentHour ? { boxShadow } : undefined}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-mono text-lg font-bold w-16 flex-shrink-0 text-white drop-shadow-sm">{displayTime}</span>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(data.status)}`} />
                        {/* Show activity text if present, regardless of status; otherwise show empty space */}
                        {(data.activity && data.activity.trim() !== "" && data.activity.trim().toLowerCase() !== "available") ? (
                          <span className={`truncate flex-1 ${isCurrentHour ? "font-semibold" : ""}`}>{data.activity}</span>
                        ) : (
                          <span className="truncate flex-1">&nbsp;</span>
                        )}
                      </div>
                      <Badge
                        variant={getStatusBadgeVariant(data.status)}
                        className={`text-xs text-white bg-black flex-shrink-0 ml-2 ${
                          data.status === "free" ? "border-green-500" : "border-red-500"
                        }`}
                      >
                        {data.status === "free" ? TEXT.available[lang] : TEXT.unavailable[lang]}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>{TEXT.footer[lang]}</p>
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
                className="border-gray-600 text-gray-200 bg-gray-900/70 hover:bg-gray-800/80 hover:text-white transition-colors"
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
              className="border-gray-600 text-gray-200 bg-gray-900/70 hover:bg-gray-800/80 hover:text-white transition-colors"
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
