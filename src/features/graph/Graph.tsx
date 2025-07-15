import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const data: GraphData = {
  nodes: [
    { id: "A", group: 1 },
    { id: "B", group: 1 },
    { id: "C", group: 1 },
    { id: "D", group: 2 },
    { id: "E", group: 2 },
    { id: "F", group: 2 },
    { id: "G", group: 3 },
    { id: "H", group: 3 },
  ],
  links: [
    { source: "A", target: "B", value: 1 },
    { source: "B", target: "C", value: 1 },
    { source: "C", target: "A", value: 1 },
    { source: "D", target: "E", value: 2 },
    { source: "E", target: "F", value: 2 },
    { source: "G", target: "H", value: 3 },
    { source: "A", target: "D", value: 5 },
    { source: "E", target: "G", value: 5 },
  ],
};

const D3Graph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const padding = 50;

    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%");

    const g = svg.append("g");

    const simulation = d3
      .forceSimulation<Node>(data.nodes)
      .force(
        "link",
        d3.forceLink<Node, Link>(data.links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-200));

    const link = g
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = g
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d) => {
        const scale = d3.scaleOrdinal(d3.schemeCategory10);
        return scale(String(d.group));
      });

    node.append("title").text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as unknown as Node).x!)
        .attr("y1", (d) => (d.source as unknown as Node).y!)
        .attr("x2", (d) => (d.target as unknown as Node).x!)
        .attr("y2", (d) => (d.target as unknown as Node).y!);

      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    });

    const zoomHandler = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomHandler);
  }, []);

  return <svg ref={svgRef}></svg>;
};

export default D3Graph;
