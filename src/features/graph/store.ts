import { create } from "zustand";

export interface AchievementNode extends d3.SimulationNodeDatum {
  id: string;
  type: "achievement";
  year: number;
  title: string;
  category: string;
  text: string;
}

export interface PersonNode extends d3.SimulationNodeDatum {
  id: string;
  type: "person";
  name: string;
  birth: number;
  death: number;
  field: string;
  nationality: string;
  photo_url?: string;
}

export type GraphNode = AchievementNode | PersonNode;

export interface Edge {
  source: string | GraphNode;
  target: string | GraphNode;
}
export interface GraphData {
  nodes: AchievementNode[];
  persons: PersonNode[];
  edges: Edge[];
}

interface GraphState extends GraphData {
  status: "idle" | "success";
  setData: (data: GraphData) => void;
  focusedPersonId: string | null;
  setFocusedPerson: (personId: string | null) => void;
  selectedFields: string[];
  setSelectedFields: (fields: string[]) => void;
  toggleField: (field: string) => void;
  clearAllFields: () => void;
  selectAllFields: () => void;

  isConnectEnabled: boolean;
  setIsConnectEnabled: (enabled: boolean) => void;
  connected: string[];
  setConnected: (id: string) => void;
  resetConnected: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  persons: [],
  edges: [],
  status: "idle",
  setData: (data) => {
    const fieldsSet = new Set<string>();
    data.persons.forEach((person) => {
      const fields = person.field.split(",").map((f) => f.trim());
      fields.forEach((field) => fieldsSet.add(field));
    });
    const allFields = Array.from(fieldsSet);

    set({
      nodes: data.nodes || [],
      persons: data.persons || [],
      edges: data.edges || [],
      status: "success",
      selectedFields: allFields,
    });
  },
  focusedPersonId: null,
  setFocusedPerson: (personId) => set({ focusedPersonId: personId }),
  selectedFields: [],
  setSelectedFields: (fields) => set({ selectedFields: fields }),
  toggleField: (field) => {
    const { selectedFields } = get();
    if (selectedFields.includes(field)) {
      set({ selectedFields: selectedFields.filter((f) => f !== field) });
    } else {
      set({ selectedFields: [...selectedFields, field] });
    }
  },
  clearAllFields: () => set({ selectedFields: [] }),
  selectAllFields: () => {
    const { persons } = get();
    const fieldsSet = new Set<string>();
    persons.forEach((person) => {
      const fields = person.field.split(",").map((f) => f.trim());
      fields.forEach((field) => fieldsSet.add(field));
    });
    set({ selectedFields: Array.from(fieldsSet) });
  },

  setIsConnectEnabled: (enabled) => set({ isConnectEnabled: enabled }),
  isConnectEnabled: false,
  connected: [],
  setConnected: (id) =>
    set((state) => {
      const isConnected = state.connected.includes(id);
      if (isConnected) {
        return { connected: state.connected.filter((prevId) => prevId !== id) };
      } else {
        return { connected: [...state.connected, id] };
      }
    }),
  resetConnected: () => set({ connected: [] }),
}));
