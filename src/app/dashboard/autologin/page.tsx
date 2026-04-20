import { AttemptsGrid } from "./components/AttemptsGrid";
import { SlaTile } from "./components/SlaTile";

export default function AutologinPage() {
  return (
    <div className="space-y-4 p-4">
      <SlaTile />
      <AttemptsGrid />
    </div>
  );
}
