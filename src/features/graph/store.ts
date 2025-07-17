import { create } from "zustand";

interface AchievementNode {
  id: string;
  type: "achievement";
  year: number;
  title: string;
  category: string;
  text: string;
}

interface PersonNode {
  id: string;
  type: "person";
  name: string;
  birth: number;
  death: number;
  field: string;
  nationality: string;
  photo_url?: string;
}

interface Edge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: AchievementNode[];
  persons: PersonNode[];
  edges: Edge[];
}

interface GraphState extends GraphData {
  status: "idle" | "success";
  setData: (data: GraphData) => void;
  focusedPersonId: string | null;
  setFocusedPerson: (personId: string | null) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  persons: [],
  edges: [],
  status: "idle",
  setData: (data) =>
    set({
      nodes: data.nodes || [],
      persons: data.persons || [],
      edges: data.edges || [],
      status: "success",
    }),
  focusedPersonId: null,
  setFocusedPerson: (personId) => set({ focusedPersonId: personId }),
}));
