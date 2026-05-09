import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function DashboardBreadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      <a
        href="/"
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Home className="size-4" />
        <span className="hidden sm:inline">Home</span>
      </a>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = item.href !== "#";

        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="size-4 text-gray-400" />

            {isLast ? (
              <span className="text-gray-900 font-semibold">
                {item.label}
              </span>
            ) : isClickable ? (
              <a
                href={item.href}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-gray-600">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
