import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import crypto from "crypto"
import FormData from "form-data"
import { Buffer } from "buffer"

const createImageResponse = (res: NextApiResponse, buffer: Buffer, filename: string | null = null) => {
  res.setHeader("Content-Type", "image/jpeg")
  res.setHeader("Content-Length", buffer.length.toString())
  res.setHeader("Cache-Control", "public, max-age=3600")
  if (filename) res.setHeader("Content-Disposition", `inline; filename="${filename}"`)
  res.status(200).send(buffer)
}

async function scrape(prompt: string) {
  const generateClientId = (): string => {
    return crypto.randomBytes(32).toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }

  const form = new FormData()
  form.append("prompt", prompt)
  form.append("output_format", "bytes")
  form.append("user_profile_id", "null")
  form.append("anonymous_user_id", crypto.randomUUID())
  form.append("request_timestamp", (Date.now() / 1000).toFixed(3))
  form.append("user_is_subscribed", "false")
  form.append("client_id", generateClientId())

  const response = await axios.post(
    "https://ai-api.magicstudio.com/api/ai-art-generator",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "accept": "application/json, text/plain, */*",
        "origin": "https://magicstudio.com",
        "referer": "https://magicstudio.com/ai-art-generator/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
      },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  )
  return response.data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const prompt = req.method === "GET" ? req.query.prompt : req.body.prompt

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ status: false, error: "Parameter 'prompt' is required" })
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ status: false, error: "Prompt too long" })
  }

  try {
    const result = await scrape(prompt.trim())
    return createImageResponse(res, Buffer.from(result), "magicstudio.jpg")
  } catch (error: any) {
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" })
  }
}
