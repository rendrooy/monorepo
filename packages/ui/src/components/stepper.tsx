import { Check } from 'lucide-react';
import { cn } from './utils';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-start justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex flex-col items-center z-10">
              {/* Step Circle */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                  isCompleted
                    ? 'border-blue-600 bg-blue-600'
                    : isActive
                    ? 'border-blue-600 bg-white'
                    : 'border-slate-300 bg-white'
                )}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <span
                    className={cn(
                      'font-semibold text-base',
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    )}
                  >
                    {step.id}
                  </span>
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    'text-sm font-medium whitespace-nowrap',
                    isCompleted || isActive ? 'text-slate-900' : 'text-slate-500'
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Connector Line - Full Width */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-300 -z-0">
          <div
            className={cn(
              'h-full transition-all duration-300',
              currentStep > 1 ? 'bg-blue-600' : 'bg-slate-300'
            )}
            style={{
              width: currentStep > 1 ? '100%' : '0%',
            }}
          />
        </div>
      </div>
    </div>
  );
}