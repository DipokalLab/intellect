import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AchievementNode extends d3.SimulationNodeDatum {
  id: string;
  type: "achievement";
  year: number;
  title: string;
  category: string;
  text: string;
}

interface PersonNode extends d3.SimulationNodeDatum {
  id: string;
  type: "person";
  name: string;
  birth: number;
  death: number;
  field: string;
  nationality: string;
}

type GraphNode = AchievementNode | PersonNode;

interface Edge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: AchievementNode[];
  persons: PersonNode[];
  edges: Edge[];
}

const TimelineGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch("/graph-data.json")
      .then((response) => response.json())
      .then((fetchedData: GraphData) => {
        setData(fetchedData);
      });
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const { nodes: achievementNodes, persons, edges } = data;
    const allNodes: GraphNode[] = [...persons, ...achievementNodes];

    const svg = d3.select(svgRef.current);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        svg.selectAll("*").remove();
        drawGraph(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    const drawGraph = (width: number, height: number) => {
      const g = svg.append("g");

      const yearDomain = d3.extent(achievementNodes, (d) => d.year) as [
        number,
        number
      ];
      const padding = 80;
      const yearScale = d3
        .scaleLinear()
        .domain(yearDomain)
        .range([padding, width - padding]);

      const formatYear = (d: d3.AxisDomain) => {
        const year = d as number;
        return year < 0 ? `${Math.abs(year)} BC` : `${year}`;
      };

      const simulation = d3
        .forceSimulation(allNodes)
        .force(
          "link",
          d3.forceLink<GraphNode, Edge>(edges).id((d) => d.id)
        )
        .force("charge", d3.forceManyBody().strength(-50))
        .force("y", d3.forceY(height / 2).strength(0.05))
        .force(
          "x",
          d3
            .forceX<GraphNode>()
            .x((d) => {
              if (d.type === "achievement") {
                return yearScale(d.year);
              }
              return width / 2;
            })
            .strength((d) => (d.type === "achievement" ? 1 : 0.05))
        )
        .force("collide", d3.forceCollide().radius(30));

      const link = g
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(edges)
        .join("line");

      const nodeGroup = g
        .append("g")
        .selectAll("g")
        .data(allNodes)
        .join("g")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          setSelectedNode(d);
        });

      nodeGroup
        .filter((d) => d.type === "person")
        .append("circle")
        .attr("r", 12)
        .attr("fill", "#1f77b4");

      nodeGroup
        .filter((d) => d.type === "achievement")
        .append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("fill", "#ff7f0e")
        .attr("x", -9)
        .attr("y", -9);

      nodeGroup.append("title").text((d) => {
        return d.type === "person" ? d.name : d.title;
      });

      nodeGroup
        .append("text")
        .text((d) => (d.type === "person" ? d.name : d.title))
        .attr("x", 18)
        .attr("y", 5)
        .attr("font-size", "12px")
        .attr("fill", "#333");

      const xAxis = d3.axisBottom(yearScale).tickFormat(formatYear);

      const xAxisGroup = svg
        .append("g")
        .attr("transform", `translate(0, ${height - 30})`)
        .call(xAxis);

      xAxisGroup.selectAll("text").attr("fill", "#333");

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => (d.source as unknown as GraphNode).x!)
          .attr("y1", (d) => (d.source as unknown as GraphNode).y!)
          .attr("x2", (d) => (d.target as unknown as GraphNode).x!)
          .attr("y2", (d) => (d.target as unknown as GraphNode).y!);

        nodeGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
      });

      const zoomHandler = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
          const { transform } = event;
          g.attr("transform", transform);
          const newYearScale = transform.rescaleX(yearScale);
          xAxisGroup.call(d3.axisBottom(newYearScale).tickFormat(formatYear));
          xAxisGroup.selectAll("text").attr("fill", "#333");
        });

      svg.call(zoomHandler);
    };

    return () => {
      resizeObserver.disconnect();
    };
  }, [data]);

  const renderDialogContent = () => {
    if (!selectedNode) return null;

    if (selectedNode.type === "person") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>{selectedNode.name}</DialogTitle>
            <DialogDescription>
              {selectedNode.nationality} / {selectedNode.field}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            {`Lived: ${Math.abs(selectedNode.birth)} BC - ${Math.abs(
              selectedNode.death
            )} BC`}
          </div>
        </>
      );
    }

    if (selectedNode.type === "achievement") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>{selectedNode.title}</DialogTitle>
            <DialogDescription>
              {selectedNode.category} (
              {selectedNode.year < 0
                ? `${Math.abs(selectedNode.year)} BC`
                : selectedNode.year}
              )
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">{selectedNode.text}</div>
        </>
      );
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "600px" }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
      <Dialog
        open={!!selectedNode}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedNode(null);
          }
        }}
      >
        <DialogContent>{renderDialogContent()}</DialogContent>
      </Dialog>
    </div>
  );
};

export default TimelineGraph;
