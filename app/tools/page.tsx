'use client'

import Image from "next/image"
import { CSSProperties, useEffect, useRef, useState } from "react"
import JSZip from "jszip"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const tools = [
  { value: "remove-bg", label: "Remove Background" },
  { value: "convert-formats", label: "Convert Formats" },
  { value: "compress-image", label: "Compress Images" },
]

const convertFormats = [
  { value: "jpg", label: "Convert to JPG" },
  { value: "webp", label: "Convert to WebP" },
  { value: "png", label: "Convert to PNG" },
]

type ConvertJobStatus = "idle" | "processing" | "done" | "error"

type ConvertJob = {
  id: string
  file: File
  originalName: string
  previewUrl: string | null
  resultUrl: string | null
  status: ConvertJobStatus
  message: string | null
  heic: boolean
  downloadName?: string
}

type CompressJob = {
  id: string
  file: File
  originalName: string
  previewUrl: string | null
  resultUrl: string | null
  status: ConvertJobStatus
  message: string | null
  percentSaved?: number
  originalSize?: number
  compressedSize?: number
  downloadName?: string
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export default function ToolsPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [convertJobs, setConvertJobs] = useState<ConvertJob[]>([])
  const [convertFormat, setConvertFormat] = useState(convertFormats[0].value)
  const [convertProcessing, setConvertProcessing] = useState(false)
  const [compressJobs, setCompressJobs] = useState<CompressJob[]>([])
  const [compressProcessing, setCompressProcessing] = useState(false)
  const convertInputRef = useRef<HTMLInputElement>(null)
  const compressInputRef = useRef<HTMLInputElement>(null)
  const [activeTool, setActiveTool] = useState(tools[0].value)
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { id: "home", label: "Home", href: "/#home" },
    { id: "about", label: "About", href: "/#about" },
    { id: "how", label: "How it works", href: "/#how" },
  ]

  useEffect(() => {
    return () => {
      if (processedImage) {
        URL.revokeObjectURL(processedImage)
      }
    }
  }, [processedImage])

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })

  const updateConvertJob = (id: string, updates: Partial<ConvertJob>) => {
    setConvertJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...updates } : job))
    )
  }

  const updateCompressJob = (id: string, updates: Partial<CompressJob>) => {
    setCompressJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...updates } : job))
    )
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      setPreview(readerEvent.target?.result as string)
      setProcessedImage(null)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBackground = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError("Select an image to get started.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", fileInputRef.current.files[0])

      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to remove background")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setProcessedImage(url)
    } catch (err) {
      console.error("Error:", err)
      setError("We couldn't process that image. Please try another file.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPreview(null)
    setProcessedImage(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleConvertFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const jobs = files.map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase()
      const heic =
        extension === "heic" ||
        extension === "heif" ||
        file.type === "image/heic" ||
        file.type === "image/heif"
      const id = generateId()
      const job: ConvertJob = {
        id,
        file,
        originalName: file.name,
        previewUrl: null,
        resultUrl: null,
        status: "idle",
        message: heic ? "HEIC file detected. Preview unavailable but conversion is supported." : null,
        heic,
      }

      if (!heic) {
        readFileAsDataURL(file)
          .then((preview) => updateConvertJob(id, { previewUrl: preview }))
          .catch(() =>
            updateConvertJob(id, {
              message: "Could not preview this file. You can still convert it.",
            })
          )
      }

      return job
    })

    setConvertJobs((prev) => [...prev, ...jobs])
    if (convertInputRef.current) {
      convertInputRef.current.value = ""
    }
  }

  const handleRemoveConvertJob = (id: string) => {
    setConvertJobs((prev) => {
      const job = prev.find((item) => item.id === id)
      if (job?.resultUrl) {
        URL.revokeObjectURL(job.resultUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleClearConvertJobs = () => {
    convertJobs.forEach((job) => {
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl)
    })
    setConvertJobs([])
    if (convertInputRef.current) {
      convertInputRef.current.value = ""
    }
  }

  const processConvertJob = async (job: ConvertJob) => {
    updateConvertJob(job.id, { status: "processing", message: null })
    try {
      const formData = new FormData()
      formData.append("file", job.file)
      formData.append("targetFormat", convertFormat)

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => null)
        const message =
          errorResponse?.error || "Conversion failed. Please try again later."
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const fallbackName = `converted-${job.originalName}.${convertFormat}`
      const contentDisposition = response.headers.get("Content-Disposition")
      const matchedFilename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] || fallbackName

      updateConvertJob(job.id, {
        resultUrl: url,
        status: "done",
        message: "Conversion complete.",
        downloadName: matchedFilename,
      })
    } catch (error) {
      console.error("Conversion error:", error)
      updateConvertJob(job.id, {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Conversion failed. Please try again.",
      })
    }
  }

  const handleConvertAll = async () => {
    if (!convertJobs.length) return
    setConvertProcessing(true)
    for (const job of convertJobs) {
      if (job.status === "processing") {
        continue
      }
      if (job.status === "done" && job.resultUrl) {
        continue
      }
      await processConvertJob(job)
    }
    setConvertProcessing(false)
  }

  const handleConvertZipDownload = async () => {
    const completed = convertJobs.filter((job) => job.resultUrl)
    if (!completed.length) return

    const zip = new JSZip()
    for (const job of completed) {
      if (!job.resultUrl) continue
      const blob = await fetch(job.resultUrl).then((res) => res.blob())
      zip.file(job.downloadName || `converted-${job.originalName}`, blob)
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `converted-files-${Date.now()}.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleCompressFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const supported = files.filter((file) => file.type.match(/image\/(png|jpeg|webp)/))
    const unsupported = files.filter((file) => !file.type.match(/image\/(png|jpeg|webp)/))

    if (unsupported.length) {
      console.warn(
        `Skipped ${unsupported.length} unsupported file(s). Only PNG, JPG, or WebP are allowed for compression.`
      )
    }

    const jobs = supported.map((file) => {
      const id = generateId()
      readFileAsDataURL(file)
        .then((preview) => updateCompressJob(id, { previewUrl: preview }))
        .catch(() =>
          updateCompressJob(id, {
            message: "Could not preview this file. You can still compress it.",
          })
        )

      const job: CompressJob = {
        id,
        file,
        originalName: file.name,
        previewUrl: null,
        resultUrl: null,
        status: "idle",
        message: null,
      }
      return job
    })
    setCompressJobs((prev) => [...prev, ...jobs])

    if (compressInputRef.current) {
      compressInputRef.current.value = ""
    }
  }

  const handleRemoveCompressJob = (id: string) => {
    setCompressJobs((prev) => {
      const job = prev.find((item) => item.id === id)
      if (job?.resultUrl) {
        URL.revokeObjectURL(job.resultUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleClearCompressJobs = () => {
    compressJobs.forEach((job) => {
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl)
    })
    setCompressJobs([])
    if (compressInputRef.current) {
      compressInputRef.current.value = ""
    }
  }

  const processCompressJob = async (job: CompressJob) => {
    updateCompressJob(job.id, { status: "processing", message: null })
    try {
      const formData = new FormData()
      formData.append("file", job.file)

      const response = await fetch("/api/compress", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => null)
        const message =
          errorResponse?.error || "Compression failed. Please try again later."
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const originalSizeHeader = response.headers.get("X-Original-Size")
      const compressedSizeHeader = response.headers.get("X-Compressed-Size")
      const percentHeader = response.headers.get("X-Percent-Saved")

      const originalSize = originalSizeHeader ? Number(originalSizeHeader) : undefined
      const compressedSize = compressedSizeHeader ? Number(compressedSizeHeader) : undefined
      const percentSaved =
        percentHeader !== null
          ? Number(percentHeader)
          : originalSize && compressedSize
            ? Math.max(0, ((originalSize - compressedSize) / originalSize) * 100)
            : undefined

      const fallbackName = `compressed-${job.originalName}`
      const contentDisposition = response.headers.get("Content-Disposition")
      const matchedFilename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] || fallbackName

      updateCompressJob(job.id, {
        resultUrl: url,
        status: "done",
        message: "Compression complete.",
        percentSaved,
        originalSize,
        compressedSize,
        downloadName: matchedFilename,
      })
    } catch (error) {
      console.error("Compression error:", error)
      updateCompressJob(job.id, {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Compression failed. Please try again.",
      })
    }
  }

  const handleCompressAll = async () => {
    if (!compressJobs.length) return
    setCompressProcessing(true)
    for (const job of compressJobs) {
      if (job.status === "processing") continue
      if (job.status === "done" && job.resultUrl) continue
      await processCompressJob(job)
    }
    setCompressProcessing(false)
  }

  const handleCompressZipDownload = async () => {
    const completed = compressJobs.filter((job) => job.resultUrl)
    if (!completed.length) return

    const zip = new JSZip()
    for (const job of completed) {
      if (!job.resultUrl) continue
      const blob = await fetch(job.resultUrl).then((res) => res.blob())
      zip.file(job.downloadName || `compressed-${job.originalName}`, blob)
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `compressed-files-${Date.now()}.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const renderPlaceholder = (label: string, description: string) => (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center text-neutral-500 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-600">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
    </div>
  )

  const checkerboardStyle: CSSProperties = {
    backgroundImage:
      "linear-gradient(45deg, #f3f3f3 25%, transparent 25%, transparent 75%, #f3f3f3 75%), linear-gradient(45deg, #f3f3f3 25%, transparent 25%, transparent 75%, #f3f3f3 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 8px 8px",
    backgroundColor: "#ffffff",
  }

  const renderRemoveSection = () => (
    <Card className="rounded-3xl border transition-colors">
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className="text-base font-semibold sm:text-lg">Remove background</CardTitle>
        <p className="text-xs text-neutral-500 sm:text-sm">
          Upload a photo, preview the cutout, and download instantly.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div
          className={cn(
            "relative flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition-all sm:min-h-[280px] sm:p-6",
            "border-neutral-200 bg-neutral-50/50",
            "hover:border-neutral-300 hover:bg-neutral-100/50",
            "touch-manipulation"
          )}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          style={{ ...(processedImage ? checkerboardStyle : undefined), touchAction: 'manipulation' }}
        >
          {processedImage || preview ? (
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-neutral-200 bg-white sm:aspect-video sm:rounded-2xl">
              <Image
                src={(processedImage as string) || (preview as string)}
                alt={processedImage ? "Background removed preview" : "Uploaded preview"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 640px"
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            renderPlaceholder("Drop image or browse", "PNG • JPG • WEBP up to 12 MB")
          )}
          {processedImage ? (
            <span className="mt-4 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
              Background removed
            </span>
          ) : (
            <span className="mt-4 text-xs font-medium text-neutral-500">
              Click to upload or drag & drop
            </span>
          )}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm text-neutral-700">
              <div className="relative mb-3 h-12 w-12">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                <div className="animate-pulse-ring absolute inset-1 rounded-full border-2 border-neutral-200" />
              </div>
              <p className="text-sm font-medium">Removing background…</p>
              <div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-neutral-200">
                <div className="animate-shimmer h-full w-1/3 rounded-full bg-neutral-900" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
            {error}
          </div>
        )}

        {processedImage && (
          <p className="text-xs text-neutral-500">
            Transparent areas are shown using the checkerboard pattern above.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center justify-between gap-2 sm:order-2 sm:flex-1 sm:justify-center">
          <Button
            onClick={handleRemoveBackground}
            disabled={loading || !preview}
            className="flex-1 text-sm sm:max-w-xs"
          >
            {loading ? "Processing…" : "Remove background"}
          </Button>
          {processedImage && (
            <Button asChild variant="secondary" className="flex-1 text-sm sm:max-w-xs">
              <a
                href={processedImage}
                download="removed-bg.png"
              >
                Download
              </a>
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={!preview && !processedImage}
          className="h-10 w-10 rounded-full self-end sm:order-1 sm:h-9 sm:w-9"
          aria-label="Clear"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </Button>
      </CardFooter>
    </Card>
  )

  const renderConvertSection = () => (
    <Card className="rounded-3xl border transition-colors">
      <CardHeader className="space-y-3 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold sm:text-lg">Convert formats</CardTitle>
            <p className="text-xs text-neutral-500 sm:text-sm">
              Upload multiple PNG, JPG, WebP, or HEIC files and convert them in one go.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Select value={convertFormat} onValueChange={setConvertFormat}>
              <SelectTrigger className="w-full rounded-2xl text-sm">
                <SelectValue placeholder="Choose format" />
              </SelectTrigger>
              <SelectContent>
                {convertFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-6">
        <input
          ref={convertInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          className="hidden"
          onChange={handleConvertFileSelect}
        />

        <div
          className={cn(
            "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-colors sm:min-h-[220px]",
            "border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 hover:bg-neutral-100/50",
            "touch-manipulation"
          )}
          onClick={() => convertInputRef.current?.click()}
          style={{ touchAction: "manipulation" }}
        >
          {convertProcessing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm">
              <div className="relative mb-3 h-10 w-10">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                <div className="animate-pulse-ring absolute inset-1 rounded-full border-2 border-neutral-200" />
              </div>
              <p className="text-sm font-medium text-neutral-700">Processing batch…</p>
            </div>
          )}
          <p className="text-sm font-medium text-neutral-700">Drop images or click to add</p>
          <p className="text-xs text-neutral-500">
            Supports PNG • JPG • WEBP • HEIC — add as many as you need
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-neutral-400">
            {convertJobs.length ? `${convertJobs.length} in queue` : "Queue is empty"}
          </p>
        </div>

        {convertJobs.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
            No files added yet. Drop your images above to start a batch conversion.
          </div>
        ) : (
          <div className="space-y-3">
            {convertJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-white sm:h-16 sm:w-16">
                      {job.previewUrl ? (
                        <img src={job.previewUrl} alt={job.originalName} className="h-full w-full object-cover" />
                      ) : job.heic ? (
                        <span className="px-2 text-[10px] uppercase tracking-[0.3em] text-neutral-400">HEIC</span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Preview…</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{job.originalName}</p>
                      <p className="text-xs text-neutral-500">
                        {job.status === "processing"
                          ? "Processing…"
                          : job.status === "done"
                            ? "Finished"
                            : job.status === "error"
                              ? "Needs attention"
                              : "Ready"}
                      </p>
                      {job.message && (
                        <p className={cn("text-xs", job.status === "error" ? "text-red-500" : "text-neutral-400")}>
                          {job.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2 sm:order-2">
                      {job.resultUrl && (
                        <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
                          <a href={job.resultUrl} download={job.downloadName || job.originalName}>
                            Download
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleRemoveConvertJob(job.id)}
                        aria-label="Remove file"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-white sm:order-1 sm:h-16 sm:w-16">
                      {job.resultUrl ? (
                        <img src={job.resultUrl} alt="Converted preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-neutral-400">
                          {job.status === "processing" ? "…" : "Not converted"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleConvertAll}
            disabled={!convertJobs.length || convertProcessing}
            className="w-full rounded-full text-sm sm:w-auto sm:px-8"
          >
            {convertProcessing ? "Converting batch…" : `Convert ${convertJobs.length || ""} image(s)`}
          </Button>
          <Button
            variant="secondary"
            disabled={!convertJobs.some((job) => job.resultUrl)}
            onClick={handleConvertZipDownload}
            className="w-full rounded-full text-sm sm:w-auto sm:px-8"
          >
            Download all as ZIP
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={handleClearConvertJobs}
          disabled={!convertJobs.length}
          className="rounded-full text-sm"
        >
          Clear list
        </Button>
      </CardFooter>
    </Card>
  )

  const renderCompressSection = () => (
    <Card className="rounded-3xl border transition-colors">
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className="text-base font-semibold sm:text-lg">Compress images</CardTitle>
        <p className="text-xs text-neutral-500 sm:text-sm">
          Queue multiple PNG, JPG, or WebP files and compress them using TinyPNG.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-6">
        <input
          ref={compressInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleCompressFileSelect}
        />

        <div
          className={cn(
            "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-colors sm:min-h-[220px]",
            "border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 hover:bg-neutral-100/50",
            "touch-manipulation"
          )}
          onClick={() => compressInputRef.current?.click()}
          style={{ touchAction: "manipulation" }}
        >
          {compressProcessing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm">
              <div className="relative mb-3 h-10 w-10">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                <div className="animate-pulse-ring absolute inset-1 rounded-full border-2 border-neutral-200" />
              </div>
              <p className="text-sm font-medium text-neutral-700">Compressing batch…</p>
            </div>
          )}
          <p className="text-sm font-medium text-neutral-700">Drop images or click to add</p>
          <p className="text-xs text-neutral-500">PNG • JPG • WEBP — TinyPNG limits apply (5MB/file)</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-neutral-400">
            {compressJobs.length ? `${compressJobs.length} in queue` : "Queue is empty"}
          </p>
        </div>

        {compressJobs.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
            No files added yet. Add a few above to see compression results and savings.
          </div>
        ) : (
          <div className="space-y-3">
            {compressJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-white sm:h-16 sm:w-16">
                      {job.previewUrl ? (
                        <img src={job.previewUrl} alt={job.originalName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-neutral-400">Preview…</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{job.originalName}</p>
                      {job.percentSaved !== undefined && job.status === "done" ? (
                        <p className="text-xs text-emerald-600">
                          −{job.percentSaved.toFixed(1)}% ({formatBytes(job.originalSize)} → {formatBytes(job.compressedSize)})
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-500">
                          {job.status === "processing"
                            ? "Compressing…"
                            : job.status === "done"
                              ? "Finished"
                              : job.status === "error"
                                ? "Needs attention"
                                : "Ready"}
                        </p>
                      )}
                      {job.message && (
                        <p className={cn("text-xs", job.status === "error" ? "text-red-500" : "text-neutral-400")}>
                          {job.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2 sm:order-2">
                      {job.resultUrl && (
                        <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
                          <a href={job.resultUrl} download={job.downloadName || job.originalName}>
                            Download
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleRemoveCompressJob(job.id)}
                        aria-label="Remove file"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-white sm:order-1 sm:h-16 sm:w-16">
                      {job.resultUrl ? (
                        <img src={job.resultUrl} alt="Compressed preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-neutral-400">
                          {job.status === "processing" ? "…" : "Not compressed"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleCompressAll}
            disabled={!compressJobs.length || compressProcessing}
            className="w-full rounded-full text-sm sm:w-auto sm:px-8"
          >
            {compressProcessing
              ? "Compressing batch…"
              : `Compress ${compressJobs.length || ""} image(s)`}
          </Button>
          <Button
            variant="secondary"
            disabled={!compressJobs.some((job) => job.resultUrl)}
            onClick={handleCompressZipDownload}
            className="w-full rounded-full text-sm sm:w-auto sm:px-8"
          >
            Download all as ZIP
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={handleClearCompressJobs}
          disabled={!compressJobs.length}
          className="rounded-full text-sm"
        >
          Clear list
        </Button>
      </CardFooter>
    </Card>
  )

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-3 text-sm sm:px-4 sm:py-4">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.2em] text-neutral-900 transition hover:opacity-70 sm:text-sm sm:tracking-[0.3em]"
          >
            SALINTOOLS
          </Link>
          <nav className="hidden gap-4 sm:flex sm:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="relative px-1 py-0.5 text-xs text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm"
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-900 transition hover:opacity-70 sm:hidden touch-manipulation"
              style={{ touchAction: 'manipulation' }}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              <span className="relative block h-4 w-5">
                <span
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-transform duration-300",
                    menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-all duration-200",
                    menuOpen ? "opacity-0" : "top-1/2 -translate-y-1/2"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-transform duration-300",
                    menuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
        <div
          className={cn(
            "sm:hidden overflow-hidden transition-all duration-300",
            menuOpen ? "max-h-[420px] border-b border-neutral-200" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-3 px-3 py-4 bg-white/95 backdrop-blur-md sm:px-4 sm:py-5">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 touch-manipulation min-h-[44px]"
                onClick={() => setMenuOpen(false)}
                style={{ touchAction: 'manipulation' }}
              >
                {item.label}
                <span className="text-xs uppercase tracking-[0.3em]">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-3 py-6 sm:gap-8 sm:px-4 sm:py-8 md:px-6 md:py-12">
        <div className="space-y-2 text-center sm:space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-neutral-500 sm:text-xs">
            Toolkit
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Pick your action</h1>
          <p className="text-xs text-neutral-600 sm:text-sm">
            Choose a tool from the dropdown and your workspace will adapt instantly.
          </p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <Select value={activeTool} onValueChange={setActiveTool}>
            <SelectTrigger className="w-full rounded-full px-4 py-5 text-sm sm:px-5 sm:py-6">
              <SelectValue placeholder="Choose a tool" />
            </SelectTrigger>
            <SelectContent>
              {tools.map((tool) => (
                <SelectItem key={tool.value} value={tool.value}>
                  {tool.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(() => {
          switch (activeTool) {
            case "convert-formats":
              return renderConvertSection()
            case "compress-image":
              return renderCompressSection()
            case "remove-bg":
            default:
              return renderRemoveSection()
          }
        })()}
      </div>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-3 py-6 text-center sm:px-4 sm:py-8">
          <p className="text-xs text-neutral-500 sm:text-sm">
            Made by Ken ❤️
          </p>
        </div>
      </footer>
    </main>
  )
}

