type ChartEmptyProps = {
  message: string;
  height?: number;
};

export function ChartEmpty({ message, height = 160 }: ChartEmptyProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border text-center"
      style={{ height }}
    >
      <p className="max-w-[22ch] text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
