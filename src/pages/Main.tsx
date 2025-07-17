import Graph from "@/features/graph/Graph";
import TopRightTitle from "@/features/title/Title";

export default function HomePage() {
  return (
    <main className="flex flex-col h-[100%] w-[100%] bg-white text-gray-900">
      <Graph />
      <TopRightTitle title="Intellect" />
    </main>
  );
}
