import { TopPersonSearch } from "@/features/search/TopPersonSearch";
import { Credit } from "../credit/Credit";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { FilterButton } from "../filter/FilterButton";

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

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 gap-2 flex items-center">
      <div className="hidden md:flex">
        <FilterButton />
      </div>

      <TopPersonSearch onPersonSelect={handleSelection} />

      <div className="hidden md:flex">
        <Credit />
      </div>

      <Button
        variant="outline"
        onClick={() => window.open("https://github.com/DipokalLab/intellect")}
      >
        <FaGithub className="h-4 w-4" />
      </Button>
    </div>
  );
}
