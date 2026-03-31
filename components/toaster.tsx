"use client"

import { Toaster } from "sonner"

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          error: "bg-destructive text-destructive-foreground",
          success: "bg-green-500 text-white",
          warning: "bg-yellow-500 text-white",
          info: "bg-blue-500 text-white",
        },
      }}
    />
  )
}
