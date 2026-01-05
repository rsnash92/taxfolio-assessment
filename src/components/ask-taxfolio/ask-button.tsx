"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { MessageCircle, X } from "lucide-react"
import { ChatInterface } from "./chat-interface"

export function AskButton() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-[#00e3ec] hover:bg-[#12c889] text-black z-50"
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
          <span className="sr-only">Ask TaxFolio</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] p-0 flex flex-col h-full overflow-hidden"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#00e3ec]" />
            Ask TaxFolio
          </SheetTitle>
        </SheetHeader>
        <ChatInterface className="flex-1 min-h-0 overflow-hidden" />
      </SheetContent>
    </Sheet>
  )
}
