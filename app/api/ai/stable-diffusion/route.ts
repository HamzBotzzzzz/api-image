import { NextRequest } from "next/server"
import axios from "axios"
import { Buffer } from "buffer"

declare const CloudflareAi: () => string | null

const createImageResponse = (buffer: Buffer, filename: string | null = null) => {
  const headers: { [key: string]: string } = {
    "Content-Type": "image/jpeg",
    "Content-Length": buffer.length.toString(),
    "Cache-Control": "public, max-age=3600",
  }
  if (filename) headers["Content-Disposition"] = `inline; filename="${filename}"`

  return new Response(new Uint8Array(buffer), { headers }) // ✅ FIX
}

async function stable(prompt: string) {
  const response = await axios.post(
    CloudflareAi() + "/image-generation",
    { model: "@cf/bytedance/stable-diffusion-xl-lightning", prompt },
    {
      headers: { "Content-Type": "application/json" },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  )
  return Buffer.from(response.data, "binary").toString("base64")
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const prompt = searchParams.get("prompt")

  if (!prompt || prompt.trim().length === 0) {
    return Response.json({ status: false, error: "Parameter 'prompt' is required" }, { status: 400 })
  }

  try {
    const base64Image = await stable(prompt.trim())
    const imageBuffer = Buffer.from(base64Image, "base64")
    return createImageResponse(imageBuffer)
  } catch (error: any) {
    return Response.json({ status: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prompt } = body || {}

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ status: false, error: "Parameter 'prompt' is required" }, { status: 400 })
  }

  try {
    const base64Image = await stable(prompt.trim())
    const imageBuffer = Buffer.from(base64Image, "base64")
    return createImageResponse(imageBuffer)
  } catch (error: any) {
    return Response.json({ status: false, error: error.message }, { status: 500 })
  }
}
