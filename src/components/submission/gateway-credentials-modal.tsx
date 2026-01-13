"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, AlertTriangle, Eye, EyeOff, ExternalLink } from "lucide-react"

interface GatewayCredentialsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (credentials: { userId: string; password: string }) => Promise<void>
  isSubmitting?: boolean
  error?: string | null
}

export function GatewayCredentialsModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error = null,
}: GatewayCredentialsModalProps) {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateUserId = (value: string): boolean => {
    // Government Gateway User ID is exactly 12 digits
    return /^\d{12}$/.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!validateUserId(userId)) {
      setValidationError("User ID must be exactly 12 digits")
      return
    }

    if (!password || password.length < 8) {
      setValidationError("Password must be at least 8 characters")
      return
    }

    await onSubmit({ userId, password })
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setUserId("")
      setPassword("")
      setValidationError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Government Gateway Login</DialogTitle>
          <DialogDescription className="text-center">
            Enter your HMRC Government Gateway credentials to submit your tax return.
            Your credentials are used once and never stored.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* User ID */}
          <div className="space-y-2">
            <Label htmlFor="userId">Government Gateway User ID</Label>
            <Input
              id="userId"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={12}
              placeholder="123456789012"
              value={userId}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, "")
                setUserId(value)
              }}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Your 12-digit User ID (numbers only)
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <Alert className="bg-muted/50">
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your credentials are transmitted securely to HMRC and are never stored
              on our servers. We only use them to submit your tax return on your behalf.
            </AlertDescription>
          </Alert>

          {/* Validation/API Error */}
          {(validationError || error) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError || error}</AlertDescription>
            </Alert>
          )}

          {/* Help Link */}
          <div className="text-center">
            <a
              href="https://www.gov.uk/log-in-register-hmrc-online-services"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              Don&apos;t have a Government Gateway account?
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !userId || !password}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit to HMRC"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
