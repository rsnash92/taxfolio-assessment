"use client"

import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface SuggestedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
  isLoading?: boolean
}

export function SuggestedQuestions({
  questions,
  onSelect,
  isLoading = false,
}: SuggestedQuestionsProps) {
  if (questions.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Suggested questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-xs h-auto py-1.5 px-3 whitespace-normal text-left"
            onClick={() => onSelect(question)}
            disabled={isLoading}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  )
}
