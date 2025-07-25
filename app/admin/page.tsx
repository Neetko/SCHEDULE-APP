"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Clock, Save, Database, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ScheduleService } from "@/lib/schedule-service"
import { isSupabaseConfigured } from "@/lib/supabase"
import { TodosService } from "@/lib/todos-service"

interface TimeSlot {
  time: string
  status: "available" | "unavailable"
  activity: string
  description: string
}

export default function AdminPage() {
  // Range selection mode for batch edit
  const [batchRangeMode, setBatchRangeMode] = useState(false)
  const [batchRangeStart, setBatchRangeStart] = useState<string | null>(null)
  const [batchRangeEnd, setBatchRangeEnd] = useState<string | null>(null)
  // Modal state for batch edit
  const [showBatchModal, setShowBatchModal] = useState(false)
  // Batch form state
  const [batchForm, setBatchForm] = useState({
    activity: "",
    status: "free" as "free" | "busy",
    description: "",
  })
  const [selectedBatchSlots, setSelectedBatchSlots] = useState<string[]>([])

  const handleBatchSlotToggle = (time: string) => {
    // Used only for legacy multi-select, not for range selection
    setSelectedBatchSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    )
  }
  // Range selection logic for batch edit
  const handleBatchRangeSlotClick = (time: string) => {
    if (!batchRangeStart) {
      setBatchRangeStart(time)
      setSelectedBatchSlots([time])
    } else if (!batchRangeEnd) {
      setBatchRangeEnd(time)
      // Find all slots between start and end (inclusive)
      const times = timeSlots.map((slot) => slot.time)
      const startIdx = times.indexOf(batchRangeStart)
      const endIdx = times.indexOf(time)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const selected = times.slice(from, to + 1)
        setSelectedBatchSlots(selected)
        setShowBatchModal(true)
      }
    }
  }

  // Reset range selection when modal closes
  useEffect(() => {
    if (!showBatchModal) {
      setBatchRangeMode(false)
      setBatchRangeStart(null)
      setBatchRangeEnd(null)
      setSelectedBatchSlots([])
    }
  }, [showBatchModal])
  const handleBatchApply = async () => {
    if (!isSupabaseConfigured || selectedBatchSlots.length === 0) return
    try {
      for (const slotTime of selectedBatchSlots) {
        await ScheduleService.saveTimeSlot(
          selectedDate,
          slotTime + ":00",
          batchForm.status,
          batchForm.activity || (batchForm.status === "free" ? "Available" : "Busy"),
          batchForm.description,
        )
      }
      // Update local state
      setTimeSlots((prev) =>
        prev.map((slot) =>
          selectedBatchSlots.includes(slot.time)
            ? { ...slot, ...batchForm, status: batchForm.status === "free" ? "available" : "unavailable" }
            : slot
        )
      )
      setSelectedBatchSlots([])
      setBatchForm({ activity: "", status: "free", description: "" })
      alert("Batch update applied to selected slots!")
    } catch (error) {
      console.error("Error applying batch update:", error)
      alert("Error applying batch update. Please try again.")
    }
  }
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    activity: "",
    status: "free" as "free" | "busy",
    description: "",
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return // Still loading
    if (!session) {
      router.push("/")
      return
    }
  }, [session, status, router])

  // Initialize time slots
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  // Fetch time slots from the database when selectedDate changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!isSupabaseConfigured || !selectedDate) return
      try {
        const schedule = await ScheduleService.getScheduleForDate(selectedDate)
        // schedule is expected to be an object: { 'HH:MM:SS': { status, activity } }
        const slots: TimeSlot[] = []
        for (let i = 0; i < 24; i++) {
          const time = `${i.toString().padStart(2, "0")}:00`
          const dbSlot = schedule[`${time}:00`] // DB uses HH:MM:SS
          slots.push({
            time,
            status: dbSlot?.status === "free" ? "available" : "unavailable",
            activity: dbSlot?.activity || "",
            description: dbSlot?.description || "",
          })
        }
        setTimeSlots(slots)
      } catch (error) {
        console.error("Error fetching schedule from DB:", error)
      }
    }
    fetchTimeSlots()
  }, [selectedDate])

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("sr-RS", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
      if (!selectedDate) {
        setSelectedDate(now.toISOString().split("T")[0])
      }
    }

    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [selectedDate])

  const handleSlotClick = (time: string) => {
    const slot = timeSlots.find((s) => s.time === time)
    if (slot) {
      setSelectedSlot(time)
      setFormData({
        activity: "", // Always start empty
        status: slot.status === "available" ? "free" : "busy",
        description: slot.description,
      })
    }
  }

  const handleSaveSlot = async () => {
    if (selectedSlot && isSupabaseConfigured) {
      try {
        await ScheduleService.saveTimeSlot(
          selectedDate,
          selectedSlot + ":00", // Convert HH:MM to HH:MM:SS format
          formData.status,
          formData.activity || (formData.status === "free" ? "Available" : "Busy"),
          formData.description,
        )

        // Update local state
        setTimeSlots((prev) =>
          prev.map((slot) =>
            slot.time === selectedSlot
              ? { ...slot, ...formData, status: formData.status === "free" ? "available" : "unavailable" }
              : slot,
          ),
        )
        setSelectedSlot(null)
        setFormData({ activity: "", status: "free", description: "" })

        alert("Time slot saved successfully!")
      } catch (error) {
        console.error("Error saving time slot:", error)
        alert("Error saving time slot. Please try again.")
      }
    }
  }

  const handleCommitData = async () => {
    if (!isSupabaseConfigured) {
      alert("Supabase is not configured")
      return
    }

    try {
      // Convert timeSlots to the format expected by ScheduleService
      const scheduleData: Record<string, { status: string; activity: string; description?: string }> = {}

      timeSlots.forEach((slot) => {
        const timeKey = slot.time + ":00" // Convert HH:MM to HH:MM:SS
        scheduleData[timeKey] = {
          status: slot.status === "available" ? "free" : "busy",
          activity: slot.activity || (slot.status === "available" ? "Available" : "Busy"),
          description: slot.description,
        }
      })

      await ScheduleService.saveDaySchedule(selectedDate, scheduleData)
      alert("Schedule committed to database successfully!")
    } catch (error) {
      console.error("Error committing data:", error)
      alert("Error committing data to database. Please try again.")
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    if (!avatar) return "/placeholder.svg?height=40&width=40"
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`
  }

  // --- To-Do List State and Handlers ---
  const [todoText, setTodoText] = useState("")
  const [todos, setTodos] = useState<Array<{ id: string; text: string; completed: boolean }>>([])

  // Fetch todos from DB
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

  const handleAddTodo = async () => {
    if (!todoText.trim() || !isSupabaseConfigured) return
    try {
      const newTodo = await TodosService.addTodo(todoText.trim())
      setTodos((prev) => [...prev, newTodo])
      setTodoText("")
    } catch (error) {
      console.error("Error adding todo:", error)
    }
  }

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await TodosService.updateTodo(id, { completed: !completed })
      setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !completed } : todo)))
    } catch (error) {
      console.error("Error updating todo:", error)
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      await TodosService.deleteTodo(id)
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
    } catch (error) {
      console.error("Error deleting todo:", error)
    }
  }

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/background-collage.jpeg"
            alt="Background collage"
            fill
            className="object-cover opacity-10"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <Card className="relative z-10 w-full max-w-md bg-gray-800/90 border-gray-700 text-white">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="picbox2 fixed w-screen h-screen">
        <div className="sliding-background"></div>
        <div className="absolute inset-0 bg-black/60 z-0"></div> {/* Opaque black layer */}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-purple-400 mb-4">Admin Panel</h1>
            <div className="flex items-center justify-center gap-4 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-mono">{currentTime}</span>
              </div>
            </div>
          </div>

          {/* Main Area: Date Selector + Schedule Grid + Batch Edit Button */}
          <div className="flex flex-col gap-6 mb-6">
            {/* Date Selector (centered) */}
            <div className="flex justify-center">
              <Card className="mb-6 bg-gray-800/90 border-gray-700 max-w-xl w-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Select Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-gray-700 text-white border-gray-600 max-w-xs mx-auto"
                  />
                </CardContent>
              </Card>
            </div>

          {/* Batch Edit Button */}
            <div className="mb-4 flex justify-center">
              <Button
                onClick={() => setBatchRangeMode(true)}
                className={`bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 text-lg font-bold ${batchRangeMode ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={batchRangeMode}
              >
                {batchRangeMode ? "Select Range..." : "Batch Edit"}
              </Button>
            </div>
            {batchRangeMode && (
              <div className="mt-2 text-purple-300 text-sm text-center">Click two time slots below to select a range.</div>
            )}

            {/* Schedule Grid */}
            <Card className="bg-gray-800/90 border-gray-700 w-full">
              <CardHeader></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-8 gap-3 w-full">
                  {timeSlots.map((slot) => (
                    batchRangeMode ? (
                      <Button
                        key={slot.time}
                        variant={selectedBatchSlots.includes(slot.time) ? "default" : "outline"}
                        onClick={() => handleBatchRangeSlotClick(slot.time)}
                        className={`h-16 flex flex-col items-center justify-center text-sm font-mono ${
                          selectedBatchSlots.includes(slot.time)
                            ? "bg-purple-700/60 text-purple-100 border-purple-600"
                            : slot.status === "available"
                              ? "bg-green-700/30 border-green-600 text-green-100 hover:bg-green-700/50"
                              : "bg-red-700/30 border-red-600 text-red-100 hover:bg-red-700/50"
                        }`}
                        disabled={selectedBatchSlots.length === timeSlots.length}
                      >
                        {slot.time}
                      </Button>
                    ) : (
                      <Dialog key={slot.time}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => handleSlotClick(slot.time)}
                            className={`h-16 flex flex-col items-center justify-center text-sm ${
                              slot.status === "available"
                                ? "bg-green-700/30 border-green-600 text-green-100 hover:bg-green-700/50"
                                : "bg-red-700/30 border-red-600 text-red-100 hover:bg-red-700/50"
                            }`}
                          >
                            <span className="font-mono font-bold">{slot.time}</span>
                            <span className="text-xs truncate w-full text-center">
                              {slot.activity || (slot.status === "available" ? "Available" : "Unavailable")}
                            </span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-800 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">Edit Time Slot: {slot.time}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="status" className="text-white">
                                Status
                              </Label>
                              <Select
                                value={formData.status}
                                onValueChange={(value: "free" | "busy") =>
                                  setFormData((prev) => ({ ...prev, status: value }))
                                }
                              >
                                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-700 border-gray-600">
                                  <SelectItem value="free" className="text-white">
                                    Available
                                  </SelectItem>
                                  <SelectItem value="busy" className="text-white">
                                    Unavailable
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="activity" className="text-white">
                                Activity
                              </Label>
                              <Input
                                id="activity"
                                value={formData.activity}
                                onChange={(e) => setFormData((prev) => ({ ...prev, activity: e.target.value }))}
                                placeholder="Enter activity name"
                                className="bg-gray-700 text-white border-gray-600"
                              />
                            </div>
                            <div>
                              <Label htmlFor="description" className="text-white">
                                Description
                              </Label>
                              <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter activity description"
                                className="bg-gray-700 text-white border-gray-600"
                                rows={3}
                              />
                            </div>
                            <Button onClick={handleSaveSlot} className="w-full bg-purple-600 hover:bg-purple-700">
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Edit Modal */}
          <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-white">Batch Edit Time Slots</DialogTitle>
              </DialogHeader>
              <div className="mb-4">
                <div className="text-white mb-2">Select time slots to apply changes:</div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedBatchSlots.includes(slot.time) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleBatchSlotToggle(slot.time)}
                      className={`font-mono ${
                        selectedBatchSlots.includes(slot.time)
                          ? slot.status === "available"
                            ? "bg-green-700/60 text-green-100 border-green-600"
                            : "bg-red-700/60 text-red-100 border-red-600"
                          : "bg-gray-700 text-white border-gray-600"
                      }`}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="batch-status" className="text-white">
                    Status
                  </Label>
                  <Select
                    value={batchForm.status}
                    onValueChange={(value: "free" | "busy") =>
                      setBatchForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="free" className="text-white">
                        Available
                      </SelectItem>
                      <SelectItem value="busy" className="text-white">
                        Unavailable
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="batch-activity" className="text-white">
                    Activity
                  </Label>
                  <Input
                    id="batch-activity"
                    value={batchForm.activity}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, activity: e.target.value }))}
                    placeholder="Enter activity name"
                    className="bg-gray-700 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="batch-description" className="text-white">
                    Description
                  </Label>
                  <Textarea
                    id="batch-description"
                    value={batchForm.description}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter activity description"
                    className="bg-gray-700 text-white border-gray-600"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => { handleBatchApply(); setShowBatchModal(false); }}
                  className="w-full bg-purple-600 hover:bg-purple-700 mt-2"
                  disabled={selectedBatchSlots.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Apply to Selected Slots
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Commit Data Button */}
          <Card className="mb-6 bg-gray-800/90 border-gray-700">
            <CardContent className="pt-6">
              <Button
                onClick={handleCommitData}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
              >
                <Database className="w-5 h-5 mr-2" />
                Commit Data to Database
              </Button>
            </CardContent>
          </Card>

          {/* To-Do List Box */}
          <Card className="mb-6 bg-gray-800/90 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">To-Do List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  value={todoText}
                  onChange={(e) => setTodoText(e.target.value)}
                  placeholder="Add a new to-do item"
                  className="bg-gray-700 text-white border-gray-600 flex-1"
                />
                <Button onClick={handleAddTodo} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Add
                </Button>
              </div>
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li key={todo.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleTodo(todo.id, todo.completed)}
                      className={`border-gray-600 ${
                        todo.completed
                          ? "bg-green-700/30 text-green-100 line-through"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      {todo.completed ? "✓" : ""}
                    </Button>
                    <span className={`flex-1 ${todo.completed ? "line-through text-gray-400" : "text-white"}`}>
                      {todo.text}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="border-red-600 text-red-400 hover:bg-red-700/30"
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <Link href="/guest">
              <Button variant="outline" className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                Go to Guest Page
              </Button>
            </Link>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 ml-4"
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
