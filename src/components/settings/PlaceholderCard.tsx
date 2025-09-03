import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ViewOptions = {
  showIndex: boolean;
  showRelativeTimestamp: boolean;
  showIpNames: boolean;
  showCallColors: boolean;
};

export default function PlaceholderCard() {
  const [callFlowViewOptions, setCallFlowViewOptions] = useState<ViewOptions | null>(null);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<number | null>(null);
  const [timestampPreset, setTimestampPreset] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("callFlowViewOptions");
      if (stored) {
        setCallFlowViewOptions(JSON.parse(stored));
      }
    } catch {}
    const refresh = localStorage.getItem("marge-refresh-interval");
    setRefreshIntervalMs(refresh ? parseInt(refresh, 10) : 0);
    setTimestampPreset(localStorage.getItem("timestampPreset"));
    setTheme(localStorage.getItem("vite-ui-theme"));
  }, []);

  const formatRefresh = (ms: number | null) => {
    if (ms == null) return "Not set";
    if (ms <= 0) return "Disabled";
    if (ms % 60000 === 0) return `${ms / 60000} minute(s)`;
    if (ms % 1000 === 0) return `${ms / 1000} second(s)`;
    return `${ms} ms`;
  };

  return (
    <Card className="w-full rounded-none cursor-default">
      <CardHeader>
        <CardTitle>Local Preferences</CardTitle>
        <CardDescription>Values currently stored in your browser</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">Time used for Refresh Interval</div>
            <div className="font-medium">{formatRefresh(refreshIntervalMs)}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Selected Timestamp Preset</div>
            <div className="font-medium">{timestampPreset ?? "Not set"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">UI Theme</div>
            <div className="font-medium">{theme ?? "system"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Call Flow View Options</div>
            {callFlowViewOptions ? (
              <ul className="mt-1 grid grid-cols-2 gap-2">
                <li>
                  <span className="text-muted-foreground">Show Indexes: </span>
                  <span className="font-medium">{callFlowViewOptions.showIndex ? "On" : "Off"}</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Relative Timestamp: </span>
                  <span className="font-medium">{callFlowViewOptions.showRelativeTimestamp ? "On" : "Off"}</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Show IP Names: </span>
                  <span className="font-medium">{callFlowViewOptions.showIpNames ? "On" : "Off"}</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Differentiate Call-IDs by Colors: </span>
                  <span className="font-medium">{callFlowViewOptions.showCallColors ? "On" : "Off"}</span>
                </li>
              </ul>
            ) : (
              <div className="font-medium">Not set</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
