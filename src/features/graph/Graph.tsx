import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGraphStore } from "./store";

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
  photo_url?: string;
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
  const { setData: setCacheData } = useGraphStore();

  useEffect(() => {
    fetch("/graph-data.json")
      .then((response) => response.json())
      .then((fetchedData: GraphData) => {
        setData(fetchedData);
        setCacheData(fetchedData);
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

      const defs = svg.append("defs");
      persons.forEach((person) => {
        if (person.photo_url) {
          defs
            .append("pattern")
            .attr("id", `pattern-${person.id}`)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("patternContentUnits", "objectBoundingBox")
            .append("image")
            .attr("href", person.photo_url)
            .attr("width", 1)
            .attr("height", 1)
            .attr("preserveAspectRatio", "xMidYMid slice");
        }
      });

      const yearDomain = [1600, 1700];

      const padding = 80;
      const yearScale = d3
        .scaleLinear()
        .domain(yearDomain)
        .range([padding, width - padding]);

      allNodes.forEach((node) => {
        if (node.type === "achievement") {
          node.fx = yearScale(node.year);
        } else if (node.type === "person") {
          node.fx = yearScale(node.birth);
        }
      });

      const formatYear = (d: d3.AxisDomain) => {
        const year = d as number;
        return year < 0
          ? `${Math.abs(Math.round(year))} BC`
          : `${Math.round(year)}`;
      };

      const simulation = d3
        .forceSimulation(allNodes)
        .force(
          "link",
          d3
            .forceLink<GraphNode, Edge>(edges)
            .id((d) => d.id)
            .strength(0.1)
        )
        .force("charge", d3.forceManyBody().strength(-100))
        .force(
          "y",
          d3
            .forceY<GraphNode>((d) => {
              return d.type === "person" ? height * 0.35 : height * 0.65;
            })
            .strength(0.1)
        )
        .force("collide", d3.forceCollide().radius(25));

      const link = g
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("fill", "none")
        .selectAll("path")
        .data(edges)
        .join("path");

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
        .filter((d): d is PersonNode => d.type === "person")
        .append("circle")
        .attr("r", 12)
        .attr("fill", (d) => {
          return (d as PersonNode).photo_url
            ? `url(#pattern-${d.id})`
            : "#1f77b4";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

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

      const labels = nodeGroup
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
        link.attr("d", (d) => {
          const source = d.source as unknown as GraphNode;
          const target = d.target as unknown as GraphNode;
          const midX = (source.x! + target.x!) / 2;
          const midY = (source.y! + target.y!) / 2;
          const controlPointY = source.y! < target.y! ? midY + 40 : midY - 40;
          const path = d3.path();
          path.moveTo(source.x!, source.y!);
          path.quadraticCurveTo(midX, controlPointY, target.x!, target.y!);
          return path.toString();
        });

        nodeGroup.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
      });

      const zoomHandler = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
          const { transform } = event;
          g.attr("transform", transform);

          labels
            .attr("font-size", `${12 / transform.k}px`)
            .style("opacity", transform.k < 0.5 ? 0 : 1);

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
      const birthYear = selectedNode.birth;
      const deathYear = selectedNode.death;
      const lived =
        birthYear < 0
          ? `Lived: ${Math.abs(birthYear)} BC - ${Math.abs(deathYear)} BC`
          : `Lived: ${birthYear} - ${deathYear}`;

      return (
        <>
          <DialogHeader>
            <DialogTitle>{selectedNode.name}</DialogTitle>
            <DialogDescription>
              {selectedNode.nationality} / {selectedNode.field}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">{lived}</div>
        </>
      );
    }

    if (selectedNode.type === "achievement") {
      const year =
        selectedNode.year < 0
          ? `${Math.abs(selectedNode.year)} BC`
          : selectedNode.year;

      return (
        <>
          <DialogHeader>
            <DialogTitle>{selectedNode.title}</DialogTitle>
            <DialogDescription>
              {selectedNode.category} ({year})
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
