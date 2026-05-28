"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-slate-600",
          actionButton:
            "group-[.toast]:bg-slate-900 group-[.toast]:text-slate-50",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500",
          success:
            "group-[.toast]:!bg-white group-[.toast]:!text-slate-900 group-[.toast]:!border-slate-200",
          error:
            "group-[.toast]:!bg-white group-[.toast]:!text-slate-900 group-[.toast]:!border-red-200",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
