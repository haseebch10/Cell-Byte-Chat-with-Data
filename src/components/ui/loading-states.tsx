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
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1 animate-pulse" />
        ))}
      </div>
      
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

// Enhanced empty state component with modern design
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: "default" | "welcome" | "simple";
}

export function EmptyState({ 
  icon: Icon = Database, 
  title, 
  description, 
  action,
  className,
  variant = "default"
}: EmptyStateProps) {
  if (variant === "welcome") {
    return (
      <div className={cn("text-center py-6 px-4", className)}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl opacity-60"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            
            <div className="relative mx-auto mb-6 animate-float">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 animate-gradient rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg hover:scale-105 transition-transform duration-300">
                <Icon className="w-8 h-8 text-white" />
              </div>
              
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-pulse-soft"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 -left-2 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse-soft" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text">
              {title}
            </h3>
            
            <p className="text-base text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
              {description}
            </p>

            {action && (
              <div className="space-y-3">
                <Button 
                  onClick={action.onClick} 
                  size="default"
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Database className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
                
                <p className="text-xs text-slate-500 italic">
                  Get started with pharmaceutical data analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Icon className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 mb-4 max-w-sm mx-auto text-sm leading-relaxed">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm" className="mt-2">
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  // Default variant with enhanced styling
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl"></div>
        
        <div className="relative p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 via-slate-50 to-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
            <Icon className="w-10 h-10 text-slate-600" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
          
          {action && (
            <Button 
              onClick={action.onClick} 
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg transition-colors duration-200"
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
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
