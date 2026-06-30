interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: "blue" | "gold" | "red" | "green" | "navy";
}

const colorClasses = {
  blue: "bg-blue-50 text-blue-600",
  gold: "bg-gold/10 text-gold-dark",
  red: "bg-red-50 text-red-600",
  green: "bg-green-50 text-green-600",
  navy: "bg-navy/10 text-navy",
};

const accentBorders = {
  blue: "border-l-blue-500",
  gold: "border-l-gold",
  red: "border-l-red-500",
  green: "border-l-green-500",
  navy: "border-l-navy",
};

export default function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-cream-dark bg-white p-6 shadow-gold border-l-4 ${accentBorders[color]} transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-navy/60">{title}</p>
          <p className="mt-1 text-3xl font-bold text-navy">{value}</p>
          {subtitle && (
            <p className={`mt-1 text-sm font-medium ${
              color === "red" ? "text-red-500" : "text-gold-dark"
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}
