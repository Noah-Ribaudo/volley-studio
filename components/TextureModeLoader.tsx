"use client"

import { useEffect } from "react"

import { ensureTextureMode } from "@/lib/textures"

const TextureModeLoader = () => {
  useEffect(() => {
    ensureTextureMode()
  }, [])

  return null
}

export default TextureModeLoader











