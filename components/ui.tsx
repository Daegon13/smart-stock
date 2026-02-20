import * as React from "react";
import type { ReactNode, HTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "outline" | "soft";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children?: React.ReactNode;
};

export function Button(props: ButtonProps) {
  const {
    className = "",
    variant = "primary",
    size = "md",
    asChild = false,
    children,
    ...rest
  } = props;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes: Record<ButtonSize, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-sm"
  };

  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-sm hover:from-indigo-500 hover:to-fuchsia-500 focus:ring-indigo-400",
    soft: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-300",
    outline:
      "border border-slate-200 bg-white/70 text-slate-900 hover:bg-white focus:ring-slate-400",
    ghost: "bg-transparent text-slate-900 hover:bg-slate-100 focus:ring-slate-400"
  };

  const classes = `${base} ${sizes[size]} ${styles[variant]} ${className}`.trim();

  // shadcn-style "asChild" support without Radix Slot:
  // we clone the only child element and inject button classes.
  if (asChild) {
    const only = React.Children.only(children) as React.ReactElement<any>;
    return React.cloneElement(only, {
      className: `${classes} ${only.props?.className ?? ""}`.trim()
    });
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-400 ${className}`}
        {...rest}
      />
    );
  }
);

Input.displayName = "Input";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      className={`w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-400 ${className}`}
      {...rest}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      className={`w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-400 ${className}`}
      {...rest}
    />
  );
}

export function Badge({
  children,
  variant = "neutral",
  tone,
  className = ""
}: {
  children: React.ReactNode;
  // legacy
  variant?: "neutral" | "low" | "soon" | "ok" | "ai" | "new" | "info";
  // newer usage (Copilot/AppShell)
  tone?: "slate" | "green" | "amber" | "rose" | "indigo" | "fuchsia" | "blue";
  className?: string;
}) {
  const map: Record<string, string> = {
    // variant
    neutral: "bg-slate-100 text-slate-700",
    low: "bg-rose-100 text-rose-700",
    soon: "bg-amber-100 text-amber-800",
    ok: "bg-emerald-100 text-emerald-700",
    ai: "bg-fuchsia-100 text-fuchsia-800",
    new: "bg-indigo-100 text-indigo-800",
    info: "bg-sky-100 text-sky-800",

    // tone
    slate: "bg-slate-900 text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-600 text-white",
    indigo: "bg-indigo-600 text-white",
    fuchsia: "bg-fuchsia-600 text-white",
    blue: "bg-sky-600 text-white"
  };

  const key = (tone ?? variant) as keyof typeof map;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[key]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Sticker({
  children,
  tone = "indigo",
  className = ""
}: {
  children: React.ReactNode;
  tone?:
    | "indigo"
    | "pink"
    | "emerald"
    | "amber"
    | "slate"
    | "purple"
    | "blue"
    | "green"
    | "rose"
    | "fuchsia";
  className?: string;
}) {
  const map: Record<string, string> = {
    indigo: "bg-gradient-to-r from-indigo-600 to-sky-600 text-white",
    pink: "bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white",
    emerald: "bg-gradient-to-r from-emerald-600 to-lime-600 text-white",
    amber: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
    purple: "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
    blue: "bg-gradient-to-r from-sky-600 to-indigo-600 text-white",
    green: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white",
    rose: "bg-gradient-to-r from-rose-600 to-pink-600 text-white",
    fuchsia: "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
    slate: "bg-slate-900 text-white"
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${map[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { className = "", ...rest } = props;
  return <label className={`text-sm font-medium text-slate-800 ${className}`} {...rest} />;
}

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 ${className}`}
      {...rest}
    />
  );
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return <div className={`border-b border-slate-200/60 p-4 ${className}`} {...rest} />;
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return <div className={`p-4 ${className}`} {...rest} />;
}


export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={"text-base font-semibold leading-none tracking-tight " + className} {...props} />;
}

export function CardDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={"text-sm text-muted-foreground " + className} {...props} />;
}
