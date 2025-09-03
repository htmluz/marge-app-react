import MeCard from "@/components/settings/MeCard";
import PlaceholderCard from "@/components/settings/PlaceholderCard";

export default function SettingsView() {
  return (
    <div className="grid grid-cols-2 gap-6 w-full">
      <MeCard />
      <PlaceholderCard />
    </div>
  );
}
