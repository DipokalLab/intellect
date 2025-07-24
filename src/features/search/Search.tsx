import { TopPersonSearch } from "@/features/search/TopPersonSearch";

interface PersonNode {
  id: string;
  name: string;
}

export function Search() {
  const handleSelection = (person: PersonNode | null) => {
    if (person) {
      console.log("Selected:", person);
    }
  };

  return <TopPersonSearch onPersonSelect={handleSelection} />;
}
