'use client'

import Image from "next/image"
import { CSSProperties, useEffect, useRef, useState } from "react"
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
  { value: "png-to-jpg", label: "Convert Formats" },
]

const convertFormats = [
  { value: "jpg", label: "Convert to JPG" },
  { value: "webp", label: "Convert to WebP" },
  { value: "avif", label: "Convert to AVIF" },
  { value: "png", label: "Convert to PNG" },
]

export default function ToolsPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [convertPreview, setConvertPreview] = useState<string | null>(null)
  const [convertFormat, setConvertFormat] = useState(convertFormats[0].value)
  const [convertLoading, setConvertLoading] = useState(false)
  const [convertMessage, setConvertMessage] = useState<string | null>(null)
  const [convertResult, setConvertResult] = useState<string | null>(null)
  const [convertFileName, setConvertFileName] = useState<string>("converted")
  const [convertOriginalName, setConvertOriginalName] = useState<string | null>(null)
  const [isHeicFile, setIsHeicFile] = useState(false)
  const convertInputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    return () => {
      if (convertResult) {
        URL.revokeObjectURL(convertResult)
      }
    }
  }, [convertResult])

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
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is HEIC/HEIF - browsers can't preview these directly
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isHeic = fileExtension === 'heic' || fileExtension === 'heif' || file.type === 'image/heic' || file.type === 'image/heif'
    
    if (isHeic) {
      // For HEIC files, we can't preview them directly in browser
      // Set a placeholder or convert message
      setConvertPreview(null)
      setIsHeicFile(true)
      setConvertMessage("HEIC file detected. Click 'Convert image' to process.")
      setConvertResult(null)
      setConvertOriginalName(file.name)
      return
    }
    
    setIsHeicFile(false)

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result as string
      if (result) {
        setConvertPreview(result)
        setConvertMessage(null)
        setConvertResult(null)
        setConvertOriginalName(file.name)
      } else {
        console.error("FileReader returned no result")
        setConvertMessage("Could not preview this file. You can still convert it.")
        setConvertOriginalName(file.name)
      }
    }
    reader.onerror = (error) => {
      console.error("FileReader error:", error)
      setConvertMessage("Could not preview this file. You can still convert it.")
      setConvertOriginalName(file.name)
      setConvertPreview(null)
    }
    reader.onabort = () => {
      console.error("FileReader aborted")
      setConvertMessage("File reading was cancelled.")
      setConvertPreview(null)
    }
    try {
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error reading file:", error)
      setConvertMessage("Could not read file. You can still convert it.")
      setConvertOriginalName(file.name)
    }
  }

  const handleConvertReset = () => {
    setConvertPreview(null)
    setConvertMessage(null)
    setConvertResult(null)
    setConvertOriginalName(null)
    setIsHeicFile(false)
    if (convertInputRef.current) {
      convertInputRef.current.value = ""
    }
  }

  const handleConvert = async () => {
    if (!convertInputRef.current?.files?.[0]) {
      setConvertMessage("Choose an image first.")
      return
    }

    setConvertLoading(true)
    setConvertMessage(null)
    setConvertResult(null)

    try {
      const formData = new FormData()
      formData.append("file", convertInputRef.current.files[0])
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
      setConvertResult(url)
      const fallbackName = `converted.${convertFormat}`
      const contentDisposition = response.headers.get("Content-Disposition")
      const matchedFilename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] || fallbackName
      setConvertFileName(matchedFilename)
      setConvertMessage("Conversion complete. Download your file below.")
    } catch (err) {
      console.error("Conversion error:", err)
      setConvertMessage(
        err instanceof Error ? err.message : "Conversion failed. Please try again."
      )
    } finally {
      setConvertLoading(false)
    }
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
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className="text-base font-semibold sm:text-lg">Convert formats</CardTitle>
        <p className="text-xs text-neutral-500 sm:text-sm">
          Upload any PNG, JPG, WebP, or HEIC and download it in another format.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <input
          ref={convertInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={handleConvertFileSelect}
        />
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div
              className={cn(
                "relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition-all sm:min-h-[280px] sm:p-6",
                "border-neutral-200 bg-neutral-50/50",
                "hover:border-neutral-300 hover:bg-neutral-100/50",
                "touch-manipulation"
              )}
              onClick={() => convertInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  convertInputRef.current?.click()
                }
              }}
              style={{ touchAction: 'manipulation' }}
            >
              {convertLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm text-neutral-700">
                  <div className="relative mb-3 h-12 w-12">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                    <div className="animate-pulse-ring absolute inset-1 rounded-full border-2 border-neutral-200" />
                  </div>
                  <p className="text-sm font-medium">Converting…</p>
                  <div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-neutral-200">
                    <div className="animate-shimmer h-full w-1/3 rounded-full bg-neutral-900" />
                  </div>
                </div>
              )}
              {convertPreview ? (
                <div className="relative flex min-h-[240px] w-full items-center justify-center overflow-hidden rounded-xl bg-white sm:min-h-[280px]">
                  {/* Use regular img tag for data URLs to avoid Next.js Image restrictions in production */}
                  <img
                    src={convertPreview}
                    alt="Source preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      console.error("Preview image failed to load:", e)
                      setConvertMessage("Preview failed to load, but you can still convert the file.")
                      setConvertPreview(null)
                    }}
                  />
                </div>
              ) : isHeicFile && convertOriginalName ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-100/50 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-neutral-300 bg-white text-neutral-400">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-neutral-700">HEIC File Ready</p>
                    <p className="text-xs text-neutral-500">{convertOriginalName}</p>
                    <p className="text-xs text-neutral-400">Preview not available for HEIC files</p>
                  </div>
                </div>
              ) : (
                renderPlaceholder("Drop file or browse", "PNG • JPG • WEBP • HEIC")
              )}
            </div>
          </div>

          {convertResult && (
            <div className="flex-1">
              <div
                className="relative flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 sm:min-h-[280px] sm:p-6"
                style={checkerboardStyle}
              >
                <div className="relative h-full w-full overflow-hidden rounded-xl">
                  <Image
                    src={convertResult}
                    alt="Converted preview"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
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
          {convertOriginalName && (
            <p className="hidden text-sm text-neutral-500 sm:block">
              {convertOriginalName}
            </p>
          )}
        </div>

        {convertMessage && (
          <div className={cn(
            "rounded-xl border px-3 py-2 text-xs sm:text-sm",
            convertMessage.includes("complete") || convertMessage.includes("success")
              ? "border-neutral-200 bg-neutral-50 text-neutral-600"
              : "border-red-200 bg-red-50 text-red-600"
          )}>
            {convertMessage}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center justify-between gap-2 sm:order-2 sm:flex-1 sm:justify-center">
          <Button
            onClick={handleConvert}
            disabled={convertLoading || (!convertPreview && !isHeicFile)}
            className="flex-1 text-sm sm:max-w-xs"
          >
            {convertLoading ? "Converting…" : "Convert image"}
          </Button>
          {convertResult && (
            <Button asChild variant="secondary" className="flex-1 text-sm sm:max-w-xs">
              <a
                href={convertResult}
                download={convertFileName}
              >
                Download
              </a>
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleConvertReset}
          disabled={!convertPreview && !convertResult}
          className="h-10 w-10 rounded-full self-end sm:order-1 sm:h-9 sm:w-9"
          aria-label="Reset"
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

        {activeTool === "remove-bg" ? renderRemoveSection() : renderConvertSection()}
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

