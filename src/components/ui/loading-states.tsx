"use client";

import React from "react";
import { Loader2, AlertCircle, Database, Upload, Brain, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Loading Spinner with context
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", message, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-purple-600", sizeClasses[size])} />
      {message && <span className="text-sm text-slate-600">{message}</span>}
    </div>
  );
}

// Loading skeleton for data tables
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1 animate-pulse" />
        ))}
      </div>
      
      {/* Row skeletons */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(4)].map((_, j) => (
            <div 
              key={j} 
              className={cn(
                "h-3 bg-slate-100 rounded animate-pulse",
                j === 0 ? "flex-1" : "flex-1"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for charts
export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mx-auto" />
      </div>
    </div>
  );
}

// Context-specific loading states
interface ContextualLoadingProps {
  type: "upload" | "processing" | "analyzing" | "generating";
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function ContextualLoading({ type, message, size = "md" }: ContextualLoadingProps) {
  const configs = {
    upload: {
      icon: Upload,
      defaultMessage: "Uploading and processing your file...",
      color: "text-blue-600"
    },
    processing: {
      icon: Database,
      defaultMessage: "Processing your dataset...",
      color: "text-green-600"
    },
    analyzing: {
      icon: Brain,
      defaultMessage: "Analyzing your query with AI...",
      color: "text-purple-600"
    },
    generating: {
      icon: BarChart3,
      defaultMessage: "Generating visualization...",
      color: "text-orange-600"
    }
  };

  const config = configs[type];
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  const sizeClasses = {
    sm: { icon: "w-5 h-5", text: "text-sm" },
    md: { icon: "w-6 h-6", text: "text-base" },
    lg: { icon: "w-8 h-8", text: "text-lg" }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="relative">
        <Icon className={cn(sizeClasses[size].icon, config.color)} />
        <Loader2 className="w-4 h-4 absolute -top-1 -right-1 animate-spin text-slate-400" />
      </div>
      <p className={cn("text-slate-600 font-medium", sizeClasses[size].text)}>
        {displayMessage}
      </p>
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  title?: string;
  message: string;
  type?: "error" | "warning" | "network" | "api";
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ 
  title,
  message, 
  type = "error",
  onRetry, 
  retryLabel = "Try Again",
  className 
}: ErrorStateProps) {
  const typeConfigs = {
    error: {
      icon: AlertCircle,
      iconColor: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    warning: {
      icon: AlertCircle,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    network: {
      icon: AlertCircle,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    api: {
      icon: Brain,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    }
  };

  const config = typeConfigs[type];
  const Icon = config.icon;

  return (
    <Card className={cn("border-2", config.borderColor, config.bgColor, className)}>
      <CardContent className="pt-6">
        <div className="text-center">
          <Icon className={cn("w-8 h-8 mx-auto mb-3", config.iconColor)} />
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          )}
          <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">{message}</p>
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              size="sm"
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {retryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon = Database, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="inline-flex items-center gap-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Progress indicator for multi-step processes
interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index < currentStep 
                    ? "bg-green-600 text-white" 
                    : index === currentStep
                    ? "bg-purple-600 text-white"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <span className="text-xs text-slate-600 mt-1 text-center max-w-16 truncate">
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  index < currentStep ? "bg-green-600" : "bg-slate-200"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
