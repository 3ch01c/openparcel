import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, DollarSign, Home } from "lucide-react";

interface StatProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, description, className }: StatProps) {
  return (
    <Card className={cn("glass-panel border-white/5", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display text-white">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
