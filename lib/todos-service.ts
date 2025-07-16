import { supabase } from "./supabase"

export class TodosService {
  static async getTodos() {
    const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: true })
    if (error) throw error
    return data
  }

  static async addTodo(text: string) {
    const { data, error } = await supabase
      .from("todos")
      .insert({ text, completed: false })
      .select("id, text, completed")
      .single()
    if (error) throw error
    return data
  }

  static async updateTodo(id: string, updates: { completed?: boolean }) {
    const { data, error } = await supabase.from("todos").update(updates).eq("id", id)
    if (error) throw error
    return data
  }

  static async deleteTodo(id: string) {
    const { error } = await supabase.from("todos").delete().eq("id", id)
    if (error) throw error
  }
}