import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/features/connect/Connect";
import { FilterButton } from "@/features/filter/FilterButton";
import { Credit } from "@/features/credit/Credit";
import { Search } from "@/features/search/Search";

export function TopBar() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 gap-2 flex items-center">
      <div className="hidden md:flex">
        <ConnectButton />
      </div>

      <div className="hidden md:flex">
        <FilterButton />
      </div>

      <Search />

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
