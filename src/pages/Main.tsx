import Graph from "@/features/graph/Graph";
import { Search } from "@/features/search/Search";
import { TopPersonSearch } from "@/features/search/TopPersonSearch";
import TopRightTitle from "@/features/title/Title";

interface PersonNode {
  id: string;
  name: string;
}

export default function HomePage() {
  return (
    <main className="flex flex-col h-[100%] w-[100%] bg-white text-gray-900">
      <Search />
      <Graph />
      <TopRightTitle title="Intellect" />
    </main>
  );
}
