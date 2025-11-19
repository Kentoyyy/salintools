import { NextRequest, NextResponse } from "next/server"

const TINYPNG_API_URL = "https://api.tinify.com/shrink"

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    const apiKey = process.env.TINYPNG_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "TinyPNG API key is not configured." },
        { status: 500 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const authHeader = Buffer.from(`api:${apiKey}`).toString("base64")

    const shrinkResponse = await fetch(TINYPNG_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/octet-stream",
      },
      body: Buffer.from(arrayBuffer),
    })

    const shrinkData = await shrinkResponse.json().catch(() => null)

    if (!shrinkResponse.ok) {
      const message =
        shrinkData?.error && shrinkData?.message
          ? `${shrinkData.error}: ${shrinkData.message}`
          : "Compression failed."
      return NextResponse.json({ error: message }, { status: shrinkResponse.status })
    }

    const outputUrl = shrinkData?.output?.url
    if (!outputUrl) {
      return NextResponse.json(
        { error: "TinyPNG did not return an output file." },
        { status: 500 }
      )
    }

    const compressedFetch = await fetch(outputUrl)
    if (!compressedFetch.ok) {
      return NextResponse.json(
        { error: "Failed to download compressed file." },
        { status: 500 }
      )
    }

    const compressedBuffer = Buffer.from(await compressedFetch.arrayBuffer())
    const inputSize = shrinkData?.input?.size
    const outputType =
      shrinkData?.output?.type || file.type || "application/octet-stream"
    const outputSize = shrinkData?.output?.size
    const percentSaved =
      inputSize && outputSize
        ? Math.max(0, ((inputSize - outputSize) / inputSize) * 100)
        : undefined
    const filename = `compressed-${file.name}`

    const headers: Record<string, string> = {
      "Content-Type": outputType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    }

    if (outputSize) {
      headers["Content-Length"] = outputSize.toString()
    }
    if (inputSize) {
      headers["X-Original-Size"] = inputSize.toString()
    }
    if (outputSize) {
      headers["X-Compressed-Size"] = outputSize.toString()
    }
    if (percentSaved !== undefined) {
      headers["X-Percent-Saved"] = percentSaved.toString()
    }

    const response = new NextResponse(compressedBuffer, {
      status: 200,
      headers,
    })

    return response
  } catch (error) {
    console.error("TinyPNG compression error:", error)
    return NextResponse.json(
      { error: "Compression failed. Please try again." },
      { status: 500 }
    )
  }
}


