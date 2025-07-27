"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { isSupabaseConfigured } from "@/lib/supabase"

export default function GalleryFromSupabase() {
  const supabase = createClientComponentClient()
  const [images, setImages] = useState<Array<{
    url: string
    title?: string
    date?: string
    description?: string
  }>>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true)
      setError(null)
      try {
        // List only files from the root of the bucket
        const { data, error } = await supabase.storage.from("activity-photos").list("", { limit: 100, offset: 0 })
        if (error) {
          setError("Greška pri dohvaćanju slika iz galerije.")
          return
        }
        const imageFiles = (data || []).filter((file: any) => file.name && /\.(jpg|jpeg|png|webp)$/i.test(file.name))
        // Fetch metadata for all images in one query
        let metaRows: Array<any> = []
        if (imageFiles.length > 0) {
          const { data: metaData } = await supabase
            .from("activity_photos")
            .select("url,title,date,description")
            .in(
              "url",
              imageFiles.map((file: any) => {
                const { data } = supabase.storage.from("activity-photos").getPublicUrl(file.name)
                return data.publicUrl
              })
            )
          metaRows = metaData || []
        }
        const imagesWithMeta = imageFiles.map((file: any) => {
          const { data } = supabase.storage.from("activity-photos").getPublicUrl(file.name)
          const url = data.publicUrl
          const meta = metaRows.find((row) => row.url === url)
          return {
            url,
            title: meta?.title || '',
            date: meta?.date || '',
            description: meta?.description || '',
          }
        })
        setImages(imagesWithMeta)
      } catch (e: any) {
        setError("Greška pri dohvaćanju slika iz galerije.")
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchImages()
  }, [])

  const showPrev = () => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  const showNext = () => setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1))

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIdx, setModalIdx] = useState<number | null>(null)
  const openModal = (idx: number) => {
    setModalIdx(idx)
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)

  if (loading) {
    return <div className="text-center text-gray-400">Učitavanje slika...</div>
  }
  if (error) {
    return <div className="text-center text-red-400">{error}</div>
  }

  if (!images.length) {
    return <div className="text-center text-gray-400">Nema slika za prikaz.</div>
  }

  // Show 3 images: current, previous, next, with guards for 1 or 2 images
  const getIndices = () => {
    if (images.length === 1) return [0, 0, 0]
    if (images.length === 2) return [0, current, (current + 1) % 2]
    const prev = (current - 1 + images.length) % images.length
    const next = (current + 1) % images.length
    return [prev, current, next]
  }
  const [prevIdx, currIdx, nextIdx] = getIndices()

  return (
    <>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={showPrev} aria-label="Prethodna slika">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex gap-2">
            {[prevIdx, currIdx, nextIdx].map((idx, i) =>
              images[idx] ? (
                <div
                  key={idx}
                  className={`relative w-40 h-40 rounded-lg overflow-hidden border-2 ${i === 1 ? "border-blue-400 z-10 scale-110" : "border-gray-700 opacity-70"} bg-black cursor-pointer`}
                  style={{ transition: "all 0.3s" }}
                  onClick={() => openModal(idx)}
                >
                  <Image
                    src={images[idx].url}
                    alt={images[idx].title || `Slika ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority={i === 1}
                  />
                </div>
              ) : null
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={showNext} aria-label="Sljedeća slika">
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
        <div className="mt-2 flex gap-1 justify-center">
          {images.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full ${idx === current ? "bg-blue-400" : "bg-gray-500"}`}
              onClick={() => setCurrent(idx)}
              aria-label={`Idi na sliku ${idx + 1}`}
              type="button"
            />
          ))}
        </div>
      </div>
      {/* Modal for enlarged image and metadata */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl bg-black text-white border-white/10">
          {modalIdx !== null && images[modalIdx] ? (
            <div className="flex flex-col items-center">
              <div className="relative w-full h-96 mb-4">
                <Image
                  src={images[modalIdx].url}
                  alt={images[modalIdx].title || `Slika`}
                  fill
                  className="object-contain rounded-lg"
                  sizes="100vw"
                  priority
                />
              </div>
              <div className="w-full text-center space-y-2">
                {images[modalIdx]?.title && (
                  <div className="text-xl font-bold">{images[modalIdx]?.title}</div>
                )}
                {images[modalIdx]?.date && (
                  <div className="text-sm text-gray-400">{images[modalIdx]?.date}</div>
                )}
                {images[modalIdx]?.description && (
                  <div className="text-base mt-2">{images[modalIdx]?.description}</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
