import Graph from "@/features/graph/Graph";
import { TopPersonSearch } from "@/features/search/TopPersonSearch";
import TopRightTitle from "@/features/title/Title";

interface PersonNode {
  id: string;
  name: string;
}

export default function HomePage() {
  const handleSelection = (person: PersonNode | null) => {
    if (person) {
      console.log("Selected:", person);
    }
  };

  return (
    <main className="flex flex-col h-[100%] w-[100%] bg-white text-gray-900">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <TopPersonSearch onPersonSelect={handleSelection} />
      </div>

      <Graph />
      <TopRightTitle title="Intellect" />
    </main>
  );
}
